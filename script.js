// ---------------------------------------------------------------------
const copyright = 'Copyright © 2025- @x-builder, Japan';
const email = 'x-builder@gmail.com';
const appName = 'xPlayer -メディアプレイヤー- Ver5.11.0';
// ---------------------------------------------------------------------
// 🔲共通変数設定🔲
// モジュールインポート
const { 
    ipcRenderer, 
    fs, 
    os, 
    path, 
    openVideoInBrowser, 
    getFilePath, 
    classifyPath, 
    captureScreenshot,
    generateVideoThumbnail,
    openFolderDialog,
    openVideoDialog,
    savePlaylistDialog,
    showSaveCutDialog,
    showSaveJoinDialog,
    showSaveSettingsDialog,
    showOpenSettingsDialog,
    getCommandLineArgs,
    convertVideo,
    cancelConversion,
    cancelCut,
    cancelJoin,
    deleteTempFile,
    savePlaylistFile,
    joinVideos,
    cutVideoMultiple,
    getVideoTracks,
    openWallpaperDialog,
    checkIsSecondaryInstance
} = window.electronAPI;

// 固定値設定
const overlayTimeout = 3000;
const seekSensitivity = 0.3;
const volumeStep = 0.001;
const playbackRates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 5.0];
const appNameAndCopyrightValue = `${appName}\n${copyright}`;
const appNameAndCopyrightValueLine = `${appName}　${copyright}`;
const HTML5_SUPPORTED = ['.mp4', '.webm', '.ogg', '.mov', '.m4v', '.mkv'];  // HTML5ネイティブ対応拡張子（ブラウザが直接再生可能）
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.oga', '.m4a', '.aac', '.opus', '.wma', '.aiff', '.aif', '.alac', '.ape'];
const HTML5_SUPPORTED_CONVERT = [];  // 動画変換対象外拡張子
const debouncedUpdateFilterList = debounce(updateFilterList, 0);      // 実際にイベントリスナー（inputなど）に登録する際は、この debouncedUpdateFilterList を呼び出してください。
const debouncedScrollCurrentFilterItem = debounce(scrollCurrentFilterItem, 100);

const SORT_MODES = {
    none:       { label: '（なし）',    fn: () => getPlaylistInOriginalOrder() },
    path_asc:   { label: '動画パス▲',   fn: () => [...playlist].sort((a, b) => a.file.path.localeCompare(b.file.path)) },
    path_desc:  { label: '動画パス▼',   fn: () => [...playlist].sort((a, b) => b.file.path.localeCompare(a.file.path)) },
    ctime_asc:  { label: '作成日時▲',   fn: async () => await sortByCreationTime(true) },
    ctime_desc: { label: '作成日時▼',   fn: async () => await sortByCreationTime(false)},
    random:     { label: '（ランダム）', fn: () => sortRandomPlaylist() }
};
const ADD_MODES = {
    Add0: { label: '選択行に追加',     fn: async () => await addToPlaylist(0) },
    Add1: { label: '選択行の下に追加', fn: async () => await addToPlaylist(1) }
};
const ASPECT_NODES = {
    'none': { label: '（なし）', value: null },
    '4:3':  { label: '4:3 旧テレビ', value: '4 / 3' },
    '16:9': { label: '16:9 テレビ', value: '16 / 9' },
    '18:9': { label: '18:9 テレビ', value: '18 / 9' },
    '21:9': { label: '21:9 シネマ', value: '21 / 9' },
    '9:16': { label: '9:16 スマホ', value: '9 / 16' }
};
const PLAYLIST_NODES = {
    'list':         { label: 'リスト', width: 96, height: 54 },
    'thumb-list':   { label: 'サムネイル＋リスト', width: 72, height: 40 },
    'thumb-small':  { label: 'サムネイル小', width: 96, height: 54 },
    'thumb-medium': { label: 'サムネイル中', width: 216, height: 122 },
    'thumb-large':  { label: 'サムネイル大', width: 432, height: 244 }
};
// オーディオモーション設定のデフォルトオプション定義
const DEFAULT_AUDIO_MOTION_OPTIONS = {
    mode: 3,               // 周波数帯域の分割解像度 (0: 離散バー, 1: 1/1オクターブ ~ 10: 1/10オクターブ等)
    radial: false,          // 円形（ラジアル）表示を無効化（通常の水平表示）
    barSpace: 0.1,          // バー同士の隙間の比率 (0: 隙間なし ~ 1: バー幅と同等)
    ledBars: false,         // バーをLEDブロック状に区切る表示をオフ（通常のソリッド描画）
    showPeaks: true,        // ピーク（頂点）ホールドラインの表示を有効化
    fillAlpha: 1,           // スペクトラム内部の塗りつぶし不透明度 (0: 完全透明 ~ 1: 完全不透明)
    lineWidth: 0,           // バー/波形の外枠線の太さpx (0: 枠線なし)
    gradient: 'classic',    // 使用するグラデーションテーマ ('classic', 'neon', 'gem' 等)
    lumaBars: false,        // 輝度（明るさ）に基づいたカラー調整をオフ
    reflexRatio: 0.02,      // 下部への反射（ミラー）描画の高さ比率 (0: なし ~ 1: 完全同サイズ)
    reflexAlpha: 0,         // 反射部分の不透明度 (0: 完全透明/非表示 ~ 1: 完全不透明)
    reflexBright: false,    // 反射部分の減衰（減光処理）をオフ
    spin: 0,                // 円形表示時の回転速度 (0: 回転なし, 正の値で時計回り)
    radius: 0.3,            // 円形表示時の内径半径の比率 (0: 中心から ~ 1: 外枠いっぱい)
    bgAlpha: 0,             // Canvas背景の透明度 (0: 完全透明 ~ 1: 完全不透明)
    showBgColor: false,     // テーマ固有の背景色描画をオフ
    overlay: true,          // 背景透過時や複数描画時の重ね合わせ表示最適化
    reflexFit: false,       // 本体と反射を合わせた全高がCanvas内に収まるよう自動スケーリング
    outlineBars: true,      // バーの外枠（輪郭線）描画
    spinSpeed: 0,           // 回転速度 (正の値で時計回り、大きいほど高速)
    channelLayout: 'single' // 音声チャンネル表示 (L/Rを合成したシングル描画)
};
// オーディオモーション設定のNODE定義
const AUDIOMOTION_NODES = {
    'none': {    label: '（なし）',
        options: {}
    },
    'preset1': { label: 'LEDオーディオコンポ',
        options: {
            mode: 3,         // 周波数帯域の分割解像度 (1/3オクターブ表示)
            barSpace: 0.2,   // バー同士の隙間の比率 (バー幅の20%分空ける)
            ledBars: true    // バーをLEDブロック状（点灯セグメント風）に区切って表示
        }
    },
    'preset2': { label: 'レインボウ・サイバーパンク',
        options: {
            mode: 2,           // 周波数帯域の分割解像度 (1/2 オクターブ表示)
            gradient: 'rainbow', // グラデーションテーマ (レインボーカラー)
            showPeaks: true,   // ピーク（頂点）ホールドラインの表示を有効化
            linearBar: true,   // バーの振幅変化を線形（リニア）スケールで計算
            bgAlpha: 0.7,      // Canvas背景の不透明度 (描画更新時の残像感を調整)
            fillAlpha: 0.6,    // スペクトラム内部の塗りつぶし不透明度 (0: 完全透明 ~ 1: 完全不透明)
            reflexRatio: 0.3,  // 下部への反射（ミラー）描画の高さ比率 (本体の30%の高さ)
            reflexAlpha: 0.2   // 反射部分の不透明度 (ほんのり透ける20%表示)
        }
    },
    'preset3': { label: 'ミニマル・クラシック',
        options: {
            mode: 1,           // 周波数帯域の分割解像度 (1/1 オクターブ：シンプルな10本前後のバー)
            barSpace: 0.25,    // バー同士の隙間の比率 (バー幅の25%分を空ける)
            gradient: 'prism', // グラデーションテーマ (プリズムカラー)
            showBgColor: false,// テーマ固有の背景色描画をオフ (背景透過)
            showScaleX: false, // X軸（周波数Hz）目盛りの表示をオフ
            showScaleY: false, // Y軸（音圧dB）目盛りの表示をオフ
            showPeaks: false,  // ピーク（頂点）ラインの表示をオフ
            outlineBars: false // バーの外枠（輪郭線）描画をオフ
        }
    },
    'preset4': { label: 'レトロ・LED ヴァイブ',
        options: {
            mode: 0,           // 周波数帯域の分割解像度 (0: 離散バー表示 / FFTSize依存)
            gradient: 'classic',// グラデーションテーマ (グリーン〜イエロー〜レッドの王道イコライザー風)
            ledBars: true,     // バーをLEDブロック状（点灯セグメント風）に分割表示
            showPeaks: true    // ピーク（頂点）表示を有効化
        }
    },
    'preset5': { label: 'センタースプリット・バー',
        options: {
            mode: 2,           // 周波数帯域の分割解像度 (1/2 オクターブ表示)
            barSpace: 0.2,     // バー同士の隙間の比率 (バー幅の20%分を空ける)
            gradient: 'rainbow',// グラデーションテーマ (レインボーカラー)
            fillAlpha: 0.85,   // スペクトラム内部の塗りつぶし不透明度 (85%表示)
            showPeaks: true,   // ピーク（頂点）ラインの表示を有効化
            reflexRatio: 0.5,  // 下部への反射（ミラー）描画の高さ比率 (本体の50%の高さ)
            reflexAlpha: 1,    // 反射部分の不透明度 (上側と同じ 1.0 にして濃さを統一)
            reflexBright: false,// 反射部分の減衰（暗くする処理）を無効化し、上下の色合いを統一
            reflexFit: true    // 本体と反射を合わせた全高がCanvas内に収まるよう自動スケーリング
        }
    },
    'preset6': { label: '円形ビジュアライザー',
        options: {
            mode: 3,           // 周波数帯域の分割解像度 (1/3 オクターブ表示)
            radial: true,      // 円形（ラジアル）表示を有効化
            spin: true,        // 円形ビジュアライザーの自動回転を有効化
            spinSpeed: 1,      // 回転速度 (正の値で時計回り、大きいほど高速)
            gradient: 'prism', // グラデーションテーマ (プリズムカラー)
            channelLayout: 'single' // 音声チャンネル表示 (L/Rを合成したシングル描画)
        }
    }
};
const languageMap = {
    'jpn': '日本語',
    'eng': '英語',
    'fra': 'フランス語',
    'fre': 'フランス語',
    'deu': 'ドイツ語',
    'ger': 'ドイツ語',
    'spa': 'スペイン語',
    'ita': 'イタリア語',
    'chi': '中国語',
    'zho': '中国語',
    'kor': '韓国語',
    'rus': 'ロシア語',
    'ara': 'アラビア語',
    'por': 'ポルトガル語',
    'hin': 'ヒンディー語',
    'afr': 'アフリカーンス語',
    'amh': 'アムハラ語',
    'aze': 'アゼルバイジャン語',
    'bel': 'ベラルーシ語',
    'bul': 'ブルガリア語',
    'cat': 'カタルーニャ語',
    'ces': 'チェコ語',
    'dan': 'デンマーク語',
    'ell': 'ギリシャ語',
    'eus': 'バスク語',
    'fin': 'フィンランド語',
    'gle': 'アイルランド語',
    'glg': 'ガリシア語',
    'heb': 'ヘブライ語',
    'hun': 'ハンガリー語',
    'ind': 'インドネシア語',
    'isl': 'アイスランド語',
    'kat': 'グルジア語',
    'kaz': 'カザフ語',
    'kir': 'キルギス語',
    'lit': 'リトアニア語',
    'lav': 'ラトビア語',
    'mlt': 'マルタ語',
    'mon': 'モンゴル語',
    'msa': 'マレー語',
    'nld': 'オランダ語',
    'nob': 'ノルウェー語',
    'pol': 'ポーランド語',
    'ron': 'ルーマニア語',
    'slk': 'スロバキア語',
    'slv': 'スロベニア語',
    'srp': 'セルビア語',
    'swe': 'スウェーデン語',
    'tha': 'タイ語',
    'tur': 'トルコ語',
    'ukr': 'ウクライナ語',
    'urd': 'ウルドゥー語',
    'vie': 'ベトナム語',
    'may': 'マレー語',
    'cze': 'チェコ語',
    'baq': 'バスク語',
    'kan': 'カンナダ語',
    'mal': 'マラヤーラム語',
    'dut': 'オランダ語',
    'tam': 'タミル語',
    'tel': 'テルグ語',
    'gre': 'ギリシャ語',
    'rum': 'ルーマニア語',
    // 追加：地域バリアント例（必要に応じて）
    'zh-cn': '中国語（簡体字）',
    'zh-tw': '中国語（繁体字）',
    'pt-br': 'ポルトガル語（ブラジル）',
    'es-419': 'スペイン語（ラテンアメリカ）',
    'fr-ca': 'フランス語（カナダ）',
    // 未指定やその他
    'qaa': 'オリジナル言語（未指定）',
    'mul': '複数言語',
    'und': '未指定',
};

// DOM要素取得
let videoPlayerElement = null;
let audioPlayer = null;
let videoPlayer = null;
let videoPreview = null;
let mainContainer = null;
let videoContainer = null;
let dropzone = null;
let controls = null;
let folderInput = null;
let videoInput = null;
let urlInputBtn = null;
let urlInput = null;
let urlClearBtn = null;
let urlConfirmBtn = null;
let urlInputPanel = null;
let prevVideoBtn = null;
let rewindBtn = null;
let playPauseBtn = null;
let playStopBtn = null;
let fastForwardBtn = null;
let nextVideoBtn = null;
let seekBar = null;
let volumeMuteBtn = null;
let volumeBar = null;
let speedSelect = null;
let zoomBtn = null;
let zoomPanel = null;
let zoomBar = null;
let zoomDisplay = null;
let zoomResetBtn = null;
let snapshotBtn = null;
let aspectRatioBtn = null;
let zoomEndBtn = null;
let fullscreenBtn = null;
let fitModeBtn = null;
let filename = null;
let filenamePanel = null;
let timeDisplay = null;
let volumeDisplay = null;
let messageOverlay = null;
let iconOverlay = null;
let appNameAndCopyright = null;
let wallpaperBtn = null;
let exportSettingsBtn = null;
let importSettingsBtn = null;
let alwaysOnTopBtn = null;
let audioMotionBtn = null;
let settingsBtn = null;
let settingsPanel = null;
let settingsCloseBtn = null;
let helpOpenBtn = null;
let helpCloseBtn = null;
let helpContainer = null;
let helpTitle = null;
let tooltipElements = null;
let filenameMenus = null;
let filenameMenu = null;
let upMovePlaylistBtn = null;
let downMovePlaylistBtn = null;
let addPlaylistBtn = null;
let removePlaylistBtn = null;
let clearPlaylistBtn = null;
let savePlaylistBtn = null;
let modeChangeBtn = null;
let editPanel = null;
let editModeBtn = null;
let setInMarkBtn = null;
let setOutMarkBtn = null;
let addCutRangeBtn = null;
let saveVideoBtn = null;
let cutRangesList = null;
let clearEditBtn = null;
let inMarkDisplay = null;
let outMarkDisplay = null;
let editSeekBar = null;
let cutCancelBtn = null;
let randomPlayBtn = null;
let repeatPlayBtn  = null;
let joinPlaylistBtn = null;
let sortPlaylistBtn = null;
let playlistDisplayBtn = null;
let filterPanel = null;
let playlistFilterInput = null;
let filterClearBtn = null;
let filterList = null;
let darkOverlay = null;
let voiceSelectBtn = null;
let subtitleSelectBtn = null;
let itemCount = null;
let playlistPathArea = null;
let cutTimelineContainer = null;
let cutTimelineBar = null;
let filterHistoryList = null;
let changelogBtn = null;
let changelogContent = null;
let tableContainer = null;
let mediaContainer = null;

// localStorage から復得
let savedVolume = null;
let savedPlaybackSpeed = null;
let savedPlaylist = null;
let savedCurrentVideoIndex = null;
let savedCurrentTime = null;
let savedFitMode = null;
let savedZoom = null;
let savedTranslateX = null;
let savedTranslateY = null;
let savedEditFrameRate = null;
let savedIsRandomPlayMode = null;
let savedIsRepeatPlayMode = null;
let savedShuffleOrder = null;
let savedShufflePosition = null;
let savedAspectRatio = null;
let savedCurrentSortMode = null;
let savedPlaylistDisplayMode = null;
let savedSelectedAudioLabel = null;
let savedSelectedAudioTrack = null;
let savedSelectedSubtitleLabel = null;
let savedSelectedSubtitleTrack = null;
let savedWallpaperPath = null;
let savedAlwaysOnTop = null;
let savedAudioMotionMode = null;
let savedFilterHistory = null;

// グローバル（共通）変数
let Initializing = true;
let playlist = [];
let currentVideoIndex = 0;
let selectedPlaylistIndex = -1;
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
let isAlwaysOnTop = false;
let isZoomMode = false;  // ズームモード状態
let isSettingsPanelOpen = false;
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
let isFilterPanelVisible = false;
let filterText = '';
let filterHistory = []; // フィルタ履歴
let editInMark = -1;  // インマーク（秒）
let editOutMark = -1; // アウトマーク（秒）
let cutRanges = []; // 配列 of { in: seconds, out: seconds }
let currentPlaybackRate = 1.0;   // ← 新規追加
let isurlInputPanelVisible = false;
let isCutEditing = false;  // カット編集中フラグ
let isJoinEditing = false;  // カット編集中フラグ
let isRandomPlayMode = false;     // ランダム再生（シャッフル）
let isRepeatPlayMode = 'none';  // 'none' | 'all' | 'single'
let shuffleOrder = [];           // ランダムモード用の再生順リスト（インデックス配列）
let shufflePosition = -1;        // 現在何番目を再生中か（-1=未開始）
let isEditSeekDragging = false;
let isMouseOverEditSeekBar = false;
let originalLoadOrder = [];  // プレイリストの「最初に読み込まれた順」を保持
let hideMouseTimeout = null;
let editFrameRate = 30;
let currentSortMode = '（なし）';
let currentAddMode = 'Add0';
let playlistDisplayMode = null;
let playlistThumbnailCache = new Map();
let selectedAudioLabel = '日本語';
let selectedAudioTrack = [];
let selectedSubtitleLabel = '（なし）';
let selectedSubtitleTrack = [];
let currentAudioIndex = 0;
let currentSubtitlesIndex = 0;
let currentAudioTracks = [];
let currentSubtitleTracks = [];
let currentAudioTrack = null;
let currentSubtitleTrack = null;
let delConvertFile = null;
let currentAspectRatio = 'none';
let currentUpdateId = 0;            // 関数の外側に、現在の実行世代を管理する変数を定義します
let scrollInterval = null;
let scrollTimeout = null;
let currentMediaType = 'video';
let audioMotion = null;
let audioMotionMode = null;

