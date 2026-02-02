// ---------------------------------------------------------------------
const copyright = 'Copyright © 2025 @x-builder, Japan';
const email = 'x-builder@gmail.com';
const appName = 'xPlayer -動画プレイヤー- Ver3.20';
// ---------------------------------------------------------------------
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { promises: fs } = require('fs');  // ← これで await 可能！
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const os = require('os');

// 🔧 キャッシュ対策（起動前に設定）
// - 書き込み可能なキャッシュディレクトリを事前に作成
// - Chromium の GPU shader disk cache を無効化して関連ワーニングを抑制
try {
    const cacheDir = path.join((app && app.getPath) ? app.getPath('userData') : os.homedir(), 'xPlayerCache', 'Cache');
    // 非同期でディレクトリ作成（失敗しても致命的でないので catch で無視）
    fs.mkdir(cacheDir, { recursive: true }).catch(() => {});
    // Chromium のディスクキャッシュ先をアプリ管理下のディレクトリに変更
    if (app && app.commandLine && typeof app.commandLine.appendSwitch === 'function') {
        app.commandLine.appendSwitch('disk-cache-dir', cacheDir);
        app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
    }
} catch (e) {
    console.warn('Cache setup failed (non-fatal):', e);
}

// === FFmpeg パス設定（asarUnpack 対応）===
const ffmpegPath = ffmpegStatic.replace('app.asar', 'app.asar.unpacked');
ffmpeg.setFfmpegPath(ffmpegPath);

// 正しい trash の取得方法（ESM対応）
let trash;
try {
    const trashModule = require('trash');
    trash = trashModule.default || trashModule;  // default 優先
    console.log('trash モジュール読み込み成功:', typeof trash); // → function
} catch (err) {
    console.error('trash モジュール読み込み失敗:', err);
    trash = null;
}

// === サポートするすべての動画拡張子（統一）===
const VIDEO_EXTENSIONS = [
    'mp4', 'mkv', 'webm', 'avi', 'flv', 'mov', 'wmv', 'mpg', 'mpeg',
    'ts', 'mts', 'm2ts', 'vob', 'ogv', '3gp', 'm4v', 'asf'
];
const VIDEO_PLAYLIST = ['amppl'];

// 正規表現（大文字小文字無視）
const VIDEO_EXTENSIONS_REGEX = new RegExp(`\\.(${VIDEO_EXTENSIONS.join('|')})$`, 'i');
const VIDEO_PLAYLIST_REGEX = new RegExp(`\\.(${VIDEO_PLAYLIST.join('|')})$`, 'i');

let mainWindow = null;
let currentFFmpeg = null;
let currentOutputPath = null;

// ウィンドウ作成
function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        title: 'xPlayer -動画プレイヤー-',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
            additionalArguments: [
                '--disable-web-security=false',  // 開発中だけ false
                '--content-security-policy="default-src \'self\'; script-src \'self\'; object-src \'none\';"'  // eval 禁止
            ],
            sandbox: false
        },
        icon: path.join(__dirname, 'xPlayer.ico'),
        autoHideMenuBar: true,
        show: false                        // ← show: false に変更（ちらつき防止）
    });
    win.loadFile('index.html');
    win.maximize();
    win.once('ready-to-show', () => win.show());  // ← これで完璧
    return win;
}

// .amppl リストファイル処理（相対パス対応 + 存在チェック）
async function processListFile(filePath) {
    const videoFiles = [];
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n').map(l => l.trim()).filter(l => l);
        const baseDir = path.dirname(filePath);

        for (const line of lines) {
            if (!line) continue;
            let fullPath = line;

            // 相対パス → 絶対パスに変換
            if (!path.isAbsolute(line)) {
                fullPath = path.join(baseDir, line);
            }

            // 正規化（重複スラッシュなど除去）
            fullPath = path.normalize(fullPath);

            // 動画ファイルかチェック
            if (VIDEO_EXTENSIONS_REGEX.test(fullPath)) {
                try {
                    await fs.access(fullPath);
                    videoFiles.push({ name: path.basename(fullPath), path: fullPath });
                } catch { /* ファイルなし → 無視 */ }
            }
        }
    } catch (e) {
        console.error(`リストファイル読み込みエラー: ${filePath}`, e);
    }
    return videoFiles;
}

