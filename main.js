// -- main.js ----------------------------------------------------------
const copyright = 'Copyright © 2025- @x-builder, Japan';
const email = 'x-builder@gmail.com';
const appName = 'xPlayer -メディアプレイヤー- Ver5.51.0';
// ---------------------------------------------------------------------

// 🔲共通変数設定🔲
// モジュールインポート
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { promises: fs } = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const os = require('os');
const { spawn, exec } = require('child_process');
const trashModule = require('trash');

// 固定値設定
const ffmpegPath = ffmpegStatic.replace('app.asar', 'app.asar.unpacked');
const ffprobePath = ffprobeStatic.path.replace('app.asar', 'app.asar.unpacked');
const VIDEO_EXTENSIONS = [
    'mp4', 'mkv', 'webm', 'avi', 'flv', 'mov', 'wmv', 'mpg', 'mpeg',
    'ts', 'mts', 'm2ts', 'vob', 'ogv', '3gp', 'm4v', 'asf'
];
const AUDIO_EXTENSIONS = [
    'mp3', 'wav', 'flac', 'ogg', 'oga', 'm4a', 'aac', 'opus', 'wma', 
    'aiff', 'aif', 'alac', 'ape', 'm4b', 'mid', 'midi'
];
const IMAGE_EXTENSIONS = [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'
];
const VIDEO_PLAYLIST = ['amppl'];
const SUPPORTED_MEDIA_EXTENSIONS = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS, ...IMAGE_EXTENSIONS];
const SUPPORTED_MEDIA_EXTENSIONS_REGEX = new RegExp(`\\.(${SUPPORTED_MEDIA_EXTENSIONS.join('|')})$`, 'i');
const VIDEO_PLAYLIST_REGEX = new RegExp(`\\.(${VIDEO_PLAYLIST.join('|')})$`, 'i');
const gotTheLock = app.requestSingleInstanceLock();     // 🔧 単一インスタンスロックの取得（重複起動の判定）

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
let thumbnailCacheDir = null;
let isSecondaryInstance = false; // 重複起動フラグ

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
    thumbnailCacheDir = path.join((app && app.getPath) ? app.getPath('userData') : os.homedir(), 'xPlayerCache', 'thumbnails');
    // 非同期でディレクトリ作成（失敗しても致命的でないので catch で無視）
    fs.mkdir(cacheDir, { recursive: true }).catch(() => {});
    fs.mkdir(thumbnailCacheDir, { recursive: true }).catch(() => {});
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
ffmpeg.setFfprobePath(ffprobePath);

// 正しい trash の取得方法（ESM対応）
try {
    trash = trashModule.default || trashModule;  // default 優先
} catch (err) {
    console.error('trash モジュール読み込み失敗:', err);
    trash = null;
}

