// ---------------------------------------------------------------------
const copyright = 'Copyright © 2025 @x-builder, Japan';
const email = 'x-builder@gmail.com';
const appName = 'xPlayer -動画プレイヤー- Ver3.43';
// ---------------------------------------------------------------------
// [変更履歴]
// 2025-11-10 Ver3.00 xPlayerのコードファイルの構成見直し。
// 2025-11-10 Ver3.01 プレイリスト操作ショートカットキー追加。
// 2025-11-10 Ver3.02 起動再開時、一時停止しない問題の対応。
// 2025-11-11 Ver3.03 動画エラー処理を isHTML5_SUPPORTED で共通化
// 2025-11-14 Ver3.04 updateIconOverlay()の表示／非表示判定、nextVideoBtn.Click()最終判定の見直し。
// 2025-11-14 Ver3.05 変換モードの一時ファイル削除（ごみ箱）対応。
// 2025-11-20 Ver3.06 videoPlayer.src、videoPreviwe.srcのクリア方法見直し。
// 2025-11-24 Ver3.07 preload.js実装対応。
// 2025-11-24 Ver3.08 ドラッグ＆ドロップ再生機能追加。
// 2025-11-25 Ver3.09 アプリ名、コピーライト表記変更。
// 2025-11-26 Ver3.10 プレイリスト編集の追加（➕）を最後に追加へ変更。
// 2025-11-30 Ver3.11 プレイリスト保存（💾）のエラー対応。
// 2025-12-02 Ver3.12 プレイリストの最終動画の終了処理見直し。
// 2025-12-03 Ver3.13 再生終了時の一時ファイル削除処理見直し。
// 2025-12-03 Ver3.14 引数再生処理見直し。
// 2025-12-03 Ver3.15 動画ソース設定、一時ファイル削除見直し。
// 2025-12-04 Ver3.16 動画変換中にウインドウを閉じた時、一時ファイルを削除。
// 2025-12-05 Ver3.17 Bluetooth メディアキー対応（0xB7,0xCD,0xE2,0xE9,0xEA,0x192,0x193）
// 2025-12-18 Ver3.18 urlInputの貼り付け不良対応。
// 2025-12-22 Ver3.19 再生速度変更機能追加。
// 2025-12-22 Ver3.20 起動時に発生するワーニング対応。
// 2026-01-22 Ver3.21 サイズ変更コントロール廃止。
// 2026-01-23 Ver3.22 YouTuneの埋め込み再生廃止。
// 2026-01-28 Ver3.23 変換モードの実行時の進捗状況をシークバーに表示。
// 2026-02-15 Ver3.24 カット編集機能追加。
// 2026-02-15 Ver3.25 カット編集機能の改善。
// 2026-02-25 Ver3.26 ズーム機能追加（-90%～+90%）。
// 2026-02-25 Ver3.27 ズーム機能をドロップダウンから縦型スライダー(-100%～+100%)に変更。
// 2026-02-25 Ver3.28 ズームモード中のショートカットキー追加（Ctrl+↑/↓/0）。
// 2026-02-25 Ver3.29 ズームモード中の画像移動機能追加。
// 2026-02-26 Ver3.30 ズームリセットボタン追加。
// 2026-02-26 Ver3.31 ズームパネルをサイズ調整に対応。
// 2026-02-26 Ver3.32 ズームパネルにズーム終了ボタン追加。
// 2026-02-27 Ver3.33 ズームモード中の←、→の移動量を詳細化。
// 2026-02-27 Ver3.34 スナップショット機能追加準備と微調整
// 2026-02-27 Ver3.35 再生速度の保存と復元の追加
// 2026-03-01 Ver3.36 カット編集の全クリア機能追加。
// 2026-03-02 Ver3.37 ネット動画再生操作変更。
// 2026-03-03 Ver3.38 スナップショット機能追加。
// 2026-03-03 Ver3.39 ズームパネルの透過率調整。
// 2026-03-03 Ver3.40 スナップショット起動時パネル非表示。
// 2026-03-03 Ver3.41 Url入力にクリアボタン（🆑）追加。
// 2026-03-04 Ver3.42 クリップボード読み込み関連処理の見直し修正。
// 2026-03-05 Ver3.43 カット編集の実装見直し修正。
// 2026-03-05 Ver3.44 パンモードで画像移動機能追加。（未実装）
//　・パン開始（🔳）／パン終了（❌）
//　・fitModeがcover時、パン中にする。cover以外は何もしない
//　・パン中は、ワイプに画面と元動画の位置関係を画面左上に表示。
//　・パン中は、マウスドラックで元動画の見切れ部分が表示できるように位置を移動。
// ---------------------------------------------------------------------

// 🔲共通変数設定🔲
// Electronモジュールインポート
const { ipcRenderer, fs, os, path, exec, getFilePath, classifyPath } = window.electronAPI;

// 表示設定
const overlayTimeout = 3000;
const seekSensitivity = 0.3;
const volumeStep = 0.005;
const playbackRates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const appNameAndCopyrightValue = `${appName}\n　${copyright}`;
const HTML5_SUPPORTED = ['.mp4', '.webm', '.ogg', '.mov', '.m4v', '.mkv'];  // HTML5ネイティブ対応拡張子（ブラウザが直接再生可能）
const HTML5_SUPPORTED_CONVERT = ['.mp4'];  // HTML5ネイティブ対応拡張子（ブラウザが直接再生可能）
const homeDir = os.homedir();
const localAppData = `${homeDir}\\AppData\\Local`;
const chromePaths = [
    `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
    `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`,
    `C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe`
];

// DOM要素取得
const videoPlayer = document.getElementById('videoPlayer');
const videoPreview = document.getElementById('videoPreview');
const mainContainer = document.querySelector('.main-container');
const videoContainer = document.querySelector('.video-container');
const dropzone = document.querySelector('.video-container');
const controls = document.querySelector('.controls');
const folderInput = document.getElementById('folderInput');
const videoInput = document.getElementById('videoInput');
const urlInputBtn = document.getElementById('urlInputBtn');
const urlInput = document.getElementById('urlInput');
const urlClearBtn = document.getElementById('urlClearBtn');
const urlConfirmBtn = document.getElementById('urlConfirmBtn');
const urlControls = document.querySelector('.url-controls');
const prevVideoBtn = document.getElementById('prevVideoBtn');
const rewindBtn = document.getElementById('rewindBtn');
const playPauseBtn = document.getElementById('playPauseBtn');
const playStopBtn = document.getElementById('playStopBtn');
const fastForwardBtn = document.getElementById('fastForwardBtn');
const nextVideoBtn = document.getElementById('nextVideoBtn');
const seekBar = document.getElementById('seekBar');
const volumeMuteBtn = document.getElementById('volumeMuteBtn');
const volumeBar = document.getElementById('volumeBar');
const speedSelect = document.getElementById('speedSelect');
const zoomBtn = document.getElementById('zoomBtn');
const zoomPanel = document.getElementById('zoomPanel');
const zoomBar = document.getElementById('zoomBar');
const zoomDisplay = document.getElementById('zoomDisplay');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const snapshotBtn = document.getElementById('snapshotBtn');
const zoomEndBtn = document.getElementById('zoomEndBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const fitModeBtn = document.getElementById('fitModeBtn');
const filename = document.querySelector('.filename');
const filenameControls = document.querySelector('.filename-controls');
const filenameDisplay = document.getElementById('filenameDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const volumeDisplay = document.getElementById('volumeDisplay');
const overlayDisplay = document.getElementById('overlayDisplay');
const iconOverlay = document.getElementById('iconOverlay');
const appNameAndCopyright = document.getElementById('appNameAndCopyright');
const helpOpenBtn = document.getElementById('helpOpenBtn');
const helpCloseBtn = document.getElementById('helpCloseBtn');
const helpContainer = document.querySelector('.help-container');
const helpTitle = helpContainer.querySelector('h1');
const tooltipElements = document.querySelectorAll('[data-tooltip]');
const filenameMenus = document.querySelector('.filename-menus');
const filenameMenu = document.getElementById('filenameMenu');
const upMovePlaylistBtn = document.getElementById('upMovePlaylistBtn');
const downMovePlaylistBtn = document.getElementById('downMovePlaylistBtn');
const addPlaylistBtn = document.getElementById('addPlaylistBtn');
const removePlaylistBtn = document.getElementById('removePlaylistBtn');
const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
const savePlaylistBtn = document.getElementById('savePlaylistBtn');
const modeChangeBtn = document.getElementById('modeChangeBtn');
const editControls = document.getElementById('editControls');
const editModeBtn = document.getElementById('editModeBtn');
const setInMarkBtn = document.getElementById('setInMarkBtn');
const setOutMarkBtn = document.getElementById('setOutMarkBtn');
const addCutRangeBtn = document.getElementById('addCutRangeBtn');
const saveVideoBtn = document.getElementById('saveVideoBtn');
const cutRangesList = document.getElementById('cutRangesList');
const clearEditBtn = document.getElementById('clearEditBtn');
const inMarkDisplay = document.getElementById('inMarkDisplay');
const outMarkDisplay = document.getElementById('outMarkDisplay');
const editSeekBar = document.getElementById('editSeekBar');
const cutCancelBtn = document.getElementById('cutCancelBtn');

// localStorage から復得
const savedVolume = localStorage.getItem('volume');
const savedPlaybackSpeed = localStorage.getItem('playbackSpeed');
const savedPlaylist = localStorage.getItem('playlist');
const savedCurrentVideoIndex = localStorage.getItem('currentVideoIndex');
const savedCurrentTime = localStorage.getItem('currentTime');
const savedFitMode = localStorage.getItem('fitMode');
const savedZoom = localStorage.getItem('zoom');
const savedTranslateX = localStorage.getItem('translateX');
const savedTranslateY = localStorage.getItem('translateY');

// 状態変数初期化
let playlist = [];
let currentVideoIndex = 0;
let timeout;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let isVolumeDragging = false;
let lastVolume = 0.2;
let isPanning = false; // ズーム時のパン（ドラッグ移動）フラグ
let panStartX = 0;
let panStartY = 0;
let translateX = 0; // ピクセル単位の平行移動量
let translateY = 0;
let isMouseOverControls = false;
let saveInterval = null;
let fitMode = 'contain';
let zoomValue = 0;  // ズーム値（-100 ～ +200）
let isZoomMode = false;  // ズームモード状態
let isHelpOpen = false;
let isSeekDragging = false;
let isMouseOverSeekBar = false;
let currentConvertPromise = null;
let isPlaying = false;
let isConverting = false;
let modeChange = 'video';
let baseConvertFile = null;
let tempConvertFile = null;
let isEditMode = false;
let editInMark = -1;  // インマーク（秒）
let editOutMark = -1; // アウトマーク（秒）
let cutRanges = []; // 配列 of { in: seconds, out: seconds }
let currentPlaybackRate = 1.0;   // ← 新規追加
let isUrlControlsVisible = false;
// 編集時のフレームレート（フレーム単位で移動するための基準）。変更したければ
// `localStorage.setItem('editFrameRate', '24')` のように保存してください。
const editFrameRate = localStorage.getItem('editFrameRate') ? parseFloat(localStorage.getItem('editFrameRate')) : 30;

// 🔲初期処理🔲
// 初期表示設定
videoPlayer.removeAttribute('src');
videoPreview.removeAttribute('src');
appNameAndCopyright.textContent = appNameAndCopyrightValue;
filenameMenus.style.display = 'none';

// Chromeパス取得
let application = chromePaths.find(p => {
    try { 
        fs.accessSync(p); 
        return true; 
    } 
    catch { 
        return false; 
    }
}) || chromePaths[0]; // 見つからなくても1つ目は試す

// コントロールサイズ適用
let controlSizeX = calculateControlSizeX();
let controlSizeY = calculateControlSizeY();
localStorage.setItem('controlSizeX', controlSizeX);
localStorage.setItem('controlSizeY', controlSizeY);
updateControlSize(controlSizeX, controlSizeY);

// 初期化時にアイコンを正しく設定
updateUrlButtonIcon();

// 初期状態：メニューは閉じておく
filenameMenus.style.display = 'none';
filenameMenu.textContent = '🚥';
filenameMenu.setAttribute('data-tooltip', 'プレイリスト編集メニューを開く (Shift+m)');

// ボリューム復元
if (savedVolume && !isNaN(savedVolume) && savedVolume >= 0 && savedVolume <= 1) {
    volumeBar.value = savedVolume;
    videoPlayer.volume = savedVolume;
    lastVolume = savedVolume;
    volumeMuteBtn.textContent = savedVolume == 0 ? '🔇' : '🔊';
    volumeMuteBtn.setAttribute('data-tooltip', savedVolume == 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
    updateVolumeDisplay();
} else {
    volumeBar.value = 0.2;
    videoPlayer.volume = 0.2;
    lastVolume = 0.2;
    volumeMuteBtn.textContent = '🔊';
    volumeMuteBtn.setAttribute('data-tooltip', 'ミュート（Ctrl+m）');
    updateVolumeDisplay();
}
// 再生速度復元
if (savedPlaybackSpeed && !isNaN(savedPlaybackSpeed) && parseFloat(savedPlaybackSpeed) > 0) {
    currentPlaybackRate = parseFloat(savedPlaybackSpeed);
    videoPlayer.playbackRate = currentPlaybackRate;
    if (speedSelect) speedSelect.value = currentPlaybackRate.toFixed(2);
} else {
    currentPlaybackRate = 1.0;
    videoPlayer.playbackRate = 1.0;
    if (speedSelect) speedSelect.value = "1.00";
}

// 描画モード復元
if (savedFitMode && ['contain', 'cover'].includes(savedFitMode)) {
    fitMode = savedFitMode;
    videoPlayer.style.objectFit = fitMode;
    fitModeBtn.textContent = fitMode === 'contain' ? '↔️' : '↕️';
    fitModeBtn.setAttribute('data-tooltip', fitMode === 'contain' ? '横に合わせる（Ctrl+x）' : '縦に合わせる（Ctrl+x）');
} else {
    fitMode = 'contain';
    videoPlayer.style.objectFit = fitMode;
    fitModeBtn.textContent = '↔️';
    fitModeBtn.setAttribute('data-tooltip', '横に合わせる（Ctrl+x）');
}

// ズーム値復元
if (savedZoom && !isNaN(savedZoom)) {
    zoomValue = parseInt(savedZoom);
    zoomBar.value = zoomValue.toString();
} else {
    zoomValue = 0;
    zoomBar.value = '0';
}

// 画像移動値復元
if (savedTranslateX && !isNaN(savedTranslateX) && savedTranslateY && !isNaN(savedTranslateY)) {
    translateX = parseInt(savedTranslateX);
    translateY = parseInt(savedTranslateY);
} else {
    translateX = 0;
    translateY = 0;
}
applyZoom(zoomValue);

// 起動時の引数有無判定
(async () => {
    const args = await ipcRenderer.invoke('get-command-line-args');
    if (args && args.length > 0) {
        // main.js が auto-play-files を送信するので、ここでは何もしない
        return;
    }

    // 引数なし → プレイリストと再生状態復元
    if (savedPlaylist && savedCurrentVideoIndex && savedCurrentTime) {
        try {
            const parsedPlaylist = JSON.parse(savedPlaylist);
            const parsedCurrentVideoIndex = parseInt(savedCurrentVideoIndex);
            if (Array.isArray(parsedPlaylist) && parsedPlaylist.length > 0 && parsedCurrentVideoIndex >= 0 && parsedCurrentVideoIndex < parsedPlaylist.length) {
                playlist = parsedPlaylist.map(path => ({
                    file: { path },
                    name: path
                }));
                currentVideoIndex = parsedCurrentVideoIndex;
                await playVideo(playlist[currentVideoIndex].file);
                // 常に一時停止
                // アプリ起動後1秒後に強制トリガー
                setTimeout(() => {
                    if (videoPlayer.src) {
                        videoPlayer.play().then(() => videoPlayer.pause()).catch(() => {});
                    }
                }, 250);
                playPauseBtn.textContent = '▶️';
                playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
                localStorage.setItem('currentTime', videoPlayer.currentTime);
                stopPeriodicSave();
                showControlsAndFilename();
                updateIconOverlay();
            } else {
                filenameDisplay.innerHTML = `<option value="">${appNameAndCopyrightValue}</option>`;
                updateIconOverlay();
            }
        } catch (e) {
            console.error('プレイリスト復元エラー:', e);
            filenameDisplay.innerHTML = `<option value="">${appNameAndCopyrightValue}</option>`;
            updateIconOverlay();
        }
    } else {
        filenameDisplay.innerHTML = `<option value="">${appNameAndCopyrightValue}</option>`;
        updateIconOverlay();
    }
})();

// Bluetooth／システムメディアキー対応（Windows11対応）
if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'playing';
    navigator.mediaSession.setActionHandler('play', () => { playPauseBtn.click(); });
    navigator.mediaSession.setActionHandler('pause', () => { playPauseBtn.click(); });
    navigator.mediaSession.setActionHandler('stop', () => { playStopBtn.click(); });
    navigator.mediaSession.setActionHandler('previoustrack', () => { prevVideoBtn.click(); });
    navigator.mediaSession.setActionHandler('nexttrack', () => { nextVideoBtn.click(); });

    // メタデータ更新（タスクバー／ロック画面に表示させるおまけ）
    const updateMetadata = () => {
        if (playlist.length === 0) return;
        const current = playlist[currentVideoIndex];
        navigator.mediaSession.metadata = new MediaMetadata({
            title: path.basename(current.name || current.file.path),
            artist: 'xPlayer'
        });
    };

    // 再生状態が変わるたびにメタデータ更新
    videoPlayer.addEventListener('play', updateMetadata);
    videoPlayer.addEventListener('pause', updateMetadata);
    videoPlayer.addEventListener('loadedmetadata', updateMetadata);
}

// 再生状態に応じてプレイバックステートを通知（Windowsがキー有効／無効を判断するのに必要）
const updatePlaybackState = () => {
    if (videoPlayer.paused) {
        navigator.mediaSession.playbackState = 'paused';
    } else {
        navigator.mediaSession.playbackState = 'playing';
    }
};
videoPlayer.addEventListener('play', () => {
    navigator.mediaSession.playbackState = 'playing';
});
videoPlayer.addEventListener('pause', () => {
    navigator.mediaSession.playbackState = 'paused';
});
videoPlayer.addEventListener('ended', () => {
    navigator.mediaSession.playbackState = 'paused';
});

// 再生／停止時に即座に反映
playPauseBtn.addEventListener('click', updatePlaybackState);
playStopBtn.addEventListener('click', updatePlaybackState);

// 🔲関数🔲
// 時間フォーマット変換
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ファイル名用時間フォーマット（HHMMSS形式）
function formatTimeForFilename(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}${secs.toString().padStart(2, '0')}`;
}

