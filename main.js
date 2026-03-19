// ---------------------------------------------------------------------
const copyright = 'Copyright © 2025 @x-builder, Japan';
const email = 'x-builder@gmail.com';
const appName = 'xPlayer -動画プレイヤー- Ver3.66';
// ---------------------------------------------------------------------

// 🔲共通変数設定🔲
// モジュールインポート
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { promises: fs } = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const os = require('os');
const { spawn, exec } = require('child_process');
const trashModule = require('trash');

// 固定値設定
const ffmpegPath = ffmpegStatic.replace('app.asar', 'app.asar.unpacked');
const VIDEO_EXTENSIONS = [
    'mp4', 'mkv', 'webm', 'avi', 'flv', 'mov', 'wmv', 'mpg', 'mpeg',
    'ts', 'mts', 'm2ts', 'vob', 'ogv', '3gp', 'm4v', 'asf'
];
const VIDEO_PLAYLIST = ['amppl'];
const VIDEO_EXTENSIONS_REGEX = new RegExp(`\\.(${VIDEO_EXTENSIONS.join('|')})$`, 'i');
const VIDEO_PLAYLIST_REGEX = new RegExp(`\\.(${VIDEO_PLAYLIST.join('|')})$`, 'i');

// グローバル（共通）変数
let trash;
let mainWindow = null;
let currentFFmpeg = null;
let currentOutputPath = null;
let currentSegmentProcs = [];
let currentTmpDir = null;
let currentJoinTempFiles = [];      // 結合用の一時変換ファイルリスト
let currentJoinConcatTxt = null;    // concatリストのtxtパス
let isJoinCancelled = false;        // ファイル先頭付近（他のグローバル変数の近く）に追加

// 🔲初期処理🔲
// 開発中セキュリティオプション設定
if (process.env.NODE_ENV === 'development') {
    app.commandLine.appendSwitch('disable-web-security');
    // または BrowserWindow で webSecurity: false を使用
}

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
ffmpeg.setFfmpegPath(ffmpegPath);

// 正しい trash の取得方法（ESM対応）
try {
    trash = trashModule.default || trashModule;  // default 優先
    console.log('trash モジュール読み込み成功:', typeof trash); // → function
} catch (err) {
    console.error('trash モジュール読み込み失敗:', err);
    trash = null;
}

// 🔲共通関数🔲
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
            webSecurity: false,           // ← 追加（または削除して app.commandLine に任せる）
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

// ユーティリティ関数
function formatFFmpegTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

