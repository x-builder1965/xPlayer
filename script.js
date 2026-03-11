// ---------------------------------------------------------------------
const copyright = 'Copyright © 2025 @x-builder, Japan';
const email = 'x-builder@gmail.com';
const appName = 'xPlayer -動画プレイヤー- Ver3.53';
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
// 2026-02-15 Ver3.24 カット編集機能（✂️）追加。
// 2026-02-15 Ver3.25 カット編集機能の改善。
// 2026-02-25 Ver3.26 ズーム機能（🔍）追加（-90%～+90%）。
// 2026-02-25 Ver3.27 ズーム機能をドロップダウンから縦型スライダー(-100%～+100%)に変更。
// 2026-02-25 Ver3.28 ズームモード中のショートカットキー追加（Ctrl+↑/↓/0）。
// 2026-02-25 Ver3.29 ズームモード中の画像移動機能追加。
// 2026-02-26 Ver3.30 ズームリセットボタン追加。
// 2026-02-26 Ver3.31 ズームパネルをサイズ調整に対応。
// 2026-02-26 Ver3.32 ズームパネルにズーム終了ボタン追加。
// 2026-02-27 Ver3.33 ズームモード中の←、→の移動量を詳細化。
// 2026-02-27 Ver3.34 スナップショット機能（📷）追加準備と微調整
// 2026-02-27 Ver3.35 再生速度の保存と復元の追加
// 2026-03-01 Ver3.36 カット編集の全クリア機能追加。
// 2026-03-02 Ver3.37 ネット動画再生操作変更。
// 2026-03-03 Ver3.38 スナップショット機能追加。
// 2026-03-03 Ver3.39 ズームパネルの透過率調整。
// 2026-03-03 Ver3.40 スナップショット起動時パネル非表示。
// 2026-03-03 Ver3.41 Url入力（🌐）にクリアボタン（🆑）追加。
// 2026-03-04 Ver3.42 クリップボード読み込み関連処理の見直し修正。
// 2026-03-05 Ver3.43 カット編集の実装見直し修正。
// 2026-03-06 Ver3.44 カット編集時のクラッシュ（FFmpegメモリリーク）対応（対応限界）。
// 2026-03-07 Ver3.45 ランダム再生（🔀）（Ctrl+r）／繰り返し再生（🔁）（Ctrl+Shift+r）機能追加。
// 2026-03-07 Ver3.46 カット編集機能（✂️）のクラッシュ対応。
// 2026-03-07 Ver3.47 カット編集中（✂️）の疑似再生機能、カット範囲表示機能追加。
// 2026-03-07 Ver3.48 ズームモード中（🔍）マウスホイールで拡大縮小。
// 2026-03-08 Ver3.49 カット編集機能（✂️）のクラッシュ対応の最適化。
// 2026-03-09 Ver3.50 シークバーの挙動改善。
// 2026-03-10 Ver3.51 結合編集（🎞️）機能追加。
// 2026-03-11 Ver3.52 プレイリスト並び替え（📩）（Shift+m）機能追加。
// 2026-03-11 Ver3.53 １動画繰り返し再生（🔂）（Ctrl+Shift+r）機能追加。
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
// 並び替えメニューの定義
const SORT_MODES = {
    none:       { label: '（なし）',    fn: () => getPlaylistInOriginalOrder() },
    path_asc:   { label: '動画パス▲',   fn: () => [...playlist].sort((a, b) => a.file.path.localeCompare(b.file.path)) },
    path_desc:  { label: '動画パス▼',   fn: () => [...playlist].sort((a, b) => b.file.path.localeCompare(a.file.path)) },
    ctime_asc:  { label: '作成日時▲',   fn: async () => await sortByCreationTime(true) },
    ctime_desc: { label: '作成日時▼',   fn: async () => await sortByCreationTime(false)},
    random:     { label: '（ランダム）',fn: sortRandomPlaylist }
};

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
const randomPlayBtn = document.getElementById('randomPlayBtn');
const repeatPlayBtn  = document.getElementById('repeatPlayBtn');
const joinPlaylistBtn = document.getElementById('joinPlaylistBtn');

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
const editFrameRate = localStorage.getItem('editFrameRate') ? parseFloat(localStorage.getItem('editFrameRate')) : 30;
const savedRandomPlay = localStorage.getItem('randomPlayMode');
const savedRepeatPlay = localStorage.getItem('repeatPlayMode');
const savedShuffleOrder = localStorage.getItem('shuffleOrder');
const savedShufflePosition = localStorage.getItem('shufflePosition');
const cutTimelineContainer = document.getElementById('cutTimelineContainer');
const cutTimelineBar = document.getElementById('cutTimelineBar');

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
let isCutEditing = false;  // カット編集中フラグ
let isJoinEditing = false;  // カット編集中フラグ
let isRandomPlayMode = false;     // ランダム再生（シャッフル）
let isRepeatPlayMode  = false;     // リスト全体繰り返し
let shuffleOrder = [];           // ランダムモード用の再生順リスト（インデックス配列）
let shufflePosition = -1;        // 現在何番目を再生中か（-1=未開始）
let isEditSeekDragging = false;
let isMouseOverEditSeekBar = false;
let currentSortMode = localStorage.getItem('playlistSortMode') || 'none';   // localStorage に保存された値があればそれを使う、なければ 'none'（読み込み順）
let originalLoadOrder = [];  // プレイリストの「最初に読み込まれた順」を保持
let repeatMode = 'none';  // 'none' | 'all' | 'single'

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

// 初期化時にアイコンを正しく設定
updateUrlButtonIcon();

// 初期状態：メニューは閉じておく
filenameMenus.style.display = 'none';
filenameMenu.textContent = '📚';
filenameMenu.setAttribute('data-tooltip', 'プレイリスト編集メニューを開く (Ctrl+l)');

// 再生モード復元
if (savedRandomPlay === 'true') {
    isRandomPlayMode = true;
}
if (savedRepeatPlay === 'true') {
    isRepeatPlayMode = true;
}

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

// 繰り返し再生モード復元
const savedRepeatMode = localStorage.getItem('repeatMode');
if (savedRepeatMode && ['none', 'all', 'single'].includes(savedRepeatMode)) {
    repeatMode = savedRepeatMode;
} else {
    repeatMode = 'none';
}
updateRepeatButtonUI();

// ランダム再生リスト復元
if (savedShuffleOrder) {
    try {
        const parsedPlaylist = JSON.parse(savedPlaylist);
        shuffleOrder = JSON.parse(savedShuffleOrder);
        // プレイリストの長さが変わっていたら無効化
        if (!Array.isArray(shuffleOrder) || shuffleOrder.length !== parsedPlaylist.length) {
            shuffleOrder = [];
        }
    } catch (e) {
        console.warn('shuffleOrder の復元に失敗:', e);
        shuffleOrder = [];
    }
}

// ランダム再生ポジション復元
if (savedShufflePosition !== null) {
    shufflePosition = parseInt(savedShufflePosition, 10);
    if (isNaN(shufflePosition) || shufflePosition < -1) {
        shufflePosition = -1;
    }
}
updateRandomPlayButton();
updateRepeatPlayButton();

// コントロールサイズ適用
let controlSizeX = calculateControlSizeX();
let controlSizeY = calculateControlSizeY();
localStorage.setItem('controlSizeX', controlSizeX);
localStorage.setItem('controlSizeY', controlSizeY);
updateControlSize(controlSizeX, controlSizeY);

