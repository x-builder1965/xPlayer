// -- preload.js -------------------------------------------------------
// copyright = 'Copyright © 2025- @x-builder, Japan'
// email     = 'x-builder@gmail.com'
// appName   = 'xPlayer -メディアプレイヤー-'
// version   = 'Ver6.57.0'
// ---------------------------------------------------------------------
// 🔲共通変数設定🔲
// モジュールインポート
const { contextBridge, ipcRenderer, webUtils } = require('electron');
const { promises: fs } = require('fs');
const os = require('os');
const path = require('path');
const AudioMotionModule = require('audiomotion-analyzer');
const AudioMotionAnalyzer = AudioMotionModule.default || AudioMotionModule;

// 🔲AudioMotionAPI🔲
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

// 🔲electronAPI🔲
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
    getPid: () => process.pid,
    showSaveAudioJoinDialog: (options) => ipcRenderer.invoke('show-save-audio-join-dialog', options),
    joinAudios: (data) => ipcRenderer.invoke('join-audios', data),
    initEngine: (address) => ipcRenderer.invoke('init-engine', address),
    connectEngine: (address) => ipcRenderer.invoke('connect-engine', address),
    disconnectEngine: () => ipcRenderer.invoke('disconnect-engine'),
    getEngineSpeakers: (address) => ipcRenderer.invoke('get-engine-speakers', address),
    installEngineSpeakerModel: (address) => ipcRenderer.invoke('install-engine-speaker-model', address),
    uninstallEngineSpeakerModel: (address, speakerUuid) => ipcRenderer.invoke('uninstall-engine-speaker-model', address, speakerUuid),
    synthesizeEngineLine: (options) => ipcRenderer.invoke('synthesize-engine-line', options)
});
