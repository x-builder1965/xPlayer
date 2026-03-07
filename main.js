// ---------------------------------------------------------------------
const copyright = 'Copyright © 2025 @x-builder, Japan';
const email = 'x-builder@gmail.com';
const appName = 'xPlayer -動画プレイヤー- Ver3.46';
// ---------------------------------------------------------------------
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { promises: fs } = require('fs');  // ← これで await 可能！
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const os = require('os');
const { spawn } = require('child_process');

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
let currentSegmentProcs = [];
let currentTmpDir = null;

// ================================================================
// 共通関数
// ================================================================
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

// ユーティリティ関数
function formatFFmpegTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

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

// ウインドウクローズでプロセス解放
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
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
            console.log('cut: 一時ディレクトリ削除成功:', currentTmpDir);
        } catch (e) {
            console.warn('cut: 一時ディレクトリ削除失敗:', e);
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
                    console.log('cut: 中断 一時ファイル削除成功:', targetPath);
                    break;
                } catch (err) {
                    // If the error is due to bad argument (null/undefined), stop trying
                    if (err && err.code === 'ERR_INVALID_ARG_TYPE') {
                        console.warn('cut: 削除スキップ (無効なパス):', err);
                        break;
                    }
                    if (err && (err.code === 'EBUSY' || err.code === 'EPERM')) {
                        await new Promise(r => setTimeout(r, interval));
                        elapsed += interval;
                        continue;
                    } else if (err && err.code === 'ENOENT') {
                        console.log('cut: 中断 ファイルは既に存在しません:', targetPath);
                        break;
                    } else {
                        console.error('cut: 削除エラー:', err);
                        break;
                    }
                }
            }
            if (elapsed >= maxWait) {
                console.warn('cut: 中断 ファイル削除タイムアウト:', targetPath);
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
                '-c:a', 'aac',
                '-b:a', '128k',              // 音声ビットレート下げ（メモリ微減）
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
            const { spawn } = require('child_process');
            spawn('explorer', [folderPath]);
        } else if (process.platform === 'darwin') {
            const { exec } = require('child_process');
            exec(`open "${folderPath}"`);
        } else {
            const { spawn } = require('child_process');
            spawn('xdg-open', [folderPath]);
        }
        return true;
    } catch (err) {
        console.error('フォルダを開く失敗:', err);
        return false;
    }
});