// クリップボード読み込み
async function pasteFromClipboard() {
    const TIMEOUT_MS = 3000;
    try {
        // タイムアウト付きクリップボード読み込み
        const text = await Promise.race([
            navigator.clipboard.readText(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('クリップボードの読み込みがタイムアウトしました')), TIMEOUT_MS)
            )
        ]);
        const trimmedText = text.trim();
        return {
            rawText: trimmedText
        };
    } catch (err) {
        console.warn('クリップボード貼り付け失敗:', err.message);
        return {
            rawText: '',
            error: err.message
        };
    }
}

// 画面幅からコントロールサイズ計算
function calculateControlSizeX() {
    const screenWidth = window.innerWidth;
    const sizePercent = (screenWidth / 2860) * 100;
    return sizePercent;
}

// 画面幅からコントロールサイズ計算
function calculateControlSizeY() {
    const screenHeight = window.innerHeight;
    const sizePercent = (screenHeight / 1600) * 100;
    return sizePercent;
}

// フォント・パディング動的更新
function updateControlSize(valueX, valueY) {
    const fontSize = 8 + (valueX / 100) * (24 - 8);
    const padding = 2 + (valueX / 100) * (10 - 2);
    const appNameAndCopyrightFontSize = 8 + (valueX / 100) * (17 - 8);
    const appNameAndCopyrightPadding = 2 + (valueX / 100) * (8 - 2);
    const speedSelectWidth = 40 + (valueX / 120) * (154 - 40);
    const zoomPanelHeight = 100 + (valueY / 100) * (500 - 100);
    const zoomPanelWidth = 30 + (valueX / 100) * (40 - 30);
    const controls = document.querySelectorAll('button, select#filenameDisplay, select#speedSelect, #timeDisplay, #volumeDisplay, #appNameAndCopyright, input#urlInput, #zoomPanel');
    controls.forEach(control => {
        if (control.id === 'appNameAndCopyright') {
            control.style.fontSize = `${appNameAndCopyrightFontSize}px`;
            control.style.padding = `${appNameAndCopyrightPadding}px ${appNameAndCopyrightPadding * 2}px`;
        } else {
            control.style.fontSize = `${fontSize}px`;
            control.style.padding = `${padding}px ${padding * 2}px`;
        }
        if (control.id === 'speedSelect') {
            control.style.width = `${speedSelectWidth}px`;
        }
        if (control.id === 'zoomPanel') {
            control.style.height = `${zoomPanelHeight}px`;
            control.style.width = `${zoomPanelWidth}px`;
        }
    });

    const overlayFontSize = 20 + (valueX / 100) * (160 - 20);
    overlayDisplay.style.fontSize = `${overlayFontSize}px`;
}

// ツールチップ表示
function showTooltip(element) {
    if (element.dataset.tooltip) {
        let tooltip = element.querySelector('.tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = element.dataset.tooltip;
            element.appendChild(tooltip);
        }
        tooltip.classList.add('visible');
    }
}

// ツールチップ非表示
function hideTooltip(element) {
    const tooltip = element.querySelector('.tooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
    }
}

// コントロール＋ファイル名表示（タイマー付き）
function showControlsAndFilename() {
    disabledControls(false);
    disabledfilename(false);
    videoContainer.style.cursor = 'auto';
    if (overlayDisplay.classList.contains('active')) {
        overlayDisplay.style.display = 'block';
        overlayDisplay.classList.add('active');
    }
    clearTimeout(timeout);
    if (!isMouseOverControls && !isUrlControlsVisible) {
        timeout = setTimeout(() => {
            if (!isMouseOverControls) {
                hideControlsAndFilename(); // ここで無効化
            }
        }, overlayTimeout);
    }
    updateIconOverlay();
}

// コントロール＋ファイル名非表示
function hideControlsAndFilename() {
    disabledControls(true);
    disabledfilename(true);
    overlayDisplay.classList.remove('active');
    videoContainer.style.cursor = 'none';
    clearTimeout(timeout);
    setTimeout(() => {
        overlayDisplay.style.display = 'none';
    }, 300);
    updateIconOverlay();
}

// コントロールパネル有効化／無効化
function disabledControls(disable) {
    if (disable) {
        controls.style.opacity = '0';
        controls.style.pointerEvents = 'none';
    } else {
        controls.style.opacity = '1';
        controls.style.pointerEvents = 'auto';
    }
    urlInputBtn.disable = disable;
    folderInput.disable = disable;
    videoInput.disable = disable;
    prevVideoBtn.disable = disable;
    rewindBtn.disable = disable;
    playStopBtn.disable = disable;
    playPauseBtn.disable = disable;
    fastForwardBtn.disable = disable;
    nextVideoBtn.disable = disable;
    zoomBtn.disable = disable;
    fitModeBtn.disable = disable;
    fullscreenBtn.disable = disable;
    helpOpenBtn.disable = disable;
    volumeMuteBtn.disable = disable;
    volumeBar.disable = disable;
    seekBar.disable = disable;
}

// プレイリスト有効化／無効化
function disabledfilename(disable) {
    if (disable) {
        filename.style.opacity = '0';
        // 【追加】pointer-events無効化 → 内包オブジェクト操作不可
        filename.style.pointerEvents = 'none';
    } else {
        filename.style.opacity = '1';
        // 【追加】pointer-events有効化
        filename.style.pointerEvents = 'auto';
    }
    filenameDisplay.disable = disable;
}

// 再生時間表示更新
function updateTimeDisplay() {
    const currentTime = formatTime(videoPlayer.currentTime);
    const duration = formatTime(videoPlayer.duration);
    timeDisplay.textContent = `${currentTime} / ${duration}`;
    updateIconOverlay();
}

// 音量表示更新
function updateVolumeDisplay() {
    const volumePercent = Math.round(videoPlayer.volume * 100);
    volumeDisplay.textContent = `${volumePercent}%`;
    updateIconOverlay();
}

// ズーム適用
function applyZoom(zoomPercent) {
    // ズーム値（-100～+500）をscale値（0～6）に変換
    // 公式: scale = (100 + zoomPercent) / 100
    const scale = (100 + zoomPercent) / 100;
    // transform は translate(px,px) scale() の順に指定
    videoPlayer.style.transformOrigin = 'center center';
    videoPlayer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    localStorage.setItem('translateX', translateX.toString());
    localStorage.setItem('translateY', translateY.toString());
    zoomValue = zoomPercent;
    localStorage.setItem('zoom', zoomValue.toString());
    zoomDisplay.textContent = `${zoomValue > 0 ? '+' : ''}${zoomValue}%`;
    if (isZoomMode) {
        updateOverlayDisplay(`🔍 ${zoomValue > 0 ? '+' : ''}${zoomValue}%`);
    }
}