// ファイルの作成日時取得
function formatTimeForFilename(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}${secs.toString().padStart(2, '0')}`;
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

// 動画のFPS取得ヘルパー関数
async function getFps(inputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) return reject(err);
            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            if (videoStream && videoStream.r_frame_rate) {
                const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
                const fps = num / (den || 1);
                resolve(fps);
            } else {
                reject(new Error('No video stream or FPS info'));
            }
        });
    });
}

// 結合用一時ファイル掃除関数
function cleanupJoinTempFiles() {
    currentJoinTempFiles.forEach(p => fs.unlink(p).catch(() => {}));
    if (currentJoinConcatTxt) {
        fs.unlink(currentJoinConcatTxt).catch(() => {});
        currentJoinConcatTxt = null;
    }
    currentJoinTempFiles = [];
}

// 🔲app ハンドラ登録🔲
// アプリ起動処理
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

// ウインドウクローズでプロセス解放
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// 🔲IPC ハンドラ登録🔲
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

// カット動画保存ダイアログ
ipcMain.handle('show-save-cut-dialog', async (event, { fileName }) => {
    const result = await dialog.showSaveDialog({
        title: '動画をカット保存',
        defaultPath: fileName,
        filters: [
            { name: '動画ファイル', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov'] },
            { name: 'すべてのファイル', extensions: ['*'] }
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

// カット処理キャンセル（変換キャンセルと類似の処理、seg/proc も扱う）
ipcMain.handle('cancel-cut', async () => {
    // まず再エンコード中の ffmpeg を殺す
    if (currentFFmpeg) {
        try {
            currentFFmpeg.kill ? currentFFmpeg.kill('SIGKILL') : null;
        } catch (e) {
            console.warn('cut: FFmpeg kill failed:', e);
        }
        currentFFmpeg = null;
    }

    // 次にコピー/concat 用に spawn したプロセスを殺す
    if (currentSegmentProcs && currentSegmentProcs.length > 0) {
        for (const p of currentSegmentProcs.slice()) {
            try {
                if (p && p.kill) p.kill('SIGKILL');
            } catch (e) {
                console.warn('cut: segment kill failed:', e);
            }
        }
        currentSegmentProcs = [];
    }

    // 一時ディレクトリのクリーンアップ
    if (currentTmpDir) {
        try {
            await fs.rm(currentTmpDir, { recursive: true, force: true });
            console.log('cut中断: 一時ディレクトリ削除成功:', currentTmpDir);
        } catch (e) {
            console.warn('cut中断: 一時ディレクトリ削除失敗:', e);
        }
        currentTmpDir = null;
    }

    // 出力ファイルが存在すれば削除を試みる（ロック待ち）
    {
        // capture to avoid race where currentOutputPath becomes null concurrently
        const targetPath = currentOutputPath;
        if (targetPath) {
            const maxWait = 5000;
            const interval = 100;
            let elapsed = 0;

            while (elapsed < maxWait) {
                try {
                    // if targetPath became null elsewhere, break
                    if (!targetPath) break;
                    await fs.access(targetPath, fs.constants.F_OK | fs.constants.W_OK);
                    await fs.unlink(targetPath);
                    console.log('cut中断: 一時ファイル削除成功:', targetPath);
                    break;
                } catch (err) {
                    // If the error is due to bad argument (null/undefined), stop trying
                    if (err && err.code === 'ERR_INVALID_ARG_TYPE') {
                        console.warn('cut中断: 削除スキップ (無効なパス):', err);
                        break;
                    }
                    if (err && (err.code === 'EBUSY' || err.code === 'EPERM')) {
                        await new Promise(r => setTimeout(r, interval));
                        elapsed += interval;
                        continue;
                    } else if (err && err.code === 'ENOENT') {
                        console.log('cut中断: ファイルは既に存在しません:', targetPath);
                        break;
                    } else {
                        console.error('cut中断: 削除エラー:', err);
                        break;
                    }
                }
            }
            if (elapsed >= maxWait) {
                console.warn('cut中断: ファイル削除タイムアウト:', targetPath);
            }
        }
        currentOutputPath = null;
    }

    // 通知
    try { mainWindow.webContents.send('cut-progress', { stage: 'error', message: 'ユーザーにより中断されました' }); } catch (e) {}
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

// スナップショット（Windows の Snipping Tool を起動）
ipcMain.handle('capture-screenshot', async (event) => {
    try {
        const { exec } = require('child_process');
        exec('explorer.exe ms-screenclip:', () => {});
        return { success: true, message: 'Snipping Tool 起動！'};
    } catch (err) {
        console.error('exec 実行エラー:', err);
        return { success: false, error: err.message };
    }
});

// ファイル展開
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

// 動画カット編集機能
ipcMain.handle('cut-video', async (event, { inputPath, inTime, outTime, outputPath }) => {
    return new Promise((resolve, reject) => {
        const fileName = path.basename(inputPath);
        const baseNameWithoutExt = path.parse(fileName).name;
        const ext = path.extname(fileName);
        
        // outputPathが指定されていればそれを使用、なければ元ファイルと同じディレクトリに生成
        let outPath;
        if (outputPath) {
            outPath = outputPath;
        } else {
            // 出力ファイル名: 元ファイル名_cut_HHMMSS-HHMMSS.拡張子
            const inStr = formatTimeForFilename(inTime);
            const outStr = formatTimeForFilename(outTime);
            const outName = `${baseNameWithoutExt}_cut_${inStr}-${outStr}${ext}`;
            outPath = path.join(path.dirname(inputPath), outName);
        }

        mainWindow.webContents.send('cut-progress', { stage: 'start', type: 'single', percent: 0, inTime, outTime, duration: outTime - inTime });

        // FFmpeg でカット処理
        const inTimeStr = formatFFmpegTime(inTime);
        const durationStr = formatFFmpegTime(outTime - inTime);

        const ff = ffmpeg(inputPath)
            .setStartTime(inTimeStr)
            .setDuration(durationStr)
            .outputOptions([
                '-c:v', 'libx264',
                '-preset', 'ultrafast',      // メモリ・CPUを最も削減（必須）
                '-crf', '30',                // 28→30に上げて処理量減（画質はHDでほぼ気にならない）
                '-ref', '1',                 // 参照フレーム1枚だけ（メモリ激減のキモ）
                '-bframes', '0',             // Bフレーム完全無効
                '-bf', '0',                  // 同上（念のため両方）
                '-g', '300',                 // GOPを長くしてバッファ減
                '-keyint_min', '30',
                '-c:s', 'mov_text',
                '-movflags', '+faststart',
                '-threads', '1'              // スレッド1固定（メモリ断片化防止）
            ])
            .on('progress', (progress) => {
                const cpuLoad = os.loadavg()[0];  // 1分平均負荷
                mainWindow.webContents.send('cut-progress', {
                    stage: 'reencode',
                    type: 'single',
                    percent: progress.percent !== undefined ? progress.percent : 0,
                    frames: progress.frames,
                    currentFps: progress.currentFps,
                    currentKbps: progress.currentKbps,
                    timemark: progress.timemark,
                    cpuLoad
                });
            })
            .on('start', () => {
                currentFFmpeg = ff;
                currentOutputPath = outPath;
            })
            .on('end', () => {
                console.log(`カット完了: ${outPath}`);
                currentFFmpeg = null;
                currentOutputPath = null;
                mainWindow.webContents.send('cut-progress', { stage: 'done', type: 'single', percent: 100, outPath });
                resolve(outPath);
            })
            .on('error', (err, stdout, stderr) => {
                const msg = err && err.message ? err.message : String(err);
                // ユーザーによる kill はエラー扱いにしない
                if (msg.includes('ffmpeg was killed') || msg.includes('was killed with signal')) {
                    console.log('カットがユーザーにより中断されました (single):', msg);
                    try { mainWindow.webContents.send('cut-progress', { stage: 'cancelled', message: 'ユーザーにより中断されました' }); } catch (e) {}
                    currentFFmpeg = null;
                    currentOutputPath = null;
                    return resolve(null);
                }
                console.error('カット処理エラー:', msg);
                currentFFmpeg = null;
                currentOutputPath = null;
                mainWindow.webContents.send('cut-progress', { stage: 'error', message: msg });
                mainWindow.webContents.send('cut-error', msg);
                reject(new Error(`カット処理失敗: ${msg}`));
            })
            .save(outPath);
    });
});

// フォルダを開く（Windows のエクスプローラー）
ipcMain.handle('open-folder', async (event, folderPath) => {
    try {
        if (process.platform === 'win32') {
            spawn('explorer', [folderPath]);
        } else if (process.platform === 'darwin') {
            const { exec } = require('child_process');
            exec(`open "${folderPath}"`);
        } else {
            spawn('xdg-open', [folderPath]);
        }
        return true;
    } catch (err) {
        console.error('フォルダを開く失敗:', err);
        return false;
    }
});

// 複数範囲を削除して結合して保存する（ranges: [{in, out}, ...]）
ipcMain.handle('cut-video-multiple', async (event, { inputPath, ranges, outputPath, frameRate, mode: requestedMode }) => {
    return new Promise((resolve, reject) => {
        try {
            const MIN_KEEP_DURATION = 0.2;
            const DURATION_EPSILON = 0.05;

            // 受け取った mode が有効かチェック（簡易）
            const validModes = ['copy', 'reencode'];
            const useCopyMode = validModes.includes(requestedMode) ? requestedMode === 'copy' : true;

            ffmpeg.ffprobe(inputPath, async (err, metadata) => {
                if (err) {
                    console.error('ffprobe エラー:', err);
                    return reject(new Error('メタデータ取得失敗'));
                }
                const duration = metadata.format.duration || 0;

                console.log(`入力動画のduration: ${duration.toFixed(2)}秒`);
                console.log(`クライアント指定モード: ${requestedMode} → 使用モード: ${useCopyMode ? 'copy' : 'reencode'}`);

                // ranges の正規化・ソート・マージ
                const normalized = (ranges || []).map(r => ({ 
                    in: Math.max(0, Math.min(duration, r.in)), 
                    out: Math.max(0, Math.min(duration, r.out)) 
                }));

                normalized.sort((a, b) => a.in - b.in || a.out - b.out);

                const merged = [];
                for (const r of normalized) {
                    if (r.out <= r.in) continue;
                    if (merged.length === 0) {
                        merged.push({ ...r });
                    } else {
                        const last = merged[merged.length - 1];
                        if (r.in <= last.out) {
                            last.out = Math.max(last.out, r.out);
                        } else {
                            merged.push({ ...r });
                        }
                    }
                }

                // 保持セグメント生成
                let keeps = [];
                let cursor = 0;
                for (const m of merged) {
                    if (m.in > cursor) {
                        keeps.push({ start: cursor, end: m.in });
                    }
                    cursor = Math.min(duration, m.out);
                    if (duration - cursor < DURATION_EPSILON) {
                        cursor = duration;
                    }
                }
                if (cursor < duration) {
                    keeps.push({ start: cursor, end: duration });
                }

                if (keeps.length === 0) {
                    return reject(new Error('指定された範囲で動画が空になります'));
                }

                // 短いセグメント除外
                const filteredKeeps = keeps.filter(k => (k.end - k.start) >= MIN_KEEP_DURATION);
                if (filteredKeeps.length === 0) {
                    return reject(new Error('有効な保持範囲がありません'));
                }
                keeps = filteredKeeps;

                const totalKeepDuration = keeps.reduce((sum, k) => sum + (k.end - k.start), 0);

                // 出力パス決定
                let outPath;
                if (outputPath) {
                    outPath = outputPath;
                } else {
                    const fileName = path.basename(inputPath);
                    const baseNameWithoutExt = path.parse(fileName).name;
                    const ext = path.extname(fileName);
                    outPath = path.join(path.dirname(inputPath), `${baseNameWithoutExt}_trimmed${ext}`);
                }

                mainWindow.webContents.send('cut-progress', { 
                    stage: 'start', 
                    type: 'multiple', 
                    percent: 0, 
                    keeps: keeps.length, 
                    duration: totalKeepDuration 
                });

                // 念のため0.1秒未満はスキップ
                const validKeeps = keeps.filter(k => (k.end - k.start) >= 0.1);

                if (validKeeps.length === 0) {
                    return reject(new Error('有効なセグメントがありません'));
                }

                // ★ ここから判定ロジックを削除し、クライアント指定に従う
                console.log(
                    `モード: ${useCopyMode ? 'コピーモード（高速・ストリームコピー）' : '再エンコードモード（高精度）'} ` +
                    `(クライアント指示による)`
                );

                if (!useCopyMode) {
                    // ── 再エンコードモード（精度優先） ──
                    const filters = [];
                    const concatInputs = [];

                    validKeeps.forEach((k, i) => {
                        filters.push(`[0:v]trim=start=${k.start}:end=${k.end},setpts=PTS-STARTPTS[v${i}]`);
                        filters.push(`[0:a]atrim=start=${k.start}:end=${k.end},asetpts=PTS-STARTPTS[a${i}]`);
                        concatInputs.push(`[v${i}][a${i}]`);
                    });

                    filters.push(`${concatInputs.join('')}concat=n=${validKeeps.length}:v=1:a=1[v][a]`);

                    const cmd = ffmpeg(inputPath)
                        .complexFilter(filters)
                        .outputOptions([
                            '-map', '[v]', '-map', '[a]',
                            '-c:v', 'libx264',
                            '-preset', 'veryfast',
                            '-crf', '23',
                            '-tune', 'fastdecode,zerolatency',
                            '-x264-params', 'ref=1:bframes=0:vbv-bufsize=3000:vbv-maxrate=5000:keyint=120:min-keyint=60',
                            '-movflags', '+faststart',
                            '-max_muxing_queue_size', '1024'
                        ])
                        .on('start', () => {
                            currentFFmpeg = cmd;
                            currentOutputPath = outPath;
                        })
                        .on('progress', (progress) => {
                            mainWindow.webContents.send('cut-progress', {
                                stage: 'reencode',
                                percent: progress.percent || 0,
                                frames: progress.frames,
                                currentFps: progress.currentFps,
                                timemark: progress.timemark
                            });
                        })
                        .on('end', () => {
                            currentFFmpeg = null;
                            currentOutputPath = null;
                            mainWindow.webContents.send('cut-progress', { stage: 'done', percent: 100, outPath });
                            resolve({ outputPath: outPath, mode: 'reencode' });
                        })
                        .on('error', (err, stdout, stderr) => {
                            currentFFmpeg = null;
                            currentOutputPath = null;

                            // ★★★ ここが修正ポイント ★★★
                            const isKilled = err.message?.includes('killed') || 
                                            err.message?.includes('SIGKILL') || 
                                            err.message?.includes('ffmpeg was killed');

                            if (isKilled) {
                                console.log('cut-video-multiple (reencode): ユーザーにより中断されました');
                                // reject せず、キャンセルとして扱う
                                mainWindow.webContents.send('cut-progress', { 
                                    stage: 'cancelled', 
                                    message: 'ユーザーにより中断されました' 
                                });
                                resolve({ cancelled: true });  // または null でも可
                                return;
                            }

                            // 本物のエラーだけ reject
                            console.error('FFmpeg再エンコードエラー:', err);
                            mainWindow.webContents.send('cut-progress', { 
                                stage: 'error', 
                                message: err.message || '再エンコード処理に失敗しました' 
                            });
                            reject(err);
                        })
                        .save(outPath);

                } else {
                    // ── コピーモード（高速・低メモリ） ──
                    mainWindow.webContents.send('cut-progress', {
                        stage: 'copy_start',
                        percent: 0
                    });

                    const tmpFiles = [];
                    const concatList = [];

                    try {
                        for (let i = 0; i < validKeeps.length; i++) {
                            const k = validKeeps[i];
                            const tmpPath = path.join(os.tmpdir(), `cut_tmp_${Date.now()}_${i}.mp4`);

                            await new Promise((res, rej) => {
                                ffmpeg(inputPath)
                                    .seekInput(k.start)
                                    .duration(k.end - k.start)
                                    .outputOptions([
                                        '-c', 'copy',
                                        '-avoid_negative_ts', 'make_zero',
                                        '-max_muxing_queue_size', '1024'
                                    ])
                                    .output(tmpPath)
                                    .on('end', res)
                                    .on('error', (err) => rej(err))
                                    .run();
                            });

                            tmpFiles.push(tmpPath);
                            concatList.push(`file '${tmpPath.replace(/'/g, "\\'")}'`);

                            // 進捗（大まか）
                            const percent = Math.round(((i + 1) / validKeeps.length) * 100);
                            mainWindow.webContents.send('cut-progress', {
                                stage: 'copy',
                                percent
                            });
                        }

                        // concatリスト作成
                        const concatTxtPath = path.join(os.tmpdir(), `concat_${Date.now()}.txt`);
                        await fs.writeFile(concatTxtPath, concatList.join('\n'), 'utf8');

                        // 最終結合
                        await new Promise((res, rej) => {
                            ffmpeg()
                                .input(concatTxtPath)
                                .inputOptions('-f', 'concat')
                                .inputOptions('-safe', '0')
                                .outputOptions([
                                    '-c', 'copy',
                                    '-movflags', '+faststart'
                                ])
                                .output(outPath)
                                .on('end', () => {
                                    res();
                                })
                                .on('error', (err) => {
                                    // ★★★ ここを追加・修正 ★★★
                                    if (err.message && (
                                        err.message.includes('killed') ||
                                        err.message.includes('SIGKILL') ||
                                        err.message.includes('ffmpeg was killed')
                                    )) {
                                        console.log('cut-video-multiple (copy concat): ユーザーによりキャンセルされました');
                                        // reject せず正常終了扱い
                                        res();  // ← これで Promise がフルフィルされる
                                        return;
                                    }

                                    // 本物のエラーだけ reject
                                    console.error('最終結合エラー:', err);
                                    rej(err);
                                })
                                .run();
                        });

                        // 掃除
                        await Promise.all(
                            tmpFiles.map(file => fs.unlink(file).catch(() => {}))
                        );
                        await fs.unlink(concatTxtPath).catch(() => {});
                        
                        mainWindow.webContents.send('cut-progress', {
                            stage: 'done',
                            percent: 100,
                            outPath
                        });
                        
                        resolve({ outputPath: outPath, mode: 'copy' });

                    } catch (copyErr) {
                        // 掃除してからエラー
                        await Promise.all(
                            tmpFiles.map(file => fs.unlink(file).catch(() => {}))
                        );
                        await fs.unlink(concatTxtPath).catch(() => {});
                    
                        console.error('コピーモードエラー:', copyErr);
                        reject(new Error('高速モードでの処理に失敗しました: ' + copyErr.message));
                    }
                }
            });
        } catch (e) {
            reject(e);
        }
    });
});