// 初回起動判定
if (!gotTheLock) {
    // 2つ目以降の起動（重複起動）の場合
    isSecondaryInstance = true;
    // 重複起動時も一時的なバックグラウンド処理や設定同期のため即時quitせずフラグのみ保持するか、
    // あるいは後続の処理で設定を同期させます。
} else {
    // 初回起動（プライマリインスタンス）の場合、2つ目が起動された際のイベントをキャッチ
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// 🔲共通関数🔲
// ウィンドウ作成
function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        title: 'xPlayer -メディアプレイヤー-',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
            additionalArguments: [
                '--disable-web-security',  // 開発中だけ false
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
    win.once('ready-to-show', () => win.show());
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

            // 音声・動画ファイルかチェック
            if (SUPPORTED_MEDIA_EXTENSIONS_REGEX.test(fullPath)) {
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
            // 先頭が '.' で始まる隠しフォルダ・隠しファイルをスキップ
            if (file.name.startsWith('.')) {
                continue;
            }

            const fullPath = path.join(folderPath, file.name);

            if (file.isDirectory()) {
                const subFiles = await getVideoFilesRecursively(fullPath);
                videoFiles.push(...subFiles);
            } else if (SUPPORTED_MEDIA_EXTENSIONS_REGEX.test(file.name)) {
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
        } else if (SUPPORTED_MEDIA_EXTENSIONS_REGEX.test(filePath)) {
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

// 正規表現の特殊文字をエスケープする関数（baseName に . などが入る場合対策）
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 字幕抽出関数（変更なし、metadataを引数で受け取る）
async function extractSubtitlesOnly(inputPath, baseName, outDir, metadata) {
    const textSubtitleCodecs = ['webvtt', 'srt', 'subrip', 'mov_text', 'ass', 'ssa'];
    const subtitleStreams = metadata.streams.filter(s => 
        s.codec_type === 'subtitle' && textSubtitleCodecs.includes(s.codec_name)
    );
    if (subtitleStreams.length === 0) {
        console.log('テキスト形式の字幕ストリームが見つからないため、処理をスキップします。');
        return;
    }

    // 字幕抽出準備中
    mainWindow.webContents.send('subtitle-extraction-progress', {
        filePath: inputPath,
        subtitleCount: subtitleStreams.length,
        subtitleIndex: 0,
        message: `字幕抽出準備中...（0/${subtitleStreams.length}）`
    });
    // 既存の対象動画の全vttファイル削除
    try {
        const files = await fs.readdir(outDir);
        const targetPattern = new RegExp(`^${escapeRegExp(baseName)}_.*\\.vtt$`, 'i');

        for (const file of files) {
            if (targetPattern.test(file)) {
                const fullPath = path.join(outDir, file);
                await trash(fullPath);
            }
        }
    } catch (err) {
        console.warn('古い .vtt ファイル削除中にエラー（続行）:', err.message);
        // 削除失敗しても字幕抽出は続行（致命的でない）
    }

    // 字幕抽出中
    for (const [idx, sub] of subtitleStreams.entries()) {
        const lang = sub.tags?.language || sub.tags?.lang || 'und';
        const vttPath = path.join(outDir, `${baseName}_track${idx}_${lang}.vtt`);

        mainWindow.webContents.send('subtitle-extraction-progress', {
            filePath: inputPath,
            subtitleCount: subtitleStreams.length,
            subtitleIndex: idx,
            message: `字幕抽出中...（${idx + 1}/${subtitleStreams.length}）`
        });

        await new Promise((res) => {
            ffmpeg(inputPath)
                .outputOptions([
                    // 0:s:${idx} ではなく、ストリームの絶対インデックス（sub.index）を使用する
                    `-map 0:${sub.index}`, 
                    '-vn', '-an',
                    '-c:s', 'webvtt'
                ])
                .on('end', () => res())
                .on('error', (err, stdout, stderr) => {
                    console.error(`抽出エラー (track ${idx}):`, stderr || err.message);
                    res();
                })
                .save(vttPath);
        });
    }

    mainWindow.webContents.send('subtitle-extraction-progress', {
        filePath: inputPath,
        subtitleCount: subtitleStreams.length,
        subtitleIndex: subtitleStreams.length,
        message: `字幕抽出完了（${subtitleStreams.length}/${subtitleStreams.length}）`
    });
}

// 🔲app ハンドラ登録🔲
// アプリ起動処理
app.whenReady().then(() => {
    mainWindow = createWindow();

    // レンダラーからの準備完了通知を待つ
    ipcMain.once('app-ready', async (event) => {
        try {
            const rawArgs = process.argv.slice(app.isPackaged ? 1 : 2);
            const args = rawArgs.filter(arg => !arg.startsWith('-'));
            if (args.length === 0) return;

            const filePromises = args.map(async (filePath) => {
                const exists = await fs.stat(filePath).then(() => true).catch(() => false);
                if (!exists) return [];
                return await processCommandLineFile(filePath);
            });

            const results = await Promise.all(filePromises);
            const uniqueFiles = [...new Set(results.flat())];

            if (uniqueFiles.length > 0) {
                // 確実にリスナーが登録されている状態で送信
                event.sender.send('auto-play-files', uniqueFiles);
            }
        } catch (err) {
            console.error('コマンドライン自動再生エラー:', err);
        }
    });
});

// ウインドウクローズでプロセス解放
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// 🔲IPC ハンドラ登録🔲
// 初回起動判定結果返却
ipcMain.handle('check-secondary-instance', async () => {
    return isSecondaryInstance;
});

// フォルダ選択
ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) {
        return null; // キャンセルされた場合は null を返す
    }
    return result.filePaths[0]; // 選択されたフォルダパスを返す
});

// フォルダ動画取得
ipcMain.handle('get-folder-video-files', async (event, folderPath) => {
    if (!folderPath) return [];
    return await getVideoFilesRecursively(folderPath);
});

// ファイル選択
ipcMain.handle('open-video-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'], // 複数選択可能
        filters: [
            {
                name: '音声・動画・画像ファイルとプレイリスト',
                extensions: [...SUPPORTED_MEDIA_EXTENSIONS, ...VIDEO_PLAYLIST]
            },
            { name: '動画ファイル', extensions: VIDEO_EXTENSIONS },
            { name: '音声ファイル', extensions: AUDIO_EXTENSIONS },
            { name: '画像ファイル', extensions: IMAGE_EXTENSIONS },
            { name: 'プレイリスト', extensions: VIDEO_PLAYLIST }
        ]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return []; // キャンセル時または未選択時は空配列を返す
    }

    return result.filePaths; // 選択されたファイルパスの配列を返す
});