// オーバーレイ表示
function updateOverlayDisplay(content, isInitial = false) {
    overlayDisplay.textContent = content;
    const overlayFontSize = parseFloat(overlayDisplay.style.fontSize) || 90;
    const charCount = content.length;
    const charWidth = overlayFontSize * 0.6;
    let overlayWidth = charCount * charWidth + 40;
    overlayWidth = Math.max(200, Math.min(overlayWidth, window.innerWidth * 0.8));
    overlayDisplay.style.width = `${overlayWidth}px`;
    overlayDisplay.style.display = 'block';
    overlayDisplay.classList.add('active');
    if (!isInitial) {
        showControlsAndFilename();
    }
    updateIconOverlay();
}

// オーバーレイ非表示
function hideOverlayDisplay() {
    overlayDisplay.classList.remove('active');
    setTimeout(() => {
        overlayDisplay.style.display = 'none';
    }, 300);
    updateIconOverlay();
}

// プレビュー位置更新関数
function updatePreviewPosition(e) {
    const previewWidth = 180;
    const previewHeight = 100;
    const seekRect = seekBar.getBoundingClientRect();

    // カーソルを中心に横位置を計算
    let x = e.clientX - previewWidth / 2;

    // 画面外に出ないよう調整
    // 右側がはみ出る場合
    if (x + previewWidth > window.innerWidth) {
        x = window.innerWidth - previewWidth - 10;
    }
    // 左側がはみ出る場合
    if (x < 0) {
        x = 10;
    }
    // Y軸：seekBarの直上に固定（プレビュー高さ + 余白）
    const y = seekRect.top - previewHeight - 20; // seekBarの上に10pxの隙間

    videoPreview.style.left = `${x}px`;
    videoPreview.style.top = `${y}px`;
}

// アイコンオーバーレイ更新
function updateIconOverlay() {
    if (playlist.length === 0 || 
        (currentVideoIndex >= playlist.length && videoPlayer.paused) || 
        isVideoStopped()) {
        if (!isConverting) {
            iconOverlay.classList.add('active');
        } else {
            iconOverlay.classList.remove('active');
        }
    } else {
        iconOverlay.classList.remove('active');
    }
}

// URL入力欄非表示
function hideURLInputControls() {
    urlControls.style.display = 'none';
    urlInput.style.display = 'none';
    urlConfirmBtn.style.display = 'none';
    urlInput.value = '';
    isUrlControlsVisible = false;
    updateUrlButtonIcon();
}

// 定期保存開始
function startPeriodicSave() {
    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(() => {
        if (!videoPlayer.paused && playlist.length > 0) {
            localStorage.setItem('currentTime', videoPlayer.currentTime);
        }
    }, 1000);
}

// 定期保存停止
function stopPeriodicSave() {
    if (saveInterval) {
        clearInterval(saveInterval);
        saveInterval = null;
    }
}

// プレイリストと再生状態保存
function savePlaylistAndPlaybackState() {
    if (playlist.length > 0) {
        const playlistPaths = playlist.map(item => item.file.path);
        localStorage.setItem('playlist', JSON.stringify(playlistPaths));
        localStorage.setItem('currentVideoIndex', currentVideoIndex);
        localStorage.setItem('currentTime', videoPlayer.currentTime || 0);
    } else {
        localStorage.removeItem('playlist');
        localStorage.removeItem('currentVideoIndex');
        localStorage.removeItem('currentTime');
    }
    updateIconOverlay();
}

// プレイリスト表示更新
function updatePlaylistDisplay() {
    // videoPlayer は常に存在 → チェック不要
    const isPlaybackActive = videoPlayer.src !== '';
    filenameDisplay.innerHTML = '';
    if (playlist.length === 0) {
        const savedPlaylist = localStorage.getItem('playlist');
        if (savedPlaylist) {
            try {
                const parsedPlaylist = JSON.parse(savedPlaylist);
                if (Array.isArray(parsedPlaylist) && parsedPlaylist.length > 0) {
                    filenameDisplay.innerHTML = `<option value="">▶️ ${parsedPlaylist[currentVideoIndex]}</option>`;
                } else {
                    filenameDisplay.innerHTML = `<option value="">${appNameAndCopyrightValue}</option>`;
                }
            } catch (e) {
                filenameDisplay.innerHTML = `<option value="">${appNameAndCopyrightValue}</option>`;
            }
        } else {
            filenameDisplay.innerHTML = `<option value="">${appNameAndCopyrightValue}</option>`;
        }
        updateIconOverlay();
        return;
    }
    playlist.forEach((item, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = (index === currentVideoIndex && isPlaying ? '▶️ ' : '') + item.name;
        filenameDisplay.appendChild(option);
    });
    filenameDisplay.value = currentVideoIndex;
    updateIconOverlay();
}

// urlInputBtn の表示状態を更新するヘルパー関数
function updateUrlButtonIcon() {
    if (isUrlControlsVisible) {
        urlInputBtn.textContent = '❌';
        urlInputBtn.setAttribute('data-tooltip', 'URL入力キャンセル');
        urlInputBtn.classList.add('active');     // 必要ならCSSで赤くするなど
    } else {
        urlInputBtn.textContent = '🌐';
        urlInputBtn.setAttribute('data-tooltip', 'ネット動画を開く (Ctrl+n)');
        urlInputBtn.classList.remove('active');
    }
}

// URLコントロールの表示／非表示を切り替える
async function toggleUrlControls(show = null) {
    // show が明示的に渡されなかった場合は現在の状態を反転
    const shouldShow = show !== null ? show : !isUrlControlsVisible;
    if (shouldShow) {
        // クリップボードに有効なURLがあるかチェック（既存機能）
        const pastedText = await pasteFromClipboard();
        const clipText = pastedText.rawText.trim() || ''; // クリップボードのテキスト（空文字も考慮）
        urlInput.value = clipText;
        if (clipText && isTwitchOrYouTube(clipText)) {
            urlInput.value = clipText;
            // 有効なURL → 自動で入力して再生（従来挙動）
            urlInputEnter();
            // コントロールは表示しない
            return;
        }

        // 有効なURLがない → 入力欄を表示
        filenameControls.style.display = 'none';
        urlControls.style.display = 'flex';
        urlInput.style.display = 'inline-block';
        urlConfirmBtn.style.display = 'inline-block';
        // urlCancelBtn はもうないので削除
        urlInput.focus();
        isUrlControlsVisible = true;
        updateUrlButtonIcon();
        showControlsAndFilename();
        updateIconOverlay();
    } else {
        urlInput.value = '';
        // 非表示にする
        hideURLInputControls();
        filenameControls.style.display = 'flex';
        isUrlControlsVisible = false;
        updateUrlButtonIcon();
        showControlsAndFilename();
        updateIconOverlay();
    }
}

// 動画再生
async function playVideo(file) {
    if (!file?.path) return;

    // 動画ソース設定
    isPlaying = true;
    await setVideoSrc(file);

    // 共通再生処理
    videoPlayer.load();
    videoPreview.load();
    videoPreview.pause();
    updatePlaylistDisplay();
    // 必ず現在の再生速度を適用する
    videoPlayer.playbackRate = currentPlaybackRate;
    if (speedSelect) {
        speedSelect.value = currentPlaybackRate.toFixed(2);
    }
    // ボリューム復元
    const savedVolume = localStorage.getItem('volume');
    if (savedVolume && !isNaN(savedVolume) && savedVolume >= 0 && savedVolume <= 1) {
        videoPlayer.volume = savedVolume;
        volumeBar.value = savedVolume;
        lastVolume = savedVolume;
        volumeMuteBtn.textContent = savedVolume == 0 ? '🔇' : '🔊';
        volumeMuteBtn.setAttribute('data-tooltip', savedVolume == 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
    } else {
        videoPlayer.volume = volumeBar.value || 0.2;
        lastVolume = videoPlayer.volume;
        volumeMuteBtn.textContent = '🔊';
        volumeMuteBtn.setAttribute('data-tooltip', 'ミュート（Ctrl+m）');
    }
    updateVolumeDisplay();

    if (modeChange === 'convert') {
        // 再生即終了 → 最後尾へ
        setVideoDurationTime(); // duration が NaN でも安全に処理
    } else {
        // 再生時間復元
        const savedCurrentTime = parseFloat(localStorage.getItem('currentTime'));
        if (!isNaN(savedCurrentTime) && savedCurrentTime >= 0) {
            videoPlayer.currentTime = savedCurrentTime;
        }
    }

    // 再生開始
    playPauseBtn.textContent = '⏸️';
    playPauseBtn.setAttribute('data-tooltip', '一時停止（Space／Right Click）');
    videoPlayer.play().catch(() => {
        playPauseBtn.textContent = '▶️';
        playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
    });

    startPeriodicSave();
    showControlsAndFilename();
    updatePlaylistDisplay();
    updateIconOverlay();
}

// 動画のメタデータがロードされてから currentTime を操作するヘルパー
function setVideoDurationTime() {
    if (videoPlayer.readyState >= 1) { // HAVE_METADATA 以上
        videoPlayer.currentTime = videoPlayer.duration;
    } else {
        // メタデータがまだない → ロード後に設定
        const handler = () => {
            videoPlayer.currentTime = videoPlayer.duration;
            videoPlayer.removeEventListener('loadedmetadata', handler);
        };
        videoPlayer.addEventListener('loadedmetadata', handler);
    }
}

// 再生/一時停止切替
async function togglePlayPause() {
    isPlaying = true;
    if (videoPlayer.paused) {
        if (isVideoStopped()) {
            const file = playlist[currentVideoIndex].file;
            // 動画ソース設定
            await setVideoSrc(file);

            // 共通再生処理
            videoPlayer.load();
            videoPreview.load();
            videoPreview.pause();
            updatePlaylistDisplay();
        }

        if (modeChange === 'convert') {
            // 再生即終了 → 最後尾へ
            setVideoDurationTime(); // duration が NaN でも安全に処理
        }
        
        playPauseBtn.textContent = '⏸️';
        playPauseBtn.setAttribute('data-tooltip', '一時停止（Space／Right Click）');
        startPeriodicSave();
        videoPlayer.play().catch(() => {
            playPauseBtn.textContent = '▶️';
            playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
        });
    } else {
        videoPlayer.pause();
        playPauseBtn.textContent = '▶️';
        playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
        localStorage.setItem('currentTime', videoPlayer.currentTime);
        stopPeriodicSave();
    }
    showControlsAndFilename();
    updateIconOverlay();
}

// 動画ソース設定
async function setVideoSrc(file) {
    const ext = path.extname(file.path).toLowerCase();

    if (isHTML5_SUPPORTED(ext)) {
        isConverting = false;
        // HTML5 ネイティブ対応
        videoPlayer.src = file.path;
        videoPreview.src = videoPlayer.src;
        baseConvertFile = null;
        tempConvertFile = null;
    } else {
        // 非対応 → FFmpeg変換
        if (isConverting) {
            updateOverlayDisplay('変換中… しばらくお待ちください');
            return;
        }
        playStopBtn.click();

        try {
            isConverting = true;
            updatePlaylistDisplay();
            updateOverlayDisplay('変換中…（FFmpeg）');
            // シークバーを赤色に変更
            seekBar.classList.add('converting');
            currentConvertPromise = ipcRenderer.invoke('convert-video', file.path);
            const convertedPath = await currentConvertPromise;

            const response = await fetch(`file://${convertedPath}`);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            videoPlayer.src = blobUrl;
            videoPreview.src = videoPlayer.src;

            baseConvertFile = file.path;
            tempConvertFile = convertedPath;
            
            // 変換完了後、シークバーをリセット
            seekBar.value = 0;
            // シークバーの色を元に戻す
            seekBar.classList.remove('converting');
        } catch (err) {
            console.error("変換失敗:", err);
            isConverting = false;
            updateOverlayDisplay(`変換失敗`);
            filenameDisplay.innerHTML = `<option value="">${appNameAndCopyrightValue}</option>`;
            updateIconOverlay();
            // 変換失敗時もシークバーをリセット
            seekBar.value = 0;
            // 変換失敗時もシークバーの色を元に戻す
            seekBar.classList.remove('converting');
            setTimeout(hideOverlayDisplay, 3000);
            return;
        }
    }
}

// 動画／停止中判定
function isVideoStopped() {
    return videoPlayer.paused && 
            playlist.length > 0 && 
            !Array.from(filenameDisplay.options).some(option => option.text.includes('▶️'));
}

// Url再生完成
function urlInputEnter() {
    const url = urlInput.value.trim();
    if (!url) {
        updateOverlayDisplay('動画のURLを入力してください');
        updateIconOverlay();
        return;
    }

    const platform = isTwitchOrYouTube(url);
    let playlistId = null;
    let videoId = null;
    let videoUrl = null;

    if (platform === 'Twitch') {
        videoId = extractTwitchVideoId(url);
        if (!videoId) {
            updateOverlayDisplay('無効なTwitch URLです。');
            updateIconOverlay();
            return;
        }
        videoUrl = `https://player.twitch.tv/?video=${videoId}&parent=twitch.tv&player=popout`;
    } else if (platform === 'YouTube') {
        playlistId = extractYouTubePlaylistId(url);
        videoId = extractYouTubeVideoId(url);
        if (!videoId) {
            updateOverlayDisplay('無効なYouTube URLです。');
            updateIconOverlay();
            return;
        }
        if (!playlistId) {
            videoUrl = `https://www.youtube.com/watch?v=${videoId}?autoplay=1&cc_load_policy=0`;
        } else {
            videoUrl = `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}&autoplay=1`;
        }
    } else if (platform === 'Other') {
        videoUrl = url;
    } else {
        updateOverlayDisplay('無効なURLです。');
        updateIconOverlay();
        return;
    }

    try {
        const command = `${application} --profile-directory=Default --app="${videoUrl}"`;
        exec(command);

        console.log("再生動画>", command);

        hideURLInputControls();
        filenameControls.style.display = 'flex';
        showControlsAndFilename();
        updateIconOverlay();
    } catch (error) {
        console.error('YouTube Or Twitch Player Setup Error:', error.message, error.stack);
        updateOverlayDisplay(`動画プレーヤーの設定に失敗しました（${error.message}）。別の動画を試してください。`);
        updateIconOverlay();
    }
}

// Url入力キャンセル
function urlInputCancel() {
    hideURLInputControls();
    filenameControls.style.display = 'flex';
    showControlsAndFilename();
    updateIconOverlay();
}

// 動画プラットフォーム判定
function isTwitchOrYouTube(url) {
    if (url.includes('http')) {
        if (url.includes('twitch.tv') && url.includes('videos')) {
            return 'Twitch';
        } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return 'YouTube';
        } else {
            return 'Other';
        }
    }
    return null;
}

