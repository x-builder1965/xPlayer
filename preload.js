// -- preload.js -------------------------------------------------------
const copyright = 'Copyright © 2025- @x-builder, Japan';
const email = 'x-builder@gmail.com';
const appName = 'xPlayer -メディアプレイヤー- Ver5.39.0';
// ---------------------------------------------------------------------

// 🔲共通変数設定🔲
// モジュールインポート
const { contextBridge, ipcRenderer, webUtils } = require('electron');
const { promises: fs } = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');
// 【追加】audioMotion-analyzer の読み込み
const AudioMotionModule = require('audiomotion-analyzer');
const AudioMotionAnalyzer = AudioMotionModule.default || AudioMotionModule;

// 🔲初期処理🔲
// 🔧 起動時対応: キャッシュディレクトリを事前に作成し、
// 一部ライブラリが出す "Unable to create cache" ワーニングを抑制します。
// - ユーザーのホームに .cache と AppData\Local\xPlayerCache を作ります（存在しなくても安全）。
// - console.warn をラップして該当メッセージを無視します（副作用を最小化するため限定的に）。
(async () => {
    try {
        const home = os.homedir();
        const possibleCacheDirs = [
            path.join(home, '.cache'),
            path.join(home, 'AppData', 'Local', 'xPlayerCache')
        ];
        for (const d of possibleCacheDirs) {
            try {
                await fs.mkdir(d, { recursive: true });
            } catch (err) {
                // 作成失敗は重大ではないので無視（権限などの問題があれば警告は抑制）
            }
        }
    } catch (e) {
        // ここでのエラーは無視
    }

    // 特定ワーニングの抑制（内容が変わらない限りのみ抑制）
    try {
        const origWarn = console.warn.bind(console);
        console.warn = (...args) => {
            try {
                if (args && args.length > 0 && typeof args[0] === 'string' && args[0].includes('Unable to create cache')) {
                    return; // 抑制
                }
            } catch (e) {
                // エラーが起きたら通常の warn を呼ぶ
            }
            origWarn(...args);
        };
    } catch (e) {
        // 抑制処理に失敗してもアプリは継続
    }
})();

let audioMotionInstance = null; // 実体を preload 内部で管理
contextBridge.exposeInMainWorld('AudioMotionAPI', {
    // 初期化またはオプションの更新を一括で行う関数
    initOrUpdate: (containerElement, audioSource, options) => {
        if (audioMotionInstance) {
            // 既存インスタンスが存在する場合は表示をオンにし、設定を更新
            audioMotionInstance.isOn = true;
            if (audioMotionInstance.canvas) {
                audioMotionInstance.canvas.style.display = 'block';
            }
            // 内部実体の setOptions を直接呼び出す
            audioMotionInstance.setOptions(options);
        } else {
            // 初回のみインスタンス生成
            audioMotionInstance = new AudioMotionAnalyzer(containerElement, {
                source: audioSource,
                bgAlpha: 0,
                showBgColor: false,
                showScaleX: false,
                showScaleY: false,
                ...options
            });
        }
    },

    // 「（なし）」が選択された場合の非表示処理
    disable: () => {
        if (audioMotionInstance) {
            audioMotionInstance.isOn = false;
            if (audioMotionInstance.canvas) {
                audioMotionInstance.canvas.style.display = 'none';
            }
        }
    }
});

// 🔲基本API🔲
contextBridge.exposeInMainWorld('electronAPI', {
    ipcRenderer: {
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
        on: (channel, listener) => ipcRenderer.on(channel, listener),
        send: (channel, ...args) => ipcRenderer.send(channel, ...args)
    },
    fs,
    os: { homedir: os.homedir },
    path,
    openVideoInBrowser: (videoUrl) => ipcRenderer.invoke('open-video-in-browser', videoUrl),
    getFilePath: (file) => {
        try {
            return webUtils.getPathForFile(file);
        } catch (err) {
            console.error('getPathForFile error:', err);
            return null;
        }
    },
    classifyPath: (fullPath) => ipcRenderer.invoke('classify-path', fullPath),
    captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
    generateVideoThumbnail: (filePath, size) => ipcRenderer.invoke('generate-video-thumbnail', { filePath, size }),
    openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
    getFolderVideoFiles: (folderPath) => ipcRenderer.invoke('get-folder-video-files', folderPath),
    openVideoDialog: () => ipcRenderer.invoke('open-video-dialog'),
	getFileVideoFiles: (filePaths) => ipcRenderer.invoke('get-file-video-files', filePaths),
    savePlaylistDialog: () => ipcRenderer.invoke('save-playlist-dialog'),
    showSaveCutDialog: (options) => ipcRenderer.invoke('show-save-cut-dialog', options),
    showSaveJoinDialog: (options) => ipcRenderer.invoke('show-save-join-dialog', options),
    showSaveSettingsDialog: (defaultPath) => ipcRenderer.invoke('show-save-settings-dialog', { defaultPath }),
    showOpenSettingsDialog: () => ipcRenderer.invoke('show-open-settings-dialog'),
    setAlwaysOnTop: (enabled) => ipcRenderer.invoke('set-always-on-top', enabled),
    getCommandLineArgs: () => ipcRenderer.invoke('get-command-line-args'),
    convertVideo: (filePath, modeChange, preferredAudioIndex) => ipcRenderer.invoke('convert-video', filePath, modeChange, preferredAudioIndex),
    cancelConversion: () => ipcRenderer.invoke('cancel-conversion'),
    cancelCut: () => ipcRenderer.invoke('cancel-cut'),
    cancelJoin: () => ipcRenderer.invoke('cancel-join'),
    deleteTempFile: (filePath) => ipcRenderer.invoke('delete-temp-file', filePath),
    savePlaylistFile: (data) => ipcRenderer.invoke('save-playlist-file', data),
    joinVideos: (data) => ipcRenderer.invoke('join-videos', data),
    cutVideoMultiple: (data) => ipcRenderer.invoke('cut-video-multiple', data),
    getVideoTracks: (filePath) => ipcRenderer.invoke('get-video-tracks', filePath),
    openWallpaperDialog: () => ipcRenderer.invoke('open-wallpaper-dialog'),
    openBgmDialog: () => ipcRenderer.invoke('open-bgm-dialog'),
    checkIsSecondaryInstance: () => ipcRenderer.invoke('check-secondary-instance'),
    getPid: () => process.pid
});