// 複数範囲を削除して結合して保存する（ranges: [{in, out}, ...]）
ipcMain.handle('cut-video-multiple', async (event, { inputPath, ranges, outputPath, frameRate }) => {
    return new Promise((resolve, reject) => {
        try {
            // ffprobeで再生時間取得
            ffmpeg.ffprobe(inputPath, (err, metadata) => {
                if (err) {
                    console.error('ffprobe エラー:', err);
                    return reject(new Error('メタデータ取得失敗'));
                }
                const duration = metadata.format.duration || 0;

                // 正規化・ソート・マージ
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

                // 残す（keep）セグメント生成（変更なし）
                const keeps = [];
                let cursor = 0;
                for (const m of merged) {
                    if (m.in > cursor) {
                        keeps.push({ start: cursor, end: m.in });
                    }
                    cursor = Math.min(duration, m.out);
                }
                if (cursor < duration) {
                    keeps.push({ start: cursor, end: duration });
                }

                if (keeps.length === 0) {
                    return reject(new Error('指定された範囲で動画が空になります'));
                }

                // 保持合計時間を計算
                let totalKeepDuration = 0;
                keeps.forEach(k => {
                    totalKeepDuration += (k.end - k.start);
                });

                // 閾値（秒）
                const MAX_DURATION_FOR_REENCODE = 600; // 10分

                // フレーム数で判定したい場合（コメントアウト解除で使用可能）
                // let totalKeepFrames = totalKeepDuration * (frameRate || 30);
                // const MAX_FRAMES_FOR_REENCODE = 18000; // 例: 10分@30fps

                console.log(`保持合計時間: ${totalKeepDuration.toFixed(2)}秒 (${keeps.length}セグメント)`);

                // 出力パス決定（変更なし）
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

                // 再エンコードする条件：frameRateあり かつ 合計10分未満
                const shouldReencode = frameRate && totalKeepDuration <= MAX_DURATION_FOR_REENCODE;

                if (shouldReencode) {
                    // ── 再エンコード経路（フレーム精度優先） ──
                    const filters = [];
                    const concatInputs = [];
                    keeps.forEach((k, i) => {
                        filters.push(`[0:v]trim=start=${k.start}:end=${k.end},setpts=PTS-STARTPTS[v${i}]`);
                        filters.push(`[0:a]atrim=start=${k.start}:end=${k.end},asetpts=PTS-STARTPTS[a${i}]`);
                        concatInputs.push(`[v${i}][a${i}]`);
                    });
                    filters.push(`${concatInputs.join('')}concat=n=${keeps.length}:v=1:a=1[v][a]`);

                    const cmd = ffmpeg(inputPath)
                        .complexFilter(filters)
                        .outputOptions([
                            '-map', '[v]', '-map', '[a]',
                            '-c:v', 'libx264',
                            '-preset', 'ultrafast',
                            '-crf', '32',
                            '-tune', 'fastdecode,zerolatency',
                            '-x264-params', 'ref=1:bframes=0:vbv-bufsize=3000:vbv-maxrate=5000:keyint=120:min-keyint=60',
                            '-c:a', 'aac',
                            '-b:a', '96k',
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
                            resolve(outPath);
                        })
                        .on('error', (err) => {
                            // エラー処理（省略・既存のものを流用）
                            // ...
                            reject(err);
                        })
                        .save(outPath);

                    return;
                }

                // ── 再エンコード不要 → copy + concat demuxer ──
                (async () => {
                    const tmpDir = path.join(os.tmpdir(), `xplayer_cut_${Date.now()}`);
                    try {
                        await fs.promises.mkdir(tmpDir, { recursive: true });
                        const ext = path.extname(inputPath) || '.mp4';
                        const segmentFiles = [];

                        // セグメント切り出し
                        for (let i = 0; i < keeps.length; i++) {
                            const k = keeps[i];
                            const segPath = path.join(tmpDir, `seg_${String(i).padStart(3, '0')}${ext}`);
                            segmentFiles.push(segPath);
                            const segDuration = (k.end - k.start).toFixed(3);

                            await new Promise((res, rej) => {
                                const args = [
                                    '-y',
                                    '-ss', k.start.toFixed(3),
                                    '-i', inputPath,
                                    '-t', segDuration,
                                    '-c', 'copy',
                                    '-avoid_negative_ts', 'make_zero',
                                    '-fflags', '+genpts',
                                    segPath
                                ];
                                const proc = spawn(ffmpegStatic, args);
                                currentSegmentProcs.push(proc);
                                proc.on('error', rej);
                                proc.on('close', (code) => {
                                    // ... エラー処理・進捗報告 ...
                                    if (code === 0) res();
                                    else rej(new Error(`segment failed code=${code}`));
                                });
                            });
                        }

                        // concat list
                        const listFile = path.join(tmpDir, 'list.txt');
                        const listContent = segmentFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
                        await fs.promises.writeFile(listFile, listContent, 'utf8');

                        // concat 実行
                        await new Promise((res, rej) => {
                            const args = [
                                '-y',
                                '-f', 'concat',
                                '-safe', '0',
                                '-i', listFile,
                                '-c', 'copy',
                                '-movflags', '+faststart',
                                outPath
                            ];
                            const proc = spawn(ffmpegStatic, args);
                            currentSegmentProcs.push(proc);
                            proc.on('error', rej);
                            proc.on('close', (code) => {
                                if (code === 0) res();
                                else rej(new Error(`concat failed code=${code}`));
                            });
                        });

                        // クリーンアップ
                        await fs.promises.rm(tmpDir, { recursive: true, force: true });
                        resolve(outPath);
                    } catch (err) {
                        console.warn('copy/concat failed, fallback to re-encode:', err);
                        // 必要ならここで再エンコードにフォールバック（ただし今回は長い動画なので諦める選択も可）
                        // または reject(err)
                        reject(err);
                    } finally {
                        currentTmpDir = null;
                        currentSegmentProcs = [];
                    }
                })();
            });
        } catch (e) {
            reject(e);
        }
    });
});