// Twitch動画ID抽出
function extractTwitchVideoId(url) {
    const regex = /twitch\.tv\/videos\/(\d+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// YouTube動画リストID抽出
function extractYouTubePlaylistId(url) {
    const regex = /[?&]list=([^&#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// YouTube動画ID抽出
function extractYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// ヘルプを開く
function openHelp() {
    videoContainer.style.display = 'none';
    helpContainer.style.display = 'block';
    helpTitle.textContent = `${appName}`;
    isHelpOpen = true;
}

// ヘルプを閉じる
function closeHelp() {
    videoContainer.style.display = 'flex';
    helpContainer.style.display = 'none';
    isHelpOpen = false;
    showControlsAndFilename();
    updateIconOverlay();
}

// ファイル設定
async function playlistSet(videoFiles) {
    if (videoFiles.length > 0) {
        await cleanupTempFiles();

        playlist = videoFiles.map(file => ({
            file: { path: file.path },
            name: file.path
        }));
        currentVideoIndex = 0;
        localStorage.setItem('currentTime', 0);

        updatePlaylistDisplay();
        await playVideo(playlist[currentVideoIndex].file);
        savePlaylistAndPlaybackState();
        updateIconOverlay();
    } else {
        updateIconOverlay();
    }
}

// HTML5対応拡張子判定
function isHTML5_SUPPORTED(ext) {
    if (modeChange === 'video') {
        return HTML5_SUPPORTED.includes(ext.toLowerCase());
    } else {
        return HTML5_SUPPORTED_CONVERT.includes(ext.toLowerCase());
    }
}

// 上へ移動
function upMovePlaylist() {
    const currentIndex = parseInt(filenameDisplay.value);
    if (isNaN(currentIndex) || currentIndex <= 0 || playlist.length === 0) return;

    // 配列から移動
    const [movedItem] = playlist.splice(currentIndex, 1);
    playlist.splice(currentIndex - 1, 0, movedItem);

    // 再生中インデックスが影響を受ける場合の調整
    if (currentVideoIndex === currentIndex) {
        currentVideoIndex -= 1;
    } 

    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
}

// 下へ移動
function downMovePlaylist() {
    const currentIndex = parseInt(filenameDisplay.value);
    if (isNaN(currentIndex) || currentIndex >= playlist.length - 1 || playlist.length === 0) return;

    // 配列から移動
    const [movedItem] = playlist.splice(currentIndex, 1);
    playlist.splice(currentIndex + 1, 0, movedItem);

    // 再生中インデックスが影響を受ける場合の調整
    if (currentVideoIndex === currentIndex) {
        currentVideoIndex += 1;
    } 

    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
}

// editModeBtn のテキストをトグルするヘルパー関数
function updateEditModeButtonUI() {
    if (isEditMode) {
        editModeBtn.textContent = '❌';
        editModeBtn.setAttribute('data-tooltip', '編集モード終了（Ctrl+e）');
        editModeBtn.classList.add('active');
    } else {
        editModeBtn.textContent = '✂️';
        editModeBtn.setAttribute('data-tooltip', '編集モード開始（Ctrl+e）');
        editModeBtn.classList.remove('active');
    }
}

// プレイリスト追加
async function addToPlaylist() {
    try {
        const files = await ipcRenderer.invoke('open-video-dialog');
        if (!files || files.length === 0) return;

        const newFiles = [];
        for (const file of files) {
            newFiles.push({ path: file.path, name: file.path });
        }

        if (newFiles.length > 0) {
            let insertIndex = playlist.length; // 末尾
            const formattedFiles = newFiles.map(f => ({ file: { path: f.path }, name: f.name }));
            playlist.splice(insertIndex, 0, ...formattedFiles);

            if (filenameDisplay.index < 0) {
                filenameDisplay.index = 0;
            }

            updatePlaylistDisplay();
            savePlaylistAndPlaybackState();
            showControlsAndFilename();
        }
    } catch (e) {
        console.error('追加エラー:', e);
        updateOverlayDisplay('動画追加に失敗');
        setTimeout(hideOverlayDisplay, 2000);
    }
}

// プレイリスト削除
async function removeFromPlaylist() {
    const selectedIndex = parseInt(filenameDisplay.value);
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= playlist.length) {
        updateOverlayDisplay('削除する動画を選択してください');
        setTimeout(hideOverlayDisplay, 2000);
        return;
    }

	await cleanupTempFiles();
    
    // 再生中かどうかの判定
    const isCurrentlyPlaying = currentVideoIndex === selectedIndex && !videoPlayer.paused;

    // 削除実行
    playlist.splice(selectedIndex, 1);

    // 新しいインデックスを計算
    let newIndex;
    if (selectedIndex < playlist.length) {
        // 次がある → 次を選択
        newIndex = selectedIndex;
    } else {
        // 次がない（最終行）→ 前を選択
        newIndex = Math.max(0, playlist.length - 1);
    }

    if (playlist.length > 0) {
        // プレイリストに動画が存在する場合。
        if (isCurrentlyPlaying) {
            // 動画が再生中の場合。
            if (selectedIndex < playlist.length) {
                // 次動画が存在する場合。
                currentVideoIndex = newIndex;
                updatePlaylistDisplay();
                await playVideo(playlist[currentVideoIndex].file);
            } else {
                // 次動画が存在しない（プレイリストの最後）場合。
                currentVideoIndex = newIndex;
                updatePlaylistDisplay();
                playStopBtn.click();
                filenameDisplay.value = currentVideoIndex;
            }
        } else {
            // 動画が停止の場合。
            currentVideoIndex = newIndex;
            updatePlaylistDisplay();
            playStopBtn.click();
            filenameDisplay.value = currentVideoIndex;
        } 
    } else {
        // プレイリストが空になった場合
        filenameDisplay.innerHTML = `<option value="">${appNameAndCopyrightValue}</option>`;
        updateIconOverlay();
        playStopBtn.click();
    }
    savePlaylistAndPlaybackState();
    showControlsAndFilename();
}

// プレイリストクリア
async function clearPlaylist() {
    if (playlist.length === 0) return;

	await cleanupTempFiles();

    // 再生中の動画を停止
    filenameDisplay.innerHTML = `<option value="">${appNameAndCopyrightValue}</option>`;
    updateIconOverlay();
    playStopBtn.click();

    // プレイリストと状態をクリア
    playlist.length = 0;
    currentVideoIndex = -1;

    // UIと状態を更新
    // updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
    showControlsAndFilename();
}

// プレイリスト保存
async function savePlaylist() {
    if (playlist.length === 0) {
        updateOverlayDisplay('保存する動画がありません');
        setTimeout(hideOverlayDisplay, 2000);
        return;
    }

    const result = await ipcRenderer.invoke('save-playlist-dialog');
    if (result.canceled) return;

    // ← ここから追加
    const paths = playlist.map(item => item.file.path);
    const saveResult = await ipcRenderer.invoke('save-playlist-file', {
        filePath: result.filePath,
        paths: paths
    });

    if (saveResult.success) {
        updateOverlayDisplay(`💾: ${path.basename(result.filePath)}`);
    } else {
        updateOverlayDisplay('保存に失敗しました');
        console.error(saveResult.error);
    }
    setTimeout(hideOverlayDisplay, 2000);
}

// ドラッグ＆ドロップファイルのプレイリスト設定
async function addFilesFromPaths(fullPaths) {
    const newFiles = [];

    for (const fullPath of fullPaths) {
        try {
            // mainプロセスに「このパスは何？」と聞いて分類してもらう
            const result = await classifyPath(fullPath);
            // result は { type: 'directory' | 'video' | 'playlist', files: [...] } の形にする

            if (result.files && result.files.length > 0) {
                newFiles.push(...result.files);
            }
        } catch (err) {
            console.error('パス分類エラー:', fullPath, err);
        }
    }

    if (newFiles.length > 0) {
        playlistSet(newFiles);           // プレイリストUI更新
        if (playlist.length === newFiles.length) {
            // 初回追加なら先頭から再生開始
            playVideo(0);
        }
    }
}

// 一時ファイル削除
async function cleanupTempFiles() {
    // FFmpeg変換中断
    if (isConverting) {
        await ipcRenderer.invoke('cancel-conversion');  // 即中断
        isConverting = false;
        setTimeout(hideOverlayDisplay, 1000);
    }
}

// 🔲レンダラーイベント🔲
// main.js からの自動再生指示を受信
ipcRenderer.on('auto-play-files', async (event, videoFiles) => {
    if (!videoFiles || videoFiles.length === 0) return;
    playlistSet(videoFiles);
});

// 変換進捗受信
ipcRenderer.on('convert-progress', (event, { percent }) => {
    updateOverlayDisplay(`変換中… ${Math.round(percent)}%`);
    // シークバーに進捗を表示
    seekBar.value = percent;
});

// カット進捗受信（詳細ペイロード対応）
ipcRenderer.on('cut-progress', (event, payload) => {
    try {
        const stage = payload && payload.stage ? payload.stage : 'progress';
        switch (stage) {
            case 'start':
                updateOverlayDisplay(`✂️ カット準備中…` , true);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'extract-start':
                updateOverlayDisplay(`✂️ 切出開始 ${payload.index + 1}/${payload.total} ${formatTime(payload.segStart)} - ${formatTime(payload.segEnd)}` , true);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'extract-done':
                updateOverlayDisplay(`✂️ 切出済 ${payload.index + 1}/${payload.total} (${Math.round(payload.percent)}%)` , true);
                break;
            case 'concat-start':
                updateOverlayDisplay(`✂️ 結合中…` , true);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'concat-done':
                updateOverlayDisplay(`✂️ 結合完了` , false);
                cutCancelBtn.style.display = 'none';
                setTimeout(hideOverlayDisplay, 1200);
                break;
            case 'reencode':
                const p = payload.percent !== undefined ? Math.round(payload.percent) : 0;
                const fm = payload.frames !== undefined ? `${payload.frames}f` : '';
                const tm = payload.timemark ? ` [${payload.timemark}]` : '';
                updateOverlayDisplay(`✂️ カット実行中… ${p}% ${fm}${tm}` , true);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'done':
                updateOverlayDisplay(`✂️ 保存完了` , false);
                cutCancelBtn.style.display = 'none';
                setTimeout(hideOverlayDisplay, 1500);
                break;
            case 'error':
                updateOverlayDisplay(`❌ カット失敗: ${payload.message || 'エラー'}` , false);
                cutCancelBtn.style.display = 'none';
                setTimeout(hideOverlayDisplay, 3000);
                break;
            default:
                // 旧スタイル or unknown
                const percent = payload && payload.percent ? Math.round(payload.percent) : 0;
                updateOverlayDisplay(`✂️ カット（削除）処理中… ${percent}%`, true);
                break;
        }
    } catch (e) {
        updateOverlayDisplay('✂️ カット処理中…', true);
    }
});

// 変換エラー
ipcRenderer.on('convert-error', (event, msg) => {
    console.error("変換失敗:", err);
    isConverting = false;
    updateOverlayDisplay(`変換失敗`);
    filenameDisplay.innerHTML = `<option value="">${appNameAndCopyrightValue}</option>`;
    updateIconOverlay();
    setTimeout(hideOverlayDisplay, 3000);
});

// 🔲グローバルイベント🔲
// ウィンドウリサイズ
window.addEventListener('resize', () => {
    const controlSizeX = calculateControlSizeX();
    const controlSizeY = calculateControlSizeY();
    localStorage.setItem('controlSizeX', controlSizeX);
    localStorage.setItem('controlSizeY', controlSizeY);
    updateControlSize(controlSizeX, controlSizeY);
    showControlsAndFilename();
    updateIconOverlay();
});

// ウィンドウリサイズ
window.addEventListener('beforeunload', async function(e)  {
	await cleanupTempFiles();
});

window.addEventListener('unload', async () => {
	await cleanupTempFiles();
});

// キー入力（イベントリスナー）
document.addEventListener('keydown', async (event) => {
    if (isHelpOpen) {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeHelp();
        } else {
            event.preventDefault();
        }
        return;
    }

    if (urlInput.style.display === 'inline-block' && urlInput === document.activeElement) {
        if (event.key === 'Enter') {
            event.preventDefault();
            urlInputEnter();
            return;
        }
     }

    // 🌐Url入力状態
    if (urlInput.style.display === 'inline-block' && urlInput === document.activeElement) {
        // ✅Url入力確定（Enter）
        if (event.key === 'Enter') {
            event.preventDefault();
            urlInputEnter();
            return;
        }
        
        // ❌Url入力キャンセル（Escape）
        if (event.key === 'Escape') {
            event.preventDefault();
            urlInputCancel();
            return;
        }
    }

    // ❓ヘルプ開く（Ctrl+h）
    if (event.ctrlKey && event.key === 'h') {
        event.preventDefault();
        openHelp();
        return;
    }

    // 再生速度ショートカット（Ctrl+. 増速 / Ctrl+, 減速）
    if (event.ctrlKey && !event.altKey && !event.metaKey) {
        const active = document.activeElement;
        if (!(active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable))) {
            if (event.key === '.' || event.key === '>') {
                event.preventDefault();
                increasePlaybackRate();
                return;
            }
            if (event.key === ',' || event.key === '<') {
                event.preventDefault();
                decreasePlaybackRate();
                return;
            }
        }
    }

    // 🎬／🔄️ファイル選択（Ctrl+r）  ※ただしURL入力欄がフォーカスされている場合は貼り付けを許可
    if (event.ctrlKey && event.key === 'v') {
        // url入力中はCtrl+Vでモード切替しない（通常の貼り付け処理を許可）
        if (urlInput && urlInput.style.display === 'inline-block' && urlInput === document.activeElement) {
            return;
        }
        event.preventDefault();
        modeChangeBtn.click();
        return;
    }

    // 🌐ネット動画選択（Ctrl+n）
    if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        urlInputBtn.click();
        return;
    }

    // 📁フォルダ選択（Ctrl+d）
    if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        folderInput.click();
        return;
    }

    // 🗒️ファイル選択（Ctrl+f）
    if (event.ctrlKey && event.key === 'f') {
        event.preventDefault();
        videoInput.click();
        return;
    }

    // ✂️編集モード切替（Ctrl+e）
    if (event.ctrlKey && event.key === 'e') {
        event.preventDefault();
        editModeBtn.click();
        return;
    }

    // ⏮️前の動画へ（PgUp）
    if (event.key === 'PageUp' && playlist.length > 0) {
        event.preventDefault();
        prevVideoBtn.click();
        return;
    } 

    // ⏪30秒戻る（Ctrl+←／Swipe Left）
    if (event.ctrlKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        rewindBtn.click();
        return;
    } 

    // ▶️再生／⏸️一時停止（Space／Right Click）
    if (!event.ctrlKey && event.key === ' ') {
        event.preventDefault();
        playPauseBtn.click();
        return;
    }

    // ⏹️停止（Ctrl+Space／Ctrl+Right Clickk）
    if (event.ctrlKey && event.key === ' ') {
        event.preventDefault();
        playStopBtn.click();
        return;
    } 

    // ⏩30秒進む（Ctrl+→／Swipe Right）
    if (event.ctrlKey && event.key === 'ArrowRight') {
        event.preventDefault();
        fastForwardBtn.click();
        return;
    } 

    // ⏭️次の動画へ（PgDw）
    if (event.key === 'PageDown' && playlist.length > 0) {
        event.preventDefault();
        nextVideoBtn.click();
        return;
    }

    // ↔️横に合わせる／↕️縦に合わせる（Ctrl+x）
    if (event.ctrlKey && event.key === 'x') {
        event.preventDefault();
        fitModeBtn.click();
        return;
    }

    // ズームモード切替（Ctrl+z）
    if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        zoomBtn.click();
        return;
    }

    // 🔊ミュート／🔇ミュート解除（Ctrl+m）
    if (event.ctrlKey && event.key === 'm') {
        event.preventDefault();
        volumeMuteBtn.click();
        return;
    }

    // ズームモード中のキー操作
    if (isZoomMode) {
        // ズームイン（Ctrl+↑）
        if (event.ctrlKey && event.key === 'ArrowUp') {
            event.preventDefault();
            let newZoom = zoomValue + 1;
            if (newZoom > 500) newZoom = 500;
            zoomBar.value = newZoom.toString();
            applyZoom(newZoom);
            return;
        }

        // ズームアウト（Ctrl+↓）
        if (event.ctrlKey && event.key === 'ArrowDown') {
            event.preventDefault();
            let newZoom = zoomValue - 1;
            if (newZoom < -100) newZoom = -100;
            zoomBar.value = newZoom.toString();
            applyZoom(newZoom);
            return;
        }

        // ズームリセット（Ctrl+0）
        if (event.ctrlKey && event.key === '0') {
            event.preventDefault();
            zoomResetBtn.click();
            return;
        }

        // スナップショット（Ctrl+s）
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            snapshotBtn.click();
            return;
        }
    }

    // 音量変更（↓／↑）- ズームモード外のみ
    if (!isZoomMode && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        const delta = event.key === 'ArrowUp' ? 0.05 : -0.05;
        videoPlayer.volume = Math.max(0, Math.min(1, videoPlayer.volume + delta));
        volumeBar.value = videoPlayer.volume;
        lastVolume = videoPlayer.volume;
        volumeMuteBtn.textContent = videoPlayer.volume === 0 ? '🔇' : '🔊';
        volumeMuteBtn.setAttribute('data-tooltip', videoPlayer.volume === 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
        updateVolumeDisplay();
        updateOverlayDisplay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`);
        localStorage.setItem('volume', videoPlayer.volume);
        showControlsAndFilename();
        updateIconOverlay();
        return;
    }
    
    // 5秒戻る／5秒進む（←／→）
	if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
	    try { event.preventDefault(); } catch (e) {}
	
	    if (videoPlayer.duration) {
	        // ★ ここですべてのフラグを先に定義 ★
	        const editControlsExist = typeof editControls !== 'undefined' && editControls;
	        const editVisible = editControlsExist && editControls.style.display !== 'none';
	        const zoomModeActive = typeof isZoomMode !== 'undefined' && isZoomMode === true;
	
	        // フレーム単位シークが必要か？
	        const needsFrameStep = isEditMode || editVisible || zoomModeActive;
	
	        const frameRate = (typeof editFrameRate === 'number' && editFrameRate > 0) ? editFrameRate : 30;
	        const stepSeconds = needsFrameStep ? (1 / frameRate) : 5;
	
	        const delta = event.key === 'ArrowLeft' ? -stepSeconds : stepSeconds;
	        let newTime = videoPlayer.currentTime + delta;
	        newTime = Math.max(0, Math.min(videoPlayer.duration, newTime));

            videoPlayer.currentTime = newTime;
            seekBar.value = (100 / videoPlayer.duration) * newTime;

            // 編集用シークバー同期（編集モードまたはズームモード時も含む）
            if (needsFrameStep && typeof editSeekBar !== 'undefined' && editSeekBar) {
                editSeekBar.value = (newTime / videoPlayer.duration) * 100;
            }

            updateTimeDisplay();
        
	        if (needsFrameStep) {
	            const frameNum = Math.round(newTime * frameRate);
	            updateOverlayDisplay(`🕓 ${formatTime(newTime)} (${frameNum}f)`);
	        } else {
	            updateOverlayDisplay(`🕓 ${formatTime(newTime)}`);
	        }
	    }
	    return;
	}

    // 🚥プレイリスト編集 表示／非表示（shift+m）
    if (event.shiftKey && event.key.toLowerCase() === 'm' ) {
        event.preventDefault();
        filenameMenu.click();
        return;
    }
    
    // 🔼前動画再生（shift+p）
    if (event.shiftKey && event.key.toLowerCase() === 'p') {
        if (playlist.length > 1) {
            event.preventDefault();
            upMovePlaylistBtn.click();
            return;
        }
    }
    
    // 🔽次動画再生（shift+p）
    if (event.shiftKey && event.key.toLowerCase() === 'n') {
        if (playlist.length > 1) {
            event.preventDefault();
            downMovePlaylistBtn.click();
            return;
        }
    }

    // 先頭動画再生（Home）
    if (event.key === 'Home') {
        if (playlist.length > 1) {
            currentVideoIndex = 0;
            localStorage.setItem('currentTime', 0);
            updatePlaylistDisplay();
            await playVideo(playlist[currentVideoIndex].file);
            savePlaylistAndPlaybackState();
            showControlsAndFilename();
            updateIconOverlay();
            return;
        }
    }
    
    // 最終動画再生（End）
    if (event.key === 'End') {
        if (playlist.length > 1) {
            currentVideoIndex = playlist.length - 1;
            localStorage.setItem('currentTime', 0);
            updatePlaylistDisplay();
            await playVideo(playlist[currentVideoIndex].file);
            savePlaylistAndPlaybackState();
            showControlsAndFilename();
            updateIconOverlay();
            return;
        }
    }
    
    // ➕動画追加（shift+a）
    if (event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        addPlaylistBtn.click();
        return;
    }
    
    // ➖動画削除（shift+d）
    if (event.shiftKey && event.key.toLowerCase() === 'd') {
        if (playlist.length > 0) {
            event.preventDefault();
            removePlaylistBtn.click();
            return;
        }
    }
    
    // 🆑動画クリア（shift+c）
    if (event.shiftKey && event.key.toLowerCase() === 'c') {
        if (playlist.length > 0) {
            event.preventDefault();
            clearPlaylistBtn.click();
            return;
        }
    }
    
    // 💾動画保存（shift+s）
    if (event.shiftKey && event.key.toLowerCase() === 's') {
        if (playlist.length > 0) {
            event.preventDefault();
            savePlaylistBtn.click();
            return;
        }
    }

    // プレイリスト・コントロール表示／非表示（Ctrl+c／Click）
    if (event.ctrlKey && event.key === 'c') {
        event.preventDefault();
        videoPlayer.click();
        return;
    }
});

// グローバル mouseup でドラッグ終了を確実に検知
document.addEventListener('mouseup', (e) => {
    if (isSeekDragging) {
        isSeekDragging = false;
        isDragging = false;
        darkOverlay.style.display = 'none';
        hideOverlayDisplay();
        
        if (videoPlayer.duration) {
            const time = videoPlayer.duration * (seekBar.value / 100);
            videoPlayer.currentTime = time;
            updateTimeDisplay();
            localStorage.setItem('currentTime', time);
        }

        if (isMouseOverSeekBar) {
            videoPreview.style.display = 'block';
        }
    }

    if (isPanning) {
        // ドキュメントレベルでのマウスアップ時にもパン終了処理
        isPanning = false;
        videoPlayer.style.cursor = 'auto';
        showControlsAndFilename();
        updateIconOverlay();
    }
});

// フルスクリーン変更
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        fullscreenBtn.textContent = '🖥️';
        fullscreenBtn.setAttribute('data-tooltip', 'フルスクリーン表示（Ctrl+z／Double Click）');
    } else {
        fullscreenBtn.textContent = '❌';
        fullscreenBtn.setAttribute('data-tooltip', 'フルスクリーン解除（Ctrl+z／Double Click）');
    }
    updateIconOverlay();
});

// 🔲イベントリスナー🔲
// ネット動画選択
urlInputBtn.addEventListener('click', async () => {
    if (isUrlControlsVisible) {
        // 現在表示中 → キャンセル
        await toggleUrlControls(false);
    } else {
        // 非表示 → 表示を試みる（クリップボードチェックあり）
        await toggleUrlControls(true);
    }
});

// フォルダ選択
folderInput.addEventListener('click', async () => {
    hideOverlayDisplay();
    try {
        const videoFiles = await ipcRenderer.invoke('open-folder-dialog');
        playlistSet(videoFiles);
    } catch (e) {
        updateOverlayDisplay('フォルダ選択エラー');
        console.error('フォルダ選択エラー:', e);
        updateIconOverlay();
    }
});

// ファイル選択
videoInput.addEventListener('click', async () => {
    hideOverlayDisplay();
    try {
        const videoFiles = await ipcRenderer.invoke('open-video-dialog');
        playlistSet(videoFiles);
    } catch (e) {
        updateOverlayDisplay('ファイル選択エラー');
        console.error('ファイル選択エラー:', e);
        updateIconOverlay();
    }
});

// 動作モード切替（視聴／変換）
modeChangeBtn.addEventListener('click', () => {
    if (!isPlaying && !isConverting) {
        if (modeChange === 'convert') {
            modeChange = 'video';
            modeChangeBtn.classList.remove('convert-active');
            // 視聴モードに戻す時、シークバーの色をリセット
            seekBar.classList.remove('converting');
        } else {
            modeChange = 'convert';
            modeChangeBtn.classList.add('convert-active');
        }
        modeChangeBtn.textContent = modeChange === 'video' ? '🎬' : '🔄️';
        modeChangeBtn.setAttribute('data-tooltip', modeChange === 'video' ? '視聴モード（Ctrl+v）' : '変換モード（Ctrl+v）');
        localStorage.setItem('modeChange', modeChange);
    }
});

// URLクリア
urlClearBtn.addEventListener('click', () => {
    hideOverlayDisplay();
    urlInput.value = '';
    urlInput.focus();
});

// URL再生
urlConfirmBtn.addEventListener('click', () => {
    urlInputEnter();
});

// 再生/一時停止
playPauseBtn.addEventListener('click', async () => {
    await togglePlayPause()
});

// 再生停止ボタン（おすすめ修正版）
playStopBtn.addEventListener('click', async () => {
    const options = filenameDisplay.options;

    // 1. まず再生を止める
    videoPlayer.pause();
    isPlaying = false;

    // 2. 現在再生中のマークを全部外す
    for (let i = 0; i < options.length; i++) {
        options[i].text = options[i].text.replace('▶️ ', '');
    }

    // 3. srcを完全にクリア（これが大事！）
    videoPlayer.removeAttribute('src');     // ← これだけでOK
    videoPlayer.load();                     // src属性が無い状態でload → エラーにならない
    videoPreview.removeAttribute('src');
    videoPreview.load();

    // 4. UI更新
    playPauseBtn.textContent = '▶️';
    playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
    stopPeriodicSave();
    showControlsAndFilename();
    updateIconOverlay();

    // 5. FFmpeg変換中ならキャンセル
    if (isConverting) {
        await ipcRenderer.invoke('cancel-conversion');
        isConverting = false;
        setTimeout(hideOverlayDisplay, 1000);
    }
});

// 前の動画
prevVideoBtn.addEventListener('click', async () => {
    if (currentVideoIndex > 0) {
        await cleanupTempFiles();

        currentVideoIndex--;
        localStorage.setItem('currentTime', 0);
        updatePlaylistDisplay();
        await playVideo(playlist[currentVideoIndex].file);
        savePlaylistAndPlaybackState();
        updateIconOverlay();
    }
    showControlsAndFilename();
});

// 30秒戻る
rewindBtn.addEventListener('click', () => {
    if (videoPlayer.duration) {
        let newTime = videoPlayer.currentTime - 30;
        newTime = Math.max(0, newTime);
        videoPlayer.currentTime = newTime;
        seekBar.value = (100 / videoPlayer.duration) * newTime;
        updateTimeDisplay();
        updateOverlayDisplay(`🕓 ${formatTime(newTime)}`);
        localStorage.setItem('currentTime', newTime);
        showControlsAndFilename();
        updateIconOverlay();
    }
});

// 30秒進む
fastForwardBtn.addEventListener('click', () => {
    if (videoPlayer.duration) {
        let newTime = videoPlayer.currentTime + 30;
        newTime = Math.min(videoPlayer.duration, newTime);
        videoPlayer.currentTime = newTime;
        seekBar.value = (100 / videoPlayer.duration) * newTime;
        updateTimeDisplay();
        updateOverlayDisplay(`🕓 ${formatTime(newTime)}`);
        localStorage.setItem('currentTime', newTime);
        showControlsAndFilename();
        updateIconOverlay();
    }
});

// 次の動画
nextVideoBtn.addEventListener('click', async () => {
    if (currentVideoIndex < playlist.length - 1) {
        await cleanupTempFiles();

        currentVideoIndex++;
        localStorage.setItem('currentTime', 0);
        updatePlaylistDisplay();
        await playVideo(playlist[currentVideoIndex].file);
        savePlaylistAndPlaybackState();
        showControlsAndFilename();
        updateIconOverlay();
    }
    showControlsAndFilename();
});

// ミュート/解除
volumeMuteBtn.addEventListener('click', () => {
    if (videoPlayer.volume === 0) {
        videoPlayer.volume = lastVolume || 0.2;
        volumeBar.value = videoPlayer.volume;
        volumeMuteBtn.textContent = '🔊';
        volumeMuteBtn.setAttribute('data-tooltip', 'ミュート（Ctrl+m）');
    } else {
        lastVolume = videoPlayer.volume;
        videoPlayer.volume = 0;
        volumeBar.value = 0;
        volumeMuteBtn.textContent = '🔇';
        volumeMuteBtn.setAttribute('data-tooltip', 'ミュート解除（Ctrl+m）');
    }
    updateVolumeDisplay();
    updateOverlayDisplay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`);
    localStorage.setItem('volume', videoPlayer.volume);
    updateIconOverlay();
});