// 再帰的フォルダ読み込み
async function getVideoFilesRecursively(folderPath) {
    const videoFiles = [];
    try {
        const files = await fs.readdir(folderPath, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(folderPath, file.name);
            if (file.isDirectory()) {
                const subFiles = await getVideoFilesRecursively(fullPath);
                videoFiles.push(...subFiles);
            } else if (VIDEO_EXTENSIONS_REGEX.test(file.name)) {
                videoFiles.push({ name: file.name, path: fullPath });
            } else if (VIDEO_PLAYLIST_REGEX.test(file.name)) {
                const listFiles = await processListFile(fullPath);
                videoFiles.push(...listFiles);
            }
        }
    } catch (e) {
        console.error(`フォルダ読み込みエラー: ${folderPath}`, e);
    }
    return videoFiles;
}

// コマンドライン引数処理関数
async function processCommandLineFile(filePath) {
    try {
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
            return await getVideoFilesRecursively(filePath);
        } else if (VIDEO_PLAYLIST_REGEX.test(filePath)) {
            return await processListFile(filePath);
        } else if (VIDEO_EXTENSIONS_REGEX.test(filePath)) {
            return [{ name: path.basename(filePath), path: filePath }];
        }
    } catch (e) {
        console.error('process-command-line-file エラー:', e);
    }
    return [];
}

// ================================================================
// アプリ起動処理
// ================================================================
app.whenReady().then(() => {
    mainWindow = createWindow();

    mainWindow.webContents.once('did-finish-load', async () => {
        try {
            const args = process.argv.slice(app.isPackaged ? 1 : 2);
            if (args.length === 0) return;

            const filePath = args[0];
            const exists = await fs.stat(filePath).then(() => true).catch(() => false);
            if (!exists) return;

            const files = await processCommandLineFile(filePath);
            if (files.length > 0) {
                mainWindow.webContents.send('auto-play-files', files);
            }
        } catch (err) {
            console.error('コマンドライン自動再生エラー:', err);
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = createWindow();
        }
    });
});

// ================================================================
// IPC ハンドラ登録
// ================================================================

// フォルダ選択
ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (!result.canceled && result.filePaths.length > 0) {
        return await getVideoFilesRecursively(result.filePaths[0]);
    }
    return [];
});

// ファイル選択（動画 or .amppl）→ 追加用にも使用
ipcMain.handle('open-video-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],  // 複数選択可能
        filters: [
            { 
                name: 'すべての動画ファイルとプレイリスト', 
                extensions: [...VIDEO_EXTENSIONS, ...VIDEO_PLAYLIST] 
            },
            { name: 'すべての動画ファイル', extensions: VIDEO_EXTENSIONS },
            { name: 'xPlayer プレイリスト', extensions: VIDEO_PLAYLIST }
        ]
    });
    if (result.canceled || result.filePaths.length === 0) return [];

    const selectedFiles = [];
    for (const filePath of result.filePaths) {
        if (VIDEO_PLAYLIST_REGEX.test(filePath)) {
            const listFiles = await processListFile(filePath);
            selectedFiles.push(...listFiles);
        } else if (VIDEO_EXTENSIONS_REGEX.test(filePath)) {
            selectedFiles.push({ name: path.basename(filePath), path: filePath });
        }
    }
    return selectedFiles;
});