// 🔲document ハンドラ登録🔲
// DOMContentロード完了（初期処理）
document.addEventListener('DOMContentLoaded', async () => {
    // DOM要素を取得
    allDOMsetting();
    // まず重複起動時の localStorage 書き込み防止を設定
    await setupLocalStorageProtection();
    // localStorageからの復元
    await allLocalStorageSetting();

    // 動画初期化（未設定状態）
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
    audioPlayer.removeAttribute('src');
    audioPlayer.load();
    videoPreview.removeAttribute('src');
    videoPreview.load();
    updateMediaPlayerDisplay();

    // ネット動画選択のアイコン表示更新
    updateUrlButtonIcon();

    // フィルタ履歴をlocalStorageから復元
    loadFilterHistory();

    // ツールチップイベント設定
    tooltipElements.forEach(element => {
        const show = () => showTooltip(element);
        const hide = () => hideTooltip(element);

        element.addEventListener('mouseenter', show);
        element.addEventListener('mouseleave', hide);
        element.addEventListener('focusout', hide);
        element.addEventListener('click', hide);
    });

    // 背景壁紙の復元
    if (savedWallpaperPath) {
        videoContainer.style.backgroundImage = savedWallpaperPath;
    } else {
        videoContainer.style.backgroundImage = 'none';
    }

    // 背景壁紙ボタンの状態反映（設定済みなら赤、未設定なら青）
    if (wallpaperBtn) {
        if (savedWallpaperPath && savedWallpaperPath !== 'none' && savedWallpaperPath.trim() !== '') {
            wallpaperBtn.classList.add('wallpaper-active');
            wallpaperBtn.style.background = '';
        } else {
            wallpaperBtn.classList.remove('wallpaper-active');
        }
    }

    // ボリューム復元
    if (savedVolume && !isNaN(savedVolume) && savedVolume >= 0 && savedVolume <= 1) {
        volumeBar.value = savedVolume;
        lastVolume = savedVolume;
        volumeMuteBtn.textContent = savedVolume === 0 ? '🔇' : '🔊';
        volumeMuteBtn.classList.toggle('muted-active', savedVolume === 0);
        volumeMuteBtn.setAttribute('data-tooltip', savedVolume === 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
        updateVolumeDisplay();
    } else {
        volumeBar.value = 0.2;
        lastVolume = 0.2;
        volumeMuteBtn.textContent = '🔊';
        volumeMuteBtn.classList.remove('muted-active');
        volumeMuteBtn.setAttribute('data-tooltip', 'ミュート（Ctrl+m）');
        updateVolumeDisplay();
    }

    // 再生速度復元
    if (savedPlaybackSpeed && !isNaN(savedPlaybackSpeed) && parseFloat(savedPlaybackSpeed) > 0) {
        currentPlaybackRate = parseFloat(savedPlaybackSpeed);
        if (speedSelect) speedSelect.value = currentPlaybackRate.toFixed(2);
    } else {
        currentPlaybackRate = 1.0;
        if (speedSelect) speedSelect.value = "1.00";
    }
    if (speedSelect) speedSelect.value = currentPlaybackRate.toFixed(2);

    // 描画モード復元
    if (savedFitMode) {
        fitMode = savedFitMode;
    } else {
        fitMode = 'contain';
    }

    // 常に最前面復元
    if (savedAlwaysOnTop === 'true') {
        isAlwaysOnTop = true;
        if (typeof window.electronAPI?.setAlwaysOnTop === 'function') {
            window.electronAPI.setAlwaysOnTop(true);
        }
    }
    updateAlwaysOnTopButtonUI();

    // ビジュアライザーモード復元
    if (savedAudioMotionMode && AUDIOMOTION_NODES[savedAudioMotionMode]) {
        audioMotionMode = savedAudioMotionMode;
    } else {
        audioMotionMode = 'preset1';
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

    // 描画モード復元
    applyFitModeSetting(fitMode);

    // プレイリスト表示モード復元
    playlistDisplayMode = ['list', 'thumb-list', 'thumb-small', 'thumb-medium', 'thumb-large'].includes(savedPlaylistDisplayMode) ? savedPlaylistDisplayMode : 'list';
    if (filterList) {
        filterList.classList.remove('playlist-grid', 'playlist-grid-small', 'playlist-grid-medium', 'playlist-grid-large');
        if (['thumb-small', 'thumb-medium', 'thumb-large'].includes(playlistDisplayMode)) {
            filterList.classList.add('playlist-grid');
            if (playlistDisplayMode === 'thumb-small') {
                filterList.classList.add('playlist-grid-small');
            } else if (playlistDisplayMode === 'thumb-medium') {
                filterList.classList.add('playlist-grid-medium');
            } else if (playlistDisplayMode === 'thumb-large') {
                filterList.classList.add('playlist-grid-large');
            }
        }
    }
    
    // アスペクト比復元
    if (savedAspectRatio && ASPECT_NODES[savedAspectRatio]) {
        currentAspectRatio = savedAspectRatio;
    } else {
        currentAspectRatio = 'none';
    }
    applyAspectRatioSetting();
    applyZoom(zoomValue);

    // 繰り返し再生モード復元
    if (savedIsRepeatPlayMode && ['none', 'all', 'single'].includes(savedIsRepeatPlayMode)) {
        isRepeatPlayMode = savedIsRepeatPlayMode;
    } else {
        isRepeatPlayMode = 'none';
    }
    updateRepeatButtonUI();

    // 再生モード復元
    if (savedIsRandomPlayMode === 'true') {
        isRandomPlayMode = true;
    }
    updateRandomButtonUI();

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

    // コントロールサイズ適用
    let controlSizeX = calculateControlSizeX();
    let controlSizeY = calculateControlSizeY();
    localStorage.setItem('controlSizeX', controlSizeX);
    localStorage.setItem('controlSizeY', controlSizeY);
    updateControlSize(controlSizeX, controlSizeY);
    adjustFilterPanelHeight();
    applyAspectRatioSetting();

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

    // カット編集・結合編集のフレームレイトの復元
    if (!savedEditFrameRate) {
        editFrameRate = 30;
    } else {
        editFrameRate = savedEditFrameRate;
    }

    // 並び替えメニューの復元
    sortPlaylistBtn.classList.remove('sorted-active', 'random-sorted-active');
    if (!savedCurrentSortMode) {
        currentSortMode = 'none';
    } else {
        currentSortMode = savedCurrentSortMode;
        if (currentSortMode === 'none') {
        } else if (currentSortMode === 'path_asc' || currentSortMode === 'path_desc') {
            sortPlaylistBtn.classList.add('sorted-active');
        } else if (currentSortMode === 'random') {
            sortPlaylistBtn.classList.add('random-sorted-active');
        } else if (currentSortMode === 'ctime_asc' || currentSortMode === 'ctime_desc') {
            sortPlaylistBtn.classList.add('sorted-active');
        } else {
            sortPlaylistBtn.classList.add('sorted-active');
        }
    }

    // 音声言語の復元
    if (!savedSelectedAudioLabel) {
        selectedAudioLabel = '日本語';
    } else {
        selectedAudioLabel = savedSelectedAudioLabel;
    }
    if (savedSelectedAudioTrack) {
        try {
            selectedAudioTrack = JSON.parse(savedSelectedAudioTrack);
        } catch (e) {
            console.warn('selectedAudioTrack の復元に失敗:', e);
            selectedAudioTrack = [];
        }
        currentAudioTrack = selectedAudioTrack;
    }

    // 字幕言語の復元
    if (!savedSelectedSubtitleLabel) {
        selectedSubtitleLabel = '（なし）';
    } else {
        selectedSubtitleLabel = savedSelectedSubtitleLabel;
    }
    if (savedSelectedSubtitleTrack) {
        try {
            selectedSubtitleTrack = JSON.parse(savedSelectedSubtitleTrack);
        } catch (e) {
            console.warn('selectedSubtitleTrack の復元に失敗:', e);
            selectedSubtitleTrack = [];
        }
        currentSubtitleTrack = selectedSubtitleTrack;
    }

    // 音声メニューボタン・字幕メニューボタン切替（初期化）
    updateTrackButtonsVisibility();

    // プレイリストと再生状態の復元
    (async () => {
        // 起動時の引数有無判定
        const args = await getCommandLineArgs();
        if (args && args.length > 0) {
            // main.js が auto-play-files を送信するので、ここでは何もしない
            return;
        }

        // 引数なし → 状態復元
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
                    selectedPlaylistIndex = currentVideoIndex;
                    debouncedUpdateFilterList();
                    debouncedScrollCurrentFilterItem();
                    await playVideo(playlist[currentVideoIndex].file, savedCurrentTime);
                    // 常に一時停止、アプリ起動後250ms後に強制トリガー
                    setTimeout(() => {
                        if (videoPlayer.src) {
                            videoPlayer.play().then(() => videoPlayer.pause()).catch(() => {});
                        }
                    }, 250);
                    playPauseBtn.textContent = '⏸️';
                    playPauseBtn.classList.add('paused-active');
                    playPauseBtn.setAttribute('data-tooltip', '一時停止（Space／Right Click）');
                    localStorage.setItem('currentTime', videoPlayer.currentTime);
                    stopPeriodicSave();
                    showControlsAndFilename();
                    updateIconOverlay();
                } else {
                    playlistPathArea.value = appNameAndCopyrightValueLine;
                    updateIconOverlay();
                }
            } catch (e) {
                console.error('プレイリスト復元エラー:', e);
                playlistPathArea.value = appNameAndCopyrightValueLine;
                updateIconOverlay();
            }
        } else {
            playlistPathArea.value = appNameAndCopyrightValueLine;
            updateIconOverlay();
        }
    })();

    // 🔲個別イベントリスナー登録🔲
    // 🌐ネット動画選択
    urlInputBtn.addEventListener('click', async () => {
        if (isurlInputPanelVisible) {
            // 現在表示中 → キャンセル
            await toggleurlInputPanel(false);
        } else {
            // 非表示 → 表示を試みる（クリップボードチェックあり）
            await toggleurlInputPanel(true);
        }
    });

    // 📁フォルダ選択
    folderInput.addEventListener('click', async () => {
        hidemessageOverlay();
        try {
            const videoFiles = await openFolderDialog();
            playlistSet(videoFiles);
            debouncedUpdateFilterList();
            debouncedScrollCurrentFilterItem();
        } catch (e) {
            updatemessageOverlay('📁 フォルダ選択エラー');
            console.error('フォルダ選択エラー:', e);
            updateIconOverlay();
        }
    });

    // 🗒️ファイル選択
    videoInput.addEventListener('click', async () => {
        hidemessageOverlay();
        try {
            const videoFiles = await openVideoDialog();
            playlistSet(videoFiles);
            debouncedUpdateFilterList();
            debouncedScrollCurrentFilterItem();
        } catch (e) {
            updatemessageOverlay('🗒️ ファイル選択エラー');
            console.error('ファイル選択エラー:', e);
            updateIconOverlay();
        }
    });

    // 🎬／🔄️動作モード切替（視聴／変換）
    modeChangeBtn.addEventListener('click', () => {
        if (!isPlaying && !isConverting) {
            if (modeChange === 'convert') {
                modeChange = 'video';
                modeChangeBtn.classList.remove('convert-active');
                seekBar.classList.remove('converting');
                updatemessageOverlay('🎬 再生モードを設定しました', false, 1500);
            } else {
                modeChange = 'convert';
                modeChangeBtn.classList.add('convert-active');
                seekBar.classList.add('converting');
                updatemessageOverlay('🔄️ 変換モードを設定しました', false, 1500);
            }
            modeChangeBtn.textContent = modeChange === 'video' ? '🎬' : '🔄️';
            modeChangeBtn.setAttribute('data-tooltip', modeChange === 'video' ? '視聴モード（Ctrl+v）' : '変換モード（Ctrl+v）');
            localStorage.setItem('modeChange', modeChange);
        } else {
            if (modeChange === 'convert') {
                updatemessageOverlay('🎬 変換中は再生モード切替不可', false, 3000);
            } else {
                updatemessageOverlay('🔄️ 再生中は変換モード切替不可', false, 3000);
            }
        }
        updateTrackButtonsVisibility();
    });

    // 🔘URLクリア
    urlClearBtn.addEventListener('click', () => {
        hidemessageOverlay();
        urlInput.value = '';
        urlInput.focus();
    });

    // ✅URL再生
    urlConfirmBtn.addEventListener('click', () => {
        urlInputEnter();
    });

    // 再生中動画パス表示エリアクリック
    playlistPathArea.addEventListener('click', () => {
        if (!filterPanel) return;
        isFilterPanelVisible = !isFilterPanelVisible;
        filterPanel.style.display = isFilterPanelVisible ? 'flex' : 'none';
        
        if (isFilterPanelVisible) {
            hideEditPanel();
            zoomEndBtn.click();
            settingsCloseBtn.click();
            try { playlistFilterInput?.focus(); } catch (e) {}
            debouncedUpdateFilterList();
            debouncedScrollCurrentFilterItem();
        }
        // プレイリストが閉じられたので、非表示タイマーを再開する
        resetCursorTimer();
    });

    // フォーカス時のイベントハンドラ
    playlistPathArea.addEventListener('focus', () => {
        // 既存のタイマーをクリア
        if (scrollInterval) clearInterval(scrollInterval);
        if (scrollTimeout) clearTimeout(scrollTimeout);

        // テキスト長が表示幅を超えている場合のみスクロール開始
        if (playlistPathArea.scrollWidth > playlistPathArea.clientWidth) {
            const speed = 1.5; // スクロール速度（ピクセル/フレーム）
            const pauseAtEnd = 1000; // 右端に達したときの停止時間 (ms)

            const startScrolling = () => {
                scrollInterval = setInterval(() => {
                    const maxScrollLeft = playlistPathArea.scrollWidth - playlistPathArea.clientWidth;

                    // 右方向へスクロール
                    playlistPathArea.scrollLeft += speed;

                    // 右端に到達したか判定
                    if (playlistPathArea.scrollLeft + 1 >= maxScrollLeft) {
                        clearInterval(scrollInterval);
                        scrollInterval = null;

                        // 端で少し停止してから先頭（左端）に戻して再開
                        scrollTimeout = setTimeout(() => {
                            playlistPathArea.scrollLeft = 0;
                            startScrolling();
                        }, pauseAtEnd);
                    }
                }, 30); // 描画更新間隔 (ms)
            };

            startScrolling();
        }
    });

    // ロストフォーカス時のイベントハンドラ
    playlistPathArea.addEventListener('blur', () => {
        // 全てのスクロール用タイマーを停止
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
            scrollTimeout = null;
        }
        
        // ロストフォーカス時に位置を先頭に戻す
        playlistPathArea.scrollLeft = 0;
    });

    // ▶️／⏸️再生/一時停止
    playPauseBtn.addEventListener('click', async () => {
        await togglePlayPause()
    });

    // ⏹️再生停止ボタン
    playStopBtn.addEventListener('click', () => {
        videoPlayer.pause();
        isPlaying = false;
        currentVideoIndex = -1;  // 停止状態を明示

        // 3. srcを完全にクリア（これが大事！）
        videoPlayer.removeAttribute('src');     // ← これだけでOK
        videoPlayer.load();                     // src属性が無い状態でload → エラーにならない
        videoPreview.removeAttribute('src');
        videoPreview.load();
        localStorage.setItem('currentTime', 0);

        // 4. UI更新（停止状態を強制）
        playPauseBtn.textContent = '⏸️';
        playPauseBtn.classList.add('paused-active');
        playPauseBtn.setAttribute('data-tooltip', '一時停止（Space／Right Click）');
        stopPeriodicSave();
        showControlsAndFilename();
        
        // 再生中アイコンを非表示にする
        if (playlistPathArea) {
            const currentPath = getCurrentPlaybackPath();
            playlistPathArea.value = currentPath || appNameAndCopyrightValueLine;
        }
        
        // プレイリスト更新（アイコン削除）
        if (isFilterPanelVisible) debouncedUpdateFilterList();
        debouncedScrollCurrentFilterItem();
        updateIconOverlay();

        // 5. FFmpeg変換中ならキャンセル
        cleanupTempFiles();
    });

    // ⏮️前の動画
    prevVideoBtn.addEventListener('click', async () => {
        const prevIndex = getPrevVideoIndex();

        if (prevIndex >= 0) {
            await cleanupTempFiles();
            currentVideoIndex = prevIndex;
            updatePlaylistDisplay();
            await playVideo(playlist[currentVideoIndex].file, 0);
            savePlaylistAndPlaybackState();
        }
        showControlsAndFilename();
        updateIconOverlay();
    });

    // ⏪30秒戻る
    rewindBtn.addEventListener('click', () => {
        if (videoPlayer.duration) {
            let newTime = videoPlayer.currentTime - 30;
            newTime = Math.max(0, newTime);
            videoPlayer.currentTime = newTime;
            seekBar.value = (100 / videoPlayer.duration) * newTime;
            updateTimeDisplay();
            updatemessageOverlay(`🕓 ${formatTime(newTime)}`);
            localStorage.setItem('currentTime', newTime);
            showControlsAndFilename();
            updateIconOverlay();
        }
    });

    // ⏩30秒進む
    fastForwardBtn.addEventListener('click', () => {
        if (videoPlayer.duration) {
            let newTime = videoPlayer.currentTime + 30;
            newTime = Math.min(videoPlayer.duration, newTime);
            videoPlayer.currentTime = newTime;
            seekBar.value = (100 / videoPlayer.duration) * newTime;
            updateTimeDisplay();
            updatemessageOverlay(`🕓 ${formatTime(newTime)}`);
            localStorage.setItem('currentTime', newTime);
            showControlsAndFilename();
            updateIconOverlay();
        }
    });

    // ⏭️次の動画
    nextVideoBtn.addEventListener('click', async () => {
        const nextIndex = getNextVideoIndex();

        if (nextIndex >= 0) {
            await cleanupTempFiles();
            currentVideoIndex = nextIndex;
            updatePlaylistDisplay();
            await playVideo(playlist[currentVideoIndex].file, 0);
            savePlaylistAndPlaybackState();
        }
        showControlsAndFilename();
        updateIconOverlay();
    });

    // 🔊／🔇ミュート/解除
    volumeMuteBtn.addEventListener('click', () => {
        if (videoPlayer.volume === 0) {
            videoPlayer.volume = lastVolume || 0.2;
            volumeBar.value = videoPlayer.volume;
            volumeMuteBtn.textContent = '🔊';
            volumeMuteBtn.classList.remove('muted-active');
            volumeMuteBtn.setAttribute('data-tooltip', 'ミュート（Ctrl+m）');
        } else {
            lastVolume = videoPlayer.volume;
            videoPlayer.volume = 0;
            volumeBar.value = 0;
            volumeMuteBtn.textContent = '🔇';
            volumeMuteBtn.classList.add('muted-active');
            volumeMuteBtn.setAttribute('data-tooltip', 'ミュート解除（Ctrl+m）');
        }
        updateVolumeDisplay();
        updatemessageOverlay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`);
        volumeMuteBtn.classList.toggle('muted-active', videoPlayer.volume === 0);
        localStorage.setItem('volume', videoPlayer.volume);
        updateIconOverlay();
    });

    // 🖥️フルスクリーン切替
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

    // ↔️／↕️／⏺️描画モード切替
    fitModeBtn.addEventListener('click', () => {
        if (videoPlayer.style.objectFit === 'contain') {
            fitMode = 'cover';
        } else if (videoPlayer.style.objectFit === 'cover') {
            fitMode = 'fill';
        } else {
            fitMode = 'contain';
            fitModeBtn.setAttribute('data-tooltip', '画像を含む（Ctrl+x）');
        }
        applyFitModeSetting(fitMode);
        showControlsAndFilename();
        updateIconOverlay();
    });

    // 🔍ズームパネルマウスオーバー
    zoomPanel.addEventListener('mouseover', () => {
        if (isZoomMode) {
            zoomPanel.style.cursor = 'auto';
            updateIconOverlay();
        }
    });

    // 🔍ズームモード切替
    zoomBtn.addEventListener('click', () => {
        isZoomMode = !isZoomMode;
        if (isZoomMode) {
            zoomPanel.style.display = 'flex';
            zoomBtn.textContent = '🔍';
            zoomBtn.classList.add('mode-active');
            zoomBtn.setAttribute('data-tooltip', 'ズームモード終了（Ctrl+z）');
            // 編集モード開始時はプレイリストパネルを閉じる（同時表示抑止）
            if (isFilterPanelVisible) {
                isFilterPanelVisible = false;
                if (filterPanel) filterPanel.style.display = 'none';
            }
            hideEditPanel();
        } else {
            zoomEndBtn.click();
        }
        showControlsAndFilename();
        updateIconOverlay();
    });

    // プレイリストフィルタ入力
    playlistFilterInput.addEventListener('input', () => {
        filterText = playlistFilterInput.value || '';
        if (isFilterPanelVisible) debouncedUpdateFilterList();
        debouncedScrollCurrentFilterItem();
        
        // ★追加: フィルタ条件入力時、履歴リストを更新して表示する
        updateFilterHistoryList();
        showHistoryList();
    });

    // フォーカス時／入力時にリストを表示
    playlistFilterInput.addEventListener('dblclick', showHistoryList);

    // 入力欄からフォーカスが外れたら非表示
    playlistFilterInput.addEventListener('click', hideHistoryList);
    playlistFilterInput.addEventListener('blur', hideHistoryList);

    // Enterキーで履歴に追加して非表示にする
    playlistFilterInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const text = playlistFilterInput.value;
            if (text.trim() !== '') {
                addToFilterHistory(text);
                hideHistoryList();
            }
        }
    });

    // 🔘フィルタ条件クリアボタン
    filterClearBtn.addEventListener('click', () => {
        clearPlaylistFilter();
        try { playlistFilterInput?.focus(); } catch (e) {}
        if (isFilterPanelVisible) debouncedUpdateFilterList();
        debouncedScrollCurrentFilterItem();
        
        // ★追加: フィルタ条件入力時、履歴リストを更新して表示する
        updateFilterHistoryList();
    });

    // 🔀ランダム再生ボタンクリック
    randomPlayBtn.addEventListener('click', () => {
        toggleRandomPlay();
    });

    // 🔁／🔂繰り返し再生ボタンクリック
    repeatPlayBtn.addEventListener('click', () => {
        toggleRepeatPlay();
    });

    // 📺アスペクト比設定ボタン
    aspectRatioBtn.addEventListener('click', (event) => {
        event.stopPropagation();

        const existingMenu = document.querySelector('.aspect-ratio-menu');
        if (existingMenu) {
            existingMenu.remove();
            document.removeEventListener('click', closeMenu);
            return;
        }

        // メニュー非表示
        hideMenus();

        const targetContainer = document.fullscreenElement || mainContainer;
        const menu = createAspectRatioMenu();
        const containerRect = targetContainer.getBoundingClientRect();
        const btnRect = aspectRatioBtn.getBoundingClientRect();

        menu.style.left = `${Math.max(8, btnRect.left - containerRect.left - (menu.offsetWidth || 160) - 2)}px`;
        menu.style.top = `${Math.max(8, btnRect.top - containerRect.top + 2)}px`;

        targetContainer.appendChild(menu);

        function closeMenu(ev) {
            if (!menu.contains(ev.target) && ev.target !== aspectRatioBtn) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        }

        setTimeout(() => {
            document.addEventListener('click', closeMenu, { once: true });
        }, 0);
    });

    // ズームスライダー変更
    zoomBar.addEventListener('input', () => {
        const zoomPercent = parseInt(zoomBar.value);
        applyZoom(zoomPercent);
    });

    // 🔘ズームリセット
    zoomResetBtn.addEventListener('click', () => {
        // ズーム値をリセットし、表示位置も中央へ戻す
        zoomBar.value = '0';
        translateX = 0;
        translateY = 0;
        applyZoom(0);

        fitMode = 'contain';
        applyFitModeSetting(fitMode);

        currentAspectRatio = 'none';
        applyAspectRatioSetting();
    });

    // 📷スナップショット
    snapshotBtn.addEventListener('click', async () => {
        try {
            // 再生中なら一時停止してからスナップショットを撮る
            if (!videoPlayer.paused) {
                playPauseBtn.click();
            }
            // スナップショットに映り込まないように
            zoomEndBtn.click(); // ズームリセットして終了
            hideControlsAndFilename(); // コントロールとファイル名を隠す
            hideEditPanel();

            const result = await captureScreenshot();
            if (result.success) {
                console.log('スナップショット完了！');
            } else {
                console.error('スナップショット失敗:', result.error);
            }
        } catch (err) {
            console.error(err);
        }
    });

    // ❌ズーム終了（Ctrl+z）
    zoomEndBtn.addEventListener('click', () => {
        isZoomMode = false;
        hideMenus();
        zoomPanel.style.display = 'none';
        zoomBtn.textContent = '🔍';
        zoomBtn.classList.remove('mode-active');
        zoomBtn.setAttribute('data-tooltip', 'ズームモード開始（Ctrl+z）');
    });

    // ⚙️設定パネル切替
    settingsBtn.addEventListener('click', () => {
        toggleSettingsPanel(!isSettingsPanelOpen);
    });

    // 🖼️背景壁紙選択
    wallpaperBtn.addEventListener('click', async () => {
        hidemessageOverlay();

        try {
            const wallpaper = await openWallpaperDialog();

            if (wallpaper === null) {
                // キャンセルされた場合 → 背景壁紙を非表示
                if (!videoContainer) return;
            
                videoContainer.style.backgroundImage = 'none';
                // ボタンを未設定（青）に
                if (wallpaperBtn) {
                    wallpaperBtn.classList.remove('wallpaper-active');
                }
            } else {
                // 壁紙が選択された場合 → 設定
                if (!videoContainer) return;
            
                // ローカルファイルのパスをCSSで使える形式に変換
                const wallpaperUrl = `url("file://${wallpaper.path.replace(/\\/g, '/')}")`;
            
                videoContainer.style.backgroundImage = wallpaperUrl;
                // ボタンを設定済み（赤）に
                if (wallpaperBtn) {
                    wallpaperBtn.classList.add('wallpaper-active');
                    wallpaperBtn.style.background = '';
                }
            }
            localStorage.setItem('wallpaperPath', videoContainer.style.backgroundImage);
            updateIconOverlay();
        } catch (e) {
            updatemessageOverlay('🖼️ 背景壁紙選択エラー');
            console.error('背景壁紙選択エラー:', e);
            updateIconOverlay();
        }
    });

    // 🔝常に前面設定
    alwaysOnTopBtn.addEventListener('click', () => {
        toggleAlwaysOnTop();
    });

    // 🏳️‍🌈オーディオモーシュン設定ボタン
    audioMotionBtn.addEventListener('click', (event) => {
        event.stopPropagation();

        const existingMenu = document.querySelector('.audio-motion-menu');
        if (existingMenu) {
            existingMenu.remove();
            document.removeEventListener('click', closeMenu);
            return;
        }

        // メニュー非表示
        hideMenus();

        const targetContainer = document.fullscreenElement || mainContainer;
        const menu = createAudioMotionMenu();
        const containerRect = targetContainer.getBoundingClientRect();
        const btnRect = audioMotionBtn.getBoundingClientRect();

        menu.style.left = `${Math.max(8, btnRect.right - containerRect.left + 2)}px`;
        menu.style.top = `${Math.max(8, btnRect.top - containerRect.top + 2)}px`;

        targetContainer.appendChild(menu);

        function closeMenu(ev) {
            if (!menu.contains(ev.target) && ev.target !== audioMotionBtn) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        }

        setTimeout(() => {
            document.addEventListener('click', closeMenu, { once: true });
        }, 0);
    });

    // 📥設定インポート
    importSettingsBtn.addEventListener('click', async () => {
        await importSettingsFromFile();
    });

    // 📤設定エクスポート
    exportSettingsBtn.addEventListener('click', async () => {
        await exportSettingsToFile();
    });

    // ❌設定モード終了
    settingsCloseBtn.addEventListener('click', () => {
        toggleSettingsPanel(false);
    });

    // ❔ヘルプ（開く）イベントリスナー
    helpOpenBtn.addEventListener('click', openHelp);

    // ❌ヘルプ（閉じる）イベントリスナー
    helpCloseBtn.addEventListener('click', closeHelp);

    // ▶️動画再生
    videoPlayer.addEventListener('play', () => {
        // メディアナビゲータ再生中設定
        navigator.mediaSession.playbackState = 'playing';
    });

    // ⏸️動画一時停止
    videoPlayer.addEventListener('pause', () => {
        // メディアナビゲータ一時停止設定
        navigator.mediaSession.playbackState = 'paused';
    });

    // 動画メタデータ読み込み
    videoPlayer.addEventListener('loadedmetadata', () => {
        // 変換ファイル削除
        if (isConverting) {
            // プレイリスト更新
            if (modeChange === 'convert') {
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
            }
            
            isConverting = false;
        }
        hideEditPanel();

        seekBar.max = 100;
        updateTimeDisplay();
        updateVolumeDisplay();
        updateIconOverlay();
    });

    // 🎞️結合編集ボタンクリック
    joinPlaylistBtn.addEventListener('click', () => {
        joinPlaylistVideos();
    });

    // 🎬動画エラー（共通化・安全・モード対応）
    videoPlayer.addEventListener('error', (e) => {
        const error = videoPlayer.error;
        if (!error) return;

        if (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED &&
            error.message.includes('Empty src attribute')) {
            
            console.log('初期化時の空srcエラー（無視）');
            
            // ★ここを追加★
            videoPlayer.error = null;          // エラーオブジェクトをクリア
            // videoPlayer.load();             // 必要ならここで再ロード（ただし空なら無意味）
            return;                            // 以降のエラー表示処理を完全にスキップ
        }

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

        //拡張子抽出
        let ext = '';
        try {
            ext = path.extname(currentSrc).toLowerCase();
        } catch (err) {
            console.warn('拡張子抽出失敗:', err);
            return;
        }

        // 共通関数で判定
        if (isHTML5_SUPPORTED(ext)) {
            stopPeriodicSave();
            playPauseBtn.textContent = '⏸️';
            playPauseBtn.classList.add('paused-active');
            playPauseBtn.setAttribute('data-tooltip', '一時停止（Space／Right Click）');
            updateIconOverlay();

            // エラー内容に応じてメッセージを細かく分ける（任意）
            let errorMsg = '▶️ 再生エラー: ファイルが破損している可能性があります';
            if (videoPlayer.error) {
                switch (videoPlayer.error.code) {
                    case 1: errorMsg = '▶️ 再生がユーザーにより中止されました'; break;
                    case 2: errorMsg = '▶️ ネットワークエラーで読み込めません'; break;
                    case 3: errorMsg = '▶️ 動画のデコードに失敗しました（破損／コーデック非対応）'; break;
                    case 4: errorMsg = '▶️ このファイル形式は再生できません'; break;
                }
            }
            updatemessageOverlay(errorMsg, true, 3000);
        } else {
            // HTML5 でサポートされていない拡張子の場合も明確に伝える
            console.warn(`拡張子 ${ext} は HTML5 でサポートされていません`);
            updatemessageOverlay(`▶️ 再生エラー: ${ext} 形式は対応していません`, false, 3000);
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

    // 動画終了、次の動画へ
    videoPlayer.addEventListener('ended', async () => {
        videoPlayer.currentTime = 0;
        localStorage.setItem('currentTime', 0);

        // 一時ファイル削除
        await deleteTempVideo();

        // 常にgetNextVideoIndex()を呼び、次があれば再生
        // （ランダムOFF・repeat 'none' でも次動画に進む）
        const nextIndex = getNextVideoIndex();
        if (nextIndex >= 0) {
            currentVideoIndex = nextIndex;
            await playVideo(playlist[currentVideoIndex].file, 0);
        } else {
            if (modeChange === 'convert') {
                seekBar.value = 0;
                updatemessageOverlay('🔄️ 変換完了', false, 3000);
            }
            playStopBtn.click(); // プレイリストの最後で停止
        }
        savePlaylistAndPlaybackState();

        showControlsAndFilename();
        updateIconOverlay();
    });

    // 動画クリック
    mediaContainer.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (event.ctrlKey) {
            playStopBtn.click();
        } else {
            playPauseBtn.click();
        }
    });

    // 動画ダブルクリック
    mediaContainer.addEventListener('dblclick', (event) => {
        event.preventDefault();
        fullscreenBtn.click();
    });

    // マウス押下
    mediaContainer.addEventListener('mousedown', (event) => {
        if (event.button === 0) {
            if (isZoomMode) {
                // ズーム時はパン（画像移動）開始
                isPanning = true;
                panStartX = event.clientX;
                panStartY = event.clientY;
                resetCursorTimer();
            } else {
                isDragging = true;
                dragStartX = event.clientX;
                dragStartY = event.clientY;
            }
            event.preventDefault();
        }
    });

    // マウス移動
    mediaContainer.addEventListener('mousemove', (event) => {
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
                updatemessageOverlay(`🕓 ${formatTime(newTime)}`);
                localStorage.setItem('currentTime', newTime);
                darkOverlay.style.display = 'block';
            } else if (absDeltaY > absDeltaX && absDeltaY > 5) {
                isVolumeDragging = true;
                const newVolume = videoPlayer.volume - (deltaY * volumeStep);
                videoPlayer.volume = Math.max(0, Math.min(1, newVolume));
                volumeBar.value = videoPlayer.volume;
                lastVolume = videoPlayer.volume;
                volumeMuteBtn.textContent = videoPlayer.volume === 0 ? '🔇' : '🔊';
                volumeMuteBtn.classList.toggle('muted-active', videoPlayer.volume === 0);
                volumeMuteBtn.setAttribute('data-tooltip', videoPlayer.volume === 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
                updateVolumeDisplay();
                updatemessageOverlay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`);
                localStorage.setItem('volume', videoPlayer.volume);
            }

            dragStartX = event.clientX;
            dragStartY = event.clientY;
            updateIconOverlay();
        } else {
            resetCursorTimer();
        }
    });

    // マウス解放
    mediaContainer.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            const wasDragging = isDragging;
            const wasVolumeDragging = isVolumeDragging;
            const wasPanning = isPanning;

            isDragging = false;
            isVolumeDragging = false;
            isPanning = false;
            darkOverlay.style.display = 'none';
            resetCursorTimer();

            if (wasDragging || wasVolumeDragging) {
                updateIconOverlay();
            }
        }
    });

    // マウスリーブ
    mediaContainer.addEventListener('mouseleave', () => {
        isDragging = false;
        isVolumeDragging = false;
        updateIconOverlay();
    });

    // マウス左クリックで表示/非表示をトグル
    mediaContainer.addEventListener('click', (e) => {
        if (e.button === 0) {
            if (!isDragging && !isVolumeDragging) {
                const isVisible = 
                    window.getComputedStyle(controls).opacity  === '1' ||
                    window.getComputedStyle(filename).opacity  === '1';
                if (isVisible) {
                    hideControlsAndFilename();
                    hideEditPanel();
                } else {
                    showControlsAndFilename();
                }
            }
            hideMenus();
            e.stopPropagation();
        }
    });

    // マウスホイール
    mediaContainer.addEventListener('wheel', (event) => {
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
            updatemessageOverlay(`🔍 ${newZoom > 0 ? '+' : ''}${newZoom}%`);

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
        volumeMuteBtn.classList.toggle('muted-active', videoPlayer.volume === 0);
        volumeMuteBtn.setAttribute('data-tooltip', videoPlayer.volume === 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
        updateVolumeDisplay();
        updatemessageOverlay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`);
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
        updatemessageOverlay(`🕓 ${formatTime(time)}`);
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
            editSeekBar.value = seekBar.value; // メインシークバーも同期
            videoPlayer.currentTime = videoPreview.currentTime;
            isDragging = true;
            isEditSeekDragging = true;
            darkOverlay.style.display = 'block';
            seekBar.value = editSeekBar.value; // シークバーも同期
            darkOverlay.style.display = 'block';
        }
    });

    // カット編集シークバー マウスオーバー
    editSeekBar.addEventListener('mouseover', (e) => {
        if (filename.style.opacity !== '1') return;
        if (!videoPlayer.duration || playlist.length === 0) return;
        isMouseOverEditSeekBar = true;
        // ★ 動画以外（音声ファイル等）の場合はプレビューを表示しない
        const currentSrc = playlist[currentVideoIndex]?.file?.path || '';
        const ext = path.extname(currentSrc).toLowerCase();
        if (!isVideoFile(ext)) return;
        videoPreview.style.display = 'block';
        // プレビュー位置更新
        updatePreviewPosition(e);
    });

    // カット編集シークバー マウス移動
    editSeekBar.addEventListener('mousemove', (e) => {
        if (filename.style.opacity !== '1') return;
        if (!videoPlayer.duration || !isMouseOverEditSeekBar) return;
        const rect = editSeekBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = videoPlayer.duration * percent;

        // プレビュー時間更新・位置更新
        videoPreview.currentTime = time;
        updatePreviewPosition(e);
        
        // カット編集シークバー表示更新（ドラッグ中は無視）
        if (!isEditSeekDragging) {
            editSeekBar.value = percent * 100;
            updateTimeDisplay();
        } else {
            editSeekBar.value = (videoPreview.currentTime / videoPreview.duration) * 100;
            seekBar.value = editSeekBar.value; // シークバーも同期
            videoPlayer.currentTime = videoPreview.currentTime;
        }
    });

    // カット編集シークバー マウスアウト
    editSeekBar.addEventListener('mouseout', () => {
        if (filename.style.opacity !== '1') return;
        isMouseOverEditSeekBar = false;
        videoPreview.style.display = 'none';
        // 通常の時間表示に戻す
        if (!isEditSeekDragging && videoPlayer.duration) {
            const value = (100 / videoPlayer.duration) * videoPlayer.currentTime;
            editSeekBar.value = value;
            seekBar.value = editSeekBar.value; // シークバーも同期
            updateTimeDisplay();
        }
    });

    // カット編集シークバー マウスリーブ
    editSeekBar.addEventListener('mouseleave', () => {
        if (filename.style.opacity !== '1') return;
        if (isEditSeekDragging && !filename.matches(':active')) {
            seekBar.value = editSeekBar.value; // シークバーも同期
            isEditSeekDragging = false;
            darkOverlay.style.display = 'none';
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
        if ((isEditMode || (typeof editPanel !== 'undefined' && editPanel && window.getComputedStyle(editPanel).display !== 'none')) && typeof editSeekBar !== 'undefined' && editSeekBar) {
            editSeekBar.value = (time / videoPlayer.duration) * 100;
        }
        updateTimeDisplay();
        updatemessageOverlay(`🕓 ${formatTime(time)}`);
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
        // ★ 動画以外（音声ファイル等）の場合はプレビューを表示しない
        const currentSrc = playlist[currentVideoIndex]?.file?.path || '';
        const ext = path.extname(currentSrc).toLowerCase();
        if (!isVideoFile(ext)) return;
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
            const value = (100 / videoPlayer.duration) * videoPlayer.currentTime;
            seekBar.value = value;
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
        volumeMuteBtn.classList.toggle('muted-active', videoPlayer.volume === 0);
        volumeMuteBtn.setAttribute('data-tooltip', videoPlayer.volume === 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
        updateVolumeDisplay();
        updatemessageOverlay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`);
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
                updatemessageOverlay(`${volume === 0 ? '🔇' : '🔊'} ${volumePercent}%`);
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
                hidemessageOverlay();
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
            updatemessageOverlay(`🏃‍♂️‍➡️ ${rate}x`, false, 1000);
        }
    });

    // コントロールマウスオーバー
    controls.addEventListener('mouseover', () => {
        if (controls.style.opacity === '1' || filename.style.opacity === '1') {
            isMouseOverControls = true;
            clearTimeout(timeout);
            controls.style.opacity = '1';
            filename.style.opacity = '1';
            controls.style.cursor = 'auto';
            filename.style.cursor = 'auto';
            if (messageOverlay.classList.contains('active')) {
                messageOverlay.style.display = 'block';
                messageOverlay.classList.add('active');
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
            clearTimeout(timeout);
            controls.style.opacity = '1';
            filename.style.opacity = '1';
            controls.style.cursor = 'auto';
            filename.style.cursor = 'auto';
            if (messageOverlay.classList.contains('active')) {
                messageOverlay.style.display = 'block';
                messageOverlay.classList.add('active');
            }
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

    // 🔼上へボタン
    upMovePlaylistBtn.addEventListener('click', () => {
        // clearPlaylistFilter();
        if (isFilterPanelVisible) debouncedUpdateFilterList();
        debouncedScrollCurrentFilterItem();
        upMovePlaylist();
    });

    // 🔽下へボタン
    downMovePlaylistBtn.addEventListener('click', () => {
        // clearPlaylistFilter();
        if (isFilterPanelVisible) debouncedUpdateFilterList();
        debouncedScrollCurrentFilterItem();
        downMovePlaylist();
    });

    // ＋追加ボタン
    addPlaylistBtn.addEventListener('click', (e) => {
        // clearPlaylistFilter();
        e.stopPropagation();

        // 1. 既に表示されていれば閉じて終了
        const existingMenu = document.querySelector('.add-playlist-menu');
        if (existingMenu) {
            existingMenu.remove();
            return; // イベントは AbortController 等で制御するか、外側クリックで自然に解除させる
        }

        // 2. 他のメニューを掃除
        hideMenus();

        // 3. メニュー生成と配置
        const targetContainer = document.fullscreenElement || mainContainer;
        const menu = createAddMenu();

        const containerRect = targetContainer.getBoundingClientRect();
        const btnRect = addPlaylistBtn.getBoundingClientRect();

        menu.style.left = `${btnRect.left - containerRect.left}px`;
        menu.style.top  = `${btnRect.bottom - containerRect.top + 4}px`;

        targetContainer.appendChild(menu);

        // 4. 外側クリックで閉じる処理（once: true を外し、閉じた時だけリスナー解除）
        function closeMenu(ev) {
            // ボタン自体またはメニュー内部のクリックなら無視
            if (menu.contains(ev.target) || addPlaylistBtn.contains(ev.target)) {
                return;
            }
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);

        // 5. 状態更新
        updatePlaylistDisplay();
        savePlaylistAndPlaybackState();
        saveShuffleState();
    });

    // －削除ボタン
    removePlaylistBtn.addEventListener('click', () => {
        // clearPlaylistFilter();
        const selectedIndex = selectedPlaylistIndex >= 0 && selectedPlaylistIndex < playlist.length ? selectedPlaylistIndex : currentVideoIndex;
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

    // 🆑プレイリストクリアボタン
    clearPlaylistBtn.addEventListener('click', () => {
        clearPlaylistFilter();
        clearPlaylist();

        shuffleOrder = [];
        shufflePosition = -1;
        saveShuffleState();

        updatePlaylistDisplay();
        savePlaylistAndPlaybackState();
    });

    // 💾保存ボタン
    savePlaylistBtn.addEventListener('click', () => {
        // clearPlaylistFilter();
        if (isFilterPanelVisible) debouncedUpdateFilterList();
        debouncedScrollCurrentFilterItem();
        savePlaylist();
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

        // Ctrlキー（MacのCmdキー含む）が押されているか判定
        const isAppend = e.ctrlKey || e.metaKey;

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
            // isAppend フラグを渡す
            await addFilesFromPaths(fullPaths, isAppend);
        }
    });

    // ✂️編集モード切替
    editModeBtn.addEventListener('click', () => {
        if (playlist.length === 0) {
            updatemessageOverlay('✂️ プレイリストが空です');
            return;
        }
        
        isEditMode = !isEditMode;
        if (isEditMode) {
            // 編集モード開始時はプレイリストパネルを閉じる（同時表示抑止）
            if (isFilterPanelVisible) {
                isFilterPanelVisible = false;
                if (filterPanel) filterPanel.style.display = 'none';
            }
            zoomEndBtn.click();
            settingsCloseBtn.click();
            editPanel.style.display = 'flex';
            editModeBtn.classList.add('mode-active');
            // 初期化
            editInMark = -1;
            editOutMark = -1;
            inMarkDisplay.textContent = '--:--:--';
            outMarkDisplay.textContent = '--:--:--';
            cutRanges = [];           // ← 必要に応じてここでリセット（好みで外しても可）
            renderCutRanges();
        } else {
            editPanel.style.display = 'none';
            editModeBtn.classList.remove('mode-active');
        }
        hidemessageOverlay();
        // ボタン表示を更新（ここが今回のメイン変更点）
        updateEditModeButtonUI();
    });

    // ❌カット中断
    cutCancelBtn.addEventListener('click', async () => {
        try {
            if (isCutEditing) {
                await cancelCut();
                updatemessageOverlay('✂️ カット中断しました');
            } else if (isJoinEditing) {
                await cancelJoin();
                updatemessageOverlay('🎞️ 結合中断しました');
            }
        } catch (e) {
            if (isCutEditing) {
                console.error('cancel-cut failed:', e);
                updatemessageOverlay('✂️ カット中断に失敗しました');
            } else if (isJoinEditing) {
                console.error('cancel-join failed:', e);
                updatemessageOverlay('🎞️ 結合中断に失敗しました');
            }
        } finally {
            if (isCutEditing) {
                isCutEditing = false;
                editModeBtn.textContent = '✂️';
                editModeBtn.setAttribute('data-tooltip', '編集モード開始（Ctrl+e）');
                editModeBtn.classList.remove('mode-active');
                cutCancelBtn.style.display = 'none';
            } else if (isJoinEditing) {
                isJoinEditing = false;
            }
        }
    });

    // 📍←インマーク設定
    setInMarkBtn.addEventListener('click', () => {
        if (videoPlayer.duration) {
            editInMark = videoPlayer.currentTime;
            inMarkDisplay.textContent = `${formatTime(editInMark)} (${Math.round(editInMark * editFrameRate)}f)`;
        }
        renderCutRanges();
    });

    // →📍アウトマーク設定
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

    // 🆑カット編集クリアボタン
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

    // ✅カット範囲追加
    addCutRangeBtn.addEventListener('click', () => {
        if (editInMark < 0 || editOutMark < 0) {
            updatemessageOverlay('✂️ INマークとOUTマークを両方設定してください');
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

    // 💾動画保存（設定した複数範囲を削除して保存）
    saveVideoBtn.addEventListener('click', async () => {
        if (!videoPlayer.src) {
            updatemessageOverlay('✂️ 動画が読み込まれていません');
            return;
        }
        if (!cutRanges || cutRanges.length === 0) {
            updatemessageOverlay('✂️ 保存するためのカット範囲が設定されていません');
            return;
        }

        try {
            const currentFile = playlist[currentVideoIndex];
            if (!currentFile) return;

            const fileName = path.basename(currentFile.file.path);
            const baseNameWithoutExt = path.parse(fileName).name;
            const ext = path.extname(fileName);
            const defaultOutName = `${baseNameWithoutExt}_trimmed${ext}`;

            const saveResult = await showSaveCutDialog({ fileName: defaultOutName });
            if (saveResult.canceled) {
                setTimeout(hidemessageOverlay, 1500);
                return;
            }

            isCutEditing = true;
            updatemessageOverlay('✂️ カット中… 0%', true, 0);

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
            const result = await cutVideoMultiple({
                inputPath: currentFile.file.path,
                ranges: alignedRanges,
                outputPath: saveResult.filePath,
                frameRate: editFrameRate,
                mode: requestedMode          // ← 追加！
            });

            if (!result || !result.outputPath) {
                updatemessageOverlay('✂️ 中断または失敗しました', false, 3000);
                console.log('カット編集中断またはエラー');
            } else {
                const { outputPath, mode } = result;

                if (mode === 'reencode') {
                    updatemessageOverlay('✂️ 保存完了（精細モード）', false, 1500);
                    console.log('カット編集完了（再エンコード）:', outputPath);
                } else if (mode === 'copy') {
                    updatemessageOverlay('✂️ 保存完了（高速モード）', false, 1500);
                    console.log('カット編集完了（ストリームコピー）:', outputPath);
                } else {
                    // 予期せぬ mode の場合
                    updatemessageOverlay('✂️ 保存完了', false, 1500);
                    console.log('カット編集完了（モード不明）:', outputPath);
                }
            }
        } catch (err) {
            console.error('カット（複数）処理エラー:', err);
            updatemessageOverlay(`✂️ カット失敗: ${err.message}`, false, 3000);
        } finally {
            isCutEditing = false;
            cutCancelBtn.style.display = 'none';
            editInMark = -1;
            editOutMark = -1;
            inMarkDisplay.textContent = '--:--:--';
            outMarkDisplay.textContent = '--:--:--';
        }
    });

    // 📩並び替えボタンクリックイベント（トグル実装）
    sortPlaylistBtn.addEventListener('click', (e) => {
        // clearPlaylistFilter();
        if (isFilterPanelVisible) debouncedUpdateFilterList();
        debouncedScrollCurrentFilterItem();
        e.stopPropagation();

        const existingMenu = document.querySelector('.sort-playlist-menu');
        if (existingMenu) {
            existingMenu.remove();
            document.removeEventListener('click', closeMenu); // ← ここも後で修正必要
            return;
        }

        // メニュー非表示
        hideMenus();

        const targetContainer = document.fullscreenElement || mainContainer;
        const menu = createSortMenu();

        const containerRect = targetContainer.getBoundingClientRect();
        const btnRect = sortPlaylistBtn.getBoundingClientRect();

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

    // 📚表示形式ボタン
    playlistDisplayBtn.addEventListener('click', (e) => {
        // clearPlaylistFilter();
        if (isFilterPanelVisible) debouncedUpdateFilterList();
        debouncedScrollCurrentFilterItem();
        e.stopPropagation();

        const existingMenu = document.querySelector('.playlist-display-menu');
        if (existingMenu) {
            existingMenu.remove();
            document.removeEventListener('click', closeMenu);
            return;
        }

        // メニュー非表示
        hideMenus();

        const targetContainer = document.fullscreenElement || mainContainer;
        const menu = createPlaylistDisplayMenu();

        const containerRect = targetContainer.getBoundingClientRect();
        const btnRect = playlistDisplayBtn.getBoundingClientRect();

        menu.style.left = `${btnRect.left - containerRect.left}px`;
        menu.style.top  = `${btnRect.bottom - containerRect.top + 4}px`;

        targetContainer.appendChild(menu);

        function closeMenu(ev) {
            if (!menu.contains(ev.target) && ev.target !== playlistDisplayBtn) {
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

    // 🎤音声選択クリック時
    voiceSelectBtn.addEventListener('click', (e) => {
        if (modeChange !== 'convert') return;
        if (playlist.length === 0) return;

        toggleTrackMenu(e, 'audio', voiceSelectBtn);

        showControlsAndFilename();
        updateIconOverlay();
    });

    // 🔠字幕選択クリック時
    subtitleSelectBtn.addEventListener('click', (e) => {
        if (modeChange !== 'video') return;
        if (playlist.length === 0) return;

        toggleTrackMenu(e, 'subtitle', subtitleSelectBtn);
        
        showControlsAndFilename();
        updateIconOverlay();
    });

    // 変更履歴の表示／非表示トグル
    changelogBtn.addEventListener('click', () => {
        // 表示状態をトグル
        if (changelogContent.style.display === 'block') {
            changelogBtn.textContent = '▶ 変更履歴';
            changelogContent.style.display = 'none';
            tableContainer.style.height = `calc(96vh - 7em)`;
        } else {
            changelogBtn.textContent = '▼ 変更履歴';
            changelogContent.style.display = 'block';
            tableContainer.style.height = `calc(61.3vh - 7em)`;
        }
    });

    Initializing = false;
});

// ショートカットキー（イベントリスナー）
document.addEventListener('keydown', async (event) => {
    // 動画のURLの入力中はショートカット無効
    if (document.activeElement === urlInput) {  
        // 動画のURLクリア（Escape）
        if (event.key === 'Escape') {
            event.preventDefault();
            urlClearBtn.click();
        }
        return;
    }
    // フィルタ条件入力中はショートカット無効
    if (document.activeElement === playlistFilterInput) { 
        // 🔘フィルタ条件クリア（Escape）
        if (event.key === 'Escape') {
            event.preventDefault();
            filterClearBtn.click();
        }
        return; 
    }

    // ■リロード■
    if (event.key === 'F5') {
        event.preventDefault();
        location.reload();
        return;
    }

    // ■ヘルプ■
    if (isHelpOpen) {
        // ヘルプキャンセル（Escape）
        if (event.key === 'Escape') {
            event.preventDefault();
            helpCloseBtn.click();
            return;
        }
    }

    // ■🌐ネット動画再生■
    if (urlInput.style.display === 'inline-block' && urlInput === document.activeElement) {
        // 🔘ネット動画Url入力クリア（Shift+C）
        if (event.shiftKey && event.key.toLowerCase() === 'c') {
            event.preventDefault();
            urlClearBtn.click();
            return;
        }

        // ✅ネット動画Url入力確定（Enter）
        if (event.key === 'Enter') {
            event.preventDefault();
            urlConfirmBtn.click();
            return;
        }
    }

    // ■カット編集■
    if (editPanel.style.display === 'flex') {
        // 📍←INマーク設定（Shift+i）
        if (event.shiftKey && event.key.toLowerCase() === 'i') {
            event.preventDefault();
            setInMarkBtn.click();
            return;
        }

        // →📍OUTマーク設定（Shift+o）
        if (event.shiftKey && event.key.toLowerCase() === 'o') {
            event.preventDefault();
            setOutMarkBtn.click();
            return;
        }

        // ✅カット設定（Shift+m）
        if (event.shiftKey && event.key.toLowerCase() === 'm') {
            event.preventDefault();
            addCutRangeBtn.click();
            return;
        }

        // 💾カット編集保存（Shift+s）
        if (event.shiftKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
            saveVideoBtn.click();
            return;
        }

        // 🆑カット編集クリア（Shift+c）
        if (event.shiftKey && event.key.toLowerCase() === 'c') {
            event.preventDefault();
            clearEditBtn.click();
            return;
        }
    }

    // カット編集保存中はキャンセルのみ有効
    if (isCutEditing ) {
        // カット編集キャンセル（Escape）
        if (event.key === 'Escape') {
            event.preventDefault();
            cutCancelBtn.click();
            return;
        }
    }

    // ■結合編集■
    // 結合編集保存中はキャンセルのみ有効
    if (isJoinEditing) {
        // 結合編集キャンセル（Escape）
        if (event.key === 'Escape') {
            event.preventDefault();
            cutCancelBtn.click();
            return;
        }
    }
    
    // ■🔎ズーム・移動・ショット■
    if (isZoomMode) {
        // 🔘ズームリセット（Ctrl+0）
        if (event.ctrlKey && event.key === '0') {
            event.preventDefault();
            zoomResetBtn.click();
            return;
        }

        // 📺アスペクト比設定（Ctrl+u）
        if (event.ctrlKey && event.key === 'u') {
            event.preventDefault();
            aspectRatioBtn.click();
            return;
        }

        // 📷スナップショット（Ctrl+s）
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            snapshotBtn.click();
            return;
        }

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

        // ❌ズーム終了（Ctrl+z）
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();
            zoomEndBtn.click();
            return;
        }
    }

    // ■設定パネル■
    if (isSettingsPanelOpen === true) {
        // 🖥️フルスクリーン表示（Ctrl+a）
        if (event.ctrlKey && event.key.toLowerCase() === 'a') {
            event.preventDefault();
            fullscreenBtn.click();
            return;
        }

        // 🖼️背景壁紙選択（Ctrl+p）
        if (event.ctrlKey && event.key === 'p') {
            event.preventDefault();
            wallpaperBtn.click();
            return;
        }

        // 🔝常に最前面（Ctrl+1）
        if (event.ctrlKey && event.key === '1') {
            event.preventDefault();
            alwaysOnTopBtn.click();
            return;
        }

        // 🏳️‍🌈オーディオモーション設定（Ctrl+m）
        if (event.ctrlKey && event.key === 'm') {
            event.preventDefault();
            audioMotionBtn.click();
            return;
        }

        // 📥設定インポート（Ctrl+i）
        if (event.ctrlKey && event.key === 'i') {
            event.preventDefault();
            importSettingsBtn.click();
            return;
        }

        // 📤設定エクスポート（Ctrl+o）
        if (event.ctrlKey && event.key === 'o') {
            event.preventDefault();
            exportSettingsBtn.click();
            return;
        }

        // ❌設定パネル終了（Ctrl+q）
        if (event.ctrlKey && event.key === 'q') {
            event.preventDefault();
            toggleSettingsPanel(false);
            return;
        }
    }

    // ■プレイリストパネル■
    if (filterPanel.style.display === 'flex') {
        // 🔘フィルタ条件クリア（shift+0）
        if (event.shiftKey && event.key === '0') {
            event.preventDefault();
            filterClearBtn.click();
            return;
        }

        // 📩プレイリスト並び替え 表示（shift+m）
        if (event.shiftKey && event.key.toLowerCase() === 'm') {
            event.preventDefault();
            sortPlaylistBtn.click();
            return;
        }

        // 📚プレイリスト表示形式変更（shift+l）
        if (event.shiftKey && event.key.toLowerCase() === 'l') {
            event.preventDefault();
            playlistDisplayBtn.click();
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
    
        // ＋動画追加（shift+a）
        if (event.shiftKey && event.key.toLowerCase() === 'a') {
            event.preventDefault();
            addPlaylistBtn.click();
            return;
        }
        
        // －動画削除（shift+d）
        if (event.shiftKey && event.key.toLowerCase() === 'd') {
            if (playlist.length > 0) {
                event.preventDefault();
                removePlaylistBtn.click();
                return;
            }
        }
        
        // 🆑プレイリストクリア（shift+c）
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

    // ■プレイリストパネル■
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

    // ▼プレイリストフィルタ（Ctrl＋g）
    if (event.ctrlKey && event.key === 'g') {
        event.preventDefault();
        toggleFilterPanel();
        return;
    }

    // 🔀ランダム再生（Ctrl＋r）
    if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        randomPlayBtn.click();
        return;
    }

    // 🔁・🔂繰り返し再生（Ctrl＋Shift＋r）
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        repeatPlayBtn.click();
        return;
    }

    // ■コントロールパネル■
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

    // 先頭動画再生（Home）
    if (event.key === 'Home') {
        if (playlist.length > 1) {
            currentVideoIndex = 0;
            updatePlaylistDisplay();
            await playVideo(playlist[currentVideoIndex].file, 0);
            savePlaylistAndPlaybackState();
            showControlsAndFilename();
            updateIconOverlay();
            return;
        }
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

    // ⏹️停止（Ctrl+Space／Ctrl+Right Clickk）
    if (event.ctrlKey && event.key === ' ') {
        event.preventDefault();
        playStopBtn.click();
        return;
    } 

    // ▶️再生／⏸️一時停止（Space／Right Click）
    if (!event.ctrlKey && event.key === ' ') {
        event.preventDefault();
        playPauseBtn.click();
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
    
    // 最終動画再生（End）
    if (event.key === 'End') {
        if (playlist.length > 1) {
            currentVideoIndex = playlist.length - 1;
            updatePlaylistDisplay();
            await playVideo(playlist[currentVideoIndex].file, 0);
            savePlaylistAndPlaybackState();
            showControlsAndFilename();
            updateIconOverlay();
            return;
        }
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

    // ⚙️ 設定モード切替（Ctrl+q）
    if (event.ctrlKey && event.key === 'q') {
        event.preventDefault();
        settingsBtn.click();
        return;
    }

    // ❓ヘルプ開く（Ctrl+h）
    if (event.ctrlKey && event.key === 'h') {
        event.preventDefault();
        helpOpenBtn.click();
        return;
    }

    // 🔠字幕・🎤音声選択（Ctrl+t）
    if (event.ctrlKey && event.key === 't') {
        event.preventDefault();
        if (modeChange === 'video') {
            subtitleSelectBtn.click();
        } else {
            voiceSelectBtn.click();
        }
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
        updatemessageOverlay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`);
        localStorage.setItem('volume', videoPlayer.volume);
        showControlsAndFilename();
        updateIconOverlay();
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

    // 5秒戻る／5秒進む（←／→）
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        try { event.preventDefault(); } catch (e) {}
    
        if (videoPlayer.duration) {
            // ★ ここですべてのフラグを先に定義 ★
            const editPanelExist = typeof editPanel !== 'undefined' && editPanel;
            const editVisible = editPanelExist && window.getComputedStyle(editPanel).display !== 'none';
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
                updatemessageOverlay(`🕓 ${formatTime(newTime)} (${frameNum}f)`);
            } else {
                updatemessageOverlay(`🕓 ${formatTime(newTime)}`);
            }
        }
        return;
    }

    // ■その他■
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
        if (controls.style.opacity !== '1') return;
        isSeekDragging = false;
        isDragging = false;
        darkOverlay.style.display = 'none';
        hidemessageOverlay();
        // ★ 動画以外（音声ファイル等）の場合はプレビューを表示しない
        const currentSrc = playlist[currentVideoIndex]?.file?.path || '';
        const ext = path.extname(currentSrc).toLowerCase();
        if (isMouseOverSeekBar && isVideoFile(ext)) {
            videoPreview.style.display = 'block';
        }
    }

    if (isEditSeekDragging) {
        if (filename.style.opacity !== '1') return;
        isEditSeekDragging = false;
        isDragging = false;
        darkOverlay.style.display = 'none';
        hidemessageOverlay();
        const currentSrc = playlist[currentVideoIndex]?.file?.path || '';
        const ext = path.extname(currentSrc).toLowerCase();
        if (isMouseOverEditSeekBar && isVideoFile(ext)) {
            videoPreview.style.display = 'block';
        }
    }   

    if (isPanning) {
        // ドキュメントレベルでのマウスアップ時にもパン終了処理
        isPanning = false;
        resetCursorTimer();
        updateIconOverlay();
    }
});

// フルスクリーン変更
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        fullscreenBtn.textContent = '🖥️';
        fullscreenBtn.classList.remove('mode-active');
        fullscreenBtn.setAttribute('data-tooltip', 'フルスクリーン表示（Ctrl+a／Double Click）');
    } else {
        fullscreenBtn.textContent = '🖥️';
        fullscreenBtn.classList.add('mode-active');
        fullscreenBtn.setAttribute('data-tooltip', 'フルスクリーン解除（Ctrl+a／Double Click）');
    }
    updateIconOverlay();
});

// 🔲window ハンドラ登録🔲
// ウィンドウリサイズ
window.addEventListener('resize', () => {
    if (Initializing) return;
    
    const controlSizeX = calculateControlSizeX();
    const controlSizeY = calculateControlSizeY();
    localStorage.setItem('controlSizeX', controlSizeX);
    localStorage.setItem('controlSizeY', controlSizeY);
    updateControlSize(controlSizeX, controlSizeY);
    adjustFilterPanelHeight();
    applyAspectRatioSetting();

    showControlsAndFilename();
    updateIconOverlay();
});

// ウィンドウ終了前
window.addEventListener('beforeunload', function(e)  {
    cleanupTempFiles();
});

// ウィンドウ終了
window.addEventListener('unload', () => {
    cleanupTempFiles();
});

// 🔲ipcRenderer ハンドラ登録🔲
// main.js からの自動再生指示を受信
ipcRenderer.on('auto-play-files', (event, videoFiles) => {
    if (!videoFiles || videoFiles.length === 0) return;
    playlistSet(videoFiles);
    debouncedUpdateFilterList();
    debouncedScrollCurrentFilterItem();
});

// 変換進捗受信
ipcRenderer.on('convert-progress', (e, { percent, step }) => {
    let playListCount = playlist.length;
    let playListCurrent = currentVideoIndex;
    if (modeChange === 'video') {
        playListCount = 1;
        playListCurrent = 0;
    }

    if (step === 1) {
        if (isRepeatPlayMode === 'single') {
            updatemessageOverlay(`🔄️ 変換中…（1/1） ${Math.round(percent)}%`, false, 0);
        } else {
            updatemessageOverlay(`🔄️ 変換中…（${playListCurrent + 1}/${playListCount}） ${Math.round(percent)}%`, false, 0);
        }
    }
    // シークバーに進捗を表示
    let totalPercent = ((playListCurrent * 100) + percent) / (playListCount * 100) * 100;
    if (isRepeatPlayMode === 'single') {
        totalPercent = percent;
    }
    seekBar.value = totalPercent;
});

// 字幕ファイル出力開始
ipcRenderer.on('subtitle-extraction-progress', (e, data) => {
    let playListCount = playlist.length;
    let playListCurrent = currentVideoIndex;
    if (modeChange === 'video') {
        playListCount = 1;
        playListCurrent = 0;
    }

    updatemessageOverlay(`🔄️ 字幕作成中…（${playListCurrent + 1}/${playListCount}） 100%（${data.subtitleIndex}/${data.subtitleCount}）`, false, 0);
});

// 変換エラー
ipcRenderer.on('convert-error', (event, msg) => {
    console.error("変換失敗:", err);
    isConverting = false;
    updatemessageOverlay(`🔄️ 変換失敗`, false, 3000);
    playlistPathArea.value = appNameAndCopyrightValueLine;
    updateIconOverlay();
});

// カット進捗受信（ 詳細ペイロード対応）
ipcRenderer.on('cut-progress', (event, payload) => {
    try {
        const stage = payload && payload.stage ? payload.stage : 'progress';
        switch (stage) {
            case 'start':
                updatemessageOverlay(`✂️ カット準備中…` , true, 0);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'extract-start':
                updatemessageOverlay(`✂️ カット開始 ${payload.index + 1}/${payload.total} ${formatTime(payload.segStart)} - ${formatTime(payload.segEnd)}` , true, 0);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'extract-done':
                updatemessageOverlay(`✂️ カット済 ${payload.index + 1}/${payload.total} (${Math.round(payload.percent)}%)` , true, 0);
                break;
            case 'concat-start':
                updatemessageOverlay(`✂️ 結合中…` , true, 0);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'concat-done':
                updatemessageOverlay(`✂️ 結合完了` , false, 1500);
                cutCancelBtn.style.display = 'none';
                break;
            case 'reencode':
                const p = payload.percent !== undefined ? Math.round(payload.percent) : 0;
                const fm = payload.frames !== undefined ? `${payload.frames}f` : '';
                const tm = payload.timemark ? ` [${payload.timemark}]` : '';
                updatemessageOverlay(`✂️ カット中… ${p}% ${fm}${tm}` , true, 0);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'done':
                isCutEditing = false;
                updatemessageOverlay(`✂️ 保存完了` , false, 1500);
                cutCancelBtn.style.display = 'none';
                break;
            case 'error':
                isCutEditing = false;
                updatemessageOverlay(`✂️ カット失敗: ${payload.message || 'エラー'}` , false, 3000);
                cutCancelBtn.style.display = 'none';
                break;
            default:
                // 旧スタイル or unknown
                const percent = payload && payload.percent ? Math.round(payload.percent) : 0;
                updatemessageOverlay(`✂️ カット中… ${percent}%`, true, 0);
                break;
        }
    } catch (e) {
        updatemessageOverlay('✂️ カット処理中…', true, 0);
    }
});

// 結合進捗受信（詳細ペイロード対応）
ipcRenderer.on('join-progress', (event, payload) => {
    try {
        const stage = payload && payload.stage ? payload.stage : 'progress';
        switch (stage) {
            case 'join-prepare':
                updatemessageOverlay(`🎞️ 変換中…`, true, 0);
                break;
            case 'convert-pre':
                const convPercent = Math.round(payload.percent);
                if (isRepeatPlayMode === 'single') {
                    updatemessageOverlay(`🎞️ 変換中… （1/1） ${convPercent}%`, true, 0);
                } else {
                    updatemessageOverlay(`🎞️ 変換中… （${payload.currentFile}/${payload.totalFiles}） ${convPercent}%`, true, 0);
                }
                break;
            case 'join-start':
                updatemessageOverlay('🎞️ 結合開始…', true, 0);
                break;
            case 'join':
                updatemessageOverlay(`🎞️ 結合中…`, true, 0);
                break;
            case 'join-done':
                updatemessageOverlay('🎞️ 結合完了', false, 1500);
                break;
        }
    } catch (e) {
        updatemessageOverlay('🎞️ 変換エラー', false, 0);
    }
});

// 🔲共通関数🔲
// DOM要素取得
function allDOMsetting() {
    videoPlayerElement = document.getElementById('videoPlayer');
    audioPlayer = document.getElementById('audioPlayer');
    videoPlayer = createMediaPlayerProxy(videoPlayerElement, audioPlayer);
    videoPreview = document.getElementById('videoPreview');
    mainContainer = document.querySelector('.main-container');
    videoContainer = document.querySelector('.video-container');
    dropzone = document.querySelector('.video-container');
    controls = document.querySelector('.controls');
    folderInput = document.getElementById('folderInput');
    videoInput = document.getElementById('videoInput');
    urlInputBtn = document.getElementById('urlInputBtn');
    urlInput = document.getElementById('urlInput');
    urlClearBtn = document.getElementById('urlClearBtn');
    urlConfirmBtn = document.getElementById('urlConfirmBtn');
    urlInputPanel = document.querySelector('.url-input-panel');
    prevVideoBtn = document.getElementById('prevVideoBtn');
    rewindBtn = document.getElementById('rewindBtn');
    playPauseBtn = document.getElementById('playPauseBtn');
    playStopBtn = document.getElementById('playStopBtn');
    fastForwardBtn = document.getElementById('fastForwardBtn');
    nextVideoBtn = document.getElementById('nextVideoBtn');
    seekBar = document.getElementById('seekBar');
    volumeMuteBtn = document.getElementById('volumeMuteBtn');
    volumeBar = document.getElementById('volumeBar');
    speedSelect = document.getElementById('speedSelect');
    zoomBtn = document.getElementById('zoomBtn');
    zoomPanel = document.getElementById('zoomPanel');
    zoomBar = document.getElementById('zoomBar');
    zoomDisplay = document.getElementById('zoomDisplay');
    zoomResetBtn = document.getElementById('zoomResetBtn');
    snapshotBtn = document.getElementById('snapshotBtn');
    aspectRatioBtn = document.getElementById('aspectRatioBtn');
    zoomEndBtn = document.getElementById('zoomEndBtn');
    fullscreenBtn = document.getElementById('fullscreenBtn');
    fitModeBtn = document.getElementById('fitModeBtn');
    filename = document.querySelector('.filename');
    filenamePanel = document.querySelector('.filename-panel');
    timeDisplay = document.getElementById('timeDisplay');
    volumeDisplay = document.getElementById('volumeDisplay');
    messageOverlay = document.getElementById('messageOverlay');
    iconOverlay = document.getElementById('iconOverlay');
    appNameAndCopyright = document.getElementById('appNameAndCopyright');
    wallpaperBtn = document.getElementById('wallpaperBtn');
    exportSettingsBtn = document.getElementById('exportSettingsBtn');
    importSettingsBtn = document.getElementById('importSettingsBtn');
    alwaysOnTopBtn = document.getElementById('alwaysOnTopBtn');
    audioMotionBtn = document.getElementById('audioMotionBtn');
    settingsBtn = document.getElementById('settingsBtn');
    settingsPanel = document.getElementById('settingsPanel');
    settingsCloseBtn = document.getElementById('settingsCloseBtn');
    helpOpenBtn = document.getElementById('helpOpenBtn');
    helpCloseBtn = document.getElementById('helpCloseBtn');
    helpContainer = document.querySelector('.help-container');
    helpTitle = helpContainer.querySelector('h1');
    tooltipElements = document.querySelectorAll('[data-tooltip]');
    filenameMenus = document.querySelector('.filename-menus');
    filenameMenu = document.getElementById('filenameMenu');
    upMovePlaylistBtn = document.getElementById('upMovePlaylistBtn');
    downMovePlaylistBtn = document.getElementById('downMovePlaylistBtn');
    addPlaylistBtn = document.getElementById('addPlaylistBtn');
    removePlaylistBtn = document.getElementById('removePlaylistBtn');
    clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
    savePlaylistBtn = document.getElementById('savePlaylistBtn');
    modeChangeBtn = document.getElementById('modeChangeBtn');
    editPanel = document.getElementById('editPanel');
    editModeBtn = document.getElementById('editModeBtn');
    setInMarkBtn = document.getElementById('setInMarkBtn');
    setOutMarkBtn = document.getElementById('setOutMarkBtn');
    addCutRangeBtn = document.getElementById('addCutRangeBtn');
    saveVideoBtn = document.getElementById('saveVideoBtn');
    cutRangesList = document.getElementById('cutRangesList');
    clearEditBtn = document.getElementById('clearEditBtn');
    inMarkDisplay = document.getElementById('inMarkDisplay');
    outMarkDisplay = document.getElementById('outMarkDisplay');
    editSeekBar = document.getElementById('editSeekBar');
    cutCancelBtn = document.getElementById('cutCancelBtn');
    randomPlayBtn = document.getElementById('randomPlayBtn');
    repeatPlayBtn  = document.getElementById('repeatPlayBtn');
    joinPlaylistBtn = document.getElementById('joinPlaylistBtn');
    sortPlaylistBtn = document.getElementById('sortPlaylistBtn');
    playlistDisplayBtn = document.getElementById('playlistDisplayBtn');
    filterPanel = document.getElementById('filterPanel');
    playlistFilterInput = document.getElementById('playlistFilterInput');
    filterClearBtn = document.getElementById('filterClearBtn');
    filterList = document.getElementById('filterList');
    darkOverlay = document.getElementById('darkOverlay');
    voiceSelectBtn = document.getElementById('voiceSelectBtn');
    subtitleSelectBtn = document.getElementById('subtitleSelectBtn');
    itemCount = document.getElementById('itemCount');
    playlistPathArea = document.getElementById('playlistPathArea');
    cutTimelineContainer = document.getElementById('cutTimelineContainer');
    cutTimelineBar = document.getElementById('cutTimelineBar');
    filterHistoryList = document.getElementById('filterHistoryList');
    changelogBtn = document.getElementById('changelogBtn');
    changelogContent = document.getElementById('changelogContent');
    tableContainer = document.getElementById('tableContainer');
    mediaContainer = document.getElementById('mediaContainer');
}

// ユーザーフォルダ内の設定ファイルパスを取得
function getUserSettingsPath() {
    // os.homedir() を使用してユーザーフォルダ直下のパスを生成
    return path.join(os.homedir(), 'xPlayerSettings.json');
}

// 重複起動判定ヘルパー
async function checkInstance() {
    if (typeof checkIsSecondaryInstance === 'function') {
        return await checkIsSecondaryInstance();
    }
    return false; // 万が一取得できない場合は初回起動扱い
}

// 重複起動時の localStorage 書き込み防止処理
async function setupLocalStorageProtection() {
    // メインプロセスへ重複起動かを問い合わせ
    const isSecondary = await window.electronAPI.checkIsSecondaryInstance();

    if (isSecondary) {
        console.warn('⚠️ 重複起動を検知しました。localStorage への書き込みを無効化します。');

        // 原型のメソッドを保持
        const originalSetItem = localStorage.setItem.bind(localStorage);
        const originalClear = localStorage.clear.bind(localStorage);
        const originalRemoveItem = localStorage.removeItem.bind(localStorage);

        // setItem をガード
        localStorage.setItem = function (key, value) {
            console.log(`[重複起動ガード] setItem スキップ: ${key}`);
            // 何もせず書き込みをスキップ
        };

        // clear をガード
        localStorage.clear = function () {
            console.log('[重複起動ガード] clear スキップ');
        };

        // removeItem をガード
        localStorage.removeItem = function (key) {
            console.log(`[重複起動ガード] removeItem スキップ: ${key}`);
        };
    }
}

// localStorage から復元 (非同期化)
async function allLocalStorageSetting() {
    const isSecondary = await window.electronAPI.checkIsSecondaryInstance();
    const settingsFilePath = getUserSettingsPath();

    if (!isSecondary) {
        // --- 初回起動時 ---
        appNameAndCopyright.textContent = appNameAndCopyrightValue;
        // 1. localStorage から値を取得し対象変数に設定
        savedVolume = localStorage.getItem('volume');
        savedPlaybackSpeed = localStorage.getItem('playbackSpeed');
        savedPlaylist = localStorage.getItem('playlist');
        savedCurrentVideoIndex = localStorage.getItem('currentVideoIndex');
        savedCurrentTime = localStorage.getItem('currentTime');
        savedFitMode = localStorage.getItem('fitMode');
        savedZoom = localStorage.getItem('zoom');
        savedTranslateX = localStorage.getItem('translateX');
        savedTranslateY = localStorage.getItem('translateY');
        savedEditFrameRate = localStorage.getItem('editFrameRate');
        savedIsRandomPlayMode = localStorage.getItem('isRandomPlayMode');
        savedIsRepeatPlayMode = localStorage.getItem('isRepeatPlayMode');
        savedShuffleOrder = localStorage.getItem('shuffleOrder');
        savedShufflePosition = localStorage.getItem('shufflePosition');
        savedAspectRatio = localStorage.getItem('aspectRatio');
        savedCurrentSortMode = localStorage.getItem('playlistSortMode');
        savedPlaylistDisplayMode = localStorage.getItem('playlistDisplayMode');
        savedSelectedAudioLabel = localStorage.getItem('selectedAudioLabel');
        savedSelectedAudioTrack = localStorage.getItem('selectedAudioTrack');
        savedSelectedSubtitleLabel = localStorage.getItem('selectedSubtitleLabel');
        savedSelectedSubtitleTrack = localStorage.getItem('selectedSubtitleTrack');
        savedWallpaperPath = localStorage.getItem('wallpaperPath');
        savedAlwaysOnTop = localStorage.getItem('alwaysOnTop');
        savedAudioMotionMode = localStorage.getItem('audioMotionMode');
        savedFilterHistory = localStorage.getItem('filterHistory');

        // 2. 取得情報をユーザーフォルダの xPlayerSettings.json に保存
        await exportSettingsToFile(settingsFilePath);

    } else {
        // --- 重複起動時 ---
        appNameAndCopyright.textContent = `🚫${appNameAndCopyrightValue}}`;
        // 1. ユーザーフォルダの xPlayerSettings.json を読込
        const loadedSettings = await importSettingsFromFile(settingsFilePath);

        if (loadedSettings) {
            // 2. 取得情報を対象変数に設定
            savedVolume = loadedSettings['volume'] ?? null;
            savedPlaybackSpeed = loadedSettings['playbackSpeed'] ?? null;
            savedPlaylist = loadedSettings['playlist'] ?? null;
            savedCurrentVideoIndex = loadedSettings['currentVideoIndex'] ?? null;
            savedCurrentTime = loadedSettings['currentTime'] ?? null;
            savedFitMode = loadedSettings['fitMode'] ?? null;
            savedZoom = loadedSettings['zoom'] ?? null;
            savedTranslateX = loadedSettings['translateX'] ?? null;
            savedTranslateY = loadedSettings['translateY'] ?? null;
            savedEditFrameRate = loadedSettings['editFrameRate'] ?? null;
            savedIsRandomPlayMode = loadedSettings['isRandomPlayMode'] ?? null;
            savedIsRepeatPlayMode = loadedSettings['isRepeatPlayMode'] ?? null;
            savedShuffleOrder = loadedSettings['shuffleOrder'] ?? null;
            savedShufflePosition = loadedSettings['shufflePosition'] ?? null;
            savedAspectRatio = loadedSettings['aspectRatio'] ?? null;
            savedCurrentSortMode = loadedSettings['playlistSortMode'] ?? null;
            savedPlaylistDisplayMode = loadedSettings['playlistDisplayMode'] ?? null;
            savedSelectedAudioLabel = loadedSettings['selectedAudioLabel'] ?? null;
            savedSelectedAudioTrack = loadedSettings['selectedAudioTrack'] ?? null;
            savedSelectedSubtitleLabel = loadedSettings['selectedSubtitleLabel'] ?? null;
            savedSelectedSubtitleTrack = loadedSettings['selectedSubtitleTrack'] ?? null;
            savedWallpaperPath = loadedSettings['wallpaperPath'] ?? null;
            savedAlwaysOnTop = loadedSettings['alwaysOnTop'] ?? null;
            savedAudioMotionMode = loadedSettings['audioMotionMode'] ?? null;
            savedFilterHistory = loadedSettings['filterHistory'] ?? null;
        }
    }
}

// 音声トラック・字幕トラック更新
async function updateTrack(type) {
    let videondex = currentVideoIndex;
    if (isVideoStopped() || videondex === -1) {
        videondex = selectedPlaylistIndex;
    }
    // プレイリスト・インデックスチェック
    if (!playlist?.length || 
        !Number.isInteger(videondex) || 
        videondex < 0 || 
        videondex >= playlist.length) {
        
        console.warn(`updateTrack(${type}) スキップ：有効な動画が選択されていません`);
        return;
    }

    const currentItem = playlist[videondex];
    if (!currentItem?.file?.path) {
        console.warn('選択中のアイテムに file.path がありません');
        return;
    }

    await toggleTrackMenu(null, type, null);

    const track = type === 'audio' ? currentAudioTrack : currentSubtitleTrack;
    const label = type === 'audio' ? '' : selectedSubtitleLabel;
    await selectTrackMenu(type, null, label, track);
}

// 時間フォーマット変換
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    const appNameAndCopyrightFontSize = 8 + (valueX / 100) * (18 - 8);
    const appNameAndCopyrightPadding = 1 + (valueX / 100) * (8 - 1);
    const speedSelectWidth = 40 + (valueX / 120) * (154 - 40);
    const zoomPanelHeight = 100 + (valueY / 100) * (500 - 100);
    const zoomPanelWidth = 30 + (valueX / 100) * (40 - 30);

    // --- ボタンの高さ・幅の計算 ---
    const buttonHeight = 18 + (valueX / 100) * (46 - 18);
    const buttonWidth = 30 + (valueX / 100) * (52 - 30);

    const controls = document.querySelectorAll('button, input, #itemCount, #timeDisplay, #speedSelect, #volumeDisplay, #appNameAndCopyright, #zoomPanel, #settingsPanel, #filename, #filenamePanel, #playlistPathArea, #cutTimelineContainer, #cutTimelineBar');
    
    controls.forEach(control => {
        // 【追加】 filter-item クラスを持つ要素はサイズ調整の対象外にする
        if (control.classList.contains('filter-item')) {
            return; // このループをスキップ
        }

        // 1. フォントサイズ・パディングの設定
        if (control.id === 'appNameAndCopyright') {
            control.style.fontSize = `${appNameAndCopyrightFontSize}px`;
            control.style.padding = `${appNameAndCopyrightPadding}px ${appNameAndCopyrightPadding * 2}px`;
        } else {
            if (control.type !== 'range' && control.id !== 'cutDeleteBtn') {
                control.style.fontSize = `${fontSize}px`;
                control.style.padding = `${padding}px ${padding * 2}px`;
            }
        }

        // 2. ボタン要素（<button>）への高さ・幅の統一適用
        if (control.tagName === 'BUTTON') {
            control.style.height = `${buttonHeight}px`;
            control.style.width = `${buttonWidth}px`;
            if (control.id === 'setInMarkBtn' || control.id === 'setOutMarkBtn') {
                control.style.width = `${buttonWidth * 1.6}px`;
            }
            // レイアウト崩れ防止（テキスト溢れ対応）
            control.style.alignItems = 'center';
            control.style.justifyContent = 'center';
        }

        // 3. 個別要素のサイズ変更
        if (control.id === 'speedSelect') {
            control.style.width = `${speedSelectWidth}px`;
        }
        if (control.id === 'zoomPanel') {
            control.style.height = `${zoomPanelHeight}px`;
            control.style.width = `${zoomPanelWidth}px`;
        }
        if (control.id === 'settingsPanel') {
            control.style.width = `${zoomPanelWidth}px`;
        }
    });

    const overlayFontSize = 20 + (valueX / 100) * (140 - 20);
    messageOverlay.style.fontSize = `${overlayFontSize}px`;
}

// ツールチップ表示
function showTooltip(element) {
    let tooltip = element.querySelector('.tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        element.appendChild(tooltip);
    }
    
    // ★ここが重要：毎回最新のdata-tooltipを反映
    tooltip.textContent = element.dataset.tooltip || '';
    
    tooltip.classList.add('visible');
    // 位置調整などの既存処理があれば継続
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
    if (messageOverlay.classList.contains('active')) {
        messageOverlay.style.display = 'block';
        messageOverlay.classList.add('active');
    }
    clearTimeout(timeout);
    if (!isMouseOverControls && !isurlInputPanelVisible) {
        timeout = setTimeout(() => {
            if (!isMouseOverControls && !isFilterPanelVisible && !(isEditMode || (editPanel && window.getComputedStyle(editPanel).display !== 'none')) && modeChange !== 'join' && modeChange === 'video') {
                hideControlsAndFilename(); // ここで無効化
            }
        }, overlayTimeout);
    }
    resetCursorTimer();
    updateIconOverlay();
}

// コントロール＋ファイル名非表示
function hideControlsAndFilename() {
    disabledControls(true);
    disabledfilename(true);
    messageOverlay.classList.remove('active');
    hideMenus(false); // 追加：コントロール非表示時にメニューも強制非表示
    clearTimeout(timeout);
    setTimeout(() => {
        messageOverlay.style.display = 'none';
    }, 300);
    videoPlayer.style.cursor = 'none';
    videoContainer.style.cursor = 'none';

    isFilterPanelVisible = false;
    if (filterPanel) filterPanel.style.display = 'none';

    updateIconOverlay();
}

function hideEditPanel() {
    const editPanel = document.querySelector('.edit-panel');
    if (editPanel) {
        // 編集モードが開始していない状態にする
        isEditMode = false;
        editPanel.style.display = 'none';
        updateEditModeButtonUI();   // ← これで最初から ✂️ が表示される
    }
}

// メニュー非表示（プレイリスト並び替えメニューなど）
function hideMenus(hideAll = true) {
    
    const classes = [
        '.sort-playlist-menu',
        '.add-playlist-menu',
        '.track-menu',
        '.playlist-display-menu',
        ...(!isZoomMode || hideAll ? ['.aspect-ratio-menu'] : []),
        ...(!isSettingsPanelOpen || hideAll ? ['.audio-motion-menu'] : [])
    ];

    document.querySelectorAll(classes.join(', ')).forEach(m => m.remove());
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
        updatemessageOverlay(`🔍 ${zoomValue > 0 ? '+' : ''}${zoomValue}%`);
    }
}

// 描画モード適用
function applyFitModeSetting(setFitMode) {
    fitModeBtn.classList.remove('fitMode-cover', 'fitMode-fill');
    if (setFitMode === 'cover') {
        fitMode = 'cover';
        fitModeBtn.classList.add('fitMode-cover');
        fitModeBtn.textContent = '↕️';
        fitModeBtn.setAttribute('data-tooltip', '画像を覆う（Ctrl+x）');
    } else if (setFitMode === 'fill') {
        fitMode = 'fill';
        fitModeBtn.classList.add('fitMode-fill');
        fitModeBtn.textContent = '⏺️';
        fitModeBtn.setAttribute('data-tooltip', '画像を満たす（Ctrl+x）');
    } else {
        fitMode = 'contain';
        fitModeBtn.textContent = '↔️';
        fitModeBtn.setAttribute('data-tooltip', '画像を含む（Ctrl+x）');
    }
    videoPlayer.style.objectFit = fitMode;
    localStorage.setItem('fitMode', fitMode);
    applyAspectRatioSetting();
}

// アスペクト比適用
function applyAspectRatioSetting() {
    const selectedOption = ASPECT_NODES[currentAspectRatio];

    if (!selectedOption || currentAspectRatio === 'none') {
        videoPlayer.style.aspectRatio = '';
        videoPlayer.style.width = '100%';
        videoPlayer.style.height = '100%';
        videoPlayer.style.maxWidth = '100%';
        videoPlayer.style.maxHeight = '100%';
        videoPlayer.style.objectFit = fitMode;
        videoPlayer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${(100 + zoomValue) / 100})`;
    } else {
        const [width, height] = selectedOption.value.split(' / ').map(Number);
        const ratio = width / height;
        const containerWidth = videoContainer.clientWidth || window.innerWidth;
        const containerHeight = videoContainer.clientHeight || window.innerHeight;
        const maxWidth = containerWidth * 1.0;
        const maxHeight = containerHeight * 1.0;
        let targetWidth = maxWidth;
        let targetHeight = targetWidth / ratio;

        if (targetHeight > maxHeight) {
            targetHeight = maxHeight;
            targetWidth = targetHeight * ratio;
        }

        videoPlayer.style.aspectRatio = `${width} / ${height}`;
        videoPlayer.style.width = `${Math.round(targetWidth)}px`;
        videoPlayer.style.height = `${Math.round(targetHeight)}px`;
        videoPlayer.style.maxWidth = '100vw';
        videoPlayer.style.maxHeight = '100vh';
        videoPlayer.style.objectFit = fitMode;
        videoPlayer.style.margin = '0 auto';
        videoPlayer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${(100 + zoomValue) / 100})`;
    }

    videoContainer.style.justifyContent = 'center';
    videoContainer.style.alignItems = 'center';
    localStorage.setItem('aspectRatio', currentAspectRatio);

    if (aspectRatioBtn) {
        aspectRatioBtn.classList.toggle('aspectRatio-active', currentAspectRatio !== 'none');
    }
}

// アスペクト比選択メニュー作成
function createAspectRatioMenu() {
    const menu = document.createElement('div');
    menu.className = 'aspect-ratio-menu';

    Object.entries(ASPECT_NODES).forEach(([key, { label }]) => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.style.color = currentAspectRatio === key ? '#00ccff' : '#eee';
        item.innerHTML = (currentAspectRatio === key ? '✅ ' : '　　') + label;

        item.addEventListener('click', (event) => {
            event.stopPropagation();
            currentAspectRatio = key;
            applyAspectRatioSetting();
            menu.remove();
            updatemessageOverlay(`📺 ${label}`, false, 1500);
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

// オーディオモーシュン設定メニュー作成
function createAudioMotionMenu() {
    const menu = document.createElement('div');
    menu.className = 'audio-motion-menu';

    Object.entries(AUDIOMOTION_NODES).forEach(([key, { label }]) => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.style.color = audioMotionMode === key ? '#00ccff' : '#eee';
        item.innerHTML = (audioMotionMode === key ? '✅ ' : '　　') + label;

        item.addEventListener('click', (event) => {
            event.stopPropagation();
            audioMotionMode = key;
            updateAudioMotion();
            toggleVisualizer(currentMediaType);
            menu.remove();
            updatemessageOverlay(`🏳️‍🌈 ${label}`, false, 1500);
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

// 設定のエクスポート
async function exportSettingsToFile(targetFilePath = null) {
    try {
        let filePath = targetFilePath;

        // 引数の保存先ファイルパスが Null の場合
        if (!filePath) {
            const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
            const defaultName = `xPlayerSettings_${timestamp}.json`;
            const result = await showSaveSettingsDialog(defaultName);
            if (result.canceled || !result.filePath) {
                return;
            }
            filePath = result.filePath;
        }

        // localStorage の内容をオブジェクトにまとめる
        const settings = {};
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (key) {
                settings[key] = localStorage.getItem(key);
            }
        }

        // 指定されたパスにエクスポート
        await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf8');

        // ダイアログ経由（手動エクスポート）の場合のみオーバーレイメッセージを表示
        if (!targetFilePath) {
            const fileName = filePath.split(/[/\\]/).pop();
            updatemessageOverlay(`📤 エクスポート: ${fileName}`, false, 3000);
        }
    } catch (error) {
        console.error('設定エクスポート失敗:', error);
        if (!targetFilePath) {
            updatemessageOverlay('📤 設定のエクスポートに失敗しました', false, 3000);
        }
    }
}

// 設定のインポート
async function importSettingsFromFile(targetFilePath = null) {
    try {
        let filePath = targetFilePath;

        // 引数の取得先ファイルパスが Null の場合
        if (!filePath) {
            const result = await showOpenSettingsDialog();
            if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                return null;
            }
            filePath = result.filePaths[0];
        }

        const content = await fs.readFile(filePath, 'utf8');
        const settings = JSON.parse(content);

        if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
            throw new Error('設定ファイルの形式が正しくありません');
        }

        // ダイアログ経由（手動インポート）の場合のみ localStorage を更新してリロード
        if (!targetFilePath) {
            localStorage.clear();
            Object.entries(settings).forEach(([key, value]) => {
                localStorage.setItem(key, String(value));
            });

            const fileName = filePath.split(/[/\\]/).pop();
            updatemessageOverlay(`📥 インポート: ${fileName}`, false, 3000);
            setTimeout(() => {
                location.reload();
            }, 300);
        }

        // 読み込んだ設定オブジェクトを返す
        return settings;

    } catch (error) {
        console.error('設定インポート失敗:', error);
        if (!targetFilePath) {
            updatemessageOverlay('📥 設定のインポートに失敗しました', false, 5000);
        }
        return null;
    }
}

// オーバーレイ表示
function updatemessageOverlay(content, isInitial = false, autoHideAfter = 3000) {
    messageOverlay.textContent = content;
    const overlayFontSize = parseFloat(messageOverlay.style.fontSize) || 90;
    // 1. 実際の文字サイズ（横幅）を計算する関数
    function getTextWidth(text, font) {
        // メモリ上に一時的なcanvasを作成
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        context.font = font;
        // 指定したフォントでの正確な横幅（px）を返す
        return context.measureText(text).width;
    }
    // 2. 現在のフォント設定を取得（font-familyも合わせるとより正確になります）
    const computedStyle = window.getComputedStyle(messageOverlay);
    const fontSetting = `${overlayFontSize}px ${computedStyle.fontFamily || 'sans-serif'}`;
    // 3. 文字列全体の実際の横幅を測定
    const actualTextWidth = getTextWidth(content, fontSetting);
    // 4. 横幅の計算（文字幅に左右の余白40pxを足す）
    let overlayWidth = actualTextWidth + 40;
    // 5. 最小・最大幅の制限
    overlayWidth = Math.max(200, Math.min(overlayWidth, window.innerWidth * 0.8));
    messageOverlay.style.width = `${overlayWidth}px`;

    messageOverlay.style.display = 'block';
    messageOverlay.classList.add('active');
    if (!isInitial && !isZoomMode) {
        showControlsAndFilename();
    }
    updateIconOverlay();

    // 自動非表示の処理
    if (autoHideAfter > 0) {
        // 以前のタイマーが残っていたらクリア（複数回呼び出し対策）
        if (messageOverlay._autoHideTimer) {
            clearTimeout(messageOverlay._autoHideTimer);
        }

        messageOverlay._autoHideTimer = setTimeout(() => {
            hidemessageOverlay();
        }, autoHideAfter);
    }
}

// オーバーレイ非表示
function hidemessageOverlay() {
    messageOverlay.classList.remove('active');
    setTimeout(() => {
        messageOverlay.style.display = 'none';
    }, 300);
    updateIconOverlay();
}

// プレビュー位置更新関数
function updatePreviewPosition(e) {
    const previewWidth  = videoPreview.offsetWidth  || 180;  // fallbackとして180
    const previewHeight = videoPreview.offsetHeight || 100;  // fallbackとして100
    const seekRect = seekBar.getBoundingClientRect();
    const editSeekRect = editSeekBar.getBoundingClientRect();

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

    let y = 20;
    if (isSeekDragging || isMouseOverSeekBar) {
        // Y軸：seekBarの直上に固定（プレビュー高さ + 余白）
        y = seekRect.top - previewHeight - (previewHeight * 0.1); // seekBarの上に10pxの隙間
    } else if (isEditSeekDragging || isMouseOverEditSeekBar) {
        // Y軸：seekBarの直上に固定（プレビュー高さ + 余白）
        y = (editSeekRect.top - previewHeight) + (previewHeight * 1.4); // editSeekBarの下に140pxの隙間
        x = x - (previewWidth * 0.5);     // マウス位置の左に100pxの隙間
        if (x < 40) {
            x = 40; 
        }
    }

    videoPreview.style.left = `${x}px`;
    videoPreview.style.top = `${y}px`;
}

// アイコンオーバーレイ更新
function updateIconOverlay() {
    if (playlist.length === 0 || 
        currentVideoIndex < 0 ||
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
    urlInputPanel.style.display = 'none';
    urlInput.style.display = 'none';
    urlConfirmBtn.style.display = 'none';
    urlInput.value = '';
    isurlInputPanelVisible = false;
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
    if (isFilterPanelVisible) debouncedUpdateFilterList();
    debouncedScrollCurrentFilterItem();
    updateIconOverlay();
}

// プレイリストパネル表示切替
function toggleFilterPanel() {
    isFilterPanelVisible = !isFilterPanelVisible;
    if (filterPanel) {
        filterPanel.style.display = isFilterPanelVisible ? 'flex' : 'none';
        if (isFilterPanelVisible) {
            hideEditPanel();
        }
    }
    if (isFilterPanelVisible) {
        debouncedUpdateFilterList();
        playlistFilterInput?.focus();
    }
    debouncedScrollCurrentFilterItem();
}

// プレイリストの現在選択アイテムをスクロールして中央に表示
function scrollCurrentFilterItem() {
    if (!filterList) return;
    try {
        const targetIndex = selectedPlaylistIndex >= 0 ? selectedPlaylistIndex : currentVideoIndex;
        const el = filterList.querySelector('[data-index="' + targetIndex + '"]');
        
        if (el && typeof el.scrollIntoView === 'function') {
            // オプションに inline: 'center' を追加
            el.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',  // 縦方向の中央合わせ
                // inline: 'center'  // 横方向の中央合わせ（サムネイルが横並びの時に有効）
            });
        }
    } catch (e) {
        console.warn("Scroll failed:", e); // 完全に無視せず警告ログを残す
    }
}

// プレイリストフィルタをクリア
function clearPlaylistFilter() {
    filterText = '';
    if (playlistFilterInput) {
        playlistFilterInput.value = '';
    }
}

// フィルタパネルの高さを調整
function adjustFilterPanelHeight() {
    const filename = document.querySelector('.filename');
    const controlsPanel = document.querySelector('.controls');
    const filterPanel = document.querySelector('.filter-panel'); // プレイリスト
    const editPanel = document.querySelector('.edit-panel'); // 編集パネル
    
    // 内部の要素を取得
    const filterHeader = document.querySelector('.filter-panel-header');
    const filterList = document.querySelector('.filter-list');
    const editHeader = document.querySelector('.edit-header');
    const cutRangesList = document.getElementById('cutRangesList');
    
    // 1. プレイ動画パネルの下端の座標を計算
    const filenameBottom = filename.offsetTop + filename.offsetHeight;
    
    // 2. プレイリストの top を計算（動画パネルの下端 + 余白 4px）
    const playlistTop = filenameBottom + 10;
    filterPanel.style.top = `${playlistTop}px`;
    editPanel.style.top = `${playlistTop}px`;
    
    // 3. 配置可能な最大の高さを計算（コントロールパネルの top - プレイリストの top - 下の余白 24px）
    const playlistHeight = controlsPanel.offsetTop - playlistTop - 30;
    const maxAvailableHeight = Math.max(0, playlistHeight);
    
    // 4. プレイリストパネルの内部コンテンツ（ヘッダ + リスト）の合計高さを計算
    // ※要素が存在しない場合の安全策としてオプショナルチェーニング（?.）とデフォルト値（0）を使用
    const headerHeight = filterHeader?.offsetHeight || 0;
    const listHeight = filterList?.offsetHeight || 0;
    const totalContentHeight = headerHeight + listHeight;
    // 5. 条件分岐: 中身が最大高さより低い場合は "auto"、超える場合は計算した高さを適用
    if (totalContentHeight < maxAvailableHeight) {
        filterPanel.style.height = 'auto';
    } else {
        filterPanel.style.height = `${maxAvailableHeight}px`;
    }

    // 5. カット編集パネルの内部コンテンツ（ヘッダ + リスト）の合計高さを計算
    // ※要素が存在しない場合の安全策としてオプショナルチェーニング（?.）とデフォルト値（0）を使用
    const cutHeaderHeight = editHeader?.offsetHeight || 0;
    const cutListHeight = cutRangesList?.offsetHeight || 0;
    const cutTotalEditHeight = cutHeaderHeight + cutListHeight;
    // 5. 条件分岐: 中身が最大高さより低い場合は "auto"、超える場合は計算した高さを適用
    if (cutTotalEditHeight < maxAvailableHeight) {
        editPanel.style.height = 'auto';
        cutRangesList.style.height = 'auto';
    } else {
        editPanel.style.height = `${maxAvailableHeight}px`;
        cutRangesList.style.height = `${maxAvailableHeight - cutHeaderHeight - 10}px`;
    }

    // 6. 要件に合わせて maxHeight には常に制限（最大サイズ）を設定しておくことで、
    // "auto" の際もコントロールパネルを突き抜けないようにガードします
    filterPanel.style.maxHeight = `${maxAvailableHeight}px`;
    editPanel.style.maxHeight = `${maxAvailableHeight}px`;
    cutRangesList.style.maxHeight = `${maxAvailableHeight - cutHeaderHeight - 10}px`;
}

// プレイリスト表示モード設定
function setPlaylistDisplayMode(mode) {
    if (!['list', 'thumb-list', 'thumb-small', 'thumb-medium', 'thumb-large'].includes(mode)) return;
    playlistDisplayMode = mode;
    localStorage.setItem('playlistDisplayMode', mode);
    if (filterList) {
        filterList.classList.remove('playlist-grid', 'playlist-grid-small', 'playlist-grid-medium', 'playlist-grid-large');
        if (['thumb-small', 'thumb-medium', 'thumb-large'].includes(mode)) {
            filterList.classList.add('playlist-grid');
            if (mode === 'thumb-small') {
                filterList.classList.add('playlist-grid-small');
            } else if (mode === 'thumb-medium') {
                filterList.classList.add('playlist-grid-medium');
            } else if (mode === 'thumb-large') {
                filterList.classList.add('playlist-grid-large');
            }
        }
    }
    if (isFilterPanelVisible) debouncedUpdateFilterList();
    debouncedScrollCurrentFilterItem();
}

// ラベルを取得する関数
function getPlaylistDisplayModeLabel(mode) {
    return (PLAYLIST_NODES[mode] || PLAYLIST_NODES['list']).label;
}

// サイズを取得する関数
function getPlaylistThumbnailDimensions(mode) {
    const node = PLAYLIST_NODES[mode] || PLAYLIST_NODES['list'];
    return { width: node.width, height: node.height };
}

// プレイリスト表示モード選択メニュー作成
function createPlaylistDisplayMenu() {
    const menu = document.createElement('div');
    menu.className = 'playlist-display-menu';

    ['list', 'thumb-list', 'thumb-small', 'thumb-medium', 'thumb-large'].forEach((mode) => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.style.color = playlistDisplayMode === mode ? '#00ccff' : '#eee';
        item.innerHTML = (playlistDisplayMode === mode ? '✅ ' : '　　') + getPlaylistDisplayModeLabel(mode);

        item.addEventListener('click', (event) => {
            event.stopPropagation();
            setPlaylistDisplayMode(mode);
            menu.remove();
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

// ファイルパスを file:// URL に変換
function pathToFileUrl(filePath) {
    if (!filePath) return '';
    const normalized = filePath.replace(/\\/g, '/');
    const encoded = encodeURI(normalized);
    return `file://${encoded.startsWith('/') ? '' : '/'}${encoded}`;
}

// プレイリストサムネイルのキャッシュ
// script.js
async function getPlaylistThumbnailDataUrl(filePath, size = 180) {
    if (!filePath) return '';
    const cacheKey = `${filePath}|${size}`;
    
    // キャッシュが存在しかつ空文字でない場合はキャッシュを返す
    if (playlistThumbnailCache.has(cacheKey)) {
        const cached = playlistThumbnailCache.get(cacheKey);
        if (cached) return cached;
    }

    try {
        const dataUrl = await generateVideoThumbnail(filePath, size);
        if (dataUrl) {
            playlistThumbnailCache.set(cacheKey, dataUrl);
            return dataUrl;
        } else {
            // 取得失敗時はキャッシュに登録せず空文字を返す（次回表示時などに再試行可能にする）
            return '';
        }
    } catch (e) {
        console.warn('[playlist-thumbnail] renderer fallback failed:', filePath, e.message);
        return '';
    }
}

// デバウンス関数
// 連続で呼び出されても、最後の呼び出しから指定ミリ秒（デフォルト300ms）経過するまで実行を遅延させます。
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// プレイリストフィルタ更新（デバウンス版）
async function updateFilterList() {
    if (!filterList) return;

    // 実行ごとにIDをカウントアップし、この実行の「世代ID」を保持する（対策2）
    const myUpdateId = ++currentUpdateId;

    filterList.innerHTML = '';
    if (playlist.length === 0) {
        filterList.innerHTML = '<div class="filter-empty">プレイリストが空です。</div>';
        updateItemCount(0, 0);
        return;
    }

    const query = (filterText || '').trim().toLowerCase();
    const normalizedQuery = query.replace(/\u3000/g, ' ');
    
    const results = playlist
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => {
            if (normalizedQuery === '') return true;
            
            const name = (item.name || '').toLowerCase();
            const pathText = (item.file?.path || '').toLowerCase();
            const fullText = name + ' ' + pathText;
            const orGroups = normalizedQuery.split(',').map(g => g.trim());
            
            return orGroups.some(group => {
                if (group === '') return false;
                const andKeywords = group.split(/\s+/).filter(k => k.length > 0);
                return andKeywords.every(keyword => fullText.includes(keyword));
            });
        });

    updateItemCount(results.length, playlist.length);

    if (results.length === 0) {
        filterList.innerHTML = '<div class="filter-empty">一致する動画がありません。</div>';
        return;
    }

    // 表示モードの判定
    const isTileMode = ['thumb-small', 'thumb-medium', 'thumb-large'].includes(playlistDisplayMode);
    const isListOrThumbListMode = ['list', 'thumb-list'].includes(playlistDisplayMode);
    
    // 【修正】すべてのモード（タイル・リスト・サムネイルリスト）でグルーピングを有効にする判定
    const isGroupEnabledMode = isTileMode || isListOrThumbListMode;
    
    // 並び替え状態の判定
    const isCreationTimeSort = ['ctime_asc', 'ctime_desc'].includes(currentSortMode);
    const isNoSortOrRandom = ['none', 'random'].includes(currentSortMode); // （なし）または（ランダム）

    // グルーピングの追跡用変数
    let lastGroupKey = null;
    let currentGroupItemsContainer = null;

    // 【修正】「並び替え＝（なし）または（ランダム）」かつ「タイルモード」の場合のみ、外側に1つだけグリッドコンテナを作成
    // ※リスト系は縦並びのため、(なし/ランダム)時もそのまま filterList 直下に追加します
    if (isTileMode && isNoSortOrRandom) {
        currentGroupItemsContainer = document.createElement('div');
        currentGroupItemsContainer.className = 'folder-group-items';
        currentGroupItemsContainer.classList.add(
            playlistDisplayMode === 'thumb-small' ? 'playlist-grid-small' :
            playlistDisplayMode === 'thumb-medium' ? 'playlist-grid-medium' :
            'playlist-grid-large'
        );
        filterList.appendChild(currentGroupItemsContainer);
    }

    for (const { item, index } of results) {
        // 【重要】ループの各ステップ開始時に、すでに次の新しい検索が始まっていないかチェック
        if (myUpdateId !== currentUpdateId) return;

        updateItemCount(index, playlist.length);

        // --- 表示形式・並び替えに応じたコンテナの決定ロジック ---
        let targetContainer = filterList;

        if (isGroupEnabledMode) {
            if (isTileMode && isNoSortOrRandom) {
                // タイルモードかつ（なし）・ランダム時はグループヘッダなしで、事前に作成した共通グリッドへ追加
                targetContainer = currentGroupItemsContainer;
            } else if (isListOrThumbListMode && isNoSortOrRandom) {
                // 【追加】リスト系かつ（なし）・ランダム時はグループヘッダなしで、そのまま filterList 直下へ追加
                targetContainer = filterList;
            } else {
                // グループのキー（タイトル文字列）を決定
                let currentGroupKey = '';

                if (isCreationTimeSort) {
                    // 作成日時▲・▼の場合：確実に取得できるミリ秒を利用
                    let dateStr = '作成日不明';
                    if (item.file?.path) {
                        try {
                            const stats = await fs.stat(item.file.path);
                            const timeMs = (stats.birthtimeMs && stats.birthtimeMs > 0) ? stats.birthtimeMs : stats.ctimeMs;

                            if (timeMs && !isNaN(timeMs)) {
                                const d = new Date(timeMs);
                                const year = d.getFullYear();
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const date = String(d.getDate()).padStart(2, '0');
                                
                                // 曜日を定義（0:日, 1:月, ... 6:土）
                                const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
                                
                                dateStr = `${year}年${month}月${date}日（${dayOfWeek}）`;
                            }
                        } catch (err) {
                            console.warn(`表示用stat失敗: ${item.file.path}`, err);
                        }
                    }
                    
                    if (myUpdateId !== currentUpdateId) return;
                    currentGroupKey = dateStr;
                } else {
                    // 上記以外（従来のフォルダパスによるグルーピング）
                    const fullPath = item.file?.path || item.name || '無題';
                    const currentFolderPath = path.dirname(fullPath);
                    currentGroupKey = currentFolderPath === '.' ? 'ルートフォルダ' : currentFolderPath;
                }

                // 新しいグループ（日付またはフォルダ）に切り替わった場合
                if (currentGroupKey !== lastGroupKey) {
                    lastGroupKey = currentGroupKey;

                    // グループ全体の親要素を作成
                    const folderGroup = document.createElement('div');
                    folderGroup.className = 'folder-group';

                    // グループヘッダを作成
                    const folderTitle = document.createElement('div');
                    folderTitle.className = 'folder-group-title';
                    folderTitle.textContent = currentGroupKey;
                    folderGroup.appendChild(folderTitle);

                    // アイテムを格納するコンテナを作成
                    currentGroupItemsContainer = document.createElement('div');
                    
                    if (isTileMode) {
                        // タイルモードの場合は横並び（Grid）にするためのクラスを付与
                        currentGroupItemsContainer.className = 'folder-group-items';
                        currentGroupItemsContainer.classList.add(
                            playlistDisplayMode === 'thumb-small' ? 'playlist-grid-small' :
                            playlistDisplayMode === 'thumb-medium' ? 'playlist-grid-medium' :
                            'playlist-grid-large'
                        );
                    } else {
                        // 【追加】リスト・サムネイルリストの場合は縦に並べるだけの単純なフレックス/ブロックコンテナにする
                        currentGroupItemsContainer.className = 'folder-group-list-items';
                        currentGroupItemsContainer.style.display = 'flex';
                        currentGroupItemsContainer.style.flexDirection = 'column';
                        currentGroupItemsContainer.style.gap = '6px';
                        currentGroupItemsContainer.style.width = '100%';
                    }

                    folderGroup.appendChild(currentGroupItemsContainer);
                    filterList.appendChild(folderGroup);
                }
                
                targetContainer = currentGroupItemsContainer;
            }
        }
        // -----------------------------------------------------------

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'filter-item';
        button.dataset.index = index;
        if (index === currentVideoIndex) button.classList.add('current');
        if (index === selectedPlaylistIndex) button.classList.add('selected');

        const displayText = item.file?.path || item.name || '無題';
        const showPlaybackIcon = index === currentVideoIndex && !isVideoStopped();
        const fileName = path.basename(item.file?.path || item.name || '無題');

        if (playlistDisplayMode === 'list') {
            button.classList.add('filter-item-list');
            button.textContent = (showPlaybackIcon ? '▶️ ' : '') + displayText;
            button.title = displayText;
        } else {
            if (playlistDisplayMode === 'thumb-list') {
                button.classList.add('filter-item-thumb-list');
            } else {
                button.classList.add('filter-item-tile');
                button.classList.add(
                    playlistDisplayMode === 'thumb-small' ? 'filter-item-size-small' :
                    playlistDisplayMode === 'thumb-medium' ? 'filter-item-size-medium' :
                    'filter-item-size-large'
                );
            }

            const thumbDims = getPlaylistThumbnailDimensions(playlistDisplayMode);
            const thumbWrap = document.createElement('div');
            thumbWrap.className = 'filter-item-thumb-wrap';
            thumbWrap.style.width = `${thumbDims.width}px`;
            thumbWrap.style.height = `${thumbDims.height}px`;
            const thumb = document.createElement('img');
            thumb.className = 'filter-item-thumb';
            thumb.style.width = '100%';
            thumb.style.height = '100%';
            thumb.alt = fileName;
            thumb.src = '';
            thumbWrap.appendChild(thumb);
            button.appendChild(thumbWrap);

            const textBlock = document.createElement('div');
            textBlock.className = 'filter-item-text';

            if (playlistDisplayMode === 'thumb-list') {
                const title = document.createElement('span');
                title.className = 'filter-item-path';
                title.textContent = showPlaybackIcon ? `▶️ ${displayText}` : displayText;
                textBlock.appendChild(title);
            } else {
                const name = document.createElement('span');
                name.className = 'filter-item-file-name';
                name.textContent = showPlaybackIcon ? `▶️ ${fileName}` : fileName;
                textBlock.appendChild(name);
            }
            button.appendChild(textBlock);
            button.title = displayText;

			const setFallbackThumb = () => {
			    thumb.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="135"><rect width="100%" height="100%" fill="#2a2a2a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="18">No Thumbnail</text></svg>');
			    thumbWrap.style.background = 'rgba(0,0,0,0.2)';
			};
			const setMusicThumb = () => {
			    thumb.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="135"><rect width="100%" height="100%" fill="#5672f1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="62">♬</text></svg>');
			    thumbWrap.style.background = 'rgba(0,0,0,0.2)';
			};
			// 音声ファイルの判定関数（拡張子チェック）
			const isAudioFile = (filePath) => {
			    if (!filePath) return false;
			    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
			    return AUDIO_EXTENSIONS.includes(ext);
			};
			
			try {
			    // 音声ファイルの場合はサムネイル取得を行わずに Music 用サムネイルを設定
			    if (isAudioFile(item.file?.path)) {
			        setMusicThumb();
			    } else {
			        const thumbUrl = await getPlaylistThumbnailDataUrl(item.file?.path, thumbDims.width);
			        if (myUpdateId !== currentUpdateId) return;
			
			        if (thumbUrl) {
			            thumb.src = thumbUrl;
			        } else {
			            setFallbackThumb();
			        }
			    }
			} catch (error) {
			    console.error(`サムネイル取得失敗 [Index: ${index}]:`, error);
			    if (myUpdateId !== currentUpdateId) return;
			    setFallbackThumb();
			}
        }

        button.addEventListener('click', async (e) => {
            // 選択インデックスを更新
            selectedPlaylistIndex = index;

            // ★修正: リスト全体の再描画(updateFilterList)を呼ばず、DOM要素のクラス変更だけで対応する
            filterList.querySelectorAll('.filter-item.selected').forEach(el => {
                el.classList.remove('selected');
            });
            button.classList.add('selected');

            // トラックの更新処理のみ実行
            if (modeChange === 'video') {
                await updateTrack('subtitle');
            } else {
                await updateTrack('audio');
            }
        });

        button.addEventListener('dblclick', async (e) => {
            // 1回目のclickで処理が行われているため、連動する状態を最新化
            selectedPlaylistIndex = index;
            currentVideoIndex = index;

            // パネルを非表示にする（非表示にするのでスクロール描画も発生しない）
            isFilterPanelVisible = false;
            if (filterPanel) filterPanel.style.display = 'none';

            // 動画再生と状態保存
            await playVideo(item.file, 0);
            updatePlaylistDisplay();
            savePlaylistAndPlaybackState();
        });

        targetContainer.appendChild(button);
    }
    updateItemCount(results.length, playlist.length);

    if (myUpdateId === currentUpdateId) {
        adjustFilterPanelHeight();
    }
}

// フィルタリングされたインデックスを取得
function getFilteredIndices() {
    const q = (filterText || '').trim().toLowerCase();
    if (!q) return playlist.map((_, idx) => idx);
    
    // 全角スペースを半角スペースに変換
    const normalizedQuery = q.replace(/\u3000/g, ' ');
    
    return playlist
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => {
            const name = (item.name || '').toLowerCase();
            const pathText = (item.file?.path || '').toLowerCase();
            const fullText = name + ' ' + pathText;
            
            // カンマで分割してOR条件グループを取得
            const orGroups = normalizedQuery.split(',').map(g => g.trim());
            
            // いずれかのORグループにマッチするかチェック
            return orGroups.some(group => {
                if (group === '') return false;
                // スペースで分割してAND条件を取得
                const andKeywords = group.split(/\s+/).filter(k => k.length > 0);
                // すべてのANDキーワードを含むかチェック
                return andKeywords.every(keyword => fullText.includes(keyword));
            });
        })
        .map(({ idx }) => idx);
}

// フィルタリングされたアイテムをソートして適用
async function applySortFiltered(modeKey = currentSortMode) {
    if (!SORT_MODES[modeKey]) return;
    currentSortMode = modeKey;
    localStorage.setItem('playlistSortMode', modeKey);

    // ボタンのスタイル更新
    sortPlaylistBtn.classList.remove('sorted-active', 'random-sorted-active');
    if (modeKey === 'none') {
    } else if (modeKey === 'random') {
        sortPlaylistBtn.classList.add('random-sorted-active');
    } else {
        sortPlaylistBtn.classList.add('sorted-active');
    }

    // 常にプレイリスト全体に対してソートを実行
    await applySort(modeKey);
}

// フィルタリングされたアイテムをシャッフルして適用
function shuffleFiltered() {
    const indices = getFilteredIndices();
    if (indices.length === 0) return;
    const items = indices.map(i => playlist[i]);
    shuffle(items);
    const newPlaylist = playlist.slice();
    indices.forEach((idx, i) => {
        newPlaylist[idx] = items[i];
    });
    const prevPath = playlist[currentVideoIndex]?.file?.path;
    playlist = newPlaylist;
    if (prevPath) {
        const newIndex = playlist.findIndex(item => item.file.path === prevPath);
        currentVideoIndex = newIndex >= 0 ? newIndex : 0;
    }
    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
}

// 件数表示更新用ヘルパー関数（新設）
function updateItemCount(filtered, total) {
    if (!itemCount) return;
    
    const filteredStr = filtered.toLocaleString('ja-JP');
    const totalStr = total.toLocaleString('ja-JP');
    
    itemCount.textContent = `${filteredStr} / ${totalStr}`;
}

// プレイリスト表示更新
function updatePlaylistDisplay() {
    // 1. パス表示エリアの更新
    const currentPath = getCurrentPlaybackPath();
    const showPlaybackIcon = currentPath && !isVideoStopped();
    try {
        if (playlistPathArea) {
            playlistPathArea.value = showPlaybackIcon 
                ? `▶️ ${currentPath}` 
                : (currentPath || appNameAndCopyrightValueLine);
        }
    } catch (e) {
        console.warn('playlistPathArea update failed', e);
    }

    // 2. プレイリストが空の場合の早期リターン
    if (playlist.length === 0) {
        if (isFilterPanelVisible) debouncedUpdateFilterList();
        updateIconOverlay();
        updateItemCount(0, 0);
        return;
    }

    // 3. インデックスの有効範囲補正
    if (selectedPlaylistIndex < 0 || selectedPlaylistIndex >= playlist.length) {
        const isValidCurrent = currentVideoIndex >= 0 && currentVideoIndex < playlist.length;
        selectedPlaylistIndex = isValidCurrent ? currentVideoIndex : 0;
    }

    // 4. UI・表示の同期
    if (isFilterPanelVisible) debouncedUpdateFilterList();
    debouncedScrollCurrentFilterItem();
    updateIconOverlay();
    
    // ※フィルター絞り込み時の表示件数（filteredLengthなど）がある場合は第1引数に適用
    updateItemCount(playlist.length, playlist.length); 
}

// 現在再生中の動画のパスを取得するヘルパー関数
function getCurrentPlaybackPath() {
    let currentPath = playlist[currentVideoIndex]?.file?.path || '';
    if (!currentPath && videoPlayer?.src) {
        try {
            currentPath = decodeURIComponent(videoPlayer.src.replace(/^file:\/\//, ''));
            const queryIndex = currentPath.indexOf('?');
            if (queryIndex !== -1) {
                currentPath = currentPath.slice(0, queryIndex);
            }
            if (/^\/([A-Za-z]:)/.test(currentPath)) {
                currentPath = currentPath.slice(1);
            }
        } catch (e) {
            currentPath = '';
        }
    }
    return currentPath;
}

// urlInputBtn の表示状態を更新するヘルパー関数
function updateUrlButtonIcon() {
    if (isurlInputPanelVisible) {
        urlInputBtn.textContent = '🌐';
        urlInputBtn.classList.add('mode-active');
        urlInputBtn.setAttribute('data-tooltip', 'URL入力キャンセル');
    } else {
        urlInputBtn.textContent = '🌐';
        urlInputBtn.classList.remove('mode-active');
        urlInputBtn.setAttribute('data-tooltip', 'ネット動画を開く (Ctrl+n)');
    }
}

// ランダム再生更新
function updateRandomButtonUI() {
    randomPlayBtn.classList.remove('active');
    if (isRandomPlayMode) {
        randomPlayBtn.classList.add('active');
        randomPlayBtn.setAttribute('data-tooltip', 'ランダム再生中（Ctrl+r）');
    } else {
        randomPlayBtn.setAttribute('data-tooltip', 'ランダム再生無効（Ctrl+r）');
    }
}

// ランダム再生トグル
function toggleRandomPlay() {
    const wasRandom = isRandomPlayMode;
    isRandomPlayMode = !isRandomPlayMode;
    localStorage.setItem('isRandomPlayMode', isRandomPlayMode);
    updateRandomButtonUI();

    if (isRandomPlayMode && !wasRandom) {
        const indices = getFilteredIndices();
        if (indices.length !== playlist.length) {
            shuffleFiltered();
            currentSortMode = 'random';
        } else {
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
            }

            // shuffle関数によりcurrentVideoIndexが先頭(0)に移動しているため、初期位置は0になります
            shufflePosition = shuffleOrder.indexOf(currentVideoIndex);
            if (shufflePosition < 0) shufflePosition = 0;

            updatePlaylistDisplay();
            savePlaylistAndPlaybackState();
            saveShuffleState();
        }
    } else if (!isRandomPlayMode && wasRandom) {
        // ランダム → 通常 に変更（ケース2・4）
        // playlist は現在の順序を維持する
        shuffleOrder = [];
        shufflePosition = -1;
        saveShuffleState();

        // 表示はそのまま、次回 next/prev が通常順になるだけ
    }

    // フィルタ条件をクリアし、再生動画の行位置にスクロール
    selectedPlaylistIndex = currentVideoIndex;
    // clearPlaylistFilter();
    if (isFilterPanelVisible) debouncedUpdateFilterList();
    debouncedScrollCurrentFilterItem();
}

// シンプルなFisher-Yatesシャッフル
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    // 2. 再生中動画(currentVideoIndex)が存在する場合、配列の先頭に移動
    if (typeof currentVideoIndex !== 'undefined' && currentVideoIndex !== null && currentVideoIndex >= 0) {
        const indexInArray = array.indexOf(currentVideoIndex);
        if (indexInArray > -1) {
            // 配列から一度削除し、先頭(0番目)に挿入
            array.splice(indexInArray, 1);
            array.unshift(currentVideoIndex);
        }
    }
}

// 再シャッフル
function resetShuffle() {
    if (isRandomPlayMode) {
        // ランダムモードONになった → シャッフル順を今生成
        shuffleOrder = [...Array(playlist.length).keys()]; // 0〜length-1 の配列
        shuffle(shuffleOrder);                             // シャッフル

        // 先頭に移動した再生中動画からスタートするため、ポジションを 0 に設定
        shufflePosition = 0; 
        saveShuffleState();
    } else {
        // OFFになったらクリア
        shuffleOrder = [];
        shufflePosition = -1;
    }
}

// 前再生動画取得
function getPrevVideoIndex() {
    if (playlist.length === 0) return -1;
    if (isRepeatPlayMode === 'single') {
        if (modeChange === 'video') {
            return currentVideoIndex;
        } else {
            return -1;
        }
    }
    if (isRandomPlayMode && currentSortMode !== 'random') {
        // ランダムモード
        shufflePosition--;
        if (shufflePosition < 0) {
            if (isRepeatPlayMode === 'all') {
                if (modeChange === 'video') {
                    shufflePosition = shuffleOrder.length - 1;
                } else {
                    return -1;
                }
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
            if (isRepeatPlayMode === 'all') {
                if (modeChange === 'video') {
                    normalPosition = playlist.length - 1;
                } else {
                    return -1;
                }
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
    if (isRepeatPlayMode === 'single') {
        if (modeChange === 'video') {
            return currentVideoIndex;
        } else {
            return -1;
        }
    }
    if (isRandomPlayMode && currentSortMode !== 'random') {
        // ランダムモード
        shufflePosition++;
        if (shufflePosition >= shuffleOrder.length) {
            if (isRepeatPlayMode === 'all') {
                if (modeChange === 'video') {
                    shufflePosition = 0;
                } else {
                    return -1;
                }
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
            if (isRepeatPlayMode === 'all') {
                if (modeChange === 'video') {
                    normalPosition = 0;
                } else {
                    return -1;
                }
            } else {
                return -1;
            }
        }
        return normalPosition;
    }
}

// ランダム再生の状態を保存
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
async function toggleurlInputPanel(show = null) {
    // show が明示的に渡されなかった場合は現在の状態を反転
    const shouldShow = show !== null ? show : !isurlInputPanelVisible;
    if (shouldShow) {
        // クリップボードに有効なURLがあるかチェック（既存機能）
        const pastedText = await pasteFromClipboard().catch(() => ({ rawText: '' }));
        const clipText = pastedText.rawText.trim() || ''; // クリップボードのテキスト（空文字も考慮）
        urlInput.value = clipText;
        if (clipText && isTwitchOrYouTube(clipText)) {
            urlInput.value = clipText;
            // 有効なURL → 自動で入力して再生（従来挙動）
            await urlInputEnter();
            // クリップボードをクリアする（従来挙動）
            await navigator.clipboard.writeText('');
            return;
        }

        // 有効なURLがない → 入力欄を表示
        filenamePanel.style.display = 'none';
        urlInputPanel.style.display = 'flex';
        urlInput.style.display = 'inline-block';
        urlConfirmBtn.style.display = 'inline-block';
        // urlCancelBtn はもうないので削除
        urlInput.focus();
        isurlInputPanelVisible = true;
        updateUrlButtonIcon();
        showControlsAndFilename();
        updateIconOverlay();
    } else {
        urlInput.value = '';
        // 非表示にする
        hideURLInputControls();
        filenamePanel.style.display = 'flex';
        isurlInputPanelVisible = false;
        updateUrlButtonIcon();
        showControlsAndFilename();
        updateIconOverlay();
    }
    updateUrlButtonIcon();   // ← ここで色も更新
}

// 動画再生
async function playVideo(file, currentTime) {
    if (!file?.path) return;

    // 動画ソース設定
    isPlaying = true;
    await setVideoSrc(file);

    if (modeChange === 'convert') {
        // 再生即終了 → 最後尾へ
        setVideoDurationTime(); // duration が NaN でも安全に処理
    } else {
        // 再生時間復元
        if (!isNaN(currentTime) && currentTime >= 0) {
            videoPlayer.currentTime = currentTime;
            localStorage.setItem('currentTime', videoPlayer.currentTime);
        }
    }

    // 再生開始
    startPeriodicSave();
    videoPlayer.play().catch(() => {
        playPauseBtn.textContent = '⏸️';
        playPauseBtn.classList.add('paused-active');
        playPauseBtn.setAttribute('data-tooltip', '一時停止（Space／Right Click）');
        stopPeriodicSave();
    });

    // フィルタ条件をクリアし、再生動画の行位置にスクロール
    selectedPlaylistIndex = currentVideoIndex;
    // clearPlaylistFilter();
    updatePlaylistDisplay();

    showControlsAndFilename();
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
        if (isVideoStopped() || currentVideoIndex === -1) {
            // 動画ソース設定
            currentVideoIndex = 0;
            if (selectedPlaylistIndex >= 0) {
                currentVideoIndex = selectedPlaylistIndex;
            }
            const file = playlist[currentVideoIndex].file;
            await setVideoSrc(file);
        } else {
            playPauseBtn.textContent = '▶️';
            playPauseBtn.classList.remove('paused-active');
            playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
        }

        if (modeChange === 'convert') {
            // 再生即終了 → 最後尾へ
            setVideoDurationTime(); // duration が NaN でも安全に処理
        } else {
            // カット編集モードで、かつカット範囲がある場合 → 次の有効な位置へジャンプ
            const isInEditMode = isEditMode || (editPanel && window.getComputedStyle(editPanel).display !== 'none');
            if (isInEditMode && cutRanges.length > 0) {
                const nextPos = findNextValidPosition(videoPlayer.currentTime);

                if (nextPos >= 0 && nextPos < videoPlayer.duration) {
                    videoPlayer.currentTime = nextPos;
                }
            }
        }
        
        // 再生開始
        startPeriodicSave();
        videoPlayer.play().catch(() => {
            playPauseBtn.textContent = '⏸️';
            playPauseBtn.classList.add('paused-active');
            playPauseBtn.setAttribute('data-tooltip', '一時停止（Space／Right Click）');
            stopPeriodicSave();
        });
    } else {
        videoPlayer.pause();
        playPauseBtn.textContent = '⏸️';
        playPauseBtn.classList.add('paused-active');
        playPauseBtn.setAttribute('data-tooltip', '一時停止（Space／Right Click）');
        localStorage.setItem('currentTime', videoPlayer.currentTime);
        stopPeriodicSave();
    }

    // フィルタ条件をクリアし、再生動画の行位置にスクロール
    selectedPlaylistIndex = currentVideoIndex;
    // clearPlaylistFilter();
    updatePlaylistDisplay();

    showControlsAndFilename();
    updateIconOverlay();
}

// 動画ソース設定
async function setVideoSrc(file) {
    playPauseBtn.textContent = '▶️';
    playPauseBtn.classList.remove('paused-active');
    playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');

    // クエリパラメータを除去して正しい拡張子を取得
    let cleanPath = file.path;
    if (cleanPath.includes('?')) {
        cleanPath = cleanPath.split('?')[0];
    }
    const ext = path.extname(cleanPath).toLowerCase();
    const isAudio = isAudioFilePath(file.path);
    currentMediaType = isAudio ? 'audio' : 'video';
    updateMediaPlayerDisplay();

    // audioMotionの初期化と表示切り替え
    updateAudioMotion();
    toggleVisualizer(currentMediaType);

    // media.src設定
    if (isAudio) {
        isConverting = false;
        const mediaUrl = `file://${file.path.replace(/\\/g, '/')}?t=${Date.now()}`;
        videoPlayerElement.src = mediaUrl;
        audioPlayer.src = mediaUrl;
        videoPreview.removeAttribute('src');
        videoPreview.load();
        baseConvertFile = null;
        tempConvertFile = null;
    } else if (isHTML5_SUPPORTED(ext)) {
        isConverting = false;
        const videoUrl = `file://${file.path.replace(/\\/g, '/')}?t=${Date.now()}`;
        videoPlayerElement.src = videoUrl;
        audioPlayer.src = videoUrl;
        videoPreview.src = videoUrl;
        baseConvertFile = null;
        tempConvertFile = null;
    } else {
        try {
            // 一時ファイル削除
            await deleteTempVideo();

            const wasIsPlaying = isPlaying;
            isConverting = true;
            updatePlaylistDisplay();
            // シークバーを赤色に変更
            currentConvertPromise = convertVideo(file.path, modeChange, currentAudioIndex);
            const convertedPath = await currentConvertPromise;

            const videoUrl = `file://${convertedPath}`;
            videoPlayerElement.src = videoUrl;
            audioPlayer.src = videoUrl;
            videoPreview.src = videoUrl;
            baseConvertFile = file.path;
            tempConvertFile = convertedPath;
            
            // パスのパラメータ排除・対応拡張子判定
            let cleanPath = baseConvertFile;
            if (cleanPath.includes('?')) {
                cleanPath = cleanPath.split('?')[0];
            }
            const ext = path.extname(cleanPath).toLowerCase();
            const validExt = isHTML5_SUPPORTED(ext);
            // 削除ファイル設定
            delConvertFile = null;
            if (!validExt) {
                if (baseConvertFile != tempConvertFile) {
                    if (modeChange === 'video') {
                        delConvertFile = tempConvertFile;
                    } else {
                        delConvertFile = baseConvertFile;
                    }
                }
            }            
            isPlaying = wasIsPlaying;
        } catch (err) {
            console.error("変換失敗:", err);
            isConverting = false;
            updatemessageOverlay('🔄️ 変換失敗', false, 5000);
            playlistPathArea.value = appNameAndCopyrightValueLine;
            updateIconOverlay();
            // 変換失敗時もシークバーをリセット
            seekBar.value = 0;
            return;
        }
    }
    
    // 音声トラック・字幕トラックボタン表示
    if (currentMediaType !== 'audio') {
        if (modeChange === 'video') {
            await updateTrack('subtitle');
        } else {
            await updateTrack('audio');
        }
    }
    updateTrackButtonsVisibility();

    // 共通再生処理
    videoPlayer.load();
    videoPreview.load();
    videoPreview.pause();
    updatePlaylistDisplay();

    // 再生速度復元（起動時のvideo.load前では設定ができていないため設定）
    videoPlayer.playbackRate = currentPlaybackRate;
    // 現在の音量を適用する
    videoPlayer.volume = volumeBar.value;
}

// 動画／停止中判定
function isVideoStopped() {
    return videoPlayer.paused && !videoPlayer.currentSrc && playlist.length > 0;
}

// Url再生完成
async function urlInputEnter() {
    const inputUrl = urlInput.value.trim();
    if (!inputUrl) {
        updatemessageOverlay('🌐 入力URL不正');
        updateIconOverlay();
        return;
    }

    const platform = isTwitchOrYouTube(inputUrl);
    let playlistId = null;
    let videoId = null;
    let videoUrl = null;

    if (platform === 'Twitch') {
        videoId = extractTwitchVideoId(inputUrl);
        if (!videoId) {
            updatemessageOverlay('🌐 無効なTwitch URL');
            updateIconOverlay();
            return;
        }
        videoUrl = `https://player.twitch.tv/?video=${videoId}&parent=twitch.tv&player=popout`;
    } else if (platform === 'YouTube') {
        playlistId = extractYouTubePlaylistId(inputUrl);
        videoId = extractYouTubeVideoId(inputUrl);
        if (!videoId) {
            updatemessageOverlay('🌐 無効なYouTube URL');
            updateIconOverlay();
            return;
        }
        if (!playlistId) {
            videoUrl = `https://www.youtube.com/watch?v=${videoId}?autoplay=1&cc_load_policy=0`;
        } else {
            videoUrl = `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}&autoplay=1`;
        }
    } else if (platform === 'Other') {
        videoUrl = inputUrl;
    } else {
        updatemessageOverlay('🌐 無効なURL');
        updateIconOverlay();
        return;
    }

    try {
        const result = await openVideoInBrowser(inputUrl);
    
        if (result.success) {
            console.log("ブラウザ起動依頼成功", result.message);
        } else {
            updatemessageOverlay(`🌐 ブラウザ起動失敗（${result.messag}）。`);
        }

        hideURLInputControls();
        filenamePanel.style.display = 'flex';
        showControlsAndFilename();
        updateIconOverlay();
    } catch (error) {
        console.error("IPCエラー:", err);
        updatemessageOverlay(`🌐 動画プレーヤーの設定失敗（${error.message}）。別の動画を試してください。`);
        updateIconOverlay();
    }
}

// 動画プラットフォーム判定
function isTwitchOrYouTube(inputUrl) {
    if (inputUrl.includes('http')) {
        if (inputUrl.includes('twitch.tv') && inputUrl.includes('videos')) {
            return 'Twitch';
        } else if (inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')) {
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

// プレイリストのファイル追加
async function playlistAdd(videoFiles) {
    if (!videoFiles || videoFiles.length === 0) return;

    // 既存のプレイリスト内のパス一覧
    const existingPaths = new Set(playlist.map(item => item?.file?.path));

    // 重複を除外した新しいファイルのみを抽出（追加リスト内での重複も排除）
    const uniqueVideoFiles = [];
    for (const file of videoFiles) {
        if (file?.path && !existingPaths.has(file.path)) {
            existingPaths.add(file.path);
            uniqueVideoFiles.push(file);
        }
    }

    // すべて重複していて追加対象がない場合は中断
    if (uniqueVideoFiles.length === 0) return;

    const mappedNewFiles = uniqueVideoFiles.map(file => ({
        file: { path: file.path },
        name: file.path
    }));

    const isFirstTime = playlist.length === 0;

    // 既存の playlist の末尾に追加
    playlist.push(...mappedNewFiles);

    // 元の読み込み順（originalLoadOrder）にも追加パスを記録
    const newPaths = uniqueVideoFiles.map(file => file.path);
    originalLoadOrder.push(...newPaths);
    localStorage.setItem('originalLoadOrder', JSON.stringify(originalLoadOrder));

    // もし元々リストが空だった場合は先頭の曲を再生
    if (isFirstTime) {
        currentVideoIndex = 0;
        selectedPlaylistIndex = 0;
        await playVideo(playlist[currentVideoIndex].file, 0);
    }

    savePlaylistAndPlaybackState();
    // シャッフル状態の維持/更新が必要な場合はここで調整
    saveShuffleState();
    updateIconOverlay();
}

// プレイリストのファイル設定
async function playlistSet(videoFiles) {
    if (videoFiles.length > 0) {
        await cleanupTempFiles();

        // ★ 元の読み込み順（Base順）を保存
        const currentPaths = videoFiles.map(file => file.path);
        originalLoadOrder = [...currentPaths];
        localStorage.setItem('originalLoadOrder', JSON.stringify(originalLoadOrder));

        // playlist を初期状態（ファイル取得順）でセット
        playlist = videoFiles.map(file => ({
            file: { path: file.path },
            name: file.path
        }));

        // ★ 現状の並び替えモード（currentSortMode）を適用
        await applySort(currentSortMode);

        currentVideoIndex = 0;
        selectedPlaylistIndex = 0;
        await playVideo(playlist[currentVideoIndex].file, 0);
        savePlaylistAndPlaybackState();
        resetShuffle();
        saveShuffleState();

        updateIconOverlay();
    }
}

// HTML5対応拡張子判定
function isHTML5_SUPPORTED(ext) {
    const cleanExt = ext.split('?')[0].toLowerCase();
    if (modeChange === 'video') {
        return HTML5_SUPPORTED.includes(cleanExt) || AUDIO_EXTENSIONS.includes(cleanExt);
    } else {
        return HTML5_SUPPORTED_CONVERT.includes(cleanExt);
    }
}

// 上へ移動
function upMovePlaylist() {
    const selectedIndex = selectedPlaylistIndex >= 0 && selectedPlaylistIndex < playlist.length ? selectedPlaylistIndex : currentVideoIndex;
    if (isNaN(selectedIndex) || selectedIndex <= 0 || playlist.length === 0) return;

    // 配列から移動
    const [movedItem] = playlist.splice(selectedIndex, 1);
    playlist.splice(selectedIndex - 1, 0, movedItem);

    // 再生中インデックスが影響を受ける場合の調整
    if (currentVideoIndex === selectedIndex) {
        currentVideoIndex -= 1;
    } else if (currentVideoIndex === selectedIndex - 1) {
        currentVideoIndex += 1;
    }

    selectedPlaylistIndex = selectedIndex - 1;
    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
}

// 下へ移動
function downMovePlaylist() {
    const selectedIndex = selectedPlaylistIndex >= 0 && selectedPlaylistIndex < playlist.length ? selectedPlaylistIndex : currentVideoIndex;
    if (isNaN(selectedIndex) || selectedIndex >= playlist.length - 1 || playlist.length === 0) return;

    // 配列から移動
    const [movedItem] = playlist.splice(selectedIndex, 1);
    playlist.splice(selectedIndex + 1, 0, movedItem);

    // 再生中インデックスが影響を受ける場合の調整
    if (currentVideoIndex === selectedIndex) {
        currentVideoIndex += 1;
    } else if (currentVideoIndex === selectedIndex + 1) {
        currentVideoIndex -= 1;
    }

    selectedPlaylistIndex = selectedIndex + 1;
    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
}

// editModeBtn のテキストをトグルするヘルパー関数
function updateEditModeButtonUI() {
    if (isEditMode) {
        editModeBtn.textContent = '✂️';
        editModeBtn.classList.add('mode-active');
        editModeBtn.setAttribute('data-tooltip', 'カット編集終了（Ctrl+e）');

        if (videoPlayer.play) {
            videoPlayer.pause();
            playPauseBtn.textContent = '⏸️';
            playPauseBtn.classList.add('paused-active');
            playPauseBtn.setAttribute('data-tooltip', '一時停止（Space／Right Click）');
            localStorage.setItem('currentTime', videoPlayer.currentTime);
            stopPeriodicSave();
        }
        editSeekBar.value = seekBar.value;
    } else {
        editModeBtn.textContent = '✂️';
        editModeBtn.classList.remove('mode-active');
        editModeBtn.setAttribute('data-tooltip', 'カット編集開始（Ctrl+e）');
    }
}

// プレイリスト追加位置を計算するヘルパー関数
function getPlaylistInsertIndex(addPosition = 0) {
    const selectedIndex = selectedPlaylistIndex >= 0 && selectedPlaylistIndex < playlist.length ? selectedPlaylistIndex : -1;
    const fallbackIndex = currentVideoIndex >= 0 && currentVideoIndex < playlist.length ? currentVideoIndex : 0;
    const baseIndex = selectedIndex >= 0 ? selectedIndex : fallbackIndex;
    return Math.max(0, baseIndex + addPosition);
}

// 現在の追加モードに応じて、追加位置を返すヘルパー関数
function getCurrentAddModePosition() {
    return currentAddMode === 'Add1' ? 1 : 0;
}

// プレイリストにファイルを挿入するヘルパー関数
function insertFilesIntoPlaylist(files, addPosition = 0) {
    if (!files || files.length === 0) return;

    // 既存のプレイリスト内のパス一覧（Setで高速化）
    const existingPaths = new Set(playlist.map(item => item?.file?.path));

    const normalizedFiles = files
        .map(file => ({
            path: file?.path || file?.file?.path || null,
            name: file?.name || path.basename(file?.path || file?.file?.path || '')
        }))
        // パスが存在し、かつ既存のプレイリストに含まれていないものだけを抽出
        .filter(file => file.path && !existingPaths.has(file.path));

    // 追加する新規ファイル内での重複も排除したい場合（必要に応じて）
    const uniqueFiles = [];
    for (const file of normalizedFiles) {
        if (!existingPaths.has(file.path)) {
            existingPaths.add(file.path);
            uniqueFiles.push(file);
        }
    }

    if (uniqueFiles.length === 0) return;

    const insertIndex = getPlaylistInsertIndex(addPosition);
    const formattedFiles = uniqueFiles.map(f => ({ file: { path: f.path }, name: f.name }));
    playlist.splice(insertIndex, 0, ...formattedFiles);
    if (selectedPlaylistIndex < 0) selectedPlaylistIndex = insertIndex;

    if (currentVideoIndex >= 0 && insertIndex <= currentVideoIndex) {
        currentVideoIndex += formattedFiles.length;
    }

    // ★ 追加後も「現在のプレイリスト順」を「なし」の基準とする
    const currentPaths = playlist.map(item => item.file.path);
    originalLoadOrder = [...currentPaths];
    localStorage.setItem('originalLoadOrder', JSON.stringify(originalLoadOrder));

    // shuffleOrder の最後に追加
    if (shuffleOrder && shuffleOrder.length > 0) {
        shuffleOrder.push(playlist.length - 1);
    }

    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
    resetShuffle();
    saveShuffleState();
    showControlsAndFilename();
}

// プレイリスト追加
async function addToPlaylist(addPosition = 0) {
    try {
        const files = await openVideoDialog();
        if (!files || files.length === 0) return;
        await insertFilesIntoPlaylist(files, addPosition);
    } catch (e) {
        console.error('追加エラー:', e);
        updatemessageOverlay('📚 動画追加に失敗', false, 5000);
    }
}

// プレイリスト削除
async function removeFromPlaylist() {
    const selectedIndex = selectedPlaylistIndex >= 0 && selectedPlaylistIndex < playlist.length ? selectedPlaylistIndex : currentVideoIndex;
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= playlist.length) {
        updatemessageOverlay('📚 削除する動画を選択してください', false, 2000);
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
        if (currentVideoIndex === selectedIndex) {
            currentVideoIndex = newIndex;
        } else if (currentVideoIndex > selectedIndex) {
            currentVideoIndex -= 1;
        }
        selectedPlaylistIndex = newIndex;
        updatePlaylistDisplay();
        if (isCurrentlyPlaying) {
            playStopBtn.click();
        }
    } else {
        playlistPathArea.value = appNameAndCopyrightValueLine;
        updateIconOverlay();
        playStopBtn.click();
        selectedPlaylistIndex = -1;
    }
    savePlaylistAndPlaybackState();
    resetShuffle();
    saveShuffleState(); // 現在のシャッフル位置を保存
    showControlsAndFilename();
}

// 🆑プレイリストクリア
async function clearPlaylist() {
    if (playlist.length === 0) return;

    await cleanupTempFiles();

    playlistPathArea.value = appNameAndCopyrightValueLine;
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
        updatemessageOverlay('📚 保存する動画がありません', false, 2000);
        return;
    }

    const result = await savePlaylistDialog();
    if (result.canceled) return;

    // ← ここから追加
    const paths = playlist.map(item => item.file.path);
    const saveResult = await savePlaylistFile({
        filePath: result.filePath,
        paths: paths
    });

    if (saveResult.success) {
        updatemessageOverlay(`📚 保存完了: ${path.basename(result.filePath)}`);
    } else {
        updatemessageOverlay('📚 保存に失敗しました', false, 5000);
        console.error(saveResult.error);
    }
}

// ドラッグ＆ドロップファイルのプレイリスト設定
async function addFilesFromPaths(fullPaths, isAppend = false) {
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
        if (isAppend) {
            // Ctrl押下時：既存リストに追加
            await playlistAdd(newFiles);
        } else {
            // 通常時：新規プレイリスト作成（上書き）
            await playlistSet(newFiles);
        }
        debouncedUpdateFilterList();
        debouncedScrollCurrentFilterItem();
    }
}

// 動画変換中止・一時ファイル削除
async function cleanupTempFiles() {
    // FFmpeg変換中断
    if (isConverting) {
        await cancelConversion();  // 即中断
        isConverting = false;
        updatemessageOverlay('🔄️ 変換中止', false, 3000);
    }

    // 一時ファイル削除
    await deleteTempVideo();
}

// 全動画結合処理
async function joinPlaylistVideos() {
    if (playlist.length < 2) {
        updatemessageOverlay(
            playlist.length === 0 ? '🎞️ プレイリストが空です' : '動画が1つだけなので結合不要です',
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
    const saveResult = await showSaveJoinDialog({ fileName: defaultName });

    if (saveResult.canceled) {
        return;
    }

    const outputPath = saveResult.filePath;

    // 結合開始
    isJoinEditing = true;           // 中断ボタン制御用に流用
    cutCancelBtn.style.display = 'inline-block';
    updatemessageOverlay('🎞️ 結合準備中…', true, 0);

    try {
        const videoPaths = playlist.map(item => item.file.path);

        const result = await joinVideos({
            inputPaths: videoPaths,
            outputPath: outputPath,
            frameRate: editFrameRate || 30
        });

        if (result && result.outputPath) {
            updatemessageOverlay(`🎞️ 結合完了！`, false, 3000);
        } else {
            updatemessageOverlay('🎞️ 結合が中断されました', false, 2000);
        }
    } catch (err) {
        console.error('結合エラー:', err);
        updatemessageOverlay(`🎞️ 結合失敗: ${err.message || '不明なエラー'}`, false, 5000);
    } finally {
        isJoinEditing = false;
        cutCancelBtn.style.display = 'none';
    }
}

// 再生速度設定
function setPlaybackRate(rate, showOverlay = true) {
    if (isNaN(rate) || rate <= 0) return;
    currentPlaybackRate = rate;                    // ← 追加
    videoPlayer.playbackRate = rate;
    if (speedSelect) speedSelect.value = parseFloat(rate).toFixed(2);
    localStorage.setItem('playbackSpeed', rate);
    if (showOverlay) {
        updatemessageOverlay(`🏃‍♂️‍➡️ ${rate}x`, false, 1000);
    }
}

// 再生速度変更（増速／減速）
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
        updatemessageOverlay(`🏃‍♂️‍➡️ ${playbackRates[newIdx]}x`, false, 1000);
    }
}

// 再生速度増減ボタン用の関数
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
            del.id = 'cutDeleteBtn';
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

// 元の順番を localStorage から復元するヘルパー関数
function getStoredOriginalLoadOrder() {
    try {
        const savedOriginalOrder = localStorage.getItem('originalLoadOrder');
        if (!savedOriginalOrder) return [];
        const parsed = JSON.parse(savedOriginalOrder);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('originalLoadOrder の復元に失敗:', e);
        return [];
    }
}

// 元の順番でプレイリストを再構築するヘルパー関数
function getPlaylistInOriginalOrder() {
    const storedOriginalOrder = getStoredOriginalLoadOrder();
    if (storedOriginalOrder.length > 0) {
        originalLoadOrder = storedOriginalOrder;
    } else if (!Array.isArray(originalLoadOrder) || originalLoadOrder.length !== playlist.length) {
        originalLoadOrder = playlist.map(item => item.file.path);
        localStorage.setItem('originalLoadOrder', JSON.stringify(originalLoadOrder));
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

    shufflePosition = currentVideoIndex;  // 表示順の位置をshufflePositionとする

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
        selectedPlaylistIndex = currentVideoIndex;
    }

    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
    saveShuffleState();
}

// 並び替えポップアップメニュー作成関数
function createSortMenu() {
    const menu = document.createElement('div');
    menu.className = 'sort-playlist-menu';  // CSSで位置・スタイルを調整

    Object.entries(SORT_MODES).forEach(([key, {label}]) => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.style.color = currentSortMode === key ? '#00ccff' : '#eee';
        item.innerHTML = (currentSortMode === key ? '✅ ' : '　　') + label;

        item.addEventListener('click', async (event) => {
            event.stopPropagation();
            
            // 1. ソート実行前にフィルターを解除
            // clearPlaylistFilter();
            
            // 2. ソートを実行（常に全体ソート）
            await applySortFiltered(key);
            
            if (isFilterPanelVisible) debouncedUpdateFilterList();
            debouncedScrollCurrentFilterItem();
            menu.remove();
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

    if (isRepeatPlayMode === 'all') {
        btn.classList.add('repeat-all');
        btn.setAttribute('data-tooltip', '全動画繰り返し再生中（Ctrl+Shift+r）');
    } else if (isRepeatPlayMode === 'single') {
        btn.classList.add('repeat-single');
        btn.textContent = '🔂';
        btn.setAttribute('data-tooltip', '1動画繰り返し再生中（Ctrl+Shift+r）');
    } else {
        btn.setAttribute('data-tooltip', '繰り返し再生無効（Ctrl+Shift+r）');
    }
}

// ループモード切替関数
function toggleRepeatPlay() {
if (isRepeatPlayMode === 'none') {
        isRepeatPlayMode = 'all';
    } else if (isRepeatPlayMode === 'all') {
        isRepeatPlayMode = 'single';
    } else {
        isRepeatPlayMode = 'none';
    }
    localStorage.setItem('isRepeatPlayMode', isRepeatPlayMode);
    updateRepeatButtonUI();
}

// プレイリスト追加ポップアップメニュー作成関数
function buildAddMenuContent(menu) {
    menu.innerHTML = '';

    const createMenuItem = (label, isSelected = false, onClick = null) => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.style.color = isSelected ? '#00ccff' : '#eee';
        item.innerHTML = label;

        if (onClick) {
            item.addEventListener('click', async (event) => {
                event.stopPropagation();
                await onClick();
            });
        }

        item.addEventListener('mouseover', () => {
            item.style.background = 'rgba(0,123,255,0.2)';
        });
        item.addEventListener('mouseout', () => {
            item.style.background = 'none';
        });

        return item;
    };

    const folderItem = createMenuItem('📁 フォルダ選択', false, async () => {
        menu.remove();
        try {
            const files = await openFolderDialog();
            if (files && files.length > 0) {
                await insertFilesIntoPlaylist(files, getCurrentAddModePosition());
            }
        } catch (e) {
            console.error('フォルダ追加エラー:', e);
            updatemessageOverlay('📚 フォルダ追加に失敗', false, 5000);
        }
    });
    menu.appendChild(folderItem);

    const fileItem = createMenuItem('🗒️ ファイル選択', false, async () => {
        menu.remove();
        try {
            const files = await openVideoDialog();
            if (files && files.length > 0) {
                await insertFilesIntoPlaylist(files, getCurrentAddModePosition());
            }
        } catch (e) {
            console.error('ファイル追加エラー:', e);
            updatemessageOverlay('📚 ファイル追加に失敗', false, 5000);
        }
    });
    menu.appendChild(fileItem);

    const separator = document.createElement('div');
    separator.style.margin = '6px 0';
    separator.style.borderTop = '1px solid #666';
    menu.appendChild(separator);

    Object.entries(ADD_MODES).forEach(([key, {label}]) => {
        const item = createMenuItem((currentAddMode === key ? '✅ ' : '　　') + label, currentAddMode === key, (event) => {
            currentAddMode = key;
            buildAddMenuContent(menu);
        });
        menu.appendChild(item);
    });
}

// プレイリスト追加ポップアップメニュー作成関数
function createAddMenu() {
    const menu = document.createElement('div');
    menu.className = 'add-playlist-menu';  // CSSで位置・スタイルを調整

    buildAddMenuContent(menu);
    return menu;
}

// マウス表示・自動非表示の設定
function resetCursorTimer() {
    if (isPanning) {    
        videoPlayer.style.cursor = 'grabbing'; 
    } else {
        videoPlayer.style.cursor = 'auto'; 
    }
    videoContainer.style.cursor = 'auto'; 

    // 既存のタイマーがあればクリア
    if (hideMouseTimeout) {
        clearTimeout(hideMouseTimeout);
    }
    
    // 【追加】プレイリスト表示中は、これ以上（非表示へのタイマー移行）の処理を行わない
    if (isFilterPanelVisible) {
        return;
    }
    
    hideMouseTimeout = setTimeout(() => {
       videoPlayer.style.cursor = 'none';
       videoContainer.style.cursor = 'none';
    }, overlayTimeout);
}

// 音声/字幕ボタンの表示をモードに応じて切り替え
function updateTrackButtonsVisibility() {
    if (currentMediaType === 'audio') {
        if (voiceSelectBtn) voiceSelectBtn.style.display = 'none';
        if (subtitleSelectBtn) subtitleSelectBtn.style.display = 'inline-block';
        subtitleSelectBtn.classList.remove('subtitles-active');
    } else {
        if (modeChange === 'video') {
            // 再生モード → 字幕選択のみ表示
            if (voiceSelectBtn) voiceSelectBtn.style.display = 'none';
            if (subtitleSelectBtn) subtitleSelectBtn.style.display = 'inline-block';
            subtitleSelectBtn.classList.remove('subtitles-active');
            if (selectedSubtitleLabel !== '（なし）') {
                subtitleSelectBtn.classList.add('subtitles-active');
            }
        } else {
            // 変換モード → 音声選択のみ表示
            if (voiceSelectBtn) voiceSelectBtn.style.display = 'inline-block';
            if (subtitleSelectBtn) subtitleSelectBtn.style.display = 'none';
            subtitleSelectBtn.classList.remove('subtitles-active');
        }
    }
}

// 動画音声トラック・字幕トラック取得
async function getVideoTracksAndFilter(filePath) {
    // 音声トラック情報・字幕トラック情報取得
    const result = await getVideoTracks(filePath);
    if (result.success) {
        currentAudioTracks = result.audio || [];
        currentSubtitleTracks = result.subtitle || [];
    } else {
        console.warn('[ffprobe] 失敗:', result.error);
        currentAudioTracks = [];
        currentSubtitleTracks = [];
    }
}

// 音声・字幕メニュー表示・非表示
async function toggleTrackMenu(e, type, button) {
    // 字幕選択ボタンイベント抑止
    if (e) {
        e.stopPropagation();
    }

    // メニュー非表示
    const existingMenu = document.querySelector('.track-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }

    // メニュー非表示
    hideMenus();

    // 動画音声トラック・字幕トラック取得
    let videondex = currentVideoIndex;
    if (isVideoStopped() || videondex === -1) {
        videondex = selectedPlaylistIndex;
    }
    const filePath = playlist[videondex].file.path;
    await getVideoTracksAndFilter(filePath);
    if (currentSubtitleTracks.length === 0) {
        subtitleSelectBtn.classList.remove('subtitles-active');
        return;
    }

    // 音声メニュー・字幕メニュー作成
    const menu = createTrackMenu(type);

    // ボタン以外からの世に出しの場合、メニュー非表示
    if (!button) return;

    // ★ 座標基準を window / document.body に統一（フルスクリーンでも安全）
    const btnRect = button.getBoundingClientRect();  // 画面基準の絶対位置

    // 仮追加して高さ取得
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.appendChild(menu);
    document.body.appendChild(tempDiv);

    const menuHeight = menu.offsetHeight;
    document.body.removeChild(tempDiv);

    // 上側表示（画面基準で計算）
    let topPosition = btnRect.top - menuHeight - 4;  // ボタンの上端からメニュー高さ分引く

    // 上側が画面外に出る場合、下側にフォールバック
    if (topPosition < 0) {
        topPosition = btnRect.bottom + 4;
        console.log('[toggleTrackMenu] 上側スペース不足 → 下側表示');
    }

    // 右側がはみ出たら左寄せ調整（任意）
    let leftPosition = btnRect.left;
    if (leftPosition + 200 > window.innerWidth) {   // メニュー幅を200pxと仮定
        leftPosition = window.innerWidth - 220;     // 少し余裕を持たせる
    }

    menu.style.position = 'fixed';  // ← absolute → fixed に変更（画面基準で固定）
    menu.style.top  = `${topPosition}px`;
    menu.style.left = `${leftPosition}px`;
    menu.style.zIndex = '9999';  // 最前面に持ってくる

    // ツールチップ非表示
    document.body.appendChild(menu);

    function closeMenu(ev) {
        if (!menu.contains(ev.target) && ev.target !== button) {
            menu.remove();
        }
    }

    setTimeout(() => {
        document.addEventListener('click', closeMenu, { once: true });
    }, 0);
}

// 字幕メニュー・音声メニュー作成
function createTrackMenu(type) {  // 'audio' or 'subtitle'
    const menu = document.createElement('div');
    menu.className = 'track-menu';

    const tracks = type === 'audio' ? currentAudioTracks : currentSubtitleTracks;
    let selectedTrackObj = type === 'audio' ? currentAudioTrack : currentSubtitleTrack;

    const labeledTracks = tracks.map(track => ({
        label: getMenuItem(track),
        track                     // ← トラックオブジェクトを保持
    }));

    // selectedTrackObj（選択項目）の判定・再設定
    // 現在選択中の「言語名」（クリーン版）を取得
    let currentCleanLabel = '';
    if (type === 'subtitle') {
        currentCleanLabel = selectedSubtitleLabel ? getCleanLabel(selectedSubtitleLabel) : '';
    } else {
        currentCleanLabel = selectedAudioLabel ? getCleanLabel(selectedAudioLabel) : '日本語';
    }
    // 同じ言語名の項目を探す（includes → 厳密に言語名で一致）
    const sameLabelItem = labeledTracks.find(item => 
        getCleanLabel(item.label).toLowerCase() === currentCleanLabel.toLowerCase()
    );
    const topItemTrack = type === 'subtitle' ? null : labeledTracks[0]?.track ?? null;

    // selectedTrackObj の決定ロジック（少し整理）
    if (!selectedTrackObj) {
        selectedTrackObj = sameLabelItem ? sameLabelItem.track : topItemTrack;
    } else {
        const isStillExists = labeledTracks.some(item => {
            const candidate = item.track;
            if (type === 'subtitle') {
                // 字幕の場合：index + vttPath の両方で厳密に比較（必須）
                return candidate.index === selectedTrackObj.index &&
                       candidate.vttPath === selectedTrackObj.vttPath;
            } else {
                // 音声の場合：index + languageで比較（より安全）
                // 必要に応じて codec_name や title も追加可能
                return candidate.index === selectedTrackObj.index &&
                       (candidate.tags?.language === selectedTrackObj.tags?.language);   // langCode があれば
            }
        });
        if (!isStillExists) {
            selectedTrackObj = sameLabelItem ? sameLabelItem.track : topItemTrack;
        }
        // 存在する場合はそのまま（何もしない）
    }

    // メニュー作成
    // 字幕メニューの"（なし）"項目を追加
    if (type === 'subtitle') {
        // 「（なし）」項目を先頭に追加
        const noneItem = document.createElement('div');
        noneItem.className = 'menu-item';
        const isNoneSelected = !selectedTrackObj;
        if (isNoneSelected) {
            currentSubtitleTrack = null;
        }
        noneItem.style.color = isNoneSelected ? '#00ccff' : '#eee';
        noneItem.innerHTML = isNoneSelected ? '✅ （なし）' : '　　（なし）';
        noneItem.onclick = () => selectTrackMenu('subtitle', menu, '（なし）');
        menu.appendChild(noneItem);
    } 
    // メニュー項目を追加
    labeledTracks.forEach(({ label, track }) => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        let isSelected = false;
        if (selectedTrackObj) {
            isSelected = (selectedTrackObj.index === track.index);
            if (isSelected) {
                if (type === 'subtitle') {
                    currentSubtitleTrack = track;
                } else {
                    currentAudioTrack =  track;
                }
            }
        }
        item.style.color = isSelected ? '#00ccff' : '#eee';
        item.innerHTML = isSelected ? `✅ ${label}` : `　　${label}`;
        item.onclick = () => selectTrackMenu(type, menu, label, track);
        menu.appendChild(item);
    });

    // メニュー全体のマウスオーバー抑止
    menu.addEventListener('mouseenter', () => {
        isMouseOverControls = true;
        clearTimeout(timeout);
        showControlsAndFilename();
    });
    menu.addEventListener('mouseleave', () => {
        isMouseOverControls = false;
        showControlsAndFilename();
    });

    return menu;
}

// フルラベルから「言語名だけ」を抽出する関数
function getCleanLabel(fullLabel) {
    if (!fullLabel) return '';
    // 「日本語(1234文)」や「English (5ch)」などから括弧とその中身を除去
    return fullLabel.replace(/\s*\([^)]*\)$/, '').trim();
}

// 逆に、言語名から該当するフルラベルを探す関数（必要に応じて使用）
function findFullLabelByCleanName(labeledTracks, cleanName) {
    if (!cleanName) return '';
    const lowerClean = cleanName.toLowerCase();
    const found = labeledTracks.find(item => 
        getCleanLabel(item.label).toLowerCase() === lowerClean
    );
    return found ? found.label : cleanName;
}

// 字幕トラック・音声トラックのメニュー項目取得
function getMenuItem(track) {
    const channels = (track.channels || '');
    const type = (track.codec_type || '');
    const tags = track.tags || {};
    const title = (tags.title || '').trim();
    const langCode = (tags.language || '').trim().toLowerCase();

    let baseLabel = '';

    if (title && title !== '') {
        baseLabel = title;
    } else {
        // excludeHandlers の場合 → 言語名を優先
        if (langCode && languageMap[langCode]) {
            baseLabel = languageMap[langCode];
        } else if (langCode && langCode !== '') {
            baseLabel = langCode.toUpperCase();
        } else {
            if (type === 'audio') {
                baseLabel = '音声';
            } else if (type === 'subtitle') {
                baseLabel = '字幕';
            } else {
                baseLabel = '不明';
            }
        }
    }

    if (type === 'audio') {
        // channelsを追加
        baseLabel += ` (${channels}ch)`;
    } else if (type === 'subtitle') {
        // 文言数取得
        const NumberOfFrames = track.nb_frames;
        if (NumberOfFrames) {
            baseLabel += ` (${NumberOfFrames}文)`;
        }
    }

    return baseLabel;
}

// 字幕メニュー・音声メニュー選択
function selectTrackMenu(type, menu, fullLabel, trackObj = null) {
    const currentTracks = type === 'audio' ? currentAudioTracks : currentSubtitleTracks;
    if (currentTracks.length === 0) {
        clearVideoSubtitle();
        return;
    }
    
    // まれなケースの予防（メニュー選択直後に再生・変換動画が変わるなど...）
    let found = false;
    let selectedIndex = -1;

    if (trackObj && Number.isInteger(trackObj.index)) {
        selectedIndex = currentTracks.findIndex(t => t.index === trackObj.index);
        found = selectedIndex !== -1;
    }
    if (trackObj && !found) {
        subtitleSelectBtn.classList.remove('subtitles-active');
        console.warn("選択しようとしたトラックはもう存在しません");
        if (type === 'subtitle') {
            currentSubtitleTrack = null;
            selectedSubtitleLabel = '（なし）';
        } else {
            currentAudioTrack = null;
        }
        return;
    }

    subtitleSelectBtn.classList.remove('subtitles-active');
    if (type === 'subtitle') {
        if (trackObj && !trackObj.exists) {
            updatemessageOverlay(`🔠 字幕ファイルが存在しません`, false, 3000);
        }

        // 動画再生状態・時間退避
        const currentTime = videoPlayer.currentTime || 0;
        const wasPlaying  = !videoPlayer.paused;
        // 動画字幕更新
        updateVideoSubtitle(fullLabel, trackObj);
        // 動画再生状態・時間復旧
        videoPlayer.currentTime = currentTime;
        if (wasPlaying) videoPlayer.play().catch(() => {});

        currentSubtitleTrack = trackObj;
        selectedSubtitleLabel = trackObj ? getCleanLabel(fullLabel) : '（なし）';
        selectedSubtitleLabel !== '（なし）' ? subtitleSelectBtn.classList.add('subtitles-active') : null;        localStorage.setItem('selectedSubtitleTrack', JSON.stringify(currentSubtitleTrack));
        localStorage.setItem('selectedSubtitleLabel', selectedSubtitleLabel);
    } else {
        updateVideoAudio(trackObj, currentTracks);
        
        currentAudioTrack = trackObj;
        selectedAudioLabel = trackObj ? getCleanLabel(fullLabel) : '日本語';
        localStorage.setItem('selectedAudioTrack', JSON.stringify(currentSubtitleTrack));
        localStorage.setItem('selectedAudioLabel', selectedAudioLabel);
    }

    // メニュー閉じる処理など
    menu?.remove();
}

// 動画字幕全クリア
function clearVideoSubtitle() {
    // 1. 全トラックを無効化（これが肝）
    Array.from(videoPlayer.textTracks || []).forEach(track => {
        track.mode = 'disabled';
    });

    // 2. <track> 要素を物理削除
    while (videoPlayer.firstElementChild) {
        videoPlayer.removeChild(videoPlayer.firstElementChild);
    }

    // 3. 念のため TextTrackList もクリア
    while (videoPlayer.textTracks?.length > 0) {
        videoPlayer.textTracks[0].remove();
    }
}

// 動画音声更新
function updateVideoAudio(trackObj, currentTracks) {
    // 'convert-video'（動画変換）に渡すcurrentAudioIndexを設定
    const trackIndex = currentTracks.findIndex(t => t.index === trackObj?.index);
    if (trackIndex !== -1) {
        currentAudioIndex = trackIndex;
    } else {
        currentAudioIndex = 0;
    }
}

// 動画字幕更新
function updateVideoSubtitle(label, trackObj) {
    clearVideoSubtitle();
    if (!trackObj) return;

    const url = trackObj.vttPath;
    const lang = trackObj.tags.language;

    const track = document.createElement('track');
    track.kind    = 'subtitles';
    track.label   = label;
    track.srclang = lang;
    track.src     = url;
    track.default = true;

    track.addEventListener('load', () => {
        if (track.track) track.track.mode = 'showing';
    });
    track.addEventListener('error', e => {
        console.error('字幕トラックエラー:', activeSubKey, e);
    });

    videoPlayer.appendChild(track);
}

// 一時変換ファイル削除
async function deleteTempVideo() {
    if (delConvertFile) {  // 前の loadedmetadata でセットした変数など
        // ハンドルを確実に解放
        videoPlayer.pause();
        videoPlayer.removeAttribute('src');
        videoPlayer.load();
        videoPreview.removeAttribute('src');
        videoPreview.load();

        await deleteTempFile(delConvertFile);
        delConvertFile = null;  // クリア
    }
}

// フィルタ履歴をlocalStorageから復元
function loadFilterHistory() {
    if (savedFilterHistory) {
        try {
            filterHistory = JSON.parse(savedFilterHistory);
            if (filterHistory.length > 1000) {
                filterHistory = filterHistory.slice(-1000);
            }
        } catch (e) {
            filterHistory = [];
        }
    }
    updateFilterHistoryList();
}

// フィルタ履歴をlocalStorageに保存
function saveFilterHistory() {
    localStorage.setItem('filterHistory', JSON.stringify(filterHistory));
}

// フィルタ履歴に項目を追加
function addToFilterHistory(text) {
    if (!text || text.trim() === '') return;
    
    const trimmedText = text.trim();
    const index = filterHistory.indexOf(trimmedText);
    if (index !== -1) {
        filterHistory.splice(index, 1);
    }
    
    filterHistory.push(trimmedText);
    
    if (filterHistory.length > 1000) {
        filterHistory = filterHistory.slice(-1000);
    }
    
    saveFilterHistory();
    updateFilterHistoryList();
}

// フィルタ履歴から特定の項目を削除
function deleteFromFilterHistory(text) {
    filterHistory = filterHistory.filter(item => item !== text);
    saveFilterHistory();
    updateFilterHistoryList();

    // 履歴が空になったらドロップダウンを隠す
    if (filterHistoryList.children.length === 0) {
        hideHistoryList();
    }
}

// フィルタ履歴datalistを更新
function updateFilterHistoryList() {
    if (!filterHistoryList) return;
    
    filterHistoryList.innerHTML = '';
    
    // 入力値を取得（大文字小文字を区別せず比較）
    const keyword = (playlistFilterInput.value || '').toLowerCase();

    // keywordが空文字の場合は filterHistory 全件をそのまま使用する
    const filteredHistory = keyword
        ? filterHistory.filter(item => item.toLowerCase().includes(keyword))
        : filterHistory;
    
    // ★変更: .slice().reverse() で最新の入力が上にくるよう逆順でループ処理
    filteredHistory.slice().reverse().forEach((item) => {
        const li = document.createElement('li');

        // --- 1. テキスト部分の作成 ---
        const textSpan = document.createElement('span');
        textSpan.className = 'history-text';
        textSpan.textContent = item;

        // アイテム選択時のイベント（テキスト領域クリック）
        li.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('delete-btn')) return;

            e.preventDefault(); 
            playlistFilterInput.value = item;
            
            playlistFilterInput.dispatchEvent(new Event('input', { bubbles: true }));
            playlistFilterInput.dispatchEvent(new Event('change', { bubbles: true }));

            hideHistoryList();
        });

        // --- 2. 削除ボタン（ゴミ箱）の作成 ---
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = '履歴から削除';

        // 削除ボタンクリック時のイベント
        deleteBtn.addEventListener('mousedown', (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            deleteFromFilterHistory(item);
        });

        // li要素に追加
        li.appendChild(textSpan);
        li.appendChild(deleteBtn);
        filterHistoryList.appendChild(li);
    });
}

// リスト表示・非表示の制御関数
function showHistoryList() {
    // ★変更: 絞り込み後のリスト要素が存在する場合のみ表示する
    if (filterHistoryList.children.length > 0) {
        filterHistoryList.classList.remove('hidden');
    }
}
function hideHistoryList() {
    filterHistoryList.classList.add('hidden');
}

// ⚙️設定パネル表示切替
function toggleSettingsPanel(show) {
    isSettingsPanelOpen = show;
    settingsPanel.style.display = isSettingsPanelOpen ? 'flex' : 'none';
    settingsBtn.classList.toggle('mode-active', isSettingsPanelOpen);
    settingsBtn.setAttribute('data-tooltip', isSettingsPanelOpen ? '設定モード終了（Ctrl+q）' : '設定モード開始（Ctrl+q）');
    if (isSettingsPanelOpen) {
        // 編集モード開始時はプレイリストパネルを閉じる（同時表示抑止）
        if (isFilterPanelVisible) {
            isFilterPanelVisible = false;
            if (filterPanel) filterPanel.style.display = 'none';
        }
        hideEditPanel();
    }
    showControlsAndFilename();
    updateIconOverlay();
}

function updateAlwaysOnTopButtonUI() {
    if (!alwaysOnTopBtn) return;
    alwaysOnTopBtn.classList.toggle('always-on-top-active', isAlwaysOnTop);
    alwaysOnTopBtn.setAttribute('data-tooltip', isAlwaysOnTop ? '常に最前面を解除（Ctrl+1）' : '常に最前面を設定（Ctrl+1）');
}

async function toggleAlwaysOnTop() {
    isAlwaysOnTop = !isAlwaysOnTop;
    if (typeof window.electronAPI?.setAlwaysOnTop === 'function') {
        await window.electronAPI.setAlwaysOnTop(isAlwaysOnTop);
    }
    localStorage.setItem('alwaysOnTop', isAlwaysOnTop ? 'true' : 'false');
    updateAlwaysOnTopButtonUI();
}

function getMediaFileExtension(filePath) {
    if (!filePath) return '';
    const cleanPath = filePath.split('?')[0];
    return path.extname(cleanPath).toLowerCase();
}

function isAudioFilePath(filePath) {
    const ext = getMediaFileExtension(filePath);
    return AUDIO_EXTENSIONS.includes(ext);
}

function updateMediaPlayerDisplay() {
    const isAudio = currentMediaType === 'audio';
    if (videoPlayerElement) {
        videoPlayerElement.style.display = isAudio ? 'none' : 'block';
    }
    if (audioPlayer) {
        audioPlayer.style.display = isAudio ? 'block' : 'none';
    }
    if (videoPreview) {
        videoPreview.style.display = 'none';
    }
}

function createMediaPlayerProxy(videoElement, audioElement) {
    return new Proxy(videoElement, {
        get(target, prop) {
            const activeElement = currentMediaType === 'audio' ? audioElement : videoElement;
            if (prop === 'src') return activeElement.src;
            if (prop === 'currentSrc') return activeElement.currentSrc;
            if (prop === 'paused') return activeElement.paused;
            if (prop === 'duration') return activeElement.duration;
            if (prop === 'currentTime') return activeElement.currentTime;
            if (prop === 'playbackRate') return activeElement.playbackRate;
            if (prop === 'volume') return activeElement.volume;
            if (prop === 'readyState') return activeElement.readyState;
            if (prop === 'error') return activeElement.error;
            if (prop === 'play') return activeElement.play.bind(activeElement);
            if (prop === 'pause') return activeElement.pause.bind(activeElement);
            if (prop === 'load') return activeElement.load.bind(activeElement);
            if (prop === 'addEventListener') {
                return (...args) => {
                    videoElement.addEventListener(...args);
                    audioElement.addEventListener(...args);
                };
            }
            if (prop === 'removeEventListener') {
                return (...args) => {
                    videoElement.removeEventListener(...args);
                    audioElement.removeEventListener(...args);
                };
            }
            if (prop === 'removeAttribute') {
                return (...args) => activeElement.removeAttribute(...args);
            }
            if (prop === 'setAttribute') {
                return (...args) => activeElement.setAttribute(...args);
            }
            if (prop === 'click') {
                return () => activeElement.click();
            }
            if (prop === 'dispatchEvent') {
                return (event) => activeElement.dispatchEvent(event);
            }
            if (prop === 'getBoundingClientRect') {
                return () => activeElement.getBoundingClientRect();
            }
            if (prop === 'matches') {
                return (...args) => activeElement.matches(...args);
            }
            if (prop === 'textTracks') return activeElement.textTracks;
            if (prop === 'firstElementChild') return activeElement.firstElementChild;
            if (prop === 'appendChild') return (...args) => activeElement.appendChild(...args);
            if (prop === 'removeChild') return (...args) => activeElement.removeChild(...args);
            return Reflect.get(activeElement, prop);
        },
        set(target, prop, value) {
            const activeElement = currentMediaType === 'audio' ? audioElement : videoElement;
            if (prop === 'src') {
                videoElement.src = value;
                audioElement.src = value;
                return true;
            }
            if (prop === 'currentTime') {
                activeElement.currentTime = value;
                return true;
            }
            if (prop === 'playbackRate') {
                activeElement.playbackRate = value;
                return true;
            }
            if (prop === 'volume') {
                activeElement.volume = value;
                return true;
            }
            if (prop === 'muted') {
                activeElement.muted = value;
                return true;
            }
            return Reflect.set(activeElement, prop, value);
        }
    });
}

// 動画ファイルかどうかを判定する関数
function isVideoFile(ext) {
    const cleanExt = ext.split('?')[0].toLowerCase();
    // 音声拡張子（AUDIO_EXTENSIONS）に含まれている場合は false
    if (typeof AUDIO_EXTENSIONS !== 'undefined' && AUDIO_EXTENSIONS.includes(cleanExt)) {
        return false;
    }
    // modeChange に合わせた動画サポート判定
    if (modeChange === 'video') {
        return HTML5_SUPPORTED.includes(cleanExt);
    } else {
        return HTML5_SUPPORTED_CONVERT.includes(cleanExt);
    }
}

// ビジュアライザーの初期化関数
function updateAudioMotion() {
    if (audioMotionBtn) {
        audioMotionBtn.classList.toggle('audio-motion-active', audioMotionMode !== 'none');
    }
    localStorage.setItem('audioMotionMode', audioMotionMode);

    const visualizerContainer = document.getElementById('visualizerContainer');
    const audioPlayer = document.getElementById('audioPlayer');

    // 「（なし）」または未定義の場合
    if (!audioMotionMode || audioMotionMode === 'none') {
        window.AudioMotionAPI.disable();
        return;
    }

    // 選択されたノードを取得（存在しないキーの場合は default を参照）
    const presetNode = AUDIOMOTION_NODES[audioMotionMode] || AUDIOMOTION_NODES['none'];

    // デフォルトオプションに選択プリセットの固有設定をマージ
    const newOptions = Object.assign({}, DEFAULT_AUDIO_MOTION_OPTIONS, presetNode.options);

    try {
        // preload 側の実体に対して処理を委託する
        window.AudioMotionAPI.initOrUpdate(visualizerContainer, audioPlayer, newOptions);
    } catch (err) {
        console.error('AudioMotion の初期化・更新に失敗しました:', err);
    }
}

// ビジュアライザーの表示切替
function toggleVisualizer(show) {
    const visualizerContainer = document.getElementById('visualizerContainer');
    const videoPlayer = document.getElementById('videoPlayer');

    if (show === 'audio') {
        if (audioMotionMode === 'none') {
            visualizerContainer.style.display = 'none';
        } else {
            visualizerContainer.style.display = 'block';
        }
        videoPlayer.style.display = 'none'; // 音声時は動画エリアを非表示に
    } else {
        visualizerContainer.style.display = 'none';
        videoPlayer.style.display = 'block'; // 動画時は動画エリアを表示
    }
}