// フルスクリーン切替
fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        if (mainContainer.requestFullscreen) {
            mainContainer.requestFullscreen();
            fullscreenBtn.textContent = '❌';
            fullscreenBtn.setAttribute('data-tooltip', 'フルスクリーン解除（Double Click）');
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            fullscreenBtn.textContent = '🖥️';
            fullscreenBtn.setAttribute('data-tooltip', 'フルスクリーン表示（Double Click）');
        }
    }
    showControlsAndFilename();
    updateIconOverlay();
});

// 描画モード切替
fitModeBtn.addEventListener('click', () => {
    fitMode = fitMode === 'contain' ? 'cover' : 'contain';
    videoPlayer.style.objectFit = fitMode;
    fitModeBtn.textContent = fitMode === 'contain' ? '↔️' : '↕️';
    fitModeBtn.setAttribute('data-tooltip', fitMode === 'contain' ? '横に合わせる（Ctrl+x）' : '縦に合わせる（Ctrl+x）');
    localStorage.setItem('fitMode', fitMode);
    showControlsAndFilename();
    updateIconOverlay();
});

// ズームモード切替
zoomBtn.addEventListener('click', () => {
    isZoomMode = !isZoomMode;
    if (isZoomMode) {
        zoomPanel.style.display = 'flex';
        zoomBtn.textContent = '❌';
        zoomBtn.setAttribute('data-tooltip', 'ズームモード終了（Ctrl+z）');
        showControlsAndFilename();
        updateIconOverlay();
    } else {
        zoomEndBtn.click(); // ズーム値リセットして終了
    }
});