// プレイリスト保存ダイアログ（.amppl）
ipcMain.handle('save-playlist-dialog', async () => {
    const result = await dialog.showSaveDialog({
        title: 'プレイリストを保存',
        defaultPath: 'MyPlaylist.amppl',
        filters: [
            { name: 'xPlayer プレイリスト', extensions: ['amppl'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
    });
    return result;
});

// コマンドライン引数取得
ipcMain.handle('get-command-line-args', () => {
    const args = process.argv.slice(app.isPackaged ? 1 : 2);
    return args.length > 0 ? args : null;
});

// コマンドライン引数処理（レンダラー用）
ipcMain.handle('process-command-line-file', async (event, filePath) => {
    return await processCommandLineFile(filePath);
});

// FFmpeg 変換ハンドラ（ファイルパス返却）＋ 日本語音声優先 + 日本語字幕優先（なければ無視）
ipcMain.handle('convert-video', async (event, filePath) => {
    return new Promise((resolve, reject) => {
        const fileName = path.basename(filePath);
        const outName = `${path.parse(fileName).name}.mp4`;
        const outPath = path.join(path.dirname(filePath), outName);
        currentOutputPath = outPath;

        mainWindow.webContents.send('convert-progress', { percent: 0 });

        // ffprobe でメタデータ取得
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                mainWindow.webContents.send('convert-error', 'メタデータ取得失敗: ' + err.message);
                reject(err);
                return;
            }

            // === 音声処理：日本語音声があれば優先、なければ最初の音声 ===
            const audioStreams = metadata.streams.filter(s => s.codec_type === 'audio');
            let audioMap = '-map 0:a'; // デフォルト：最初の音声
            let selectedAudioBitrate = '192k'; // フォールバック

            if (audioStreams.length > 0) {
                const japaneseAudio = audioStreams.find(s => 
                    s.tags && (s.tags.language === 'jpn' || s.tags.language === 'ja' || s.tags.language === 'japanese')
                );

                let selectedStream;
                if (japaneseAudio) {
                    const index = audioStreams.indexOf(japaneseAudio);
                    audioMap = `-map 0:a:${index}`;
                    selectedStream = japaneseAudio;
                    console.log(`日本語音声発見 (index: ${index}) → ${audioMap}`);
                } else {
                    selectedStream = audioStreams[0];
                    console.log('日本語音声なし → 最初の音声を使用');
                }

                // 選択された音声のビットレートを取得（bit_rate は文字列で入る場合あり）
                if (selectedStream.bit_rate) {
                    const bitrate = parseInt(selectedStream.bit_rate, 10);
                    if (!isNaN(bitrate) && bitrate > 0) {
                        selectedAudioBitrate = `${Math.round(bitrate / 1000)}k`;
                        console.log(`元音声ビットレート: ${selectedAudioBitrate}`);
                    }
                }
            } else {
                console.log('音声ストリームがありません');
            }

            // === 字幕処理：日本語字幕があれば優先、なければ無視 ===
            const subtitleStreams = metadata.streams.filter(s => s.codec_type === 'subtitle');
            let subtitleOptions = [];

            const japaneseSub = subtitleStreams.find(s => 
                s.tags && (s.tags.language === 'jpn' || s.tags.language === 'ja' || s.tags.language === 'japanese')
            );

            if (japaneseSub) {
                const idx = subtitleStreams.indexOf(japaneseSub);
                subtitleOptions = [
                    `-map 0:s:${idx}`,
                    '-c:s', 'mov_text'
                ];
                console.log(`日本語字幕発見 (index: ${idx}) → 出力に含む`);
            } else {
                console.log('日本語字幕なし → 字幕は出力しない');
            }

            // === FFmpeg コマンド構築 ===
            const ff = ffmpeg(filePath)
                .outputOptions('-map 0:v')
                .outputOptions(audioMap)
                .outputOptions(subtitleOptions)
                .outputOptions('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23')
                .outputOptions('-c:a', 'aac', `-b:a`, selectedAudioBitrate)  // ← ここが動的！
                .outputOptions('-movflags', '+faststart')
                .on('progress', (progress) => {
                    if (progress.percent !== undefined) {
                        mainWindow.webContents.send('convert-progress', { percent: progress.percent });
                    }
                })
                .on('end', () => {
                    currentFFmpeg = null;
                    currentOutputPath = null;
                    resolve(outPath);
                })
                .on('error', (err, stdout, stderr) => {
                    if (err.message.includes('ffmpeg was killed')) {
                        console.log('変換がユーザーにより中断されました:', filePath);
                        return;
                    }
                    currentFFmpeg = null;
                    currentOutputPath = null;
                    mainWindow.webContents.send('convert-error', err.message);
                    reject(err);
                })
                .save(outPath);

            currentFFmpeg = ff;
        });
    });
});