// 保存ダイアログ（結合用）
ipcMain.handle('show-save-join-dialog', async (event, { fileName }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: '結合した動画を保存',
        defaultPath: fileName || 'joined_video.mp4',
        filters: [
            { name: 'MP4 動画ファイル', extensions: ['mp4'] },
            { name: 'すべてのファイル', extensions: ['*'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
    });

    return result;  // { canceled: boolean, filePath?: string }
});

// 結合処理（全動画を厳密に統一フォーマットに変換 → 結合）
ipcMain.handle('join-videos', async (event, { inputPaths, outputPath, frameRate }) => {
    if (!inputPaths || !Array.isArray(inputPaths) || inputPaths.length < 2) {
        throw new Error('結合する動画が2つ以上必要です');
    }
    if (!outputPath) {
        throw new Error('出力パスが指定されていません');
    }

    currentJoinTempFiles = [];      // リセット
    currentJoinConcatTxt = null;
    isJoinCancelled = false;          // キャンセル状態をリセット

    return new Promise(async (resolve, reject) => {
        let currentProc = null;

        try {
            mainWindow.webContents.send('join-progress', { 
                stage: 'join-prepare', 
                percent: 0,
                totalVideos: inputPaths.length,
                message: '全動画を同一フォーマットに変換中…'
            });

            // ★ FPS検出＆決定ロジック（ここを追加）
            const fpsList = (await Promise.all(
                inputPaths.map(async path => {
                    try {
                        return await getFps(path);
                    } catch (err) {
                        console.warn(`FPS取得失敗: ${path}`, err);
                        return null;
                    }
                })
            )).filter(fps => fps !== null && !isNaN(fps) && fps > 0);

            let targetFps = 30;  // デフォルト

            if (fpsList.length > 0) {
                // 多数決（最頻値）で決定
                const fpsCounts = fpsList.reduce((acc, fps) => {
                    acc[fps] = (acc[fps] || 0) + 1;
                    return acc;
                }, {});
                targetFps = Object.keys(fpsCounts).reduce((a, b) => fpsCounts[a] > fpsCounts[b] ? a : b);

                // または最大値で決定（コメントアウト中 - 好みで切り替え）
                // targetFps = Math.max(...fpsList);

                console.log(`入力FPSリスト: ${fpsList.join(', ')} → 採用FPS: ${targetFps}`);
            } else {
                console.warn('FPS取得失敗 - デフォルト30使用');
            }

            // ★ commonOptions を動的に生成（-r と -vf fps= を targetFps に）
            const commonOptions = [
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-crf', '23',
                `-vf`, `scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=${targetFps},format=yuv420p`,  // ← fps= を動的
                '-colorspace', 'bt709',
                '-color_primaries', 'bt709',
                '-color_trc', 'bt709',
                `-r`, `${targetFps}`,  // ← ここを動的
                '-c:a', 'aac',
                '-b:a', '192k',
                '-ar', '48000',
                '-movflags', '+faststart',
                '-fflags', '+genpts',
                '-async', '1',
                '-max_muxing_queue_size', '9999'
            ];

            // 変換フェーズ（以降は変更なし）
            for (let i = 0; i < inputPaths.length; i++) {
                if (isJoinCancelled) {
                    console.log(`キャンセル検知：残りの変換（${i+1}以降）をスキップ`);
                    break;  // 以降の変換を完全に止める
                }

                const input = inputPaths[i];
                const tempOut = path.join(os.tmpdir(), `join_temp_${Date.now()}_${i}.mp4`);
                currentJoinTempFiles.push(tempOut);

                await new Promise((res, rej) => {
                    const ff = ffmpeg(input)
                        .outputOptions(commonOptions)
                        .on('start', () => {
                            if (isJoinCancelled) {
                                ff.kill('SIGKILL');  // 念のため即殺
                                res();
                                return;
                            }
                            currentFFmpeg = ff;
                            currentOutputPath = outputPath;
                        })
                        .on('progress', (progress) => {
                            if (isJoinCancelled) return;  // 進捗送信をスキップ
                            const filePercent = progress.percent || 0;
                            const overall = ((i + filePercent / 100) / inputPaths.length) * 100;
                            mainWindow.webContents.send('join-progress', {
                                stage: 'convert-pre',
                                percent: overall,
                                currentFile: i + 1,
                                totalFiles: inputPaths.length
                            });
                        })
                        .on('end', res)
                        .on('error', (err) => {
                            if (err.message.includes('killed with signal SIGKILL') || isJoinCancelled) {
                                console.log('変換キャンセル検知');
                                res();  // ここは await new Promise なので resolve で抜ける
                                return;
                            }
                            rej(err);
                        })
                        .save(tempOut);
                });
                if (isJoinCancelled) break;
            }


            mainWindow.webContents.send('join-progress', { 
                stage: 'join-start', 
                percent: 0,
                message: '変換完了 → 結合中…'
            });

            // ★★★ ここにフラグチェックを追加 ★★★
            if (isJoinCancelled) {
                console.log('キャンセル済み：結合フェーズをスキップします');
                cleanupJoinTempFiles();               // 一時ファイルを確実に掃除
                currentFFmpeg = null;
                currentOutputPath = null;
                
                // UIにキャンセル完了を通知（念のため再送してもOK）
                mainWindow.webContents.send('join-progress', { 
                    stage: 'cancelled', 
                    message: 'ユーザーにより結合が中断されました' 
                });
                
                // 処理を正常終了扱いにして抜ける
                resolve({ cancelled: true, message: 'ユーザーによりキャンセルされました' });
                return;   // ← これで以降の結合処理は一切実行されない
            }

            // 結合フェーズ
            const concatList = currentJoinTempFiles.map(p => `file '${p.replace(/'/g, "\\'")}'`);
            currentJoinConcatTxt = path.join(os.tmpdir(), `join_concat_${Date.now()}.txt`);

            await fs.writeFile(currentJoinConcatTxt, concatList.join('\n'), 'utf8');

            const ff = ffmpeg()
                .input(currentJoinConcatTxt)
                .inputOptions('-f', 'concat', '-safe', '0')
                .outputOptions([
                    '-fps_mode', 'passthrough',
                    '-c', 'copy',
                    '-movflags', '+faststart'
                ])
                .on('start', () => {
                    currentFFmpeg = ff;
                    currentOutputPath = outputPath;
                })
                .on('progress', (progress) => {
                    if (progress.percent !== undefined) {
                        mainWindow.webContents.send('join-progress', {
                            stage: 'join',
                            percent: progress.percent
                        });
                    }
                })
                .on('end', () => {
                    cleanupJoinTempFiles();
                    currentFFmpeg = null;
                    currentOutputPath = null;
                    mainWindow.webContents.send('join-progress', { 
                        stage: 'join-done', 
                        percent: 100, 
                        outputPath 
                    });
                    resolve({ outputPath });
                })
                .on('error', (err) => {
                    cleanupJoinTempFiles();
                    if (err.message.includes('ffmpeg was killed') || 
                        err.message.includes('killed with signal SIGKILL')) {
                        // ユーザーキャンセルによる kill → reject せず静かに処理
                        currentFFmpeg = null;
                        currentOutputPath = null;
                        console.log('結合処理がユーザーによりキャンセルされました');
                        // resolve するか、特別な値を返す（例: null や { cancelled: true }）
                        resolve({ cancelled: true, message: 'ユーザーによりキャンセル' });
                        return;
                    }
                    currentFFmpeg = null;
                    currentOutputPath = null;
                    reject(err);
                })
                .save(outputPath);
        } catch (err) {
            cleanupJoinTempFiles();
            currentFFmpeg = null;
            currentOutputPath = null;
            reject(err);
        }
        // Promise の最後（resolve/reject の後ろあたり）
        finally {
            isJoinCancelled = false;
        }
    });
});

// 結合処理専用キャンセル
ipcMain.handle('cancel-join', async () => {
    // 変換中・結合中のFFmpegプロセスを殺す
    isJoinCancelled = true;  // ← これを最初に立てる
    if (currentFFmpeg) {
        try {
            currentFFmpeg.kill('SIGKILL');
        } catch (e) {
            console.warn('join: FFmpeg kill failed:', e);
        }
        currentFFmpeg = null;
    }

    // 一時ファイル全削除
    cleanupJoinTempFiles();

    // 出力パスがあれば削除試行（ロック待ち）
    if (currentOutputPath) {
        const maxWait = 5000;
        const interval = 100;
        let elapsed = 0;

        while (elapsed < maxWait) {
            try {
                if (!currentOutputPath) break;
                await fs.access(currentOutputPath, fs.constants.F_OK | fs.constants.W_OK);
                await fs.unlink(currentOutputPath);
                console.log('join中断: 出力ファイル削除成功:', currentOutputPath);
                break;
            } catch (err) {
                if (err.code === 'EBUSY' || err.code === 'EPERM') {
                    await new Promise(r => setTimeout(r, interval));
                    elapsed += interval;
                    continue;
                } else if (err.code === 'ENOENT') {
                    console.log('join中断: ファイルは既に存在しません:', currentOutputPath);
                    break;
                } else {
                    console.error('join中断削除エラー:', err);
                    break;
                }
            }
        }
        if (elapsed >= maxWait) {
            console.warn('join中断: ファイル削除タイムアウト:', currentOutputPath);
        }
    }
    currentOutputPath = null;

    // 通知（結合専用のチャネルで）
    try {
        mainWindow.webContents.send('join-progress', { 
            stage: 'cancelled', 
            message: 'ユーザーにより結合が中断されました' 
        });
    } catch (e) {}

    return true;
});

// ブラウザ起動ハンドラ
ipcMain.handle('open-video-in-browser', async (event, videoUrl) => {
  try {
    // Chromeのパスをメイン側で管理（セキュリティ向上・パス漏洩防止）
    let chromePath;

    if (process.platform === 'win32') {
      // Windowsの場合、複数の候補から最初に見つかったものを利用
      const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        // 必要ならさらに追加
      ];

      for (const path of possiblePaths) {
        try {
          require('fs').accessSync(path);
          chromePath = path;
          break;
        } catch {}
      }

      if (!chromePath) {
        throw new Error('Chromeが見つかりません。インストールを確認してください。');
      }

    } else if (process.platform === 'darwin') {
      chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    } else {
      // Linuxなど（適宜対応）
      chromePath = 'google-chrome';
    }

    // コマンド構築（--app= でポップアップ風再生）
    const command = `"${chromePath}" --profile-directory=Default --app="${videoUrl}" --new-window`;

    // 実行（非同期でfire-and-forget）
    exec(command, (error) => {
      if (error) {
        console.error('ブラウザ起動エラー:', error);
        // 必要ならレンダラーにエラー通知IPCを送る
      }
    });

    return { success: true, message: `起動コマンド: ${command}` };

  } catch (err) {
    console.error(err);
    return { success: false, message: err.message };
  }
});