// ズームスライダー変更
zoomBar.addEventListener('input', () => {
    const zoomPercent = parseInt(zoomBar.value);
    applyZoom(zoomPercent);
});

// ズームリセット
zoomResetBtn.addEventListener('click', () => {
    // ズーム値をリセットし、表示位置も中央へ戻す
    zoomBar.value = '0';
    translateX = 0;
    translateY = 0;
    applyZoom(0);
});

// スナップショット
snapshotBtn.addEventListener('click', async () => {
    try {
        // 再生中なら一時停止してからスナップショットを撮る
        if (!videoPlayer.paused) {
            await togglePlayPause();
        }
        // スナップショットに映り込まないように
        zoomEndBtn.click(); // ズームリセットして終了
        hideControlsAndFilename(); // コントロールとファイル名を隠す

        const result = await window.electronAPI.captureScreenshot();
        if (result.success) {
            console.log('スナップショット完了！');
        } else {
            console.error('スナップショット失敗:', result.error);
        }
    } catch (err) {
        console.error(err);
    }
});

// ズーム終了（Ctrl+z）
zoomEndBtn.addEventListener('click', () => {
    isZoomMode = false;
    zoomPanel.style.display = 'none';
    zoomBtn.textContent = '🔍';
    zoomBtn.setAttribute('data-tooltip', 'ズームモード開始（Ctrl+z）');
});

// プレイリスト選択
filenameDisplay.addEventListener('change', async () => {
    if (filename.style.opacity !== '1') return;

    const selectedIndex = parseInt(filenameDisplay.value);
    if (!isNaN(selectedIndex)) {
        await cleanupTempFiles();

        currentVideoIndex = selectedIndex;
        localStorage.setItem('currentTime', 0);
        await playVideo(playlist[currentVideoIndex].file);
        savePlaylistAndPlaybackState();
        updateIconOverlay();
    }
});

// ヘルプ（開く）イベントリスナー
helpOpenBtn.addEventListener('click', openHelp);

// ヘルプ（閉じる）イベントリスナー
helpCloseBtn.addEventListener('click', closeHelp);

// 動画メタデータ読み込み
videoPlayer.addEventListener('loadedmetadata', () => {
    // 変換ファイル削除
    if (isConverting) {
        if (modeChange === 'video') {
            // 一時ファイル削除
            if (tempConvertFile) {
                ipcRenderer.invoke('delete-temp-file', tempConvertFile)
                    .catch(e => console.warn('一時ファイル削除失敗:', e));
            }
        } else {
            // プレイリスト更新
            const currentIndex = playlist.findIndex(item => item.file.path === baseConvertFile);
            if (currentIndex !== -1) {
                // プレイリストの該当エントリを更新
                playlist[currentIndex] = {
                    file: { path: tempConvertFile },
                    name: tempConvertFile
                };
                updatePlaylistDisplay();
            }

            // 動画ファイル削除
            if (baseConvertFile) {
                ipcRenderer.invoke('delete-temp-file', baseConvertFile)
                    .catch(e => console.warn('動画ファイル削除失敗:', e));
            }
        }
        const revoke = () => {
            URL.revokeObjectURL(blobUrl);
            videoPlayer.removeEventListener('ended', revoke);
            videoPlayer.removeEventListener('error', revoke);
        };
        videoPlayer.addEventListener('ended', revoke);
        videoPlayer.addEventListener('error', revoke);
        
        isConverting = false;
    }
    // 編集モードが開始していない状態にする
    isEditMode = false;
    editControls.style.display = 'none';
    updateEditModeButtonUI();   // ← これで最初から ✂️ が表示される

    seekBar.max = 100;
    updateTimeDisplay();
    updateVolumeDisplay();
    updateIconOverlay();
});