// ファイル動画取得（動画 or .amppl）→ 追加用にも使用
ipcMain.handle('get-file-video-files', async (event, filePaths) => {
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
        return [];
    }

    const selectedFiles = [];
    for (const filePath of filePaths) {
        if (VIDEO_PLAYLIST_REGEX.test(filePath)) {
            const listFiles = await processListFile(filePath);
            selectedFiles.push(...listFiles);
        } else if (SUPPORTED_MEDIA_EXTENSIONS_REGEX.test(filePath)) {
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

// カット保存ダイアログ
ipcMain.handle('show-save-cut-dialog', async (event, { fileName, ext }) => {
    const audioExts = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'];
    const isAudio = audioExts.includes((ext || '').toLowerCase());

    const filters = isAudio
        ? [
            { name: '音声ファイル', extensions: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'] },
            { name: 'すべてのファイル', extensions: ['*'] }
          ]
        : [
            { name: '動画ファイル', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov'] },
            { name: 'すべてのファイル', extensions: ['*'] }
          ];

    const result = await dialog.showSaveDialog({
        title: isAudio ? '音声をカット保存' : '動画をカット保存',
        defaultPath: fileName,
        filters: filters,
        properties: ['createDirectory', 'showOverwriteConfirmation']
    });
    return result;
});

// 設定エクスポート保存ダイアログ
ipcMain.handle('show-save-settings-dialog', async (event, { defaultPath }) => {
    const result = await dialog.showSaveDialog({
        title: '設定をエクスポート',
        defaultPath: defaultPath || 'xPlayerSettings.json',
        filters: [
            { name: 'JSON ファイル', extensions: ['json'] },
            { name: 'すべてのファイル', extensions: ['*'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
    });
    return result;
});

// 設定インポート開くダイアログ
ipcMain.handle('show-open-settings-dialog', async () => {
    const result = await dialog.showOpenDialog({
        title: '設定をインポート',
        defaultPath: 'xPlayerSettings.json',
        filters: [
            { name: 'JSON ファイル', extensions: ['json'] },
            { name: 'すべてのファイル', extensions: ['*'] }
        ],
        properties: ['openFile']
    });
    return result;
});

ipcMain.handle('set-always-on-top', async (event, enabled) => {
    if (mainWindow) {
        mainWindow.setAlwaysOnTop(Boolean(enabled));
    }
    return { success: true };
});

// 背景壁紙選択（単ファイル選択）
ipcMain.handle('open-wallpaper-dialog', async () => {
    const result = await dialog.showOpenDialog({
        title: '背景壁紙を選択',
        properties: ['openFile'],           // 単ファイル選択
        filters: [
            { 
                name: '画像ファイル', 
                extensions: IMAGE_EXTENSIONS
            },
            { 
                name: 'すべてのファイル', 
                extensions: ['*'] 
            }
        ]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;   // キャンセル時は null を返す
    }

    const filePath = result.filePaths[0];
    return {
        name: path.basename(filePath),
        path: filePath
    };
});

// BGM選択（単ファイル選択）
ipcMain.handle('open-bgm-dialog', async () => {
    /* 複数ファイル選択(multiSelections)に対応 */
    const result = await dialog.showOpenDialog({
        title: 'BGMを選択',
        properties: ['openFile', 'multiSelections'], // 複数選択を許可
        filters: [
            { 
                name: '音声ファイル', 
                extensions: AUDIO_EXTENSIONS
            },
            { 
                name: 'すべてのファイル', 
                extensions: ['*'] 
            }
        ]
    });

    /* キャンセル時または未選択時は null を返す（クリア判定用） */
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    /* 選択された全ファイルの情報を配列で返す */
    return result.filePaths.map(filePath => ({
        name: path.basename(filePath),
        path: filePath
    }));
});

// コマンドライン引数取得
ipcMain.handle('get-command-line-args', () => {
    const rawArgs = process.argv.slice(app.isPackaged ? 1 : 2);
    
    // 特定のデバッグ引数やフラグを除外する
    const filteredArgs = rawArgs.filter(arg => 
        !arg.startsWith('--remote-debugging-port=') &&
        !arg.startsWith('--inspect=') &&
        !arg.startsWith('--inspect-brk=')
    );

    return filteredArgs.length > 0 ? filteredArgs : null;
});

// コマンドライン引数処理（レンダラー用）
ipcMain.handle('process-command-line-file', async (event, filePath) => {
    return await processCommandLineFile(filePath);
});

// FFmpeg 変換ハンドラ（ファイルパス返却）＋ 日本語音声優先 + 日本語字幕優先（なければ無視）
ipcMain.handle('convert-video', async (event, filePath, modeChange, preferredAudioIndex = 0) => {
    // 1. ffprobe でメタデータ取得
    let metadata;
    try {
        metadata = await new Promise((res, rej) => {
            ffmpeg.ffprobe(filePath, (err, data) => {
                if (err) rej(err);
                else res(data);
            });
        });
    } catch (probeErr) {
        mainWindow.webContents.send('convert-error', 'メタデータ取得失敗: ' + probeErr.message);
        throw probeErr;
    }

    // ストリーム存在確認（アタッチされた画像を除外した動画ストリームの存在で判定）
    const hasVideo = metadata.streams.some(s => s.codec_type === 'video' && !s.disposition?.attached_pic);
    const hasAudio = metadata.streams.some(s => s.codec_type === 'audio');

    // 2. 判定・分岐処理
    if (hasVideo) {
        // 動画変換へ
        return convertVideo(filePath, modeChange, preferredAudioIndex, metadata);
    } else if (hasAudio) {
        // 音声変換へ
        return convertAudio(filePath, metadata);
    } else {
        // 動画・音声ストリームがいずれも存在しない場合
        const errMessage = '変換不能な形式エラー';
        mainWindow.webContents.send('convert-error', errMessage);
        throw new Error(errMessage);
    }
});

// 動画変換ヘルパー関数
function convertVideo(filePath, modeChange, preferredAudioIndex, metadata) {
    return new Promise(async (resolve, reject) => {
        const fileName = path.basename(filePath);
        const baseName = path.parse(fileName).name;
        const ext = path.extname(filePath).toLowerCase();
        const outDir = path.dirname(filePath);
        const outName = `${baseName}.mp4`;
        const outPath = path.join(outDir, outName);

        const isMp4Input = ext === '.mp4';
        currentOutputPath = null;

        const audioStreams = metadata.streams.filter(s => s.codec_type === 'audio');
        const targetAudioIdx = Math.max(0, Math.min(preferredAudioIndex, audioStreams.length - 1));

        const videoStreamIndex = metadata.streams.findIndex(s => 
            s.codec_type === 'video' && !s.disposition?.attached_pic
        ) !== -1 ? metadata.streams.findIndex(s => 
            s.codec_type === 'video' && !s.disposition?.attached_pic
        ) : 0;

        const mapOptions = [
            '-map', `0:${videoStreamIndex}`,
            '-map', '-0:v:m:disposition:attached_pic',
        ];

        const dispositionOptions = [];

        if (audioStreams.length > 0) {
            for (let i = 0; i < audioStreams.length; i++) {
                mapOptions.push(`-map 0:a:${i}?`);
            }
            dispositionOptions.push(`-disposition:a:${targetAudioIdx}`, 'default');
            for (let i = 0; i < audioStreams.length; i++) {
                if (i !== targetAudioIdx) {
                    dispositionOptions.push(`-disposition:a:${i}`, '0');
                }
            }
        }

        mapOptions.push('-map 0:s?');

        const ff = ffmpeg(filePath)
            .outputOptions(mapOptions)
            .outputOptions(dispositionOptions);

        if (isMp4Input) {
            ff.outputOptions([
                '-c:v', 'copy',
                '-c:a', 'copy',
                '-c:s', 'copy',
                '-movflags', '+faststart'
            ]);
        } else {
            let videoBitrate = '1500k';
            const videoStream = metadata.streams[videoStreamIndex];
            if (videoStream?.bit_rate) {
                const br = parseInt(videoStream.bit_rate, 10);
                if (!isNaN(br) && br > 0) {
                    videoBitrate = `${Math.round(br / 1000)}k`;
                }
            }

            ff.outputOptions([
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-b:v', videoBitrate,
                '-c:a', 'copy',
                '-c:s', 'mov_text',
                '-movflags', '+faststart'
            ]);
        }

        // Tempフォルダ準備
        const tempBaseDir = path.join(os.tmpdir(), 'xPlayer');
        try {
            await fs.mkdir(tempBaseDir, { recursive: true });
        } catch (mkdirErr) {
            console.error('xPlayer tempフォルダ作成失敗:', mkdirErr);
            mainWindow.webContents.send('convert-error', '一時フォルダ作成失敗: ' + mkdirErr.message);
            return reject(mkdirErr);
        }
        const tempPath = path.join(tempBaseDir, `${baseName}_temp_${Date.now()}.mp4`);
        currentOutputPath = tempPath;

        mainWindow.webContents.send('convert-progress', { percent: 0, step: 1 });

        ff.on('progress', (progress) => {
            if (progress.percent !== undefined) {
                mainWindow.webContents.send('convert-progress', { percent: progress.percent, step: 1 });
            }
        })
        .on('end', async () => {
            currentFFmpeg = null;
            currentOutputPath = null;

            try {
                mainWindow.webContents.send('convert-progress', { percent: 100, step: 2 });
                await fs.copyFile(tempPath, outPath);
                await fs.unlink(tempPath);

                if (modeChange === 'convert') {
                    await extractSubtitlesOnly(outPath, baseName, outDir, metadata);
                }

                resolve(outPath);
            } catch (moveErr) {
                mainWindow.webContents.send('convert-error', '後処理エラー: ' + moveErr.message);
                reject(moveErr);
            }
        })
        .on('error', (err, stdout, stderr) => {
            if (err.message.includes('ffmpeg was killed')) {
                console.log('変換中断:', filePath);
                return;
            }
            console.error('FFmpegエラー:', stderr);
            mainWindow.webContents.send('convert-error', err.message + '\n' + stderr);
            currentFFmpeg = null;
            currentOutputPath = null;
            reject(err);
        })
        .save(tempPath);

        currentFFmpeg = ff;
    });
}

// 音声変換ヘルパー関数
// （MP3エンコーダ、192kbps、48kHz、2ch ステレオへ変換）
function convertAudio(filePath, metadata) {
    return new Promise(async (resolve, reject) => {
        const fileName = path.basename(filePath);
        const baseName = path.parse(fileName).name;
        const outDir = path.dirname(filePath);
        const outName = `${baseName}.mp3`;
        const outPath = path.join(outDir, outName);

        currentOutputPath = null;

        // Tempフォルダ準備
        const tempBaseDir = path.join(os.tmpdir(), 'xPlayer');
        try {
            await fs.mkdir(tempBaseDir, { recursive: true });
        } catch (mkdirErr) {
            console.error('xPlayer tempフォルダ作成失敗:', mkdirErr);
            mainWindow.webContents.send('convert-error', '一時フォルダ作成失敗: ' + mkdirErr.message);
            return reject(mkdirErr);
        }
        const tempPath = path.join(tempBaseDir, `${baseName}_temp_${Date.now()}.mp3`);
        currentOutputPath = tempPath;

        const ff = ffmpeg(filePath)
            .audioCodec('libmp3lame') // MP3エンコーダ
            .audioBitrate('192k')     // ビットレート 192kbps
            .audioFrequency(48000)    // サンプリングレート 48kHz
            .audioChannels(2);        // ステレオ (2ch)

        mainWindow.webContents.send('convert-progress', { percent: 0, step: 1 });

        ff.on('progress', (progress) => {
            if (progress.percent !== undefined) {
                mainWindow.webContents.send('convert-progress', { percent: progress.percent, step: 1 });
            }
        })
        .on('end', async () => {
            currentFFmpeg = null;
            currentOutputPath = null;

            try {
                mainWindow.webContents.send('convert-progress', { percent: 100, step: 2 });
                await fs.copyFile(tempPath, outPath);
                await fs.unlink(tempPath);

                resolve(outPath);
            } catch (moveErr) {
                mainWindow.webContents.send('convert-error', '後処理エラー: ' + moveErr.message);
                reject(moveErr);
            }
        })
        .on('error', (err, stdout, stderr) => {
            if (err.message.includes('ffmpeg was killed')) {
                console.log('変換中断:', filePath);
                return;
            }
            console.error('FFmpegエラー:', stderr);
            mainWindow.webContents.send('convert-error', err.message + '\n' + stderr);
            currentFFmpeg = null;
            currentOutputPath = null;
            reject(err);
        })
        .save(tempPath);

        currentFFmpeg = ff;
    });
}

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
                break;
            } catch (err) {
                if (err.code === 'EBUSY' || err.code === 'EPERM') {
                    await new Promise(r => setTimeout(r, interval));
                    elapsed += interval;
                    continue;
                } else if (err.code === 'ENOENT') {
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
            return { success: true };
        } catch (err) {
            console.error('ゴミ箱移動失敗:', err);
            return { success: false, error: err.message };
        }
    } else {
        // フォールバック：完全削除
        try {
            await fs.unlink(filePath);
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

// 動画サムネイル生成
ipcMain.handle('generate-video-thumbnail', async (event, { filePath, size = 180 }) => {
    if (!filePath) return null;

    const tempDir = thumbnailCacheDir || path.join(app.getPath('userData'), 'xPlayerCache', 'thumbnails');
    await fs.mkdir(tempDir, { recursive: true });
    
    const crypto = require('crypto');
    const safeName = crypto.createHash('sha1').update(filePath).digest('hex');
    const outputPath = path.join(tempDir, `${safeName}_${size}.png`);

    // サムネイル生成用の内部関数
    const captureFrame = (seekTime) => {
        let logCommandLine = '';
        return new Promise((resolve, reject) => {
            let stderr = '';
            let command = ffmpeg(filePath);

            // シーク時間が指定されている場合は追加（例: 00:00:30）
            if (seekTime) {
                command = command.inputOptions(['-ss', seekTime]);
            }

            command
                .outputOptions(['-frames:v', '1', '-vf', `scale=${Math.max(80, size)}:-1`, '-y'])
                .on('start', (commandLine) => {
                    logCommandLine = commandLine;
                })
                .on('stderr', (chunk) => {
                    stderr += chunk.toString();
                })
                .on('end', resolve)
                .on('error', (err) => {
                    const detailed = stderr ? `\n${stderr.trim()}` : '';
                    reject(new Error(`${err.message}${detailed}`));
                })
                .save(outputPath);
        });
    };

    try {
        // 1回目の試行: 30秒地点から取得
        try {
            await captureFrame('00:00:30');
        } catch (firstErr) {
            console.warn('[thumbnail] 30s seek failed, retrying from start (00:00:00):', filePath, firstErr.message);
            // 2回目の試行（リトライ）: 動画の先頭から取得
            await captureFrame('00:00:00');
        }

        const data = await fs.readFile(outputPath);
        await fs.unlink(outputPath).catch(() => {});
        return `data:image/png;base64,${data.toString('base64')}`;

    } catch (err) {
        console.warn('[thumbnail] ffmpeg retry failed:', filePath, err.message);
        // エラー時に一時ファイルが残っている場合は削除
        await fs.unlink(outputPath).catch(() => {});
        return null;
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

        if (SUPPORTED_MEDIA_EXTENSIONS_REGEX.test(fullPath)) {
            // 単体音声・動画ファイル
            return {
                type: 'media',
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
                currentFFmpeg = null;
                currentOutputPath = null;
                mainWindow.webContents.send('cut-progress', { stage: 'done', type: 'single', percent: 100, outPath });
                resolve(outPath);
            })
            .on('error', (err, stdout, stderr) => {
                const msg = err && err.message ? err.message : String(err);
                // ユーザーによる kill はエラー扱いにしない
                if (msg.includes('ffmpeg was killed') || msg.includes('was killed with signal')) {
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

// カット編集のメインハンドラ
ipcMain.handle('cut-video-multiple', async (event, { inputPath, ranges, outputPath, frameRate, mode: requestedMode }) => {
    return new Promise((resolve, reject) => {
        try {
            const MIN_KEEP_DURATION = 0.2;
            const DURATION_EPSILON = 0.05;
            const validModes = ['copy', 'reencode'];
            const useCopyMode = validModes.includes(requestedMode) ? requestedMode === 'copy' : true;

            ffmpeg.ffprobe(inputPath, async (err, metadata) => {
                if (err) {
                    console.error('ffprobe エラー:', err);
                    return reject(new Error('メタデータ取得失敗'));
                }

                const duration = metadata.format.duration || 0;
                // 映像ストリームが存在するか確認
                const hasVideo = metadata.streams && metadata.streams.some(s => 
                    s.codec_type === 'video' && (!s.disposition || s.disposition.attached_pic !== 1)
                );
                
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
                    if (duration - cursor < DURATION_EPSILON) cursor = duration;
                }
                if (cursor < duration) {
                    keeps.push({ start: cursor, end: duration });
                }

                const filteredKeeps = keeps.filter(k => (k.end - k.start) >= MIN_KEEP_DURATION);
                if (filteredKeeps.length === 0) {
                    return reject(new Error('有効な保持範囲がありません'));
                }
                keeps = filteredKeeps;

                const outPath = outputPath || path.join(
                    path.dirname(inputPath),
                    `${path.parse(inputPath).name}_trimmed${path.extname(inputPath)}`
                );

                mainWindow.webContents.send('cut-progress', { 
                    stage: 'start', 
                    type: 'multiple', 
                    percent: 0, 
                    keeps: keeps.length, 
                    duration: keeps.reduce((sum, k) => sum + (k.end - k.start), 0)
                });

                // 動画と音声でヘルパー関数を分離して実行
                try {
                    let result;
                    if (hasVideo) {
                        result = await cutVideoHelper(inputPath, keeps, outPath, useCopyMode);
                    } else {
                        result = await cutAudioHelper(inputPath, keeps, outPath, useCopyMode);
                    }
                    resolve({ ...result, isAudio: !hasVideo });
                } catch (procErr) {
                    reject(procErr);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
});

// 動画カット編集ヘルパー関数
async function cutVideoHelper(inputPath, validKeeps, outPath, useCopyMode) {
    if (!useCopyMode) {
        // ── 再エンコードモード（動画） ──
        const filters = [];
        const concatInputs = [];

        validKeeps.forEach((k, i) => {
            filters.push(`[0:v]trim=start=${k.start}:end=${k.end},setpts=PTS-STARTPTS[v${i}]`);
            filters.push(`[0:a]atrim=start=${k.start}:end=${k.end},asetpts=PTS-STARTPTS[a${i}]`);
            concatInputs.push(`[v${i}][a${i}]`);
        });

        filters.push(`${concatInputs.join('')}concat=n=${validKeeps.length}:v=1:a=1[v][a]`);

        return new Promise((resolve, reject) => {
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
                .on('error', (err) => {
                    currentFFmpeg = null;
                    currentOutputPath = null;
                    const isKilled = err.message?.includes('killed') || err.message?.includes('SIGKILL') || err.message?.includes('ffmpeg was killed');
                    if (isKilled) {
                        mainWindow.webContents.send('cut-progress', { stage: 'cancelled', message: 'ユーザーにより中断されました' });
                        resolve({ cancelled: true });
                        return;
                    }
                    console.error('FFmpeg動画再エンコードエラー:', err);
                    mainWindow.webContents.send('cut-progress', { stage: 'error', message: err.message || '再エンコード処理に失敗しました' });
                    reject(err);
                })
                .save(outPath);
        });
    } else {
        // ── コピーモード（動画） ──
        return await cutCopyModeGeneric(inputPath, validKeeps, outPath, '.mp4');
    }
}

// 音声カット編集ヘルパー関数
async function cutAudioHelper(inputPath, validKeeps, outPath, useCopyMode) {
    if (!useCopyMode) {
        // ── 再エンコードモード（音声: MP3 / 192kbps / 48kHz / Stereo） ──
        const filters = [];
        const concatInputs = [];

        validKeeps.forEach((k, i) => {
            filters.push(`[0:a]atrim=start=${k.start}:end=${k.end},asetpts=PTS-STARTPTS[a${i}]`);
            concatInputs.push(`[a${i}]`);
        });

        filters.push(`${concatInputs.join('')}concat=n=${validKeeps.length}:v=0:a=1[a]`);

        return new Promise((resolve, reject) => {
            const cmd = ffmpeg(inputPath)
                .complexFilter(filters)
                .outputOptions([
                    '-map', '[a]',
                    '-c:a', 'libmp3lame',
                    '-b:a', '192k',
                    '-ar', '48000',
                    '-ac', '2'
                ])
                .on('start', () => {
                    currentFFmpeg = cmd;
                    currentOutputPath = outPath;
                })
                .on('progress', (progress) => {
                    mainWindow.webContents.send('cut-progress', {
                        stage: 'reencode',
                        percent: progress.percent || 0,
                        timemark: progress.timemark
                    });
                })
                .on('end', () => {
                    currentFFmpeg = null;
                    currentOutputPath = null;
                    mainWindow.webContents.send('cut-progress', { stage: 'done', percent: 100, outPath });
                    resolve({ outputPath: outPath, mode: 'reencode' });
                })
                .on('error', (err) => {
                    currentFFmpeg = null;
                    currentOutputPath = null;
                    const isKilled = err.message?.includes('killed') || err.message?.includes('SIGKILL') || err.message?.includes('ffmpeg was killed');
                    if (isKilled) {
                        mainWindow.webContents.send('cut-progress', { stage: 'cancelled', message: 'ユーザーにより中断されました' });
                        resolve({ cancelled: true });
                        return;
                    }
                    console.error('FFmpeg音声再エンコードエラー:', err);
                    mainWindow.webContents.send('cut-progress', { stage: 'error', message: err.message || '音声エンコード処理に失敗しました' });
                    reject(err);
                })
                .save(outPath);
        });
    } else {
        // ── コピーモード（音声） ──
        const ext = path.extname(outPath) || '.mp3';
        return await cutCopyModeGeneric(inputPath, validKeeps, outPath, ext);
    }
}

// ストリームコピー用共通処理
async function cutCopyModeGeneric(inputPath, validKeeps, outPath, tmpExt) {
    mainWindow.webContents.send('cut-progress', { stage: 'copy_start', percent: 0 });

    const tmpFiles = [];
    const concatList = [];

    try {
        for (let i = 0; i < validKeeps.length; i++) {
            const k = validKeeps[i];
            const tmpPath = path.join(os.tmpdir(), `cut_tmp_${Date.now()}_${i}${tmpExt}`);

            await new Promise((res, rej) => {
                ffmpeg(inputPath)
                    .seekInput(k.start)
                    .duration(k.end - k.start)
                    .outputOptions([
                        '-c', 'copy',
                        '-avoid_negative_ts', 'make_zero'
                    ])
                    .output(tmpPath)
                    .on('end', res)
                    .on('error', (err) => rej(err))
                    .run();
            });

            tmpFiles.push(tmpPath);
            concatList.push(`file '${tmpPath.replace(/'/g, "\\'")}'`);

            const percent = Math.round(((i + 1) / validKeeps.length) * 100);
            mainWindow.webContents.send('cut-progress', { stage: 'copy', percent });
        }

        const concatTxtPath = path.join(os.tmpdir(), `concat_${Date.now()}.txt`);
        await fs.writeFile(concatTxtPath, concatList.join('\n'), 'utf8');

        await new Promise((res, rej) => {
            ffmpeg()
                .input(concatTxtPath)
                .inputOptions('-f', 'concat')
                .inputOptions('-safe', '0')
                .outputOptions(['-c', 'copy'])
                .output(outPath)
                .on('end', () => res())
                .on('error', (err) => {
                    if (err.message && (
                        err.message.includes('killed') ||
                        err.message.includes('SIGKILL') ||
                        err.message.includes('ffmpeg was killed')
                    )) {
                        res();
                        return;
                    }
                    console.error('最終結合エラー:', err);
                    rej(err);
                })
                .run();
        });

        // 一時ファイルの削除
        await Promise.all(tmpFiles.map(file => fs.unlink(file).catch(() => {})));
        await fs.unlink(concatTxtPath).catch(() => {});

        mainWindow.webContents.send('cut-progress', { stage: 'done', percent: 100, outPath });
        return { outputPath: outPath, mode: 'copy' };

    } catch (copyErr) {
        await Promise.all(tmpFiles.map(file => fs.unlink(file).catch(() => {})));
        console.error('コピーモードエラー:', copyErr);
        throw new Error('高速モードでの処理に失敗しました: ' + copyErr.message);
    }
}

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
                break;
            } catch (err) {
                if (err.code === 'EBUSY' || err.code === 'EPERM') {
                    await new Promise(r => setTimeout(r, interval));
                    elapsed += interval;
                    continue;
                } else if (err.code === 'ENOENT') {
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
        let browserPath;
        let isEdge = false;

        if (process.platform === 'win32') {
            // 1. Chromeのパス候補（優先度: 高）
            const chromePaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
            ];

            // 2. Edgeのパス候補（優先度: 低）
            const edgePaths = [
                'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
                'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
                process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe',
            ];

            // Chromeの存在チェック
            for (const path of chromePaths) {
                try {
                    require('fs').accessSync(path);
                    browserPath = path;
                    break;
                } catch {}
            }

            // Chromeが見つからなければEdgeをチェック
            if (!browserPath) {
                for (const path of edgePaths) {
                    try {
                        require('fs').accessSync(path);
                        browserPath = path;
                        isEdge = true;
                        break;
                    } catch {}
                }
            }

            if (!browserPath) {
                throw new Error('ChromeおよびEdgeが見つかりません。ブラウザのインストールを確認してください。');
            }

        } else if (process.platform === 'darwin') {
            browserPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        } else {
            // Linuxなど
            browserPath = 'google-chrome';
        }

        // コマンド構築（Chrome / Edge 両方で --app オプションが利用可能）
        const profileOpt = isEdge ? '--profile-directory="Default"' : '--profile-directory=Default';
        const command = `"${browserPath}" ${profileOpt} --app="${videoUrl}" --new-window`;

        // 実行（非同期でfire-and-forget）
        exec(command, (error) => {
            if (error) {
                console.error('ブラウザ起動エラー:', error);
            }
        });

        return { success: true, message: `起動コマンド: ${command}` };

    } catch (err) {
        console.error(err);
        return { success: false, message: err.message };
    }
});

// 音声トラック情報・字幕トラック情報取得
ipcMain.handle('get-video-tracks', async (event, filePath) => {
    try {
        // ffprobe を Promise化
        const metadata = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });

        const streams = metadata.streams || [];
        const format = metadata.format || {};

        const audioTracks = [];
        const subtitleTracks = [];

        // 【追加】安全に抽出できるテキスト字幕コーデックのホワイトリスト
        const textSubtitleCodecs = ['webvtt', 'srt', 'subrip', 'mov_text', 'tx3g', 'ass', 'ssa'];

        streams.forEach((s, index) => {
            // 元のストリームの index（絶対インデックス）を保持したオブジェクトを作成
            const streamWithIndex = { ...s, index };

            if (s.codec_type === 'audio') {
                audioTracks.push(streamWithIndex);
            } 
            // 【修正】字幕判定ロジック
            // codec_type が 'subtitle' または 'text' であり、かつ画像形式（dvd_subtitle等）ではないもの
            else if (
                (s.codec_type === 'subtitle' || s.codec_type === 'text') &&
                textSubtitleCodecs.includes(s.codec_name?.toLowerCase())
            ) {
                // フロントエンド側で判定に使えるよう、一応フラグも持たせる
                streamWithIndex.isTextBased = true;
                subtitleTracks.push(streamWithIndex);
            }
        });

        const outDir = path.dirname(filePath);
        const baseName = path.parse(path.basename(filePath)).name;
        
        // 【注意】ここでループする subtitleTracks はすでにテキスト字幕のみに絞り込まれています
        for (const [idx, sub] of subtitleTracks.entries()) {
            const lang = sub.tags?.language || sub.tags?.lang || 'und';
            // ファイル名は「テキスト字幕の中での連番(idx)」を使用して作成
            const vttPath = path.join(outDir, `${baseName}_track${idx}_${lang}.vtt`);

            let exists = false;
            try {
                await fs.stat(vttPath);
                exists = true;
            } catch {
                // 存在しない → false のまま
            }

            sub.vttPath = vttPath;
            sub.exists = exists;
        }

        // format.tags の補助チェック（省略可）
        if (format.tags?.subtitle) {
            console.log('format.tags に字幕情報発見:', format.tags.subtitle);
        }

        return {
            success: true,
            audio: audioTracks,
            subtitle: subtitleTracks, // イメージ字幕が完全に排除された配列
            totalStreams: streams.length,
            debug: {
                hasTx3g: streams.some(s => s.codec_name === 'tx3g'),
                ffprobeVersion: metadata.format?.tags?.encoder || 'unknown'
            }
        };

    } catch (err) {
        console.error('ffprobe または処理中にエラー:', err);
        return {
            success: false,
            error: err.message || '処理に失敗しました'
        };
    }
});

// 保存ダイアログ（音声結合用 - MP3固定）
ipcMain.handle('show-save-audio-join-dialog', async (event, { fileName }) => {
    // 拡張子が .mp3 でない場合は .mp3 に変更
    let defaultName = fileName || 'joined_audio.mp3';
    if (!defaultName.toLowerCase().endsWith('.mp3')) {
        defaultName = defaultName.replace(/\.[^/.]+$/, "") + '.mp3';
    }

    const result = await dialog.showSaveDialog(mainWindow, {
        title: '結合した音声を保存',
        defaultPath: defaultName,
        filters: [
            { name: 'MP3 音声ファイル', extensions: ['mp3'] },
            { name: 'すべてのファイル', extensions: ['*'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
    });

    return result; // { canceled: boolean, filePath?: string }
});

// 音声結合処理（全音声をMP3に統一変換 → concatで結合）
ipcMain.handle('join-audios', async (event, { inputPaths, outputPath }) => {
    if (!inputPaths || !Array.isArray(inputPaths) || inputPaths.length < 2) {
        throw new Error('結合する音声が2つ以上必要です');
    }
    if (!outputPath) {
        throw new Error('出力パスが指定されていません');
    }

    currentJoinTempFiles = [];      // リセット
    currentJoinConcatTxt = null;
    isJoinCancelled = false;          // キャンセル状態をリセット

    return new Promise(async (resolve, reject) => {
        try {
            mainWindow.webContents.send('join-progress', { 
                stage: 'join-prepare', 
                percent: 0,
                totalVideos: inputPaths.length,
                message: '全音声を同一フォーマット(MP3)に変換中…'
            });

            // MP3フォーマット統一用の共通オプション
            const commonAudioOptions = [
                '-vn',                  // 映像ストリームを除外
                '-c:a', 'libmp3lame',   // MP3エンコーダ
                '-b:a', '192k',         // ビットレート 192kbps
                '-ar', '48000',         // サンプリングレート 48kHz
                '-ac', '2',             // ステレオ(2ch)
                '-fflags', '+genpts'
            ];

            // 1. 変換フェーズ (全音声を標準的な一時MP3ファイルに変換)
            for (let i = 0; i < inputPaths.length; i++) {
                if (isJoinCancelled) break;

                const input = inputPaths[i];
                const tempOut = path.join(os.tmpdir(), `join_audio_temp_${Date.now()}_${i}.mp3`);
                currentJoinTempFiles.push(tempOut);

                await new Promise((res, rej) => {
                    const ff = ffmpeg(input)
                        .outputOptions(commonAudioOptions)
                        .on('start', () => {
                            if (isJoinCancelled) {
                                ff.kill('SIGKILL');
                                res();
                                return;
                            }
                            currentFFmpeg = ff;
                            currentOutputPath = outputPath;
                        })
                        .on('progress', (progress) => {
                            if (isJoinCancelled) return;
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
                                res();
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

            // キャンセルチェック
            if (isJoinCancelled) {
                cleanupJoinTempFiles();
                currentFFmpeg = null;
                currentOutputPath = null;
                
                mainWindow.webContents.send('join-progress', { 
                    stage: 'cancelled', 
                    message: 'ユーザーにより音声結合が中断されました' 
                });
                
                resolve({ cancelled: true, message: 'ユーザーによりキャンセルされました' });
                return;
            }

            // 2. 結合フェーズ (concat demuxer による高速・無劣化結合)
            const concatList = currentJoinTempFiles.map(p => `file '${p.replace(/'/g, "\\'")}'`);
            currentJoinConcatTxt = path.join(os.tmpdir(), `join_audio_concat_${Date.now()}.txt`);

            await fs.writeFile(currentJoinConcatTxt, concatList.join('\n'), 'utf8');

            const ff = ffmpeg()
                .input(currentJoinConcatTxt)
                .inputOptions('-f', 'concat', '-safe', '0')
                .outputOptions([
                    '-c', 'copy' // 一時MP3ファイルを無劣化ストリームコピー結合
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
                        currentFFmpeg = null;
                        currentOutputPath = null;
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
        } finally {
            isJoinCancelled = false;
        }
    });
});