// 変換キャンセル（ロック待機 + リトライ）
ipcMain.handle('cancel-conversion', async () => {
    if (currentFFmpeg) {
        try {
            currentFFmpeg.kill('SIGKILL');
        } catch (e) {
            console.warn('FFmpeg kill failed:', e);
        }
        currentFFmpeg = null;
    }

    if (currentOutputPath) {
        const maxWait = 5000;
        const interval = 100;
        let elapsed = 0;

        while (elapsed < maxWait) {
            try {
                await fs.access(currentOutputPath, fs.constants.F_OK | fs.constants.W_OK);
                await fs.unlink(currentOutputPath);
                console.log('中断: 一時ファイル削除成功:', currentOutputPath);
                break;
            } catch (err) {
                if (err.code === 'EBUSY' || err.code === 'EPERM') {
                    await new Promise(r => setTimeout(r, interval));
                    elapsed += interval;
                    continue;
                } else if (err.code === 'ENOENT') {
                    console.log('中断: ファイルは既に存在しません:', currentOutputPath);
                    break;
                } else {
                    console.error('削除エラー:', err);
                    break;
                }
            }
        }
        if (elapsed >= maxWait) {
            console.warn('中断: ファイル削除タイムアウト:', currentOutputPath);
        }
    }
    currentOutputPath = null;
    return true;
});

// 一時ファイル削除用（ゴミ箱移動）
ipcMain.handle('delete-temp-file', async (event, filePath) => {
    if (!filePath) {
        return { success: false, error: 'filePath is missing' };
    }

    if (typeof trash === 'function') {
        try {
            await trash(filePath);  // ここでゴミ箱に移動
            console.log('ゴミ箱移動成功:', filePath);
            return { success: true };
        } catch (err) {
            console.error('ゴミ箱移動失敗:', err);
            return { success: false, error: err.message };
        }
    } else {
        // フォールバック：完全削除
        const fs = require('fs').promises;
        try {
            await fs.unlink(filePath);
            console.log('完全削除（フォールバック）:', filePath);
            return { success: true, fallback: true };
        } catch (err) {
            console.error('削除失敗:', err);
            return { success: false, error: err.message };
        }
    }
});

// プレイリストの実保存処理（mainプロセス側）
ipcMain.handle('save-playlist-file', async (event, { filePath, paths }) => {
    try {
        const content = paths.join('\n');
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (err) {
        console.error('プレイリスト保存失敗:', err);
        return { success: false, error: err.message };
    }
});

// ============================================================
// ファイル展開
// ============================================================
ipcMain.handle('classify-path', async (event, fullPath) => {
    try {
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
            // フォルダ → 再帰的に動画＋.ampplを全部取得
            const files = await getVideoFilesRecursively(fullPath);
            return { type: 'directory', files };
        }

        if (VIDEO_PLAYLIST_REGEX.test(fullPath)) {
            // .ampplプレイリストファイル
            const files = await processListFile(fullPath);
            return { type: 'playlist', files };
        }

        if (VIDEO_EXTENSIONS_REGEX.test(fullPath)) {
            // 単体動画ファイル
            return {
                type: 'video',
                files: [{ name: path.basename(fullPath), path: fullPath }]
            };
        }

        return { type: 'unknown', files: [] };
    } catch (err) {
        console.error('classify-path エラー:', fullPath, err);
        return { type: 'error', files: [], error: err.message };
    }
});

// ============================================================
// ウインドウクローズでプロセス解放
// ============================================================
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});