// 動画エラー（共通化・安全・モード対応）
videoPlayer.addEventListener('error', (e) => {
    // ① まずエラーオブジェクト全体をログ出力（最も情報量が多い）
    console.error('ビデオ再生エラー発生:', e);
    console.error('videoPlayer.error オブジェクト:', videoPlayer.error);
    
    // ② 具体的なエラーコードと意味を分かりやすく出力
    if (videoPlayer.error) {
        const err = videoPlayer.error;
        const errorDetails = {
            code: err.code,
            message: err.message || '詳細メッセージなし',
            // MediaError のコードに対応する意味（参考）
            code意味: {
                1: 'MEDIA_ERR_ABORTED (ユーザーが中止)',
                2: 'MEDIA_ERR_NETWORK (ネットワークエラー)',
                3: 'MEDIA_ERR_DECODE (デコードエラー・破損・非対応コーデック)',
                4: 'MEDIA_ERR_SRC_NOT_SUPPORTED (ソース非対応・形式非対応)'
            }[err.code] || '不明なエラーコード'
        };
        console.error('エラー詳細:', errorDetails);
    }

    const currentSrc = videoPlayer.src;
    if (!currentSrc) {
        console.warn('src が空です');
        return;
    }

    // Blob URL かローカルファイルかを判定
    let ext = '';
    try {
        if (currentSrc.startsWith('blob:')) {
            const currentItem = playlist[currentVideoIndex];
            if (currentItem?.file?.path) {
                ext = path.extname(currentItem.file.path).toLowerCase();
            }
        } else {
            ext = path.extname(currentSrc).toLowerCase();
        }
    } catch (err) {
        console.warn('拡張子抽出失敗:', err);
        return;
    }

    console.log(`再生しようとしたファイル拡張子: ${ext} (src: ${currentSrc})`);

    // 共通関数で判定
    if (isHTML5_SUPPORTED(ext)) {
        stopPeriodicSave();
        playPauseBtn.textContent = '▶️';
        playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
        updateIconOverlay();

        // エラー内容に応じてメッセージを細かく分ける（任意）
        let errorMsg = '再生エラー: ファイルが破損している可能性があります';
        if (videoPlayer.error) {
            switch (videoPlayer.error.code) {
                case 1: errorMsg = '再生がユーザーにより中止されました'; break;
                case 2: errorMsg = 'ネットワークエラーで読み込めません'; break;
                case 3: errorMsg = '動画のデコードに失敗しました（破損／コーデック非対応）'; break;
                case 4: errorMsg = 'このファイル形式は再生できません'; break;
            }
        }

        updateOverlayDisplay(errorMsg);
        setTimeout(hideOverlayDisplay, 4000);
    } else {
        // HTML5 でサポートされていない拡張子の場合も明確に伝える
        console.warn(`拡張子 ${ext} は HTML5 でサポートされていません`);
        updateOverlayDisplay(`再生エラー: ${ext} 形式は対応していません`);
        setTimeout(hideOverlayDisplay, 4000);
    }
});

// 再生時間更新
videoPlayer.addEventListener('timeupdate', () => {
    if (!isDragging && !seekBar.matches(':active') && !isMouseOverSeekBar) {
        const value = videoPlayer.duration ? (100 / videoPlayer.duration) * videoPlayer.currentTime : 0;
        seekBar.value = value;
        updateTimeDisplay();
        updateIconOverlay();
    }
});

// 動画終了：Blob URL 解放 + 次の動画へ
videoPlayer.addEventListener('ended', async () => {
    videoPlayer.currentTime = 0;
    localStorage.setItem('currentTime', 0);
    if (currentVideoIndex < playlist.length - 1) {
        nextVideoBtn.click();
    } else {
        playStopBtn.click();
    }
});

// 動画クリック
videoPlayer.addEventListener('contextmenu', async (event) => {
    event.preventDefault();
    if (event.ctrlKey) {
        playStopBtn.click();
    } else {
        await togglePlayPause();
        showControlsAndFilename();
        updateIconOverlay();
    }
});

// 動画ダブルクリック
videoPlayer.addEventListener('dblclick', (event) => {
    event.preventDefault();
    if (!document.fullscreenElement) {
        if (mainContainer.requestFullscreen) {
            mainContainer.requestFullscreen();
            fullscreenBtn.textContent = '❌';
            fullscreenBtn.setAttribute('data-tooltip', 'フルスクリーン解除（Ctrl+z／Double Click）');
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            fullscreenBtn.textContent = '🖥️';
            fullscreenBtn.setAttribute('data-tooltip', 'フルスクリーン表示（Ctrl+z／Double Click）');
        }
    }
    showControlsAndFilename();
    updateIconOverlay();
});

// マウス押下
videoPlayer.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
        if (isZoomMode) {
            // ズーム時はパン（画像移動）開始
            isPanning = true;
            panStartX = event.clientX;
            panStartY = event.clientY;
            videoPlayer.style.cursor = 'grabbing';
        } else {
            isDragging = true;
            dragStartX = event.clientX;
            dragStartY = event.clientY;
        }
        event.preventDefault();
    }
});