// 起動時の引数有無判定
(async () => {
    const args = await ipcRenderer.invoke('get-command-line-args');
    if (args && args.length > 0) {
        // main.js が auto-play-files を送信するので、ここでは何もしない
        return;
    }

    // ── 引数なし → 状態復元 ──
    const savedOriginalOrder = localStorage.getItem('originalLoadOrder');
    if (savedOriginalOrder) {
        try {
            originalLoadOrder = JSON.parse(savedOriginalOrder);
        } catch (e) {
            console.warn('originalLoadOrder の復元に失敗:', e);
            originalLoadOrder = [];
        }
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

// 🔲ヘルパー関数🔲
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
    const padding = 1 + (valueX / 100) * (8 - 1);
    const appNameAndCopyrightFontSize = 8 + (valueX / 100) * (17 - 8);
    const appNameAndCopyrightPadding = 1 + (valueX / 100) * (8 - 1);
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

// カット編集モードがアクティブ判定
function isCutEditModeActive() {
    return isEditMode || 
           (editControls && editControls.style.display !== 'none');
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
            if (!isMouseOverControls && !isCutEditModeActive()) {
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
    hideMenus(); // 追加：コントロール非表示時にメニューも強制非表示
    clearTimeout(timeout);
    setTimeout(() => {
        overlayDisplay.style.display = 'none';
    }, 300);
    updateIconOverlay();
}

// メニュー非表示（プレイリスト並び替えメニューなど）
function hideMenus() {
    // 追加：開いている可能性のあるすべてのコンテキストメニューを強制非表示
    document.querySelectorAll('.sort-menu, .context-menu, .dropdown-menu').forEach(el => {
        el.remove();  // または el.style.display = 'none';
    });

    // 念のためbody直下のfloat系メニューも掃除（必要に応じてクラス指定を厳しくする）
    document.querySelectorAll('body > .menu, body > [class*="menu"]').forEach(el => {
        if (!el.contains(sortPlaylistBtn)) {  // ボタン自身が含まれるものは除外したい場合は
            el.remove();
        }
    });
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
function updateOverlayDisplay(content, isInitial = false, autoHideAfter = 3000) {
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

    // 自動非表示の処理
    if (autoHideAfter > 0) {
        // 以前のタイマーが残っていたらクリア（複数回呼び出し対策）
        if (overlayDisplay._autoHideTimer) {
            clearTimeout(overlayDisplay._autoHideTimer);
        }

        overlayDisplay._autoHideTimer = setTimeout(() => {
            hideOverlayDisplay();
        }, autoHideAfter);
    }
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

// ランダム再生更新
function updateRandomPlayButton() {
    randomPlayBtn.classList.toggle('active', isRandomPlayMode);
}

// 繰り返し再生更新
function updateRepeatPlayButton() {
    repeatPlayBtn.classList.toggle('active', isRepeatPlayMode);
}

// ランダム再生トグル
function toggleRandomPlay() {
    const wasRandom = isRandomPlayMode;
    isRandomPlayMode = !isRandomPlayMode;
    localStorage.setItem('randomPlayMode', isRandomPlayMode);
    updateRandomPlayButton();

    if (isRandomPlayMode && !wasRandom) {
        // 通常 → ランダム に変更（ケース1・3）
        if (!shuffleOrder || shuffleOrder.length !== playlist.length) {
            shuffleOrder = [...Array(playlist.length).keys()];
            shuffle(shuffleOrder);
        }

        // ケース3対応：（ランダム）が選択中なら表示に適用
        if (currentSortMode === 'random') {
            const currentPath = playlist[currentVideoIndex]?.file?.path;
            playlist = shuffleOrder.map(i => ({ ...playlist[i] }));

            if (currentPath) {
                currentVideoIndex = playlist.findIndex(p => p.file.path === currentPath);
                if (currentVideoIndex < 0) currentVideoIndex = 0;
            }

            shufflePosition = shuffleOrder.indexOf(currentVideoIndex);
            if (shufflePosition < 0) shufflePosition = 0;

            updatePlaylistDisplay();
        }
        // ケース1ではここまで来ない（表示変更なし）

        shufflePosition = shuffleOrder.indexOf(currentVideoIndex);
        if (shufflePosition < 0) shufflePosition = 0;

        savePlaylistAndPlaybackState();
        saveShuffleState();
    } 
    else if (!isRandomPlayMode && wasRandom) {
        // ランダム → 通常 に変更（ケース2・4）
        // playlist と filenameDisplay は一切変更しない（定義通り）
        shuffleOrder = [];
        shufflePosition = -1;
        saveShuffleState();

        // 表示はそのまま、次回 next/prev が通常順になるだけ
    }
}

// シンプルなFisher-Yatesシャッフル
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 再シャッフル
function resetShuffle() {
    if (isRandomPlayMode) {
        // ランダムモードONになった → シャッフル順を今生成
        shuffleOrder = [...Array(playlist.length).keys()]; // 0〜length-1 の配列
        shuffle(shuffleOrder);                             // シャッフル
        shufflePosition = -1;                              // リセット
    } else {
        // OFFになったらクリア
        shuffleOrder = [];
        shufflePosition = -1;
    }
}

// 繰り返し再生トグル
function toggleRepeatPlay() {
    isRepeatPlayMode = !isRepeatPlayMode;
    localStorage.setItem('repeatPlayMode', isRepeatPlayMode);
    updateRepeatPlayButton();
}

// 前再生動画取得
function getPrevVideoIndex() {
    if (playlist.length === 0) return -1;
    if (repeatMode === 'single') {
        return currentVideoIndex;
    }
    if (isRandomPlayMode) {
        // ランダムモード
        shufflePosition--;
        if (shufflePosition < 0) {
            if (repeatMode === 'all') {  // 修正: isRepeatPlayMode → repeatMode === 'all'
                shufflePosition = shuffleOrder.length - 1;
            } else {
                shufflePosition = 0;
                saveShuffleState(); // 現在のシャッフル位置を保存
                return -1;
            }
        }
        saveShuffleState(); // 現在のシャッフル位置を保存
        return shuffleOrder[shufflePosition];
    } else {
        // 通常順
        let normalPosition = currentVideoIndex - 1;
        if (normalPosition < 0) {
            if (repeatMode === 'all') {  // 修正: isRepeatPlayMode → repeatMode === 'all'
                normalPosition = playlist.length - 1;
            } else {
                return -1;
            }
        }
        return normalPosition;
    }
}

// 次再生動画取得
function getNextVideoIndex() {
    if (playlist.length === 0) return -1;
    if (repeatMode === 'single') {
        // 1動画ループ中は次へ行かせない
        return currentVideoIndex;
    }
    if (isRandomPlayMode) {
        // ランダムモード
        shufflePosition++;
        if (shufflePosition >= shuffleOrder.length) {
            if (repeatMode === 'all') {  // 修正: isRepeatPlayMode → repeatMode === 'all'
                shufflePosition = 0;
            } else {
                shufflePosition = shuffleOrder.length - 1;
                saveShuffleState(); // 現在のシャッフル位置を保存
                return -1;
            }
        }
        saveShuffleState(); // 現在のシャッフル位置を保存
        return shuffleOrder[shufflePosition];
    } else {
        // 通常順
        let normalPosition = currentVideoIndex + 1;
        if (normalPosition >= playlist.length) {
            if (repeatMode === 'all') {  // 修正: isRepeatPlayMode → repeatMode === 'all'
                normalPosition = 0;
            } else {
                return -1;
            }
        }
        return normalPosition;
    }
}

function saveShuffleState() {
    if (isRandomPlayMode) {
        localStorage.setItem('shuffleOrder', JSON.stringify(shuffleOrder));
        localStorage.setItem('shufflePosition', shufflePosition.toString());
    } else {
        // ランダムOFFならクリア
        localStorage.removeItem('shuffleOrder');
        localStorage.removeItem('shufflePosition');
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

// カット範囲を時間順にソート＆マージ
function getSortedAndMergedCutRanges() {
    if (!cutRanges || cutRanges.length === 0) return [];

    const sorted = [...cutRanges].sort((a, b) => a.in - b.in);
    const merged = [];
    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].in <= current.out) {
            current.out = Math.max(current.out, sorted[i].out);
        } else {
            merged.push(current);
            current = { ...sorted[i] };
        }
    }
    merged.push(current);

    return merged;
}

// 現在時刻から見て「次に進むべき有効な位置」を返す
function findNextValidPosition(currentTime) {
    const ranges = getSortedAndMergedCutRanges();
    if (ranges.length === 0) return -1;

    for (const r of ranges) {
        if (currentTime < r.in) {
            return currentTime; // 今いる場所が有効
        }
        if (currentTime >= r.in && currentTime < r.out) {
            return r.out; // カット範囲の終了後にジャンプ
        }
    }
    return -1; // 全てのカット後 → そのまま最後まで
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

        // カット編集モードで、かつカット範囲がある場合 → 次の有効な位置へジャンプ
        const isInEditMode = isEditMode || (editControls && editControls.style.display !== 'none');
        if (isInEditMode && cutRanges.length > 0) {
            const nextPos = findNextValidPosition(videoPlayer.currentTime);

            if (nextPos >= 0 && nextPos < videoPlayer.duration) {
                videoPlayer.currentTime = nextPos;
            }
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
            updateOverlayDisplay(`変換失敗`, false, 5000);
            filenameDisplay.innerHTML = `<option value="">${appNameAndCopyrightValue}</option>`;
            updateIconOverlay();
            // 変換失敗時もシークバーをリセット
            seekBar.value = 0;
            // 変換失敗時もシークバーの色を元に戻す
            seekBar.classList.remove('converting');
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

        // 新規プレイリスト作成 → 並び替えを「なし」に強制リセット
        currentSortMode = 'none';
        localStorage.setItem('playlistSortMode', 'none');

        // ★ ここで必ず現在の順番を基準として保存（上書き）
        const currentPaths = videoFiles.map(file => file.path);
        originalLoadOrder = [...currentPaths];
        localStorage.setItem('originalLoadOrder', JSON.stringify(originalLoadOrder));

        // playlist を生の順でセット
        playlist = videoFiles.map(file => ({
            file: { path: file.path },
            name: file.path
        }));

        currentVideoIndex = 0;
        localStorage.setItem('currentTime', 0);

        await playVideo(playlist[currentVideoIndex].file);
        savePlaylistAndPlaybackState();
        resetShuffle();
        saveShuffleState();

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

        if (videoPlayer.play) {
            videoPlayer.pause();
            playPauseBtn.textContent = '▶️';
            playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
            localStorage.setItem('currentTime', videoPlayer.currentTime);
            stopPeriodicSave();
        }
        editSeekBar.value = seekBar.value;
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

        const newFiles = files.map(file => ({ path: file.path, name: file.path }));

        let insertIndex = playlist.length; // 末尾追加
        const formattedFiles = newFiles.map(f => ({ file: { path: f.path }, name: f.name }));
        playlist.splice(insertIndex, 0, ...formattedFiles);

        // ★ 追加後も「現在のプレイリスト順」を「なし」の基準とする
        const currentPaths = playlist.map(item => item.file.path);
        originalLoadOrder = [...currentPaths];
        localStorage.setItem('originalLoadOrder', JSON.stringify(originalLoadOrder));

        updatePlaylistDisplay();
        savePlaylistAndPlaybackState();
        resetShuffle();
        saveShuffleState();

        showControlsAndFilename();
    } catch (e) {
        console.error('追加エラー:', e);
        updateOverlayDisplay('動画追加に失敗', false, 5000);
    }
}

// プレイリスト削除
async function removeFromPlaylist() {
    const selectedIndex = parseInt(filenameDisplay.value);
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= playlist.length) {
        updateOverlayDisplay('削除する動画を選択してください', false, 2000);
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
    resetShuffle();
    saveShuffleState(); // 現在のシャッフル位置を保存
    showControlsAndFilename();
}

// プレイリストクリア
async function clearPlaylist() {
    if (playlist.length === 0) return;

    await cleanupTempFiles();

    filenameDisplay.innerHTML = `<option value="">${appNameAndCopyrightValue}</option>`;
    updateIconOverlay();
    playStopBtn.click();

    playlist.length = 0;
    currentVideoIndex = -1;

    // ★ クリアしたら基準順もクリア
    originalLoadOrder = [];
    localStorage.removeItem('originalLoadOrder');

    savePlaylistAndPlaybackState();
    resetShuffle();
    saveShuffleState();
    showControlsAndFilename();
}

// プレイリスト保存
async function savePlaylist() {
    if (playlist.length === 0) {
        updateOverlayDisplay('保存する動画がありません', false, 2000);
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
        updateOverlayDisplay('保存に失敗しました', false, 5000);
        console.error(saveResult.error);
    }
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
            videoPlayer.currentTime = 0;
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

// 全動画結合処理
async function joinPlaylistVideos() {
    if (playlist.length < 2) {
        updateOverlayDisplay(
            playlist.length === 0 ? '❌ プレイリストが空です' : '動画が1つだけなので結合不要です',
            false,
            3000
        );
        return;
    }

    // デフォルトファイル名（最初の動画名 + _join.mp4）
    const firstFile = playlist[0].file.path;
    const baseName = path.parse(path.basename(firstFile)).name;
    const fileCount = playlist.length;
    const defaultName = `${baseName}_join×${fileCount}.mp4`;

    // 保存ダイアログ
    const saveResult = await ipcRenderer.invoke('show-save-join-dialog', { fileName: defaultName });

    if (saveResult.canceled) {
        return;
    }

    const outputPath = saveResult.filePath;

    // 結合開始
    isJoinEditing = true;           // 中断ボタン制御用に流用
    cutCancelBtn.style.display = 'inline-block';
    updateOverlayDisplay('🎞️ 結合準備中…', true, 0);

    try {
        const videoPaths = playlist.map(item => item.file.path);

        const result = await ipcRenderer.invoke('join-videos', {
            inputPaths: videoPaths,
            outputPath: outputPath,
            frameRate: editFrameRate || 30
        });

        if (result && result.outputPath) {
            updateOverlayDisplay(`🎞️ 結合完了！`, false, 3000);
        } else {
            updateOverlayDisplay('🎞️ 結合が中断されました', false, 2000);
        }
    } catch (err) {
        console.error('結合エラー:', err);
        updateOverlayDisplay(`❌ 結合失敗: ${err.message || '不明なエラー'}`, false, 5000);
    } finally {
        isJoinEditing = false;
        cutCancelBtn.style.display = 'none';
    }
}


// 再生速度設定ヘルパー
function setPlaybackRate(rate, showOverlay = true) {
    if (isNaN(rate) || rate <= 0) return;
    currentPlaybackRate = rate;                    // ← 追加
    videoPlayer.playbackRate = rate;
    if (speedSelect) speedSelect.value = parseFloat(rate).toFixed(2);
    localStorage.setItem('playbackSpeed', rate);
    if (showOverlay) {
        updateOverlayDisplay(`🏃‍♂️‍➡️再生速度: ${rate}x`, false, 1000);
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
        updateOverlayDisplay(`🏃‍♂️‍➡️再生速度: ${playbackRates[newIdx]}x`, false, 1000);
    }
}

function increasePlaybackRate() { changePlaybackRate(1); }
function decreasePlaybackRate() { changePlaybackRate(-1); }

// レンジ一覧描画
function renderCutRanges() {
    cutRangesList.innerHTML = '';
    cutTimelineBar.innerHTML = '';  // 赤いバーを全部削除
    if (!cutRanges || cutRanges.length === 0) {
       cutRangesList.textContent = '（なし）';
    } else {
        cutRanges.sort((a, b) => a.in - b.in);

        // モード判定
        let modeText = "高速モード";
        let longestCutDuration = 0;
        let longestCutIndex = -1;           // ← 追加：最長のカット番号（0ベース）

        // 最後のカット範囲をチェック
        const lastRange = cutRanges[cutRanges.length - 1];
        const isLastToEnd = lastRange && Math.abs(lastRange.out - videoPlayer.duration) < 1.0; // 1秒未満の誤差を許容

        // 対象となるカット範囲（最後の範囲を除くかどうか）
        const rangesToCheck = isLastToEnd ? cutRanges.slice(0, -1) : cutRanges;

        if (rangesToCheck.length > 0) {
            // 最長の長さと、そのインデックスを取得
            let maxDuration = -Infinity;
            let maxIndex = -1;
        
            rangesToCheck.forEach((r, arrayIndex) => {
                const dur = r.out - r.in;
                if (dur > maxDuration) {
                    maxDuration = dur;
                    maxIndex = arrayIndex;
                }
            });
        
            longestCutDuration = maxDuration;
            longestCutIndex = maxIndex;
        
        } else if (!isLastToEnd && cutRanges.length === 1) {
            longestCutDuration = lastRange.out - lastRange.in;
            longestCutIndex = 0;
        }

        // 10分 = 600秒
        const isHighPrecisionMode = longestCutDuration <= 600;
        if (isHighPrecisionMode) {
            modeText = "精細モード";
        }

        // モード表示（リストの一番上に）
        const modeDiv = document.createElement('div');
        modeDiv.style.padding = '8px 12px';
        // modeDiv.style.backgroundColor = '#000000';
        modeDiv.style.borderBottom = '1px solid #000000';
        modeDiv.style.fontWeight = 'bold';
        modeDiv.style.color = isHighPrecisionMode ? '#a4d2ff' : '#ffcccc';
        modeDiv.textContent = modeText;
        cutRangesList.appendChild(modeDiv);
        window.currentEditMode = isHighPrecisionMode ? 'reencode' : 'copy';

        // リスト部分
        cutRanges.forEach((r, idx) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '2px 4px';
        
            const label = document.createElement('div');
            label.style.flex = '1';
        
            const durationSec = r.out - r.in;
            const durationStr = formatTime(durationSec);
        
            // ★を表示するかどうか判定
            let showStar = false;
        
            // 1. 10分超えているか
            if (durationSec > 600) {
                // 2. 最後のカット範囲（idx === cutRanges.length - 1）かどうか
                if (idx === cutRanges.length - 1) {
                    // 最後の範囲が動画の最後までカバーしているか
                    const lastRange = cutRanges[cutRanges.length - 1];
                    const isLastToEnd = lastRange && Math.abs(lastRange.out - videoPlayer.duration) < 1.0;
        
                    // 最後までカット範囲 → ★非表示
                    showStar = !isLastToEnd;
                } else {
                    // 最後のカット範囲ではない → ★表示
                    showStar = true;
                }
            }
        
            label.innerHTML = `
                カット範囲${idx + 1}： ${formatTime(r.in)} (${Math.round(r.in * editFrameRate)}f) 
                - ${formatTime(r.out)} (${Math.round(r.out * editFrameRate)}f)
                <span style="margin-left:12px; font-size:1.1em;">
                    [${durationStr}]${showStar ? ' ⚠️' : ''}
                </span>
            `;
        
            const del = document.createElement('button');
            del.textContent = '🗑️';
            del.style.marginLeft = '8px';
            del.addEventListener('click', () => {
                cutRanges.splice(idx, 1);
                // 削除対象のカット範囲のin、ourをinMarkDisplay、outMarkDisplayに設定。
                editInMark = r.in;
                editOutMark = r.out;
                inMarkDisplay.textContent = `${formatTime(editInMark)} (${Math.round(editInMark * editFrameRate)}f)`;
                outMarkDisplay.textContent = `${formatTime(editOutMark)} (${Math.round(editOutMark * editFrameRate)}f)`;
                editSeekBar.value = (r.out / videoPlayer.duration) * 100;
                seekBar.value = editSeekBar.value;
                renderCutRanges();
            });
        
            div.appendChild(label);
            div.appendChild(del);
            cutRangesList.appendChild(div);
        });

        // タイムラインバー部分
        console.log('カット範囲描画:', cutRanges);
        if (!cutTimelineContainer || !cutTimelineBar) return;

        cutTimelineBar.innerHTML = ''; // クリア
        if (!videoPlayer.duration || cutRanges.length === 0) {
            return;
        }

        const duration = videoPlayer.duration;
        cutRanges.forEach((range) => {
            const leftPercent  = (range.in  / duration) * 100;
            const widthPercent = ((range.out - range.in) / duration) * 100;

            const bar = document.createElement('div');
            bar.className = 'cut-range-bar';
            bar.style.left   = `${leftPercent}%`;
            bar.style.width  = `${widthPercent}%`;

            cutTimelineBar.appendChild(bar);
        });
    }

    // 2. Inマーク（白い縦線）
    if (typeof editInMark === 'number' && editInMark >= 0 && editInMark <= videoPlayer.duration) {
        const inLeft = (editInMark / videoPlayer.duration) * 100;
        
        const inMarker = document.createElement('div');
        inMarker.className = 'edit-in-marker';
        inMarker.style.left = `${inLeft}%`;
        
        const inLine = document.createElement('div');
        inLine.className = 'marker-line';
        inMarker.appendChild(inLine);
        
        cutTimelineBar.appendChild(inMarker);
        
        console.log(`Inマーク表示: ${formatTime(editInMark)} @ ${inLeft.toFixed(2)}%`);
    }
    
    // 3. Outマーク（白い縦線）
    if (typeof editOutMark === 'number' && editOutMark >= 0 && editOutMark <= videoPlayer.duration) {
        const outLeft = (editOutMark / videoPlayer.duration) * 100;
        
        const outMarker = document.createElement('div');
        outMarker.className = 'edit-out-marker';
        outMarker.style.left = `${outLeft}%`;
        
        const outLine = document.createElement('div');
        outLine.className = 'marker-line';
        outMarker.appendChild(outLine);
        
        cutTimelineBar.appendChild(outMarker);
        
        console.log(`Outマーク表示: ${formatTime(editOutMark)} @ ${outLeft.toFixed(2)}%`);
    }
}

// 作成日時で並び替える非同期関数（fs.stat を使って取得）
async function sortByCreationTime(ascending = true) {
    const sorted = [...playlist];
    
    // 各ファイルの作成日時を取得
    const promises = sorted.map(async (item) => {
        try {
            const stats = await fs.stat(item.file.path);
            return { ...item, ctime: stats.ctimeMs };  // ctimeMs = 作成日時のミリ秒
        } catch (err) {
            console.warn(`stat失敗: ${item.file.path}`, err);
            return { ...item, ctime: 0 };  // 失敗したら古い扱い
        }
    });

    const itemsWithTime = await Promise.all(promises);

    // 昇順／降順でソート
    itemsWithTime.sort((a, b) => ascending ? a.ctime - b.ctime : b.ctime - a.ctime);

    return itemsWithTime;
}

// 元の順番でプレイリストを再構築するヘルパー関数
function getPlaylistInOriginalOrder() {
    if (!originalLoadOrder || originalLoadOrder.length !== playlist.length) {
        console.warn(
            'originalLoadOrder が不整合です（長さ不一致）。現在のplaylistをそのまま返します',
            { originalLength: originalLoadOrder?.length, currentLength: playlist.length }
        );
        return [...playlist];
    }

    // パス → アイテムのマッピングを作成（高速検索用）
    const pathToItem = new Map(
        playlist.map(item => [item.file.path, item])
    );

    // 元の順番に従って再構築
    const restored = originalLoadOrder.map(path => {
        const item = pathToItem.get(path);
        if (!item) {
            console.warn(`元の順番に存在しないパスが見つかりました: ${path}`);
            return null;
        }
        return item;
    }).filter(Boolean); // null を除去

    // 何か欠落していた場合のフォールバック
    if (restored.length !== playlist.length) {
        console.warn('一部のアイテムが復元できませんでした。現在のplaylistを返します');
        return [...playlist];
    }

    return restored;
}

// 並び順メニュー「（ランダム）」選択時（ケース5・6対応）
function sortRandomPlaylist() {
    // ケース5：🔀 が OFF なら表示を一切変えない
    if (!isRandomPlayMode) {
        return [...playlist];  // そのまま返す（変更なし）
    }

    // ケース6：🔀 が ON なら既存の shuffleOrder を表示に適用
    if (!shuffleOrder || shuffleOrder.length !== playlist.length) {
        // shuffleOrder が不整合の場合 → 変更せず元のまま返す
        console.warn('shuffleOrder が不整合のため、表示変更をスキップ');
        return [...playlist];
    }

    const currentPath = playlist[currentVideoIndex]?.file?.path;
    const newPlaylist = shuffleOrder.map(idx => ({ ...playlist[idx] }));

    // 現在の再生位置を維持
    if (currentPath) {
        const newIndex = newPlaylist.findIndex(item => item.file.path === currentPath);
        currentVideoIndex = newIndex >= 0 ? newIndex : 0;
    } else {
        currentVideoIndex = 0;
    }

    shufflePosition = shuffleOrder.indexOf(currentVideoIndex);
    if (shufflePosition < 0) shufflePosition = 0;

    // playlist 本体を上書き（ケース6で定義されている挙動）
    playlist = newPlaylist;

    return playlist;
}

// 並び替え実行関数
async function applySort(modeKey = currentSortMode) {
    if (!SORT_MODES[modeKey]) return;

    currentSortMode = modeKey;
    localStorage.setItem('playlistSortMode', modeKey);

    const prevCurrentPath = playlist[currentVideoIndex]?.file?.path;

    // SORT_MODES[modeKey].fn() を呼ぶ → random の場合はここで playlist が上書きされる
    playlist = await SORT_MODES[modeKey].fn();

    // 再生位置再調整
    if (prevCurrentPath) {
        const newIndex = playlist.findIndex(item => item.file.path === prevCurrentPath);
        currentVideoIndex = newIndex >= 0 ? newIndex : 0;
    }

    filenameDisplay.value = currentVideoIndex;
    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
    saveShuffleState();
}

// ポップアップメニュー作成関数
function createSortMenu() {
    const menu = document.createElement('div');
    menu.className = 'sort-menu';  // CSSで位置・スタイルを調整
    menu.style.position = 'absolute';
    menu.style.background = 'rgba(30,30,30,0.95)';
    menu.style.border = '1px solid #444';
    menu.style.borderRadius = '6px';
    menu.style.padding = '6px 0';
    menu.style.zIndex = '1001';
    menu.style.minWidth = '160px';
    menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.6)';

    Object.entries(SORT_MODES).forEach(([key, {label}]) => {
        const item = document.createElement('div');
        item.style.padding = '8px 16px';
        item.style.cursor = 'pointer';
        item.style.whiteSpace = 'nowrap';
        item.style.color = currentSortMode === key ? '#00ccff' : '#eee';

        item.innerHTML = (currentSortMode === key ? '✅ ' : '　　') + label;

        item.addEventListener('click', async () => {
            await applySort(key);
            menu.remove();  // 選択したら即閉じる
        });

        item.addEventListener('mouseover', () => {
            item.style.background = 'rgba(0,123,255,0.2)';
        });
        item.addEventListener('mouseout', () => {
            item.style.background = 'none';
        });

        menu.appendChild(item);
    });

    return menu;
}

// 並び替えボタンのUI更新関数
function updateRepeatButtonUI() {
    const btn = repeatPlayBtn;

    btn.classList.remove('repeat-all', 'repeat-single');
    btn.textContent = '🔁';  // デフォルト

    if (repeatMode === 'all') {
        btn.classList.add('repeat-all');
        btn.setAttribute('data-tooltip', '全動画ループ中（Ctrl+Shift+R）');
    } else if (repeatMode === 'single') {
        btn.classList.add('repeat-single');
        btn.textContent = '🔂';
        btn.setAttribute('data-tooltip', '1動画ループ中（Ctrl+Shift+R）');
    } else {
        btn.setAttribute('data-tooltip', 'ループ無効（Ctrl+Shift+R）');
    }
}
function updateRepeatButtonUI() {
    const btn = repeatPlayBtn;

    btn.classList.remove('repeat-all', 'repeat-single');
    btn.textContent = '🔁';  // デフォルト

    if (repeatMode === 'all') {
        btn.classList.add('repeat-all');
        btn.setAttribute('data-tooltip', '全動画ループ中（Ctrl+Shift+R）');
    } else if (repeatMode === 'single') {
        btn.classList.add('repeat-single');
        btn.textContent = '🔂';
        btn.setAttribute('data-tooltip', '1動画ループ中（Ctrl+Shift+R）');
    } else {
        btn.setAttribute('data-tooltip', 'ループ無効（Ctrl+Shift+R）');
    }
}

// ループモード切替関数
function toggleRepeatMode() {
    if (repeatMode === 'none') {
        repeatMode = 'all';
    } else if (repeatMode === 'all') {
        repeatMode = 'single';
    } else {
        repeatMode = 'none';
    }

    localStorage.setItem('repeatMode', repeatMode);
    updateRepeatButtonUI();
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
                updateOverlayDisplay(`✂️ カット準備中…` , true, 0);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'extract-start':
                updateOverlayDisplay(`✂️ カット開始 ${payload.index + 1}/${payload.total} ${formatTime(payload.segStart)} - ${formatTime(payload.segEnd)}` , true, 0);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'extract-done':
                updateOverlayDisplay(`✂️ カット済 ${payload.index + 1}/${payload.total} (${Math.round(payload.percent)}%)` , true, 0);
                break;
            case 'concat-start':
                updateOverlayDisplay(`✂️ 結合中…` , true, 0);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'concat-done':
                updateOverlayDisplay(`✂️ 結合完了` , false, 1500);
                cutCancelBtn.style.display = 'none';
                break;
            case 'reencode':
                const p = payload.percent !== undefined ? Math.round(payload.percent) : 0;
                const fm = payload.frames !== undefined ? `${payload.frames}f` : '';
                const tm = payload.timemark ? ` [${payload.timemark}]` : '';
                updateOverlayDisplay(`✂️ カット実行中… ${p}% ${fm}${tm}` , true, 0);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'done':
                isCutEditing = false;
                updateOverlayDisplay(`✂️ 保存完了` , false, 1500);
                cutCancelBtn.style.display = 'none';
                break;
            case 'error':
                isCutEditing = false;
                updateOverlayDisplay(`❌ カット失敗: ${payload.message || 'エラー'}` , false, 3000);
                cutCancelBtn.style.display = 'none';
                break;
            default:
                // 旧スタイル or unknown
                const percent = payload && payload.percent ? Math.round(payload.percent) : 0;
                updateOverlayDisplay(`✂️ カット（削除）処理中… ${percent}%`, true, 0);
                break;
        }
    } catch (e) {
        updateOverlayDisplay('✂️ カット処理中…', true, 0);
    }
});

// 結合進捗受信（詳細ペイロード対応）
ipcRenderer.on('join-progress', (event, payload) => {
    try {
        const stage = payload && payload.stage ? payload.stage : 'progress';
        switch (stage) {
            case 'join-prepare':
                updateOverlayDisplay(`🎞️ 統一変換中… (${payload.currentFile}/${payload.totalFiles})`, true, 0);
                break;
            case 'convert-pre':
                const convPercent = Math.round(payload.percent);
                updateOverlayDisplay(`🎞️ 変換中 ${payload.currentFile}/${payload.totalFiles}… ${convPercent}%`, true, 1000);
                break;
            case 'join-start':
                updateOverlayDisplay('🎞️ 結合開始…', true, 0);
                break;
            case 'join':
                updateOverlayDisplay(`🎞️ 結合中… ${Math.round(payload.percent)}%`, true, 1000);
                break;
            case 'join-done':
                updateOverlayDisplay('🎞️ 結合完了！', false, 3000);
                break;
        }
    } catch (e) {
        updateOverlayDisplay('🎞️ 結合処理中…', true, 0);
    }
});

// 変換エラー
ipcRenderer.on('convert-error', (event, msg) => {
    console.error("変換失敗:", err);
    isConverting = false;
    updateOverlayDisplay(`変換失敗`, false, 3000);
    filenameDisplay.innerHTML = `<option value="">${appNameAndCopyrightValue}</option>`;
    updateIconOverlay();
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

    if (isCutEditing || isJoinEditing) {
        if (event.key === 'Escape') {
            event.preventDefault();
            cutCancelBtn.click();
            return;
        }
    }


    // 🔎ズームモード中のキー操作
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

    // 🎞️結合編集（Ctrl+j）
    if (event.ctrlKey && event.key === 'j') {
        event.preventDefault();
        joinPlaylistBtn.click();
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

    // 🔎ズームモード切替（Ctrl+z）
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

    if (filename.style.opacity === '1' && filenameMenus.style.display === 'flex') {
        // 📩プレイリスト並び替え 表示（shift+m）
        if (event.shiftKey && event.key.toLowerCase() === 'm') {
            // filenameMenu が開いている場合はそちらを優先しても良いが、
            // 要件では「並び替え（📩）」なので独立して開く
            event.preventDefault();
            sortPlaylistBtn.click();
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
        
        // 🔽次動画再生（shift+n）
        if (event.shiftKey && event.key.toLowerCase() === 'n') {
            if (playlist.length > 1) {
                event.preventDefault();
                downMovePlaylistBtn.click();
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
    }

    // 🖥️フルスクリーン表示（Ctrl+a）
    if (event.ctrlKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        fullscreenBtn.click();
        return;
    }

    // 🔀ランダム再生（Ctrl＋r）
    if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        randomPlayBtn.click();
        return;
    }

    // 🔁繰り返し再生（Ctrl＋Shift＋r）
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        repeatPlayBtn.click();
        return;
    }

    // 📚プレイリスト編集 表示／非表示（Ctrl+l）
    if (event.ctrlKey && event.key.toLowerCase() === 'l' ) {
        event.preventDefault();
        filenameMenu.click();
        return;
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
            seekBar.value = (videoPreview.currentTime / videoPreview.duration) * 100;
            videoPlayer.currentTime = videoPreview.currentTime;
            updateTimeDisplay();
            localStorage.setItem('currentTime', videoPlayer.currentTime);
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

// 再生停止ボタン
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
    if (repeatMode === 'single') return; // 無効化
    const prevIndex = getPrevVideoIndex();

    if (prevIndex >= 0) {
        await cleanupTempFiles();
        currentVideoIndex = prevIndex;
        localStorage.setItem('currentTime', 0);
        updatePlaylistDisplay();
        await playVideo(playlist[currentVideoIndex].file);
        savePlaylistAndPlaybackState();
    }
    showControlsAndFilename();
    updateIconOverlay();
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
    if (repeatMode === 'single') return; // 無効化
    const nextIndex = getNextVideoIndex();

    if (nextIndex >= 0) {
        await cleanupTempFiles();
        currentVideoIndex = nextIndex;
        localStorage.setItem('currentTime', 0);
        updatePlaylistDisplay();
        await playVideo(playlist[currentVideoIndex].file);
        savePlaylistAndPlaybackState();
    }
    showControlsAndFilename();
    updateIconOverlay();
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

// ランダム再生ボタンクリック
randomPlayBtn.addEventListener('click', () => {
    toggleRandomPlay();
});

// 繰り返し再生ボタンクリック
repeatPlayBtn.addEventListener('click', () => {
    toggleRepeatMode();  // 修正: toggleRepeatPlay() を削除、モード切替のみ
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
                resetShuffle();
                saveShuffleState(); // 現在のシャッフル位置を保存
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

// 結合編集ボタンクリック
joinPlaylistBtn.addEventListener('click', () => {
    joinPlaylistVideos();
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
        updateOverlayDisplay(errorMsg, true, 3000);
    } else {
        // HTML5 でサポートされていない拡張子の場合も明確に伝える
        console.warn(`拡張子 ${ext} は HTML5 でサポートされていません`);
        updateOverlayDisplay(`再生エラー: ${ext} 形式は対応していません`, false, 3000);
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

    // 編集モードでカット範囲内に入ったら自動で飛ばす
    if (isEditMode && cutRanges.length > 0) {
        const ranges = getSortedAndMergedCutRanges();
        for (const r of ranges) {
            if (videoPlayer.currentTime >= r.in && videoPlayer.currentTime < r.out) {
                let jumpTo = r.out;
                // 連続したカット範囲がある場合、次の有効位置を探す
                const nextValid = findNextValidPosition(jumpTo);
                if (nextValid >= 0) {
                    jumpTo = nextValid;
                }
                videoPlayer.currentTime = jumpTo;
                break; // 一度に1回だけジャンプ
            }
        }
    }
});

// 動画終了：Blob URL 解放 + 次の動画へ
videoPlayer.addEventListener('ended', async () => {
    videoPlayer.currentTime = 0;
    localStorage.setItem('currentTime', 0);

    if (repeatMode === 'single') {
        // 1動画ループ → 即座に同じ動画を再生
        videoPlayer.play().catch(() => {});
        playPauseBtn.textContent = '⏸️';
        return;
    }

    // 修正: 常にgetNextVideoIndex()を呼び、次があれば再生（ランダムOFF・repeat 'none' でも次動画に進む）
    const nextIndex = getNextVideoIndex();

    if (nextIndex >= 0) {
        currentVideoIndex = nextIndex;
        await playVideo(playlist[currentVideoIndex].file);
        savePlaylistAndPlaybackState();
    } else {
        // 次なし → 停止
        playStopBtn.click();
    }

    showControlsAndFilename();
    updateIconOverlay();
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
    fullscreenBtn.click();
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
            darkOverlay.style.display = 'block';
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
        darkOverlay.style.display = 'none';

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

    // ズームモードが有効 → ホイールでズーム調整
    if (isZoomMode) {
        const zoomStep = 5;           // 1回で5%ずつ（好みで3〜10の範囲で調整可）
        let newZoom = zoomValue;

        if (event.deltaY < 0) {
            // ホイール上（拡大）
            newZoom += zoomStep;
        } else if (event.deltaY > 0) {
            // ホイール下（縮小）
            newZoom -= zoomStep;
        }

        // 範囲制限（現在のズームスライダーと同じ範囲に合わせる）
        newZoom = Math.max(-100, Math.min(500, newZoom));  // 必要なら上限を200などに変更

        // スライダーと同期
        zoomBar.value = newZoom.toString();
        applyZoom(newZoom);

        // フィードバック表示（任意だがおすすめ）
        updateOverlayDisplay(`🔍 ${newZoom > 0 ? '+' : ''}${newZoom}%`);
        showControlsAndFilename();

        return;  // ここで終了 → 音量調整には行かない
    }

    // 通常モード → 既存の音量調整
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

// カット編集シークバー ドラッグ
editSeekBar.addEventListener('input', (e) => {
    if (filename.style.opacity !== '1') return;
    if (!videoPlayer.duration) return;
    const time = videoPlayer.duration * (editSeekBar.value / 100);
    videoPlayer.currentTime = time;
    seekBar.value = (time / videoPlayer.duration) * 100;
    updateTimeDisplay();
    updateOverlayDisplay(`🕓 ${formatTime(time)}`);
});

// カット編集シークバー スライダー変更
editSeekBar.addEventListener('change', () => {
    if (filename.style.opacity !== '1') return;
    if (!videoPlayer.duration) return;
    // 最後にユーザーがセットした値を優先して使う
    updateTimeDisplay();                       // 正しい時間で更新
    localStorage.setItem('currentTime', videoPlayer.currentTime);
});

// カット編集シークバー マウスクリック
editSeekBar.addEventListener('mousedown', (e) => {
    if (filename.style.opacity !== '1') return;
    if (e.button === 0 && videoPlayer.duration) {
        seekBar.value = editSeekBar.value; // メインシークバーも同期
        const time = videoPlayer.duration * (editSeekBar.value / 100);
        videoPlayer.currentTime = time;
        isEditSeekDragging = true;
        darkOverlay.style.display = 'block';
    }
});

// カット編集シークバー マウスオーバー
editSeekBar.addEventListener('mouseover', (e) => {
    if (filename.style.opacity !== '1') return;
    if (!videoPlayer.duration || playlist.length === 0) return;
    isMouseOverEditSeekBar = true;
});

// カット編集シークバー マウス移動
editSeekBar.addEventListener('mousemove', (e) => {
    if (filename.style.opacity !== '1') return;
    if (!videoPlayer.duration || !isMouseOverEditSeekBar) return;
    // カット編集シークバー表示更新（ドラッグ中は無視）
    if (!isEditSeekDragging) {
        const rect = editSeekBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        editSeekBar.value = percent * 100;
    }
});

// カット編集シークバー マウスアップ
editSeekBar.addEventListener('mouseup', () => {
    if (filename.style.opacity !== '1') return;
    if (isEditSeekDragging) {
        seekBar.value = editSeekBar.value; // メインシークバーも同期
        const time = videoPlayer.duration * (seekBar.value / 100);
        videoPlayer.currentTime = time;
        isEditSeekDragging = false;
        hideOverlayDisplay();
        darkOverlay.style.display = 'none';
    }
});

// カット編集シークバー マウスアウト
editSeekBar.addEventListener('mouseout', () => {
    if (filename.style.opacity !== '1') return;
    isMouseOverEditSeekBar = false;
    // 通常の時間表示に戻す
    if (!isEditSeekDragging && videoPlayer.duration) {
        const value = (100 / videoPlayer.duration) * videoPlayer.currentTime;
        editSeekBar.value = value;
    }
});

// シークバー ドラッグ
seekBar.addEventListener('input', (e) => {
    if (controls.style.opacity !== '1') return;
    if (!videoPlayer.duration) return;
    const time = videoPlayer.duration * (seekBar.value / 100);
    videoPreview.currentTime = time;
    videoPlayer.currentTime = videoPreview.currentTime;
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
    // 最後にユーザーがセットした値を優先して使う
    updateTimeDisplay();                       // 正しい時間で更新
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
        editSeekBar.value = seekBar.value; // カット編集シークバーも同期
    }
});

// シークバー マウスオーバー
seekBar.addEventListener('mouseover', (e) => {
    if (controls.style.opacity !== '1') return;
    if (!videoPlayer.duration || playlist.length === 0) return;
    isMouseOverSeekBar = true;
    videoPreview.style.display = 'block';
    // プレビュー位置更新
    updatePreviewPosition(e);
});

// シークバー マウス移動
seekBar.addEventListener('mousemove', (e) => {
    if (controls.style.opacity !== '1') return;
    if (!videoPlayer.duration || !isMouseOverSeekBar) return;
    const rect = seekBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = videoPlayer.duration * percent;

    // プレビュー時間更新・位置更新
    videoPreview.currentTime = time;
    updatePreviewPosition(e);

    // シークバー表示更新（ドラッグ中は無視）
    if (!isSeekDragging) {
        seekBar.value = percent * 100;
        updateTimeDisplay();
    } else {
        seekBar.value = (videoPreview.currentTime / videoPreview.duration) * 100;
        editSeekBar.value = seekBar.value; // カット編集シークバーも同期
        videoPlayer.currentTime = videoPreview.currentTime;
    }
});

// シークバー マウスアウト
seekBar.addEventListener('mouseout', () => {
    if (controls.style.opacity !== '1') return;
    isMouseOverSeekBar = false;
    videoPreview.style.display = 'none';
    // 通常の時間表示に戻す
    if (!isSeekDragging && videoPlayer.duration) {
        // const value = (100 / videoPlayer.duration) * videoPlayer.currentTime;
        // seekBar.value = value;
        editSeekBar.value = seekBar.value; // カット編集シークバーも同期
        updateTimeDisplay();
    }
});

// シークバー マウスリーブ
seekBar.addEventListener('mouseleave', () => {
    if (controls.style.opacity !== '1') return;
    if (isSeekDragging && !seekBar.matches(':active')) {
        editSeekBar.value = seekBar.value; // カット編集シークバーも同期
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
speedSelect.addEventListener('change', (e) => {
    if (controls.style.opacity !== '1') return;
    const rate = parseFloat(e.target.value);
    if (!isNaN(rate) && rate > 0) {
        currentPlaybackRate = rate;               // ← ここを追加
        videoPlayer.playbackRate = rate;
        localStorage.setItem('playbackSpeed', rate);
        updateOverlayDisplay(`🏃‍♂️‍➡️再生速度: ${rate}x`, false, 1000);
    }
});

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
addPlaylistBtn.addEventListener('click', async () => {
    addToPlaylist();

    // shuffleOrder の最後に追加
    if (shuffleOrder && shuffleOrder.length > 0) {
        shuffleOrder.push(playlist.length - 1);
    }

    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
    saveShuffleState();
});

// 削除ボタン
removePlaylistBtn.addEventListener('click', () => {
    const selectedIndex = parseInt(filenameDisplay.value);
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= playlist.length) return;

    removeFromPlaylist();

    // shuffleOrder から削除＆インデックス調整
    if (shuffleOrder && shuffleOrder.length > 0) {
        shuffleOrder = shuffleOrder.filter(idx => idx !== selectedIndex);
        shuffleOrder = shuffleOrder.map(idx => idx > selectedIndex ? idx - 1 : idx);

        if (shufflePosition >= shuffleOrder.length) {
            shufflePosition = shuffleOrder.length - 1;
        }
        if (shufflePosition < 0) shufflePosition = -1;
    }

    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
    saveShuffleState();
});

// クリアボタン
clearPlaylistBtn.addEventListener('click', () => {
    clearPlaylist();

    shuffleOrder = [];
    shufflePosition = -1;
    saveShuffleState();

    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
});

clearPlaylistBtn.addEventListener('click', () => {
    // ... 既存のクリア処理 ...

    shuffleOrder = [];
    shufflePosition = -1;
    saveShuffleState();

    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
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
        filenameMenu.setAttribute('data-tooltip', 'プレイリスト編集メニューを閉じる (Ctrl+l)');
    } else {
        filenameMenus.style.display = 'none';
        filenameMenu.textContent = '📚';           // 非表示 → 禁止マーク
        filenameMenu.setAttribute('data-tooltip', 'プレイリスト編集メニューを開く (Ctrl+l)');
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
        if (isCutEditing) {
            await ipcRenderer.invoke('cancel-cut');
            updateOverlayDisplay('✂️ カット中断しました');
        } else if (isJoinEditing) {
            await ipcRenderer.invoke('cancel-join');
            updateOverlayDisplay('🎞️ 結合中断しました');
        }
    } catch (e) {
        if (isCutEditing) {
            console.error('cancel-cut failed:', e);
            updateOverlayDisplay('✂️ カット中断に失敗しました');
        } else if (isJoinEditing) {
            console.error('cancel-join failed:', e);
            updateOverlayDisplay('🎞️ 結合中断に失敗しました');
        }
    } finally {
        if (isCutEditing) {
            isCutEditing = false;
            editModeBtn.textContent = '✂️';
            editModeBtn.setAttribute('data-tooltip', '編集モード開始（Ctrl+e）');
            editModeBtn.classList.remove('active');
            cutCancelBtn.style.display = 'none';
        } else if (isJoinEditing) {
            isJoinEditing = false;
        }
    }
});

// インマーク設定
setInMarkBtn.addEventListener('click', () => {
    if (videoPlayer.duration) {
        editInMark = videoPlayer.currentTime;
        inMarkDisplay.textContent = `${formatTime(editInMark)} (${Math.round(editInMark * editFrameRate)}f)`;
    }
    renderCutRanges();
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
    renderCutRanges();
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

// カット範囲追加
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
    // 追加後はマークをクリア
    editInMark = -1;
    editOutMark = -1;
    inMarkDisplay.textContent = '--:--:--';
    outMarkDisplay.textContent = '--:--:--';

    renderCutRanges();
});

// 動画保存（設定した複数範囲を削除して保存）
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

        isCutEditing = true;
        updateOverlayDisplay('✂️ カット（削除）処理中… 0%', true, 0);

        // フレーム単位へ丸めたレンジを作成して main.js に送る
        const alignedRanges = (cutRanges || []).map(r => {
            const startFrame = Math.round(r.in * editFrameRate);
            const endFrame = Math.round(r.out * editFrameRate);
            const start = startFrame / editFrameRate;
            const end = endFrame / editFrameRate;
            return { in: start, out: end };
        });

        // ★ ここで判定結果を渡す
        const requestedMode = window.currentEditMode || 'copy';  // fallback

        // main.js に複数範囲削除のハンドラを呼ぶ
        const result = await ipcRenderer.invoke('cut-video-multiple', {
            inputPath: currentFile.file.path,
            ranges: alignedRanges,
            outputPath: saveResult.filePath,
            frameRate: editFrameRate,
            mode: requestedMode          // ← 追加！
        });

        if (!result || !result.outputPath) {
            updateOverlayDisplay('✂️ 中断または失敗しました', false, 3000);
            console.log('カット編集中断またはエラー');
        } else {
            const { outputPath, mode } = result;

            if (mode === 'reencode') {
                updateOverlayDisplay('✂️ 保存完了（精細モード）', false, 1500);
                console.log('カット編集完了（再エンコード）:', outputPath);
            } else if (mode === 'copy') {
                updateOverlayDisplay('✂️ 保存完了（高速モード）', false, 1500);
                console.log('カット編集完了（ストリームコピー）:', outputPath);
            } else {
                // 予期せぬ mode の場合
                updateOverlayDisplay('✂️ 保存完了', false, 1500);
                console.log('カット編集完了（モード不明）:', outputPath);
            }
        }
    } catch (err) {
        console.error('カット（複数）処理エラー:', err);
        updateOverlayDisplay(`❌ カット失敗: ${err.message}`, false, 3000);
    } finally {
        isCutEditing = false;
        cutCancelBtn.style.display = 'none';
        editInMark = -1;
        editOutMark = -1;
        inMarkDisplay.textContent = '--:--:--';
        outMarkDisplay.textContent = '--:--:--';
    }
});

// 並び替えボタンクリックイベント（トグル実装）
sortPlaylistBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    const existingMenu = document.querySelector('.sort-menu');
    if (existingMenu) {
        existingMenu.remove();
        document.removeEventListener('click', closeMenu); // ← ここも後で修正必要
        return;
    }

    document.querySelectorAll('.sort-menu').forEach(m => m.remove());

    const targetContainer = document.fullscreenElement || mainContainer;
    const menu = createSortMenu();

    const containerRect = targetContainer.getBoundingClientRect();
    const btnRect = sortPlaylistBtn.getBoundingClientRect();

    menu.style.position = 'absolute';
    menu.style.left = `${btnRect.left - containerRect.left}px`;
    menu.style.top  = `${btnRect.bottom - containerRect.top + 4}px`;

    targetContainer.appendChild(menu);

    function closeMenu(ev) {    // ← function宣言ならhoistingされるのでOK
        if (!menu.contains(ev.target) && ev.target !== sortPlaylistBtn) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    }

    setTimeout(() => {
        document.addEventListener('click', closeMenu, { once: true });
    }, 0);
});

// 編集モード時にシークバーを同期
videoPlayer.addEventListener('timeupdate', () => {
    if (isEditMode && videoPlayer.duration && !isMouseOverSeekBar) {
        editSeekBar.value = (videoPlayer.currentTime / videoPlayer.duration) * 100;
        // 双方のシークバーを同期
        seekBar.value = (videoPlayer.currentTime / videoPlayer.duration) * 100;
    }
});