// マウス移動
videoPlayer.addEventListener('mousemove', (event) => {
    // ズームモード時のパン（画像移動）
    if (isPanning) {
        const deltaX = event.clientX - panStartX;
        const deltaY = event.clientY - panStartY;
        panStartX = event.clientX;
        panStartY = event.clientY;
        translateX += deltaX;
        translateY += deltaY;
        const scale = (100 + zoomValue) / 100;
        videoPlayer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        localStorage.setItem('translateX', translateX.toString());
        localStorage.setItem('translateY', translateY.toString());
        updateIconOverlay();
        showControlsAndFilename();
        return;
    }

    if (isDragging && videoPlayer.duration) {
        const deltaX = event.clientX - dragStartX;
        const deltaY = event.clientY - dragStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        if (absDeltaX > absDeltaY && absDeltaX > 5) {
            isVolumeDragging = false;
            const seekStep = videoPlayer.duration / 1000;
            const seekTime = deltaX * seekStep * seekSensitivity;
            let newTime = videoPlayer.currentTime + seekTime;
            newTime = Math.max(0, Math.min(videoPlayer.duration, newTime));
            videoPlayer.currentTime = newTime;
            seekBar.value = (100 / videoPlayer.duration) * newTime;
            updateTimeDisplay();
            updateOverlayDisplay(`🕓 ${formatTime(newTime)}`);
            localStorage.setItem('currentTime', newTime);
        } else if (absDeltaY > absDeltaX && absDeltaY > 5) {
            isVolumeDragging = true;
            const newVolume = videoPlayer.volume - (deltaY * volumeStep);
            videoPlayer.volume = Math.max(0, Math.min(1, newVolume));
            volumeBar.value = videoPlayer.volume;
            lastVolume = videoPlayer.volume;
            volumeMuteBtn.textContent = videoPlayer.volume === 0 ? '🔇' : '🔊';
            volumeMuteBtn.setAttribute('data-tooltip', videoPlayer.volume === 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
            updateVolumeDisplay();
            updateOverlayDisplay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`);
            localStorage.setItem('volume', videoPlayer.volume);
        }

        dragStartX = event.clientX;
        dragStartY = event.clientY;
        updateIconOverlay();
    }
});

// マウス解放
videoPlayer.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        const wasDragging = isDragging;
        const wasVolumeDragging = isVolumeDragging;
        const wasPanning = isPanning;

        isDragging = false;
        isVolumeDragging = false;
        isPanning = false;
        videoPlayer.style.cursor = 'auto';

        if (wasDragging || wasVolumeDragging || wasPanning) {
            showControlsAndFilename();
            updateIconOverlay();
        }
    }
});

// マウスリーブ
videoPlayer.addEventListener('mouseleave', () => {
    isDragging = false;
    isVolumeDragging = false;
    updateIconOverlay();
});

// マウス左クリックで表示/非表示をトグル
videoPlayer.addEventListener('click', (e) => {
    if (e.button === 0) {
        if (!isDragging && !isVolumeDragging) {
            const isVisible = 
                window.getComputedStyle(controls).opacity  === '1' ||
                window.getComputedStyle(filename).opacity  === '1';
            if (isVisible) {
                hideControlsAndFilename();
            } else {
                showControlsAndFilename();
            }
        }
        e.stopPropagation();
    }
});

// マウスホイール
videoPlayer.addEventListener('wheel', (event) => {
    event.preventDefault();
    const volumeStep = 0.01;
    if (event.deltaY < 0) {
        videoPlayer.volume = Math.min(1, videoPlayer.volume + volumeStep);
    } else if (event.deltaY > 0) {
        videoPlayer.volume = Math.max(0, videoPlayer.volume - volumeStep);
    }
    volumeBar.value = videoPlayer.volume;
    lastVolume = videoPlayer.volume;
    volumeMuteBtn.textContent = videoPlayer.volume === 0 ? '🔇' : '🔊';
    volumeMuteBtn.setAttribute('data-tooltip', videoPlayer.volume === 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
    updateVolumeDisplay();
    updateOverlayDisplay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`);
    localStorage.setItem('volume', videoPlayer.volume);
    showControlsAndFilename();
    updateIconOverlay();
});

// シークバー ドラッグ
seekBar.addEventListener('input', (e) => {
    if (controls.style.opacity !== '1') return;
    if (!videoPlayer.duration) return;
    const time = videoPlayer.duration * (seekBar.value / 100);
    videoPlayer.currentTime = time;
    // 編集モード中は編集用シークバーも同期
    if ((isEditMode || (typeof editControls !== 'undefined' && editControls && editControls.style.display !== 'none')) && typeof editSeekBar !== 'undefined' && editSeekBar) {
        editSeekBar.value = (time / videoPlayer.duration) * 100;
    }
    updateTimeDisplay();
    updateOverlayDisplay(`🕓 ${formatTime(time)}`);
});

// シークバー スライダー変更
seekBar.addEventListener('change', () => {
    if (controls.style.opacity !== '1') return;
    if (!videoPlayer.duration) return;
    // mouseup で既に処理済みなので、最終同期のみ
    updateTimeDisplay();
    localStorage.setItem('currentTime', videoPlayer.currentTime);
});

// シークバー マウスクリック
seekBar.addEventListener('mousedown', (e) => {
    if (controls.style.opacity !== '1') return;
    if (e.button === 0 && videoPlayer.duration) {
        videoPlayer.currentTime = videoPreview.currentTime;
        isDragging = true;
        isSeekDragging = true;
        darkOverlay.style.display = 'block';
    }
});

// シークバー マウスオーバー
seekBar.addEventListener('mouseover', (e) => {
    if (controls.style.opacity !== '1') return;
    if (!videoPlayer.duration || playlist.length === 0) return;
    isMouseOverSeekBar = true;
    videoPreview.style.display = 'block';
    updatePreviewPosition(e);
});

// シークバー マウス移動
seekBar.addEventListener('mousemove', (e) => {
    if (controls.style.opacity !== '1') return;
    if (!videoPlayer.duration || !isMouseOverSeekBar) return;
    const rect = seekBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = videoPlayer.duration * percent;

    // プレビュー時間更新
    if (Math.abs(videoPreview.currentTime - time) > 0.5) {
        videoPreview.currentTime = time;
    }

    // プレビュー位置更新
    updatePreviewPosition(e);

    // シークバー表示更新（ドラッグ中は無視）
    if (!isSeekDragging) {
        seekBar.value = percent * 100;
        timeDisplay.textContent = `${formatTime(time)} / ${formatTime(videoPlayer.duration)}`;
    }
});

// シークバー マウスアウト
seekBar.addEventListener('mouseout', () => {
    if (controls.style.opacity !== '1') return;
    isMouseOverSeekBar = false;
    videoPreview.style.display = 'none';
    // 通常の時間表示に戻す
    if (!isSeekDragging && videoPlayer.duration) {
        const value = (100 / videoPlayer.duration) * videoPlayer.currentTime;
        seekBar.value = value;
        updateTimeDisplay();
    }
});

// シークバー マウスリーブ
seekBar.addEventListener('mouseleave', () => {
    if (controls.style.opacity !== '1') return;
    if (isSeekDragging && !seekBar.matches(':active')) {
        isSeekDragging = false;
        darkOverlay.style.display = 'none';
    }
});

// 音量バー入力
volumeBar.addEventListener('input', () => {
    if (controls.style.opacity !== '1') return;
    videoPlayer.volume = volumeBar.value;
    lastVolume = videoPlayer.volume;
    volumeMuteBtn.textContent = videoPlayer.volume === 0 ? '🔇' : '🔊';
    volumeMuteBtn.setAttribute('data-tooltip', videoPlayer.volume === 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
    updateVolumeDisplay();
    updateOverlayDisplay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`);
    localStorage.setItem('volume', videoPlayer.volume);
    updateIconOverlay();
});

// 音量バーマウス移動
volumeBar.addEventListener('mousemove', (e) => {
    if (controls.style.opacity !== '1') return;
    if (volumeBar.matches(':active') || e.buttons === 1) {
        e.stopPropagation();
        const rect = volumeBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x >= 0 && x <= rect.width) {
            const volume = (x / rect.width);
            const volumePercent = Math.round(volume * 100);
            updateOverlayDisplay(`${volume === 0 ? '🔇' : '🔊'} ${volumePercent}%`);
        }
        showControlsAndFilename();
        updateIconOverlay();
    }
});

// 音量バーマウスリーブ
volumeBar.addEventListener('mouseleave', () => {
    if (controls.style.opacity !== '1') return;
    if (!isDragging && !volumeBar.matches(':active')) {
        if (!isVolumeDragging && !volumeBar.matches(':active')) {
            hideOverlayDisplay();
        }
        updateIconOverlay();
    }
});

// 再生速度セレクト
if (speedSelect) {
    speedSelect.addEventListener('change', (e) => {
        if (controls.style.opacity !== '1') return;
        const rate = parseFloat(e.target.value);
        if (!isNaN(rate) && rate > 0) {
            currentPlaybackRate = rate;               // ← ここを追加
            videoPlayer.playbackRate = rate;
            localStorage.setItem('playbackSpeed', rate);
            updateOverlayDisplay(`🏃‍♂️‍➡️再生速度: ${rate}x`);
            setTimeout(hideOverlayDisplay, 1000);
        }
    });
}

// 再生速度設定ヘルパー
function setPlaybackRate(rate, showOverlay = true) {
    if (isNaN(rate) || rate <= 0) return;
    currentPlaybackRate = rate;                    // ← 追加
    videoPlayer.playbackRate = rate;
    if (speedSelect) speedSelect.value = parseFloat(rate).toFixed(2);
    localStorage.setItem('playbackSpeed', rate);
    if (showOverlay) {
        updateOverlayDisplay(`🏃‍♂️‍➡️再生速度: ${rate}x`);
        setTimeout(hideOverlayDisplay, 1000);
    }
}

function changePlaybackRate(direction) { // direction: 1 増速, -1 減速
    const current = parseFloat(videoPlayer.playbackRate || 1.0);
    let idx = playbackRates.findIndex(r => Math.abs(r - current) < 0.001);
    if (idx === -1) {
        idx = playbackRates.reduce((best, r, i) => Math.abs(r - current) < Math.abs(playbackRates[best] - current) ? i : best, 0);
    }
    let newIdx = idx + direction;
    newIdx = Math.max(0, Math.min(newIdx, playbackRates.length - 1));
    const newRate = playbackRates[newIdx];
    if (newRate !== playbackRates[idx]) {
        setPlaybackRate(newRate);
    } else {
        updateOverlayDisplay(`🏃‍♂️‍➡️再生速度: ${playbackRates[newIdx]}x`);
        setTimeout(hideOverlayDisplay, 700);
    }
}

function increasePlaybackRate() { changePlaybackRate(1); }
function decreasePlaybackRate() { changePlaybackRate(-1); }

// コントロールマウスオーバー
controls.addEventListener('mouseover', () => {
    if (controls.style.opacity === '1' || filename.style.opacity === '1') {
        isMouseOverControls = true;
        clearTimeout(timeout);
        controls.style.opacity = '1';
        filename.style.opacity = '1';
        videoContainer.style.cursor = 'auto';
        if (overlayDisplay.classList.contains('active')) {
            overlayDisplay.style.display = 'block';
            overlayDisplay.classList.add('active');
        }
        updateIconOverlay();
    }
});

// コントロールマウスリーブ
controls.addEventListener('mouseleave', () => {
    if (controls.style.opacity === '1' || filename.style.opacity === '1') {
        isMouseOverControls = false;
        showControlsAndFilename();
        updateIconOverlay();
    }
});

// ファイル名マウスオーバー
filename.addEventListener('mouseover', () => {
    if (controls.style.opacity === '1' || filename.style.opacity === '1') {
        isMouseOverControls = true;
        showControlsAndFilename();
        updateIconOverlay();
    }
});

// ファイル名マウスリーブ
filename.addEventListener('mouseleave', () => {
    if (controls.style.opacity === '1' || filename.style.opacity === '1') {
        isMouseOverControls = false;
        showControlsAndFilename();
        updateIconOverlay();
    }
});

// 動画マウス移動
videoContainer.addEventListener('mousemove', () => {
    videoContainer.style.cursor = 'auto';
    updateIconOverlay();
});

// ツールチップイベント設定
tooltipElements.forEach(element => {
    element.addEventListener('mouseenter', () => showTooltip(element));
    element.addEventListener('mouseleave', () => hideTooltip(element));
});

// 上へボタン
upMovePlaylistBtn.addEventListener('click', () => {
    upMovePlaylist();
});

// 下へボタン
downMovePlaylistBtn.addEventListener('click', () => {
    downMovePlaylist();
});

// 追加ボタン
addPlaylistBtn.addEventListener('click', () => {
    addToPlaylist();
});

// 削除ボタン
removePlaylistBtn.addEventListener('click', () => {
    removeFromPlaylist();
});

// クリアボタン
clearPlaylistBtn.addEventListener('click', () => {
    clearPlaylist();
});        

// 保存ボタン
savePlaylistBtn.addEventListener('click', () => {
    savePlaylist();
});

// プレイリスト編集メニュー
filenameMenu.addEventListener('click', () => {
    if (filenameMenus.style.display === 'none') {
        filenameMenus.style.display = 'flex';
        filenameMenu.textContent = '❌';           // 表示中 → 緑信号
        filenameMenu.setAttribute('data-tooltip', 'プレイリスト編集メニューを閉じる (Shift+m)');
    } else {
        filenameMenus.style.display = 'none';
        filenameMenu.textContent = '🚥';           // 非表示 → 禁止マーク
        filenameMenu.setAttribute('data-tooltip', 'プレイリスト編集メニューを開く (Shift+m)');
    }
});

// 既存のドラッグ＆ドロップ処理無効化
['dragover', 'dragenter', 'dragleave'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
    });
});

// ドラッグ＆ドロップ処理
dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const fullPaths = [];
    for (const file of files) {
        try {
            const fullPath = await getFilePath(file); // ← preloadで公開済み
            if (fullPath) fullPaths.push(fullPath);
        } catch (err) {
            console.error('getFilePath失敗:', err);
        }
    }

    if (fullPaths.length > 0) {
        await addFilesFromPaths(fullPaths);
    }
});

// 編集モード切替
editModeBtn.addEventListener('click', () => {
    if (!videoPlayer.src) {
        updateOverlayDisplay('❌ 動画が読み込まれていません');
        return;
    }
    
    isEditMode = !isEditMode;
    if (isEditMode) {
        editControls.style.display = 'flex';
        editModeBtn.classList.add('active');
        // 初期化
        editInMark = -1;
        editOutMark = -1;
        inMarkDisplay.textContent = '--:--:--';
        outMarkDisplay.textContent = '--:--:--';
        cutRanges = [];           // ← 必要に応じてここでリセット（好みで外しても可）
        renderCutRanges();
    } else {
        editControls.style.display = 'none';
        editModeBtn.classList.remove('active');
        hideOverlayDisplay();
    }
    // ボタン表示を更新（ここが今回のメイン変更点）
    updateEditModeButtonUI();
});

// カット中断
cutCancelBtn.addEventListener('click', async () => {
    try {
        await ipcRenderer.invoke('cancel-cut');
        updateOverlayDisplay('中断しました');
    } catch (e) {
        console.error('cancel-cut failed:', e);
        updateOverlayDisplay('中断に失敗しました');
    } finally {
        cutCancelBtn.style.display = 'none';
        setTimeout(hideOverlayDisplay, 1200);
    }
});

// インマーク設定
setInMarkBtn.addEventListener('click', () => {
    if (videoPlayer.duration) {
        editInMark = videoPlayer.currentTime;
        inMarkDisplay.textContent = `${formatTime(editInMark)} (${Math.round(editInMark * editFrameRate)}f)`;
    }
});

// アウトマーク設定
setOutMarkBtn.addEventListener('click', () => {
    if (videoPlayer.duration) {
        editOutMark = videoPlayer.currentTime;
        
        // アウトマークがインマークより前ならスワップ
        if (editOutMark < editInMark) {
            [editInMark, editOutMark] = [editOutMark, editInMark];
            inMarkDisplay.textContent = `${formatTime(editInMark)} (${Math.round(editInMark * editFrameRate)}f)`;
        }
        
        outMarkDisplay.textContent = `${formatTime(editOutMark)} (${Math.round(editOutMark * editFrameRate)}f)`;
    }
});

// 編集シークバー
editSeekBar.addEventListener('input', () => {
    if (videoPlayer.duration) {
        const newTime = (parseFloat(editSeekBar.value) / 100) * videoPlayer.duration;
        videoPlayer.currentTime = newTime;
        // seekBarも同期
        seekBar.value = (newTime / videoPlayer.duration) * 100;
        updateTimeDisplay();
    }
});

// キャンセル
clearEditBtn.addEventListener('click', () => {
    // カット範囲を全削除
    cutRanges = [];

    // マークもクリア（次のカットをすぐ設定できるように）
    editInMark = -1;
    editOutMark = -1;
    inMarkDisplay.textContent = '--:--:--';
    outMarkDisplay.textContent = '--:--:--';

    // リスト再描画
    renderCutRanges();
});

// --- カット設定追加ボタン ---
addCutRangeBtn.addEventListener('click', () => {
    if (editInMark < 0 || editOutMark < 0) {
        updateOverlayDisplay('❌ INマークとOUTマークを両方設定してください');
        return;
    }
    let a = editInMark;
    let b = editOutMark;
    if (a >= b) {
        // スワップして正規化
        [a, b] = [b, a];
    }
    cutRanges.push({ in: a, out: b });
    renderCutRanges();
    // 追加後はマークをクリア
    editInMark = -1;
    editOutMark = -1;
    inMarkDisplay.textContent = '--:--:--';
    outMarkDisplay.textContent = '--:--:--';
});

// レンジ一覧描画
function renderCutRanges() {
    cutRangesList.innerHTML = '';
    if (!cutRanges || cutRanges.length === 0) {
        cutRangesList.textContent = '（なし）';
        return;
    }
    cutRanges.forEach((r, idx) => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.padding = '2px 4px';
        const label = document.createElement('div');
        label.textContent = `カット${idx + 1}: ${formatTime(r.in)} (${Math.round(r.in * editFrameRate)}f) - ${formatTime(r.out)} (${Math.round(r.out * editFrameRate)}f)`;
        label.style.flex = '1';
        const del = document.createElement('button');
        del.textContent = '🗑️';
        del.style.marginLeft = '8px';
        del.addEventListener('click', () => {
            cutRanges.splice(idx, 1);
            renderCutRanges();
        });
        div.appendChild(label);
        div.appendChild(del);
        cutRangesList.appendChild(div);
    });
}

// --- 動画保存（設定した複数範囲を削除して保存） ---
saveVideoBtn.addEventListener('click', async () => {
    if (!videoPlayer.src) {
        updateOverlayDisplay('❌ 動画が読み込まれていません');
        return;
    }
    if (!cutRanges || cutRanges.length === 0) {
        updateOverlayDisplay('❌ 保存するためのカット範囲が設定されていません');
        return;
    }

    try {
        // 非編集モードに
        isEditMode = false;
        editControls.style.display = 'none';
        editModeBtn.classList.remove('active');

        const currentFile = playlist[currentVideoIndex];
        if (!currentFile) return;

        const fileName = path.basename(currentFile.file.path);
        const baseNameWithoutExt = path.parse(fileName).name;
        const ext = path.extname(fileName);
        const defaultOutName = `${baseNameWithoutExt}_trimmed${ext}`;

        const saveResult = await ipcRenderer.invoke('show-save-cut-dialog', { fileName: defaultOutName });
        if (saveResult.canceled) {
            setTimeout(hideOverlayDisplay, 1500);
            return;
        }

        updateOverlayDisplay('✂️ カット（削除）処理中… 0%', true);

        // フレーム単位へ丸めたレンジを作成して main.js に送る
        const alignedRanges = (cutRanges || []).map(r => {
            const startFrame = Math.round(r.in * editFrameRate);
            const endFrame = Math.round(r.out * editFrameRate);
            const start = startFrame / editFrameRate;
            const end = endFrame / editFrameRate;
            return { in: start, out: end };
        });

        // main.js に複数範囲削除のハンドラを呼ぶ
        const outputPath = await ipcRenderer.invoke('cut-video-multiple', {
            inputPath: currentFile.file.path,
            ranges: alignedRanges,
            outputPath: saveResult.filePath,
            frameRate: editFrameRate
        });

        if (!outputPath) {
            updateOverlayDisplay('✂️ 中断されました');
            console.log('カット（複数）中断');
        } else {
            updateOverlayDisplay(`✂️ 保存完了`);
            console.log('カット（複数）完了:', outputPath);
        }

        // カット篆囲は保持し適用可能にして保持
        setTimeout(hideOverlayDisplay, 2000);
    } catch (err) {
        console.error('カット（複数）処理エラー:', err);
        updateOverlayDisplay(`❌ カット失敗: ${err.message}`);
        setTimeout(hideOverlayDisplay, 3000);
    } finally {
        editInMark = -1;
        editOutMark = -1;
        inMarkDisplay.textContent = '--:--:--';
        outMarkDisplay.textContent = '--:--:--';
    }
});

// 編集モード時にシークバーを同期
videoPlayer.addEventListener('timeupdate', () => {
    if (isEditMode && videoPlayer.duration && !isMouseOverSeekBar) {
        editSeekBar.value = (videoPlayer.currentTime / videoPlayer.duration) * 100;
        // 双方のシークバーを同期
        seekBar.value = (videoPlayer.currentTime / videoPlayer.duration) * 100;
    }
});

