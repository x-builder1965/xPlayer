// -- script.js --------------------------------------------------------
const copyright = 'Copyright © 2025- @x-builder, Japan';
const email = 'x-builder@gmail.com';
const appName = 'xPlayer -メディアプレイヤー- Ver5.77.0';
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
    getFolderVideoFiles,
    openVideoDialog,
    getFileVideoFiles,
    savePlaylistDialog,
    showSaveCutDialog,
    showSaveJoinDialog,
    showSaveSettingsDialog,
    showOpenSettingsDialog,
    setAlwaysOnTop,
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
    openBgmDialog,
    checkIsSecondaryInstance,
    getPid,
    showSaveAudioJoinDialog,
    joinAudios
} = window.electronAPI;

// 固定値設定
const overlayTimeout = 3000;
const seekSensitivity = 0.3;
const volumeStep = 0.001;
const playbackRates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 5.0];
const appNameAndCopyrightValue = `${appName}\n${copyright}`;
const appNameAndCopyrightValueLine = `${appName}　${copyright}`;
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.m4v', '.mkv'];  // HTML5ネイティブ対応拡張子（ブラウザが直接再生可能）
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.oga', '.m4a', '.aac', '.opus', '.wma', '.aiff', '.aif', '.alac', '.ape'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
const VIDEO_EXTENSIONS_CONVERT = [];        // 動画変換対象外拡張子
const SETTINGS_FILE_REGEX = /\.(json|xpj)$/i;
const debouncedUpdateFilterList = debounce(updateFilterList, 0);      // 実際にイベントリスナー（inputなど）に登録する際は、この debouncedUpdateFilterList を呼び出してください。
const debouncedScrollCurrentFilterItem = debounce(scrollCurrentFilterItem, 100);
const settingsFilePath = getUserSettingsPath();
const pid = getPid();
const IMAGE_DURATION = 5;                   // 画像の再生時間（秒）
const bgmAudio = new Audio();
const imageThumbnailCache = new Map();		// 画像サムネイル用キャッシュ（Mapオブジェクト）
const dragThreshold = 5;                    // ドラッグ判定用の移動閾値（手ぶれ考慮: 5ピクセル）
const imageCache = new Map();		        // 画像キャッシュストレージ（メモリ内）
const MAX_IMAGE_CACHE_SIZE = 5; 			// メモリを圧迫しないよう保持数を制限（0は無効）
const mediaCache = new Map();	            // 動画・音声の先読み要素キャッシュ
const MAX_MEDIA_CACHE_SIZE = 3; 	        // メモリを圧迫しないよう保持数を制限（0は無効）

const SORT_MODES = {
    'none':       { label: '（なし）',    fn: () => getPlaylistInOriginalOrder() },
    'path_asc':   { label: 'ファイル▲',   fn: () => [...getPlaylistInOriginalOrder()].sort((a, b) => (a.file?.path || '').localeCompare(b.file?.path || '')) },
    'path_desc':  { label: 'ファイル▼',   fn: () => [...getPlaylistInOriginalOrder()].sort((a, b) => (b.file?.path || '').localeCompare(a.file?.path || '')) },
    'type_asc':   { label: '種類▲',       fn: () => [...getPlaylistInOriginalOrder()].sort((a, b) => {
        const extA = a.file?.ext || '';
        const extB = b.file?.ext || '';
        const comp = extA.localeCompare(extB);
        return comp !== 0 ? comp : (a.file?.path || '').localeCompare(b.file?.path || '');
    })},
    'type_desc':  { label: '種類▼',       fn: () => [...getPlaylistInOriginalOrder()].sort((a, b) => {
        const extA = a.file?.ext || '';
        const extB = b.file?.ext || '';
        const comp = extB.localeCompare(extA);
        return comp !== 0 ? comp : (a.file?.path || '').localeCompare(b.file?.path || '');
    })},
    'ctime_asc':  { label: '作成日時▲',   fn: async () => await sortByCreationTime(true) },
    'ctime_desc': { label: '作成日時▼',   fn: async () => await sortByCreationTime(false)},
    'random':     { label: '（ランダム）', fn: () => sortRandomPlaylist() }
};
const ADD_MODES = {
    'Folder': {
        label: '📁 フォルダ選択',
        fn: async () => await addFilesToPlaylist(openFolderDialog, getFolderVideoFiles),
        isAction: true // モード変更ではなく即時実行アクションであることを示すフラグ
    },
    'File': {
        label: '🗒️ ファイル選択',
        fn: async () => await addFilesToPlaylist(openVideoDialog, getFileVideoFiles),
        isAction: true
    },
    'Separator': { isSeparator: true }, // セパレータ要素
    'Add0': { label: '選択行に追加' },
    'Add1': { label: '選択行の下に追加' }
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
    mode: 3,                                // 周波数帯域の分割解像度 (0: 離散バー, 1: 1/1オクターブ ~ 10: 1/10オクターブ等)
    radial: false,                          // 円形（ラジアル）表示を無効化（通常の水平表示）
    barSpace: 0.1,                          // バー同士の隙間の比率 (0: 隙間なし ~ 1: バー幅と同等)
    ledBars: false,                         // バーをLEDブロック状に区切る表示をオフ（通常のソリッド描画）
    showPeaks: true,                        // ピーク（頂点）ホールドラインの表示を有効化
    fillAlpha: 1,                           // スペクトラム内部の塗りつぶし不透明度 (0: 完全透明 ~ 1: 完全不透明)
    lineWidth: 0,                           // バー/波形の外枠線の太さpx (0: 枠線なし)
    gradient: 'classic',                    // 使用するグラデーションテーマ ('classic', 'neon', 'gem' 等)
    lumaBars: false,                        // 輝度（明るさ）に基づいたカラー調整をオフ
    reflexRatio: 0.02,                      // 下部への反射（ミラー）描画の高さ比率 (0: なし ~ 1: 完全同サイズ)
    reflexAlpha: 0,                         // 反射部分の不透明度 (0: 完全透明/非表示 ~ 1: 完全不透明)
    reflexBright: false,                    // 反射部分の減衰（減光処理）をオフ
    spin: 0,                                // 円形表示時の回転速度 (0: 回転なし, 正の値で時計回り)
    radius: 0.3,                            // 円形表示時の内径半径の比率 (0: 中心から ~ 1: 外枠いっぱい)
    bgAlpha: 0,                             // Canvas背景の透明度 (0: 完全透明 ~ 1: 完全不透明)
    showBgColor: false,                     // テーマ固有の背景色描画をオフ
    overlay: true,                          // 背景透過時や複数描画時の重ね合わせ表示最適化
    reflexFit: false,                       // 本体と反射を合わせた全高がCanvas内に収まるよう自動スケーリング
    outlineBars: true,                      // バーの外枠（輪郭線）描画
    spinSpeed: 0,                           // 回転速度 (正の値で時計回り、大きいほど高速)
    channelLayout: 'single',                // 音声チャンネル表示 (L/Rを合成したシングル描画)
    mirror: 0,                              // ミラー表示 (0: なし, -1: 左右反転, 1: 左右上下反転)
	maxFreq: 12000,                         // 表示する最大周波数 (Hz)
	frequencyScale: 'log',                  // 周波数軸のスケール ('log' | 'linear' | 'bark' | 'mel' | 'notes')
	roundBars: false,                       // バーの頂点を丸く丸めるか
	gradient: 'classic',                    // 使用するグラデーションプリセット名またはカスタム定義
};
// オーディオモーション設定のNODE定義
const AUDIOMOTION_NODES = {
    'none': {    label: '（なし）', options: {} },
    'preset1': { label: 'LEDオーディオコンポ',
        options: {
            mode: 3,                        // 周波数帯域の分割解像度 (1/3オクターブ表示)
            barSpace: 0.2,                  // バー同士の隙間の比率 (バー幅の20%分空ける)
            ledBars: true,                  // バーをLEDブロック状（点灯セグメント風）に区切って表示
        }
    },
    'preset2': { label: 'レインボウ・サイバーパンク',
        options: {
            mode: 2,                        // 周波数帯域の分割解像度 (1/2 オクターブ表示)
            gradient: 'rainbow',            // グラデーションテーマ (レインボーカラー)
            showPeaks: true,                // ピーク（頂点）ホールドラインの表示を有効化
            linearBar: true,                // バーの振幅変化を線形（リニア）スケールで計算
            bgAlpha: 0.7,                   // Canvas背景の不透明度 (描画更新時の残像感を調整)
            fillAlpha: 1,                   // スペクトラム内部の塗りつぶし不透明度 (0: 完全透明 ~ 1: 完全不透明)
            reflexRatio: 0.3,               // 下部への反射（ミラー）描画の高さ比率 (本体の30%の高さ)
            reflexAlpha: 0.5,               // 反射部分の不透明度 (ほんのり透ける40%表示)
        }
    },
    'preset3': { label: 'ミニマル・クラシック',
        options: {
            mode: 1,                        // 周波数帯域の分割解像度 (1/1 オクターブ：シンプルな10本前後のバー)
            barSpace: 0.25,                 // バー同士の隙間の比率 (バー幅の25%分を空ける)
            gradient: 'prism',              // グラデーションテーマ (プリズムカラー)
            showBgColor: false,             // テーマ固有の背景色描画をオフ (背景透過)
            showScaleX: false,              // X軸（周波数Hz）目盛りの表示をオフ
            showScaleY: false,              // Y軸（音圧dB）目盛りの表示をオフ
            showPeaks: false,               // ピーク（頂点）ラインの表示をオフ
            outlineBars: false,             // バーの外枠（輪郭線）描画をオフ
        }
    },
    'preset4': { label: 'レトロ・ヴァイブ',
        options: {
            mode: 0,                        // 周波数帯域の分割解像度 (0: 離散バー表示 / FFTSize依存)
            ledBars: true,                  // バーをLEDブロック状（点灯セグメント風）に分割表示
            showPeaks: true,                // ピーク（頂点）表示を有効化
        }
    },
    'preset5': { label: 'センタースプリット',
        options: {
            mode: 2,                        // 周波数帯域の分割解像度 (1/2 オクターブ表示)
            barSpace: 0.2,                  // バー同士の隙間の比率 (バー幅の20%分を空ける)
            gradient: 'rainbow',            // グラデーションテーマ (レインボーカラー)
            fillAlpha: 0.85,                // スペクトラム内部の塗りつぶし不透明度 (85%表示)
            showPeaks: false,               // ピーク（頂点）ラインの表示を有効化
            reflexRatio: 0.5,               // 下部への反射（ミラー）描画の高さ比率 (本体の50%の高さ)
            reflexAlpha: 1,                 // 反射部分の不透明度 (上側と同じ 1.0 にして濃さを統一)
            reflexBright: false,            // 反射部分の減衰（暗くする処理）を無効化し、上下の色合いを統一
            reflexFit: true,                // 本体と反射を合わせた全高がCanvas内に収まるよう自動スケーリング
        }
    },
    'preset6': { label: 'サークル・ヴォルテックス',
        options: {
            mode: 3,                        // 周波数帯域の分割解像度 (1/3 オクターブ表示)
            radial: true,                   // 円形（ラジアル）表示を有効化
            spin: true,                     // 円形ビジュアライザーの自動回転を有効化
            spinSpeed: 1,                   // 回転速度 (正の値で時計回り、大きいほど高速)
            gradient: 'prism',              // グラデーションテーマ (プリズムカラー)
            mirror: 1,                      // ミラー表示 (0: なし, -1: 左右反転, 1: 左右上下反転)
        }
    },
    'preset7': { label: 'クリスタル・スペクトラム',
        options: {
            mode: 10,                       // 周波数帯域の分割解像度 (1/2 オクターブ表示)
            barSpace: 0.25,                 // バー同士の隙間の比率 (バー幅の20%分を空ける)
            gradient: 'rainbow',            // グラデーションテーマ (レインボーカラー)
            showPeaks: true,                // ピーク（頂点）ラインの表示を有効化
            lineWidth: 1,                   // バー/波形の外枠線の太さpx (4pxの輪郭線)
            fillAlpha: 0.7,                 // スペクトラム内部の塗りつぶし不透明度 (50%表示)
            reflexRatio: 0.5,               // 下部への反射（ミラー）描画の高さ比率 (本体の50%の高さ)
            reflexAlpha: 1,                 // 反射部分の不透明度 (上側と同じ 1.0 にして濃さを統一)
            reflexBright: 1,                // 反射部分の減衰（暗くする処理）を無効化し、上下の色合いを統一
            reflexFit: -1,                  // 本体と反射を合わせた全高がCanvas内に収まるよう自動スケーリング
            mirror: 1,                      // ミラー表示 (0: なし, -1: 左右反転, 1: 左右上下反転)
        }
    },
    'preset8': { label: 'プリズム・リフレクト',
        options: {
            mode: 4,                        // 周波数帯域の分割解像度 (1/2 オクターブ表示)
            barSpace: 0.25,                 // バー同士の隙間の比率 (バー幅の20%分を空ける)
            gradient: 'prism',              // グラデーションテーマ (プリズムカラー)
            showPeaks: false,               // ピーク（頂点）ラインの表示を有効化
            reflexRatio: 0.5,               // 下部への反射（ミラー）描画の高さ比率 (本体の50%の高さ)
            reflexAlpha: 1,                 // 反射部分の不透明度 (上側と同じ 1.0 にして濃さを統一)
            reflexBright: 1,                // 反射部分の減衰（暗くする処理）を無効化し、上下の色合いを統一
            reflexFit: 0,                   // 本体と反射を合わせた全高がCanvas内に収まるよう自動スケーリング
            roundBars: true,                // バーの頂点を丸く丸める
        }
    },
    'preset9': { label: 'デュアルグロウ・セグメント',
        options: {
            mode: 10,                       // 周波数帯域の分割解像度 (0: 離散バー表示 / FFTSize依存)
            ledBars: true,                  // バーをLEDブロック状（点灯セグメント風）に分割表示
            showPeaks: false,               // ピーク（頂点）ラインの表示を有効化
            gradient: 'steelblue',          // 使用するグラデーションプリセット名またはカスタム定義
            gradientLeft: 'steelblue',      // ステレオ表示時の左チャンネル用グラデーション
            gradientRight: 'orangered',     // ステレオ表示時の右チャンネル用グラデーション
            channelLayout: 'dual-combined', // 音声チャンネル表示 (L/Rを合成したシングル描画)
            lineWidth: 2,                   // バー/波形の外枠線の太さpx (4pxの輪郭線)
            fillAlpha: 0.5,                 // スペクトラム内部の塗りつぶし不透明度 (50%表示)
        }
    },
    'random': { label: '（ランダム）', options: {} }
};
// イメージエフェクト＆BGM設定のNODE定義
const IMAGEEFFECTBGM_NODES = {
    'bgm-set':       { label: 'BGM設定' },
    'separator1':    { isSeparator: true },
    'wallpaper-set': { label: '背景生成' },
    'separator2':    { isSeparator: true },
    'none':          { label: '（なし）',          className: 'effect-none' },
    'effect1':       { label: 'フェード',          className: 'effect-fade' },
    'effect2':       { label: 'スライド（左→右）',  className: 'effect-slide-lr' },
    'effect3':       { label: 'スライド（右→左）',  className: 'effect-slide-rl' },
    'effect4':       { label: 'スライド（上→下）',  className: 'effect-slide-tb' },
    'effect5':       { label: 'スライド（下→上）',  className: 'effect-slide-bt' },
    'effect6':       { label: 'ズームイン',        className: 'effect-zoom-in' },
    'effect7':       { label: 'ズームアウト',       className: 'effect-zoom-out' },
    'effect8':       { label: 'ポップアップ',       className: 'effect-pop' },
    'effect9':       { label: '回転フェード',       className: 'effect-rotate' },
    'effect10':      { label: 'スイング/振り子',    className: 'effect-swing-top' },
    'effect11':      { label: 'スイング/扇',        className: 'effect-swing-bottom' },
    'effect12':      { label: 'フリップ（左右）',   className: 'effect-flip-lr' },
    'effect13':      { label: 'フリップ（上下）',   className: 'effect-flip-tb' },
    'random':        { label: '（ランダム）' }
};
const JOIN_MODES = {
    'joinVideos': { label: '🎞️ 動画結合', fn: () => joinPlaylistVideos() },
    'joinAudios': { label: '🎵 音声結合', fn: () => joinPlaylistAudios() }
};
const IMPORT_EXPORT_MODES = {
    'import': { label: '📥 設定インポート',   fn: () => importSettingsFromFile() },
    'export': { label: '📤 設定エクスポート', fn: () => exportSettingsToFile() }
};
const CONTROL_MODES = {
    'display-disable': { label: 'コントロール自動表示抑止', fn: () => togglePauseShowControls() },
    'center-disable':  { label: 'センターコントロール無効', fn: () => toggleHideCenterControls() }
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
let importExportBtn = null;
let alwaysOnTopBtn = null;
let audioMotionBtn = null;
let imageEffectBgmBtn = null;
let autoShuffleBtn = null;
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
let playlistProgressBar = null;
let isPlaylistCreationInProgress = false;
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
let imagePlayer = null;
let imageWrapper = null;
let centerControls = null;
let centerPrevBtn = null;
let centerPlayPauseBtn = null;
let centerNextBtn = null;
let imageWallpaper = null;
let imageWallpaperImg = null;

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
let savedAutoShuffle = null;            // 全曲リピート時に周回ごと再シャッフル
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
let savedPauseShowControls = null;
let savedHideCenterControls = null;
let savedAudioMotionMode = null;
let savedImageEffectBgmMode = null;
let savedIsImageWallpaperEnabled = null;
let savedFilterHistory = null;
let savedOriginalOrder = null;
let savedAudioMotionOptions = null;
let savedAudioMotionNodes = null;
let savedImageBgmPaths = null;	// 複数BGMパスの保持用変数を追加
let savedCurrentBgmIndex = null;	// 複数BGMパスのインデックス保持用変数を追加
let savedMaxImageCacheSize = null;
let savedMaxMediaCacheSize = null;

// グローバル（共通）変数
let localSettings = {};     // localSettingsをオブジェクトとして初期化
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
let autoShuffle = true;            // 全曲リピート時に周回ごと再シャッフル
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
let displayFormatUpdateRequested = false;
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
let imageEffectBgmMode = null;
let isImageWallpaperEnabled = null;
let lastRandomPreset = null;		// 直前にランダムで選ばれたプリセットを保持する変数（関数の外に定義）
let isSecondary = null;
let disableMessageOverlay = false;
let imageTimer = null;
let imageCurrentTime = 0;      // 0〜5秒
let imageProgressInterval = null;
let pauseShowControls = false;
let hideCenterControls = false;
let imageBgmPaths = []; 		// 複数BGMパスの配列管理変数を追加
let currentBgmIndex = 0;		// 複数BGMパスのインデックス管理を追加
let currentLoadedBgmPath = null;    // BGM設定用の変数（パス管理）
let lastEffectKey = null;		// 直前に適用されたエフェクトキーを記憶する変数
let hasMoved = false;           // ドラッグ中にマウスが移動したかどうかのフラグ
let forceStop = true;           // 起動時の再生一時停止判定用（アプリ起動：true、設定インポート：false）
let maxImageCacheSize = 0;		// 画像用キャッシュサイズ（0はキャッシュ無効）
let maxMediaCacheSize = 0;		// 動画・音声用キャッシュサイズ（0はキャッシュ無効）

// 🔲document ハンドラ登録🔲
// DOMContentロード完了（初期処理）
document.addEventListener('DOMContentLoaded', async () => {
    // 多重起動（セカンダリインスタンス）判定
    isSecondary = await checkIsSecondaryInstance();
    // DOM要素を取得
    allDOMsetting();
    // まず多重起動時の localStorage 書き込み防止を設定
    await setupLocalStorageProtection();
    // localStorageからの復元
    await allLocalStorageSetting();

    // リスナー登録完了後、メインプロセスへ準備完了を通知
    ipcRenderer.send('app-ready');

    // メディア初期化（未設定状態）
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
    audioPlayer.removeAttribute('src');
    audioPlayer.load();
    videoPreview.removeAttribute('src');
    videoPreview.load();
    updateMediaPlayerDisplay();

    // ネットURL選択のアイコン表示更新
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

    // コントロール表示抑止の復元
    if (savedPauseShowControls === 'true') {
        pauseShowControls = true;
    } else {
        pauseShowControls = false;
    }

    // センターコントロール無効の復元
    if (savedHideCenterControls === 'true') {
        hideCenterControls = true;
    } else {
        hideCenterControls = false;
    }

    // ボリューム復元
    if (savedVolume >= 0 && savedVolume <= 1) {
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
        await setAlwaysOnTop(true);
    }
    updateAlwaysOnTopButtonUI();

    // オーディオモーション復元
    if (savedAudioMotionMode && AUDIOMOTION_NODES[savedAudioMotionMode]) {
        audioMotionMode = savedAudioMotionMode;
    } else {
        audioMotionMode = 'preset1';
    }

    // イメージエフェクト復元
    if (savedImageEffectBgmMode && IMAGEEFFECTBGM_NODES[savedImageEffectBgmMode]) {
        imageEffectBgmMode = savedImageEffectBgmMode;
    } else {
        imageEffectBgmMode = 'effect1';
    }

    // イメージ壁紙表示の復元
    if (savedIsImageWallpaperEnabled) {
        isImageWallpaperEnabled = savedIsImageWallpaperEnabled;
    } else {
        isImageWallpaperEnabled = 'false';
    }

    // イメージBGM復元
    bgmAudio.loop = false;
    if (savedImageBgmPaths && savedImageBgmPaths !== 'null') {
        try {
            imageBgmPaths = typeof savedImageBgmPaths === 'string' ? JSON.parse(savedImageBgmPaths) : savedImageBgmPaths;
            if (!Array.isArray(imageBgmPaths)) imageBgmPaths = [];
        } catch (e) {
            console.error('imageBgmPaths の復元エラー:', e);
            imageBgmPaths = [];
        }
    } else {
        imageBgmPaths = [];
    }

    // イメージBGM演奏曲の復元
    if (savedCurrentBgmIndex !== null && !isNaN(savedCurrentBgmIndex)) {
        currentBgmIndex = parseInt(savedCurrentBgmIndex);
    } else {
        currentBgmIndex = 0;
    }

    // 音量バーの入力変更をBGM音量に同期
    if (volumeBar) {
        bgmAudio.volume = parseFloat(volumeBar.value);
        volumeBar.addEventListener('input', () => {
            bgmAudio.volume = parseFloat(volumeBar.value);
        });
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

    // 自動シャッフル復元
    if (savedAutoShuffle === 'false') {
        autoShuffle = false;
    }
    updateAutoShuffleButtonUI();

    // ランダム再生リスト復元
    if (savedShuffleOrder) {
        try {
            // 変数名を parsedPlaylist に統一
            const parsedPlaylist = safeJSONParse(savedPlaylist, []);
            shuffleOrder = safeJSONParse(savedShuffleOrder, []);
            
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
    if (savedShufflePosition !== 'null') {
        shufflePosition = parseInt(savedShufflePosition, 10);
        if (isNaN(shufflePosition) || shufflePosition < -1) {
            shufflePosition = -1;
        }
    }

    // 画像用キャッシュサイズ復元
    if (savedMaxImageCacheSize !== 'null') {
        maxImageCacheSize = savedMaxImageCacheSize;
    } else {
        maxImageCacheSize = MAX_IMAGE_CACHE_SIZE;
    }
    localStorageSetItemAndFile('maxImageCacheSize', maxImageCacheSize);
    // 動画・音声用キャッシュサイズ復元
    if (savedMaxMediaCacheSize !== 'null') {
        maxMediaCacheSize = savedMaxMediaCacheSize;
    } else {
        maxMediaCacheSize = MAX_MEDIA_CACHE_SIZE;
    }
    localStorageSetItemAndFile('maxMediaCacheSize', maxMediaCacheSize);
    
    // コントロールサイズ適用
    let controlSizeX = calculateControlSizeX();
    let controlSizeY = calculateControlSizeY();
    localStorageSetItemAndFile('controlSizeX', controlSizeX);
    localStorageSetItemAndFile('controlSizeY', controlSizeY);
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
            if (!playlist || playlist.length === 0) return;
            if (currentVideoIndex < 0 || currentVideoIndex >= playlist.length) return;
            
            const current = playlist[currentVideoIndex];
            navigator.mediaSession.metadata = new MediaMetadata({
                title: current.file.name,
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
            // アクティブクラス付与なし
        } else if (['path_asc', 'path_desc', 'type_asc', 'type_desc', 'ctime_asc', 'ctime_desc'].includes(currentSortMode)) {
            sortPlaylistBtn.classList.add('sorted-active');
        } else if (currentSortMode === 'random') {
            sortPlaylistBtn.classList.add('random-sorted-active');
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
        // リロード判定（PerformanceNavigationTiming API）
        const navEntries = performance.getEntriesByType('navigation');
        const isReload = navEntries.length > 0 && navEntries[0].type === 'reload';
        // 起動時の引数有無判定
        const args = await getCommandLineArgs();
        if (!isReload && args && args.length > 0) {
            updateMessageOverlay(`📚 プレイリスト作成中...`, 0, false);
            // main.js が auto-play-files を送信するので、ここでは何もしない
            return;
        }

        // 引数なし → 状態復元
        if (savedOriginalOrder) {
            try {
                originalLoadOrder = safeJSONParse(savedOriginalOrder, []);
            } catch (e) {
                console.warn('originalLoadOrder の復元に失敗:', e);
                originalLoadOrder = [];
            }
        }

        // 引数なし → プレイリストと再生状態復元
        // savedCurrentVideoIndex が 0 であっても通過できるように修正
        if (savedPlaylist && savedCurrentVideoIndex != null && savedCurrentTime != null) {
            try {
                // すでに配列の場合はそのまま、文字列の場合は JSON Parse
                const parsedPlaylist = typeof savedPlaylist === 'string' 
                    ? safeJSONParse(savedPlaylist, []) 
                    : savedPlaylist;
                const parsedIndex = parseInt(savedCurrentVideoIndex, 10);
                const parsedCurrentVideoIndex = (!isNaN(parsedIndex) && parsedIndex >= 0) ? parsedIndex : 0;                
                if (Array.isArray(parsedPlaylist) && parsedPlaylist.length > 0 && 
                    !isNaN(parsedCurrentVideoIndex) && parsedCurrentVideoIndex >= 0 && parsedCurrentVideoIndex < parsedPlaylist.length) {
                    // プレイリスト復元
                    updateMessageOverlay(`📚 プレイリスト作成中...`, 0, false);
                    playlist = await Promise.all(parsedPlaylist.map(file => createPlaylistItem(file)));
                    currentVideoIndex = parsedCurrentVideoIndex;
                    await debouncedUpdateFilterList();
                    await debouncedScrollCurrentFilterItem();
					// 復元メディアの再生
					await playVideo(playlist[currentVideoIndex].file, savedCurrentTime);
                    if (forceStop) {
                        // 起動時は一時停止状態にする
                        await togglePlayPause();
                    }
                    
                    hideMessageOverlay(true);
                    updateIconOverlay();
                } else {
                    playlistPathArea.value = appNameAndCopyrightValueLine;
                    updateIconOverlay();
                }
            } catch (e) {
                console.error('プレイリスト復元エラー:', e);
                playlistPathArea.value = appNameAndCopyrightValueLine;
                hideMessageOverlay(true);
                updateIconOverlay();
            }
        } else {
            playlistPathArea.value = appNameAndCopyrightValueLine;
            updateIconOverlay();
        }
    })();

    // 🔲個別イベントリスナー登録🔲
    // 🌐ネットURL選択
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
        try {
            const folderPath = await openFolderDialog();
            if (!folderPath) return;
            updateMessageOverlay(`📚 プレイリスト作成中...`, 0, false);
            const videoFiles = await getFolderVideoFiles(folderPath);

            playlistSet(videoFiles);
            debouncedUpdateFilterList();
            debouncedScrollCurrentFilterItem();
            hideMessageOverlay(true);
        } catch (e) {
            updateMessageOverlay('📁 フォルダ選択エラー', 6000);
            console.error('フォルダ選択エラー:', e);
            updateIconOverlay();
        }
    });

    // 🗒️ファイル選択
    videoInput.addEventListener('click', async () => {
        try {
            const filePaths = await openVideoDialog();
            if (!filePaths || filePaths.length === 0) return;
            updateMessageOverlay(`📚 プレイリスト作成中...`, 0, false);
            const videoFiles = await getFileVideoFiles(filePaths);

            playlistSet(videoFiles);
            debouncedUpdateFilterList();
            debouncedScrollCurrentFilterItem();
            hideMessageOverlay(true);
        } catch (e) {
            updateMessageOverlay('🗒️ ファイル選択エラー', 6000);
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
                updateMessageOverlay('🎬 再生モードを設定しました');
            } else {
                modeChange = 'convert';
                modeChangeBtn.classList.add('convert-active');
                seekBar.classList.add('converting');
                updateMessageOverlay('🔄️ 変換モードを設定しました');
            }
            modeChangeBtn.textContent = modeChange === 'video' ? '🎬' : '🔄️';
            modeChangeBtn.setAttribute('data-tooltip', modeChange === 'video' ? '視聴モード（Ctrl+v）' : '変換モード（Ctrl+v）');
            localStorageSetItemAndFile('modeChange', modeChange);
        } else {
            if (modeChange === 'convert') {
                updateMessageOverlay('🎬 変換中は再生モード切替できません');
            } else {
                updateMessageOverlay('🔄️ 再生中は変換モード切替できません');
            }
        }
        updateTrackButtonsVisibility();
    });

    // 🔘URLクリア
    urlClearBtn.addEventListener('click', () => {
        hideMessageOverlay();
        urlInput.value = '';
        urlInput.focus();
    });

    // ✅URL再生
    urlConfirmBtn.addEventListener('click', () => {
        urlInputEnter();
    });

    // 再生中メディアパス表示エリアクリック
    playlistPathArea.addEventListener('click', () => {
        if (!filterPanel) return;
        isFilterPanelVisible = !isFilterPanelVisible;
        filterPanel.style.display = isFilterPanelVisible ? 'flex' : 'none';
        
        if (isFilterPanelVisible) {
            hideEditPanel();
            zoomEndBtn.click();
            settingsCloseBtn.click();
            showControlsAndFilename(true);
            try { playlistFilterInput?.focus(); } catch (e) {}
            debouncedUpdateFilterList();
            debouncedScrollCurrentFilterItem();
        } else {
            showControlsAndFilename();
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
        currentVideoIndex = -1; // 停止状態を明示

        // 画像表示用タイマーを停止
        if (currentMediaType === 'image') {
            clearTimeout(imageTimer);
            imageTimer = null;
            stopImageProgress();

            // BGMを停止して再生位置を先頭に戻す
            if (!bgmAudio.paused) {
                bgmAudio.pause();
            }
            bgmAudio.currentTime = 0; // 停止時は巻き戻し
        }

        if (imageWrapper) {
            imageWrapper.style.display = 'none';
            imageWrapper.className = ''; // アニメーション・pausedクラス等をすべてクリア
        }

        // イメージ壁紙を非表示にする
        if (imageWallpaper) {
            imageWallpaper.style.display = 'none';
            imageWallpaper.removeAttribute('src'); // srcを利用している場合はクリア
            imageWallpaper.className = '';         // 必要に応じてクラスもクリア
        }

        // 3. srcを完全にクリア（これが大事！）
        videoPlayer.removeAttribute('src');     // ← これだけでOK
        videoPlayer.load();                     // src属性が無い状態でload → エラーにならない
        videoPreview.removeAttribute('src');
        videoPreview.load();
        imagePlayer.removeAttribute('src');
        localStorageSetItemAndFile('currentTime', 0);

        // 4. UI更新（停止状態を強制）
        playPauseBtn.textContent = '▶️';
        playPauseBtn.classList.add('paused-active');
        playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
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

    // ⏮️前ヘ
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

    // ⏪30秒戻る（画像の場合は先頭へ戻す）
    rewindBtn.addEventListener('click', () => {
        const duration = getMediaDuration();
        if (duration) {
            let newTime = getMediaCurrentTime() - 30;
            setMediaCurrentTime(newTime);
            updateMessageOverlay(`🕓 ${formatTime(getMediaCurrentTime())}`);
            showControlsAndFilename();
            updateIconOverlay();
        }
    });

    // ⏩30秒進む（画像の場合は末尾へ進み次のメディアへ）
    fastForwardBtn.addEventListener('click', () => {
        const duration = getMediaDuration();
        if (duration) {
            let newTime = getMediaCurrentTime() + 30;
            setMediaCurrentTime(newTime);
            updateMessageOverlay(`🕓 ${formatTime(getMediaCurrentTime())}`);
            showControlsAndFilename();
            updateIconOverlay();
        }
    });

    // ⏭️次へ
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
            bgmAudio.volume = videoPlayer.volume; // BGMも一緒に更新
            volumeBar.value = videoPlayer.volume;
            volumeMuteBtn.textContent = '🔊';
            volumeMuteBtn.classList.remove('muted-active');
            volumeMuteBtn.setAttribute('data-tooltip', 'ミュート（Ctrl+m）');
        } else {
            lastVolume = videoPlayer.volume;
            videoPlayer.volume = 0;
            bgmAudio.volume = 0; // BGMも一緒に更新
            volumeBar.value = 0;
            volumeMuteBtn.textContent = '🔇';
            volumeMuteBtn.classList.add('muted-active');
            volumeMuteBtn.setAttribute('data-tooltip', 'ミュート解除（Ctrl+m）');
        }
        updateVolumeDisplay();
        updateMessageOverlay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`);
        volumeMuteBtn.classList.toggle('muted-active', videoPlayer.volume === 0);
        localStorageSetItemAndFile('volume', videoPlayer.volume);
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
        const targetElement = getMediaElement();
        const currentFit = targetElement.style.objectFit || fitMode;

        if (currentFit === 'contain') {
            fitMode = 'cover';
        } else if (currentFit === 'cover') {
            fitMode = 'fill';
        } else {
            fitMode = 'contain';
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
        if (isPlaylistCreationInProgress) {
            showPlaylistProgress(false);
        }
        if (isFilterPanelVisible) debouncedUpdateFilterList();
        debouncedScrollCurrentFilterItem();
        
        // フィルタ条件入力時、履歴リストを更新して表示する
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
        if (isPlaylistCreationInProgress) {
            showPlaylistProgress(false);
        }
        try { playlistFilterInput?.focus(); } catch (e) {}
        if (isFilterPanelVisible) debouncedUpdateFilterList();
        debouncedScrollCurrentFilterItem();
        
        // フィルタ条件入力時、履歴リストを更新して表示する
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
                console.log('スナップショット完了');
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

    // 🔀自動シャッフル切替
    autoShuffleBtn.addEventListener('click', () => {
        toggleAutoShuffle();
    });

    // 🖼️背景壁紙選択
    wallpaperBtn.addEventListener('click', async () => {
        hideMessageOverlay();

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
            localStorageSetItemAndFile('wallpaperPath', videoContainer.style.backgroundImage);
            updateIconOverlay();
        } catch (e) {
            updateMessageOverlay('🖼️ 背景壁紙選択エラー', 6000);
            console.error('背景壁紙選択エラー:', e);
            updateIconOverlay();
        }
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
        targetContainer.appendChild(menu);

        const containerRect = targetContainer.getBoundingClientRect();
        const btnRect = audioMotionBtn.getBoundingClientRect();

        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;

        let left = btnRect.right - containerRect.left + 2;
        let top = btnRect.top - containerRect.top + 2;

        if (left + menuWidth > containerRect.width) {
            left = btnRect.left - containerRect.left - menuWidth - 2;
        }

        if (top + menuHeight > containerRect.height) {
            top = containerRect.height - menuHeight - 8;
        }

        menu.style.left = `${Math.max(8, left)}px`;
        menu.style.top = `${Math.max(8, top)}px`;

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

    // 💃イメージエフェクト＆BGM設定ボタン
    imageEffectBgmBtn.addEventListener('click', (event) => {
        event.stopPropagation();

        const existingMenu = document.querySelector('.image-effectbgm-menu');
        if (existingMenu) {
            existingMenu.remove();
            document.removeEventListener('click', closeMenu);
            return;
        }

        // メニュー非表示
        hideMenus();

        const targetContainer = document.fullscreenElement || mainContainer;
        const menu = createImageEffectBgmMenu();
        
        // 位置計算のために一度DOMに追加
        targetContainer.appendChild(menu);

        const containerRect = targetContainer.getBoundingClientRect();
        const btnRect = imageEffectBgmBtn.getBoundingClientRect();

        // メニューの実際の幅と高さを取得
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;

        // 基本位置：ボタンの右側・上揃え（コンテナ相対座標）
        let left = btnRect.right - containerRect.left + 2;
        let top = btnRect.top - containerRect.top + 2;

        // 右側にはみ出る場合 -> ボタンの左側に配置
        if (left + menuWidth > containerRect.width) {
            left = btnRect.left - containerRect.left - menuWidth - 2;
        }

        // 下側にはみ出る場合 -> ボタンの下端に寄せる（または画面内に収まるよう調整）
        if (top + menuHeight > containerRect.height) {
            top = containerRect.height - menuHeight - 8;
        }

        // 画面左端・上端からはみ出ないよう最小値を制御
        menu.style.left = `${Math.max(8, left)}px`;
        menu.style.top = `${Math.max(8, top)}px`;

        function closeMenu(ev) {
            if (!menu.contains(ev.target) && ev.target !== imageEffectBgmBtn) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        }

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    });

	// 曲終了時に次のBGMへ自動遷移する処理を追加
    bgmAudio.addEventListener('ended', async () => {
        if (Array.isArray(imageBgmPaths) && imageBgmPaths.length > 0) {
            // 次の曲のインデックスに加算（末尾まで行ったら 0 に戻るリストループ）
            currentBgmIndex = (currentBgmIndex + 1) % imageBgmPaths.length;
            await localStorageSetItemAndFile('currentBgmIndex', currentBgmIndex);
            
            // パス変更を検知させるため一度クリアして再生状態を更新
            currentLoadedBgmPath = null;
            await manageBgmState();

            // メニューが開いている場合は表示（演奏中の曲ファイル名）を即時更新
            const existingMenu = document.querySelector('.image-effectbgm-menu');
            if (existingMenu) {
                // 開いているポップアップがあれば事前に除去
                const existingPopup = existingMenu.querySelector('.bgm-popup-menu');
                if (existingPopup) {
                    existingPopup.remove();
                }

                // メニューコンテンツを再構築してラベルと再生アイコンを更新
                buildImageEffectBgmMenuContent(existingMenu);
            }
        }
    });
    
	// 👁️ コントロール制御ボタンのクリックイベント
	pauseShowBtn.addEventListener('click', async (event) => {
	    event.stopPropagation();
	    hideMessageOverlay();
	
	    // 既存の control-menu がある場合は閉じる（トグル表示）
	    const existingMenu = document.querySelector('.control-menu');
	    if (existingMenu) {
	        existingMenu.remove();
	        return;
	    }
	
        // メニュー非表示
        hideMenus();

        const targetContainer = document.fullscreenElement || mainContainer;
        const menu = createControlMenu();
	    document.body.appendChild(menu);
        const containerRect = targetContainer.getBoundingClientRect();
        const btnRect = pauseShowBtn.getBoundingClientRect();

        menu.style.left = `${Math.max(8, btnRect.right - containerRect.left + 2)}px`;
        menu.style.top = `${Math.max(8, btnRect.top - containerRect.top + 2)}px`;
	
	    updateIconOverlay();
	});

    // 🔝常に前面設定
    alwaysOnTopBtn.addEventListener('click', () => {
        toggleAlwaysOnTop();
    });

    // 🍥インポート・エクスポート
    importExportBtn.addEventListener('click', (event) => {
        event.stopPropagation();

        const existingMenu = document.querySelector('.import-export-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        hideMenus();

        const targetContainer = document.fullscreenElement || mainContainer;
        const menu = createImportExportMenu();
        const containerRect = targetContainer.getBoundingClientRect();
        const btnRect = importExportBtn.getBoundingClientRect();

        menu.style.left = `${Math.max(8, btnRect.right - containerRect.left + 2)}px`;
        menu.style.top = `${Math.max(8, btnRect.top - containerRect.top + 2)}px`;
        targetContainer.appendChild(menu);

        function closeMenu(ev) {
            if (!menu.contains(ev.target) && ev.target !== importExportBtn) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        }

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    });

    // ❌設定モード終了
    settingsCloseBtn.addEventListener('click', () => {
        toggleSettingsPanel(false);
    });

    // ❔ヘルプ（開く）イベントリスナー
    helpOpenBtn.addEventListener('click', openHelp);

    // ❌ヘルプ（閉じる）イベントリスナー
    helpCloseBtn.addEventListener('click', closeHelp);

    // ▶️メディア再生
    videoPlayer.addEventListener('play', () => {
        // メディアナビゲータ再生中設定
        navigator.mediaSession.playbackState = 'playing';
    });

    // ⏸️メディア一時停止
    videoPlayer.addEventListener('pause', () => {
        // メディアナビゲータ一時停止設定
        navigator.mediaSession.playbackState = 'paused';
    });

    // メディアメタデータ読み込み
    videoPlayer.addEventListener('loadedmetadata', async () => {
        // 変換ファイル削除
        if (isConverting) {
            // プレイリスト更新
            if (modeChange === 'convert') {
                const currentIndex = playlist.findIndex(item => item.file.path === baseConvertFile);
                if (currentIndex !== -1) {
                    // プレイリストの該当エントリを更新
                    playlist[currentIndex] = await createPlaylistItem(tempConvertFile);
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
    joinPlaylistBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        // 1. 既に表示されていれば閉じて終了
        const existingMenu = document.querySelector('.join-playlist-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        // 2. 他のメニューを掃除
        hideMenus();

        // 3. メニュー生成と配置
        const targetContainer = document.fullscreenElement || mainContainer;
        const menu = createJoinMenu();

        const containerRect = targetContainer.getBoundingClientRect();
        const btnRect = joinPlaylistBtn.getBoundingClientRect();

        menu.style.left = `${btnRect.left - containerRect.left}px`;
        menu.style.top  = `${btnRect.bottom - containerRect.top + 4}px`;

        targetContainer.appendChild(menu);

        // 4. 外側クリックで閉じる処理
        function closeMenu(ev) {
            // ボタン自体またはメニュー内部のクリックなら無視
            if (menu.contains(ev.target) || joinPlaylistBtn.contains(ev.target)) {
                return;
            }
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    });

    // 🎬メディアエラー（共通化・安全・モード対応）
    videoPlayer.addEventListener('error', (e) => {
        const error = videoPlayer.error;
        if (!error) return;

        if (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED &&
            error.message.includes('Empty src attribute')) {
            
            console.log('初期化時の空srcエラー（無視）');
            
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

        const currentFile = playlist[currentVideoIndex]?.file;
        if (!currentFile) {
            console.warn('src が空です');
            return;
        }

        const ext = currentFile.ext || '';

        // 共通関数で判定
        if (isVIDEO_EXTENSIONS(ext)) {
            stopPeriodicSave();
            playPauseBtn.textContent = '▶️';
            playPauseBtn.classList.add('paused-active');
            playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
            updateIconOverlay();

            // エラー内容に応じてメッセージを細かく分ける（任意）
            let errorMsg = '▶️ 再生エラー: ファイルが破損している可能性があります';
            if (videoPlayer.error) {
                switch (videoPlayer.error.code) {
                    case 1: errorMsg = '▶️ 再生がユーザーにより中止されました'; break;
                    case 2: errorMsg = '▶️ ネットワークエラーで読み込めません'; break;
                    case 3: errorMsg = '▶️ メディアのデコードに失敗しました（破損／コーデック非対応）'; break;
                    case 4: errorMsg = '▶️ このファイル形式は再生できません'; break;
                }
            }
            updateMessageOverlay(errorMsg, 6000);
        } else {
            // HTML5 でサポートされていない拡張子の場合も明確に伝える
            console.warn(`拡張子 ${ext} は HTML5 でサポートされていません`);
            updateMessageOverlay(`▶️ 再生エラー: ${ext} 形式は対応していません`, 6000);
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

    // メディア終了、次へ
    videoPlayer.addEventListener('ended', async () => {
        videoPlayer.currentTime = 0;
        localStorageSetItemAndFile('currentTime', 0);

        // 一時ファイル削除
        await deleteTempVideo();

        // 常にgetNextVideoIndex()を呼び、次があれば再生
        // （ランダムOFF・repeat 'none' でも次に進む）
        const nextIndex = getNextVideoIndex();
        if (nextIndex >= 0) {
            currentVideoIndex = nextIndex;
            await playVideo(playlist[currentVideoIndex].file, 0);
        } else {
            if (modeChange === 'convert') {
                seekBar.value = 0;
                updateMessageOverlay('🔄️ 変換完了');
            }
            currentVideoIndex = -1;  // 停止状態を明示
            playStopBtn.click(); // プレイリストの最後で停止
        }
        savePlaylistAndPlaybackState();

        showControlsAndFilename();
        updateIconOverlay();
    });

    // メディアクリック
    mediaContainer.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (event.ctrlKey) {
            playStopBtn.click();
        } else {
            playPauseBtn.click();
        }
    });

    // メディアダブルクリック
    mediaContainer.addEventListener('dblclick', (event) => {
        event.preventDefault();
        fullscreenBtn.click();
    });

    // マウス押下
    mediaContainer.addEventListener('mousedown', (event) => {
        if (event.button === 0) {
            hasMoved = false; // 移動フラグをリセット

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

    // マウス移動（ドラッグシーク）
    mediaContainer.addEventListener('mousemove', (event) => {
        // ズームモード時のパン（画像移動）
        if (isPanning) {
            const deltaX = event.clientX - panStartX;
            const deltaY = event.clientY - panStartY;
            
            // 閾値判定
            if (Math.hypot(event.clientX - panStartX, event.clientY - panStartY) > dragThreshold) {
                hasMoved = true;
            }

            panStartX = event.clientX;
            panStartY = event.clientY;
            translateX += deltaX;
            translateY += deltaY;
            const scale = (100 + zoomValue) / 100;
            
            // 画像の場合も imagePlayer 本体に transform を適用（親の imageWrapper のアニメーションと分離）
            const targetElement = (currentMediaType === 'image' && typeof imagePlayer !== 'undefined') ? imagePlayer : videoPlayer;
            targetElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            
            localStorageSetItemAndFile('translateX', translateX.toString());
            localStorageSetItemAndFile('translateY', translateY.toString());

            updateIconOverlay();
            return;
        }

        const duration = getMediaDuration();
        if (isDragging && duration) {
            // 押下位置からの総移動距離でマウス移動（ドラッグ）発生を判定
            const totalDistanceFromStart = Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY);
            if (totalDistanceFromStart > dragThreshold) {
                hasMoved = true;
            }

            const deltaX = event.clientX - dragStartX;
            const deltaY = event.clientY - dragStartY;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);

            if (absDeltaX > absDeltaY && absDeltaX > 5) {
                isVolumeDragging = false;
                const seekStep = duration / 1000;
                const seekTime = deltaX * seekStep * seekSensitivity;
                let newTime = getMediaCurrentTime() + seekTime;
                setMediaCurrentTime(newTime);
                updateMessageOverlay(`🕓 ${formatTime(getMediaCurrentTime())}`, 1000);
                darkOverlay.style.display = 'block';
            } else if (absDeltaY > absDeltaX && absDeltaY > 5) {
                isVolumeDragging = true;
                const newVolume = videoPlayer.volume - (deltaY * volumeStep);
                videoPlayer.volume = Math.max(0, Math.min(1, newVolume));
                volumeBar.value = videoPlayer.volume;
                bgmAudio.volume = videoPlayer.volume; // BGMも一緒に更新
                lastVolume = videoPlayer.volume;
                volumeMuteBtn.textContent = videoPlayer.volume === 0 ? '🔇' : '🔊';
                volumeMuteBtn.classList.toggle('muted-active', videoPlayer.volume === 0);
                volumeMuteBtn.setAttribute('data-tooltip', videoPlayer.volume === 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
                updateVolumeDisplay();
                updateMessageOverlay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`, 1000);
                localStorageSetItemAndFile('volume', videoPlayer.volume);
            }

            dragStartX = event.clientX;
            dragStartY = event.clientY;
            updateIconOverlay();
        } else {
            resetCursorTimer(true);
        }
    });

    // マウス解放
    mediaContainer.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            const wasDragging = isDragging;
            const wasVolumeDragging = isVolumeDragging;

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
        isPanning = false;
        updateIconOverlay();
    });

    // マウス左クリックで表示/非表示をトグル
    mediaContainer.addEventListener('click', (e) => {
        if (e.button === 0) {
            // ドラッグ中・ボリュームドラッグ中・一定ピクセル以上の移動がない純粋なクリック時のみ実行
            if (!isDragging && !isVolumeDragging && !hasMoved) {
                const isVisible = 
                    window.getComputedStyle(controls).opacity === '1' ||
                    window.getComputedStyle(filename).opacity === '1';
                if (isVisible) {
                    hideControlsAndFilename();
                    hideEditPanel();
                } else {
                    showControlsAndFilename(true);
                }
            }
            hideMenus();
            hideMessageOverlay();
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
            updateMessageOverlay(`🔍 ${newZoom > 0 ? '+' : ''}${newZoom}%`, 1000);

            return;  // ここで終了 → 音量調整には行かない
        }

        // 通常モード → 既存の音量調整
        const volumeStep = 0.01;
        if (event.deltaY < 0) {
            videoPlayer.volume = Math.min(1, videoPlayer.volume + volumeStep);
        } else if (event.deltaY > 0) {
            videoPlayer.volume = Math.max(0, videoPlayer.volume - volumeStep);
        }

        bgmAudio.volume = videoPlayer.volume; // BGMも一緒に更新
        volumeBar.value = videoPlayer.volume;
        lastVolume = videoPlayer.volume;
        volumeMuteBtn.textContent = videoPlayer.volume === 0 ? '🔇' : '🔊';
        volumeMuteBtn.classList.toggle('muted-active', videoPlayer.volume === 0);
        volumeMuteBtn.setAttribute('data-tooltip', videoPlayer.volume === 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
        updateVolumeDisplay();
        updateMessageOverlay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`, 1000);
        localStorageSetItemAndFile('volume', videoPlayer.volume);
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
        updateMessageOverlay(`🕓 ${formatTime(time)}`);
    });

    // カット編集シークバー スライダー変更
    editSeekBar.addEventListener('change', () => {
        if (filename.style.opacity !== '1') return;
        if (!videoPlayer.duration) return;
        // 最後にユーザーがセットした値を優先して使う
        updateTimeDisplay();                       // 正しい時間で更新
        localStorageSetItemAndFile('currentTime', videoPlayer.currentTime);
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
        // 動画以外（音声ファイル等）の場合はプレビューを表示しない
        const ext = playlist[currentVideoIndex]?.file?.ext || '';
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
        const duration = getMediaDuration();
        if (!duration) return;

        const time = duration * (seekBar.value / 100);
        setMediaCurrentTime(time);
    
        if (currentMediaType !== 'image') {
            videoPreview.currentTime = time;
        }
    
        if ((isEditMode || (typeof editPanel !== 'undefined' && editPanel && window.getComputedStyle(editPanel).display !== 'none')) && typeof editSeekBar !== 'undefined' && editSeekBar) {
            editSeekBar.value = (time / duration) * 100;
        }
        updateMessageOverlay(`🕓 ${formatTime(time)}`);
    });

    // シークバー スライダー変更
    seekBar.addEventListener('change', () => {
        if (controls.style.opacity !== '1') return;
        const duration = getMediaDuration();
        if (!duration) return;
        
        updateTimeDisplay();
        localStorageSetItemAndFile('currentTime', getMediaCurrentTime());
    });

    // シークバー マウスクリック
    seekBar.addEventListener('mousedown', (e) => {
        if (controls.style.opacity !== '1') return;
        
        const duration = getMediaDuration();
        if (e.button === 0 && duration) {
            // クリック位置から時間を直接計算
            const rect = seekBar.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const time = duration * percent;

            if (currentMediaType !== 'image') {
                // videoPreview ではなく、計算した time をメディアに適用
                setMediaCurrentTime(time);
                if (currentMediaType === 'video' && videoPreview) {
                    videoPreview.currentTime = time;
                }
            }

            isDragging = true;
            isSeekDragging = true;
            darkOverlay.style.display = 'block';
            if (typeof editSeekBar !== 'undefined' && editSeekBar) {
                editSeekBar.value = seekBar.value;
            }
        }
    });

    // シークバー マウスオーバー
    seekBar.addEventListener('mouseover', (e) => {
        if (controls.style.opacity !== '1') return;
        const duration = getMediaDuration();
        if (!duration || playlist.length === 0) return;
        
        isMouseOverSeekBar = true;
        const ext = playlist[currentVideoIndex]?.file?.ext || '';
        if (!isVideoFile(ext)) return;
        videoPreview.style.display = 'block';
        updatePreviewPosition(e);
    });

    // シークバー マウス移動
    seekBar.addEventListener('mousemove', (e) => {
        if (controls.style.opacity !== '1') return;
        const duration = getMediaDuration();
        if (!duration || !isMouseOverSeekBar) return;
        
        const rect = seekBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = duration * percent;
    
        if (currentMediaType === 'video') {
            videoPreview.currentTime = time;
            updatePreviewPosition(e);
        }
    
        if (!isSeekDragging) {
            seekBar.value = percent * 100;
            updateTimeDisplay();
        } else {
            setMediaCurrentTime(time);
            if (typeof editSeekBar !== 'undefined' && editSeekBar) {
                editSeekBar.value = seekBar.value;
            }
        }
    });

    // シークバー マウスアウト
    seekBar.addEventListener('mouseout', () => {
        if (controls.style.opacity !== '1') return;
        
        isMouseOverSeekBar = false;
        videoPreview.style.display = 'none';
    
        const duration = getMediaDuration();
        if (!isSeekDragging && duration) {
            const value = (100 / duration) * getMediaCurrentTime();
            seekBar.value = value;
            if (typeof editSeekBar !== 'undefined' && editSeekBar) {
                editSeekBar.value = seekBar.value;
            }
            updateTimeDisplay();
        }
    });

    // シークバー マウスリーブ
    seekBar.addEventListener('mouseleave', () => {
        if (controls.style.opacity !== '1') return;
        
        if (isSeekDragging && !seekBar.matches(':active')) {
            if (typeof editSeekBar !== 'undefined' && editSeekBar) {
                editSeekBar.value = seekBar.value;
            }
            isSeekDragging = false;
            darkOverlay.style.display = 'none';
        }
    });

    // 音量バー入力
    volumeBar.addEventListener('input', () => {
        if (controls.style.opacity !== '1') return;
        videoPlayer.volume = volumeBar.value;
        bgmAudio.volume = videoPlayer.volume; // BGMも一緒に更新
        lastVolume = videoPlayer.volume;
        volumeMuteBtn.textContent = videoPlayer.volume === 0 ? '🔇' : '🔊';
        volumeMuteBtn.classList.toggle('muted-active', videoPlayer.volume === 0);
        volumeMuteBtn.setAttribute('data-tooltip', videoPlayer.volume === 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
        updateVolumeDisplay();
        updateMessageOverlay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`);
        localStorageSetItemAndFile('volume', videoPlayer.volume);
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
                updateMessageOverlay(`${volume === 0 ? '🔇' : '🔊'} ${volumePercent}%`);
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
                hideMessageOverlay();
            }
            updateIconOverlay();
        }
    });

    // 再生速度セレクト
    speedSelect.addEventListener('change', (e) => {
        if (controls.style.opacity !== '1') return;
        const rate = parseFloat(e.target.value);
        if (!isNaN(rate) && rate > 0) {
            setPlaybackRate(rate);
        }
    });

    // コントロールマウスオーバー
    controls.addEventListener('mouseover', () => {
        disableAutoHideControls();
    });

    // コントロールマウスリーブ
    controls.addEventListener('mouseleave', () => {
        enableAutoHideControls();
    });

    // ファイル名マウスオーバー
    filename.addEventListener('mouseover', () => {
        disableAutoHideControls();
    });

    // ファイル名マウスリーブ
    filename.addEventListener('mouseleave', () => {
        enableAutoHideControls();
    });

    // 📩並び替えボタンクリックイベント（トグル実装）
    sortPlaylistBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        const existingMenu = document.querySelector('.sort-playlist-menu');
        if (existingMenu) {
            existingMenu.remove();
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

        function closeMenu(ev) {
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

    // 🔼上へボタン
    upMovePlaylistBtn.addEventListener('click', () => {
        clearPlaylistFilter();
        upMovePlaylist();
    });

    // 🔽下へボタン
    downMovePlaylistBtn.addEventListener('click', () => {
        clearPlaylistFilter();
        downMovePlaylist();
    });

    // ＋追加ボタン
    addPlaylistBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        clearPlaylistFilter();
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
        clearPlaylistFilter();
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

        const fullPaths = [];
        for (const file of files) {
            try {
                const fullPath = await getFilePath(file); // ← preloadで公開済み
                if (fullPath) fullPaths.push(fullPath);
            } catch (err) {
                console.error('getFilePath失敗:', err);
            }
        }

        const settingsPath = fullPaths.find(filePath => SETTINGS_FILE_REGEX.test(filePath));
        if (settingsPath) {
    			dropImportSettingsFromFile(settingsPath);
		} else {
            // Ctrlキー（MacのCmdキー含む）が押されているか判定
            const isAppend = e.ctrlKey || e.metaKey;
            const actionText = isAppend ? '追加' : '作成';
            updateMessageOverlay(`📚 プレイリスト${actionText}中...`, 0, false);
            
            if (fullPaths.length > 0) {
	            // isAppend フラグを渡す
	            await addFilesFromPaths(fullPaths, isAppend);
	        }
		}
        hideMessageOverlay(true);
    });

    // ✂️編集モード切替
    editModeBtn.addEventListener('click', () => {
        if (playlist.length === 0) {
            updateMessageOverlay('✂️ プレイリストが空です');
            return;
        }
        
	    // 再生中メディアの拡張子判定処理を追加
	    const currentFile = playlist[currentVideoIndex];
	    if (currentFile && currentFile.file && currentFile.file.path) {
            const ext = currentFile.file.ext || '';
	        const isVideo = VIDEO_EXTENSIONS.includes(ext);
	        const isAudio = AUDIO_EXTENSIONS.includes(ext);
	
	        if (!isVideo && !isAudio) {
	            updateMessageOverlay('✂️ 動画・音声以外はカット編集できません');
	            return;
	        }
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
        hideMessageOverlay();
        // ボタン表示を更新（ここが今回のメイン変更点）
        updateEditModeButtonUI();
    });

    // ❌カット中断
    cutCancelBtn.addEventListener('click', async () => {
        try {
            if (isCutEditing) {
                await cancelCut();
                updateMessageOverlay('✂️ カット中断しました');
            } else if (isJoinEditing) {
                await cancelJoin();
                updateMessageOverlay('🎞️ 結合中断しました');
            }
        } catch (e) {
            if (isCutEditing) {
                console.error('cancel-cut failed:', e);
                updateMessageOverlay('✂️ カット中断に失敗しました', 6000);
            } else if (isJoinEditing) {
                console.error('cancel-join failed:', e);
                updateMessageOverlay('🎞️ 結合中断に失敗しました', 6000);
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
            updateMessageOverlay('✂️ INマークとOUTマークを両方設定してください');
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

	// 💾カット保存（動画・音声対応）
	saveVideoBtn.addEventListener('click', async () => {
	    if (!videoPlayer.src) {
	        updateMessageOverlay('✂️ メディアが読み込まれていません');
	        return;
	    }
	    if (!cutRanges || cutRanges.length === 0) {
	        updateMessageOverlay('✂️ 保存するためのカット範囲が設定されていません');
	        return;
	    }
	
	    try {
	        const currentFile = playlist[currentVideoIndex];
	        if (!currentFile) return;
	
            const fileName = currentFile.file.name;
            const baseNameWithoutExt = path.parse(fileName).name;
            const ext = currentFile.file.ext;
	        const defaultOutName = `${baseNameWithoutExt}_trimmed${ext}`;
	
	        // 保存ダイアログ表示
	        const saveResult = await showSaveCutDialog({ 
	            fileName: defaultOutName,
	            ext: ext
	        });
	        if (saveResult.canceled) {
	            hideMessageOverlay();
	            return;
	        }
	
	        isCutEditing = true;
	        updateMessageOverlay('✂️ カット中… 0%', 0);
	
	        // フレーム・秒単位のレンジ調整
	        const alignedRanges = (cutRanges || []).map(r => {
	            const startFrame = Math.round(r.in * editFrameRate);
	            const endFrame = Math.round(r.out * editFrameRate);
	            const start = startFrame / editFrameRate;
	            const end = endFrame / editFrameRate;
	            return { in: start, out: end };
	        });
	
	        const requestedMode = window.currentEditMode || 'copy';
	
	        // メインプロセスで動画/音声を自動判定して処理
	        const result = await cutVideoMultiple({
	            inputPath: currentFile.file.path,
	            ranges: alignedRanges,
	            outputPath: saveResult.filePath,
	            frameRate: editFrameRate,
	            mode: requestedMode
	        });
	
	        if (!result || !result.outputPath) {
	            updateMessageOverlay('✂️ 中断または失敗しました', 6000);
	            console.log('カット編集中断またはエラー');
	        } else {
	            const { outputPath, mode, isAudio } = result;
	            const modeText = mode === 'reencode' ? '精細モード' : '高速モード';
	            const mediaType = isAudio ? '音声' : '動画';
	
	            updateMessageOverlay(`✂️ ${mediaType}保存完了（${modeText}）`);
	            console.log(`${mediaType}カット編集完了（${modeText}）:`, outputPath);
	        }
	    } catch (err) {
	        console.error('カット処理エラー:', err);
	        updateMessageOverlay(`✂️ カット失敗: ${err.message}`, 6000);
	    } finally {
	        isCutEditing = false;
	        cutCancelBtn.style.display = 'none';
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

	// センターコントロールのクリックイベント
	centerPrevBtn.addEventListener('click', () => {
	    if (prevVideoBtn) prevVideoBtn.click();
	});
	centerPlayPauseBtn.addEventListener('click', () => {
	    if (playPauseBtn) playPauseBtn.click();
	});
	centerNextBtn.addEventListener('click', () => {
	    if (nextVideoBtn) nextVideoBtn.click();
	});
	
	// センターコントロールのマウスオーバーイベント
	centerPrevBtn.addEventListener('mouseover', () => {
	    disableAutoHideControls();
	});
	centerPlayPauseBtn.addEventListener('mouseover', () => {
	    disableAutoHideControls();
	});
	centerNextBtn.addEventListener('mouseover', () => {
	    disableAutoHideControls();
	});

	// センターコントロールのマウスリーブイベント
	centerPrevBtn.addEventListener('mouseleave', () => {
	    enableAutoHideControls();
	});
	centerPlayPauseBtn.addEventListener('mouseleave', () => {
	    enableAutoHideControls();
	});
	centerNextBtn.addEventListener('mouseleave', () => {
	    enableAutoHideControls();
	});

    Initializing = false;
});

// ショートカットキー（イベントリスナー）
document.addEventListener('keydown', async (event) => {
    // メディアURL入力中はショートカット無効
    if (document.activeElement === urlInput) {  
        // メディアURLクリア（Escape）
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

    // ■🌐ネットURL表示■
    if (urlInput.style.display === 'inline-block' && urlInput === document.activeElement) {
        // 🔘ネットUrl入力クリア（Shift+C）
        if (event.shiftKey && event.key.toLowerCase() === 'c') {
            event.preventDefault();
            urlClearBtn.click();
            return;
        }

        // ✅ネットUrl入力確定（Enter）
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
        // 🖼️背景壁紙選択（Ctrl+p）
        if (event.ctrlKey && event.key === 'p') {
            event.preventDefault();
            wallpaperBtn.click();
            return;
        }

        // 🏳️‍🌈オーディオモーション設定（Ctrl+m）
        if (event.ctrlKey && event.key === 'm') {
            event.preventDefault();
            audioMotionBtn.click();
            return;
        }

        // 💃イメージエフェクト＆BGM設定（Ctrl+b）
        if (event.ctrlKey && event.key === 'b') {
            event.preventDefault();
            imageEffectBgmBtn.click();
            return;
        }

        // 🔀自動シャッフル設定（Ctrl+w）
        if (event.ctrlKey && event.key === 'w') {
            event.preventDefault();
            autoShuffleBtn.click();
            return;
        }

        // 👁️コントロール表示抑止（Ctrl+y）
        if (event.ctrlKey && event.key === 'y') {
            event.preventDefault();
            pauseShowBtn.click();
            return;
        }

        // 🖥️フルスクリーン表示（Ctrl+a）
        if (event.ctrlKey && event.key === 'a') {
            event.preventDefault();
            fullscreenBtn.click();
            return;
        }

        // 🔝常に最前面（Ctrl+1）
        if (event.ctrlKey && event.key === '1') {
            event.preventDefault();
            alwaysOnTopBtn.click();
            return;
        }

        // 📥設定インポート（Ctrl+i）
        if (event.ctrlKey && event.key === 'i') {
            event.preventDefault();
            await importSettingsFromFile();
            return;
        }

        // 📤設定エクスポート（Ctrl+o）
        if (event.ctrlKey && event.key === 'o') {
            event.preventDefault();
            await exportSettingsToFile();
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

        // 🔼前再生（shift+p）
        if (event.shiftKey && event.key.toLowerCase() === 'p') {
            if (playlist.length > 1) {
                event.preventDefault();
                upMovePlaylistBtn.click();
                return;
            }
        }
        
        // 🔽次再生（shift+n）
        if (event.shiftKey && event.key.toLowerCase() === 'n') {
            if (playlist.length > 1) {
                event.preventDefault();
                downMovePlaylistBtn.click();
                return;
            }
        }
    
        // ＋メディア追加（shift+a）
        if (event.shiftKey && event.key.toLowerCase() === 'a') {
            event.preventDefault();
            addPlaylistBtn.click();
            return;
        }
        
        // －メディア削除（shift+d）
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
        
        // 💾プレイリスト保存（shift+s）
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
        playlistPathArea.click();
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
    // 🌐ネットURL入力（Ctrl+n）
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

    // 先頭再生（Home）
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

    // ⏮️前へ（PgUp）
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

    // ⏭️次へ（PgDw）
    if (event.key === 'PageDown' && playlist.length > 0) {
        event.preventDefault();
        nextVideoBtn.click();
        return;
    }
    
    // 最終再生（End）
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
        bgmAudio.volume = videoPlayer.volume; // BGMも一緒に更新
        volumeBar.value = videoPlayer.volume;
        lastVolume = videoPlayer.volume;
        volumeMuteBtn.textContent = videoPlayer.volume === 0 ? '🔇' : '🔊';
        volumeMuteBtn.setAttribute('data-tooltip', videoPlayer.volume === 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
        updateVolumeDisplay();
        updateMessageOverlay(`${videoPlayer.volume === 0 ? '🔇' : '🔊'} ${Math.round(videoPlayer.volume * 100)}%`);
        localStorageSetItemAndFile('volume', videoPlayer.volume);
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

        const duration = videoPlayer.duration;
        if (duration && !isNaN(duration) && duration > 0) {
            const editPanelExist = typeof editPanel !== 'undefined' && editPanel;
            const editVisible = editPanelExist && window.getComputedStyle(editPanel).display !== 'none';
            const zoomModeActive = typeof isZoomMode !== 'undefined' && isZoomMode === true;

            // フレーム単位シークが必要か？
            const needsFrameStep = isEditMode || editVisible || zoomModeActive;
            const frameRate = (typeof editFrameRate === 'number' && editFrameRate > 0) ? editFrameRate : 30;
            const stepSeconds = needsFrameStep ? (1 / frameRate) : 5;
            const delta = event.key === 'ArrowLeft' ? -stepSeconds : stepSeconds;
            let newTime = videoPlayer.currentTime + delta;

            // 終端は duration よりほんの僅かに手前に制限（微小な数値を引くことで ended 発火等による挙動不審を防ぐ）
            const maxTime = Math.max(0, duration - 0.1);
            newTime = Math.max(0, Math.min(maxTime, newTime));
            videoPlayer.currentTime = newTime;
            
            // シークバー同期（0〜100%にクランプ）
            const percent = Math.max(0, Math.min(100, (newTime / duration) * 100));
            seekBar.value = percent;

            // 編集用シークバー同期（編集モードまたはズームモード時も含む）
            if (needsFrameStep && typeof editSeekBar !== 'undefined' && editSeekBar) {
                editSeekBar.value = percent;
            }

            updateTimeDisplay();

            if (needsFrameStep) {
                const frameNum = Math.round(newTime * frameRate);
                updateMessageOverlay(`🕓 ${formatTime(newTime)} (${frameNum}f)`);
            } else {
                updateMessageOverlay(`🕓 ${formatTime(newTime)}`);
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
        
        // 単一クリックで mousemove が走らなかった場合でも、現在の seekBar.value から再生位置を確定する処理
        const duration = getMediaDuration();
        if (duration) {
            const time = duration * (seekBar.value / 100);
            setMediaCurrentTime(time);
        }

        isSeekDragging = false;
        isDragging = false;
        darkOverlay.style.display = 'none';
        hideMessageOverlay();

        const ext = playlist[currentVideoIndex]?.file?.ext || '';
        if (isMouseOverSeekBar && isVideoFile(ext)) {
            videoPreview.style.display = 'block';
        }
    }

    if (isEditSeekDragging) {
        if (filename.style.opacity !== '1') return;
        isEditSeekDragging = false;
        isDragging = false;
        darkOverlay.style.display = 'none';
        hideMessageOverlay();
        const ext = playlist[currentVideoIndex]?.file?.ext || '';
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
    localStorageSetItemAndFile('controlSizeX', controlSizeX);
    localStorageSetItemAndFile('controlSizeY', controlSizeY);
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
ipcRenderer.on('auto-play-files', async (event, videoFiles) => {
    if (!Array.isArray(videoFiles) || videoFiles.length === 0) return;

    const runAutoPlay = async () => {
        try {
            await playlistSet(videoFiles);
            debouncedUpdateFilterList();
            debouncedScrollCurrentFilterItem();
            hideMessageOverlay(true);
        } catch (err) {
            console.error('プレイリスト設定エラー:', err);
        }
    };

    // did-finish-load 後に送信されるため、DOM読み込みは通常完了しています
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAutoPlay, { once: true });
    } else {
        await runAutoPlay();
    }
});

// main.js からの起動時設定インポート指示を受信
ipcRenderer.on('auto-import-settings', async (event, filePath) => {
    if (!filePath) return;

    const runAutoImport = async () => {
        await importSettingsFromFile(filePath, true);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAutoImport, { once: true });
    } else {
        await runAutoImport();
    }
});

// 変換進捗受信
ipcRenderer.on('convert-progress', (e, { percent, step }) => {
    let playlisyCount = playlist.length;
    let playlisyCurrent = currentVideoIndex;
    if (modeChange === 'video') {
        playlisyCount = 1;
        playlisyCurrent = 0;
    }

    if (step === 1) {
        if (isRepeatPlayMode === 'single') {
            updateMessageOverlay(`🔄️ 変換中…（1/1） ${Math.round(percent)}%`, 0);
        } else {
            updateMessageOverlay(`🔄️ 変換中…（${playlisyCurrent + 1}/${playlisyCount}） ${Math.round(percent)}%`, 0);
        }
    }
    // シークバーに進捗を表示
    let totalPercent = ((playlisyCurrent * 100) + percent) / (playlisyCount * 100) * 100;
    if (isRepeatPlayMode === 'single') {
        totalPercent = percent;
    }
    seekBar.value = totalPercent;
});

// 字幕ファイル出力開始
ipcRenderer.on('subtitle-extraction-progress', (e, data) => {
    let playlisyCount = playlist.length;
    let playlisyCurrent = currentVideoIndex;
    if (modeChange === 'video') {
        playlisyCount = 1;
        playlisyCurrent = 0;
    }

    updateMessageOverlay(`🔄️ 字幕作成中…（${playlisyCurrent + 1}/${playlisyCount}） 100%（${data.subtitleIndex}/${data.subtitleCount}）`, 0);
});

// 変換エラー
ipcRenderer.on('convert-error', (event, msg) => {
    console.error("変換失敗:", err);
    isConverting = false;
    updateMessageOverlay(`🔄️ 変換失敗`, 6000);
    playlistPathArea.value = appNameAndCopyrightValueLine;
    updateIconOverlay();
});

// カット進捗受信（ 詳細ペイロード対応）
ipcRenderer.on('cut-progress', (event, payload) => {
    try {
        const stage = payload && payload.stage ? payload.stage : 'progress';
        switch (stage) {
            case 'start':
                updateMessageOverlay(`✂️ カット準備中…`, 0);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'extract-start':
                updateMessageOverlay(`✂️ カット開始 ${payload.index + 1}/${payload.total} ${formatTime(payload.segStart)} - ${formatTime(payload.segEnd)}`, 0);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'extract-done':
                updateMessageOverlay(`✂️ カット済 ${payload.index + 1}/${payload.total} (${Math.round(payload.percent)}%)`, 0);
                break;
            case 'concat-start':
                updateMessageOverlay(`✂️ 結合中…`, 0);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'concat-done':
                updateMessageOverlay(`✂️ 結合完了`);
                cutCancelBtn.style.display = 'none';
                break;
            case 'reencode':
                const p = payload.percent !== undefined ? Math.round(payload.percent) : 0;
                const fm = payload.frames !== undefined ? `${payload.frames}f` : '';
                const tm = payload.timemark ? ` [${payload.timemark}]` : '';
                updateMessageOverlay(`✂️ カット中… ${p}% ${fm}${tm}`, 0);
                cutCancelBtn.style.display = 'inline-block';
                break;
            case 'done':
                isCutEditing = false;
                updateMessageOverlay(`✂️ 保存完了`);
                cutCancelBtn.style.display = 'none';
                break;
            case 'error':
                isCutEditing = false;
                updateMessageOverlay(`✂️ カット失敗: ${payload.message || 'エラー'}`, 6000);
                cutCancelBtn.style.display = 'none';
                break;
            default:
                // 旧スタイル or unknown
                const percent = payload && payload.percent ? Math.round(payload.percent) : 0;
                updateMessageOverlay(`✂️ カット中… ${percent}%`, 0);
                break;
        }
    } catch (e) {
        updateMessageOverlay('✂️ カット処理中…', 0);
    }
});

// 結合進捗受信（詳細ペイロード対応）
ipcRenderer.on('join-progress', (event, payload) => {
    try {
        const stage = payload && payload.stage ? payload.stage : 'progress';
        switch (stage) {
            case 'join-prepare':
                updateMessageOverlay(`🎞️ 変換中…`, 0);
                break;
            case 'convert-pre':
                const convPercent = Math.round(payload.percent);
                if (isRepeatPlayMode === 'single') {
                    updateMessageOverlay(`🎞️ 変換中… （1/1） ${convPercent}%`, 0);
                } else {
                    updateMessageOverlay(`🎞️ 変換中… （${payload.currentFile}/${payload.totalFiles}） ${convPercent}%`, 0);
                }
                break;
            case 'join-start':
                updateMessageOverlay('🎞️ 結合開始…', 0);
                break;
            case 'join':
                updateMessageOverlay(`🎞️ 結合中…`, 0);
                break;
            case 'join-done':
                updateMessageOverlay('🎞️ 結合完了');
                break;
        }
    } catch (e) {
        updateMessageOverlay('🎞️ 変換エラー', 6000);
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
    importExportBtn = document.getElementById('importExportBtn');
    alwaysOnTopBtn = document.getElementById('alwaysOnTopBtn');
    audioMotionBtn = document.getElementById('audioMotionBtn');
    imageEffectBgmBtn = document.getElementById('imageEffectBgmBtn');
    autoShuffleBtn = document.getElementById('autoShuffleBtn');
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
    playlistProgressBar = document.getElementById('playlistProgressBar');
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
    imagePlayer = document.getElementById('imagePlayer');
    imageWrapper = document.getElementById('imageWrapper');
    centerControls = document.getElementById('centerControls');
    centerPrevBtn = document.getElementById('centerPrevBtn');
    centerPlayPauseBtn = document.getElementById('centerPlayPauseBtn');
    centerNextBtn = document.getElementById('centerNextBtn');
    imageWallpaper = document.getElementById('imageWallpaper');
    imageWallpaperImg = document.getElementById('imageWallpaperImg');
}

// ユーザーフォルダ内の設定ファイルパスを取得
function getUserSettingsPath() {
    // os.homedir() を使用してユーザーフォルダ直下のパスを生成
    return path.join(os.homedir(), 'xPlayerSettings.xpj');
}

// 多重起動判定ヘルパー
async function checkInstance() {
    if (typeof checkIsSecondaryInstance === 'function') {
        return await checkIsSecondaryInstance();
    }
    return false; // 万が一取得できない場合は初回起動扱い
}

// 多重起動時の localStorage 書き込み防止処理
async function setupLocalStorageProtection() {
    if (isSecondary) {
        console.warn('⚠️ 多重起動を検知しました。localStorage への書き込みを無効化します。');

        // 原型のメソッドを保持
        const originalSetItem = localStorage.setItem.bind(localStorage);
        const originalClear = localStorage.clear.bind(localStorage);
        const originalRemoveItem = localStorage.removeItem.bind(localStorage);

        // setItem をガード
        localStorage.setItem = function (key, value) {
            console.log(`[多重起動ガード] setItem スキップ: ${key}`);
            // 何もせず書き込みをスキップ
        };

        // clear をガード
        localStorage.clear = function () {
            console.log('[多重起動ガード] clear スキップ');
        };

        // removeItem をガード
        localStorage.removeItem = function (key) {
            console.log(`[多重起動ガード] removeItem スキップ: ${key}`);
        };
    }
}

// localStorage から復元 (非同期化)
async function allLocalStorageSetting() {
    if (!isSecondary) {
        // --- 初回起動時 ---
        appNameAndCopyright.textContent = appNameAndCopyrightValue;
        // 先に AUDIOMOTION_NODES を復元・初期化
        loadAudioMotionOptions();
        loadAudioMotionNodes();

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
        savedAutoShuffle = localStorage.getItem('autoShuffle');
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
        savedPauseShowControls = localStorage.getItem('pauseShowControls');
        savedHideCenterControls = localStorage.getItem('hideCenterControls');
        savedAudioMotionMode = localStorage.getItem('audioMotionMode');
        savedImageEffectBgmMode = localStorage.getItem('imageEffectBgmMode');
        savedIsImageWallpaperEnabled = localStorage.getItem('isImageWallpaperEnabled');
        savedFilterHistory = localStorage.getItem('filterHistory');
        savedOriginalOrder = localStorage.getItem('originalLoadOrder');
        savedAudioMotionOptions = localStorage.getItem('audioMotionOptions');
        savedAudioMotionNodes = localStorage.getItem('audioMotionNodes');
        savedImageBgmPaths = localStorage.getItem('imageBgmPaths');
        savedCurrentBgmIndex = localStorage.getItem('currentBgmIndex');
        savedMaxImageCacheSize = localStorage.getItem('maxImageCacheSize');
        savedMaxMediaCacheSize = localStorage.getItem('maxMediaCacheSize');
        // 2. 取得情報をユーザーフォルダの xPlayerSettings.xpj に保存
        await exportSettingsToFile(settingsFilePath);
    } else {
        // --- 多重起動時 ---
        appNameAndCopyright.textContent = `🚫${appNameAndCopyrightValue}`;

        // pid（プロセスID）を取得して個別の設定ファイルパスを生成
        const pidSettingsFilePath = settingsFilePath.replace(/\.xpj$/, `_${pid}.xpj`);

        // xPlayerSettings_(pid).json の存在確認
        let hasPidFile = false;
        try {
            await fs.access(pidSettingsFilePath);
            hasPidFile = true;
        } catch {
            hasPidFile = false;
        }
        forceStop = !hasPidFile;

        let loadedSettings = null;
        if (hasPidFile) {
            // 手動インポート：importSettingsFromFile(xPlayerSettings_(pid).json) で実行
            loadedSettings = await importSettingsFromFile(pidSettingsFilePath);
            // xPlayerSettings_(pid).json を削除
            try {
                await fs.unlink(pidSettingsFilePath);
            } catch (e) {
                console.error(`ファイル削除失敗 (${pidSettingsFilePath}):`, e);
            }
        } else {
            // 自動インポート：importSettingsFromFile(xPlayerSettings.json) で実行
            loadedSettings = await importSettingsFromFile(settingsFilePath);
        }

        // 戻り値（importSettingsFromFile の設定オブジェクト）→ 各 saved変数
        if (loadedSettings) {
            // 安全な値取得ヘルパー
            // loadedSettings に値があれば採用し、無ければ現在のメモリ変数(currentVal)を維持、それも無ければ defaultValue
            const getVal = (key, currentVal, defaultValue = null) => {
                if (loadedSettings[key] !== undefined && loadedSettings[key] !== null) {
                    return loadedSettings[key];
                }
                if (currentVal !== undefined && currentVal !== null) {
                    return currentVal;
                }
                return defaultValue;
            };

            // 各変数への代入（現在保持している変数値自体を第2引数に渡して保護）
            savedVolume = getVal('volume', savedVolume, '1.0');
            savedPlaybackSpeed = getVal('playbackSpeed', savedPlaybackSpeed, '1.0');
            savedPlaylist = getVal('playlist', savedPlaylist);
            savedCurrentVideoIndex = getVal('currentVideoIndex', savedCurrentVideoIndex, '0');
            savedCurrentTime = getVal('currentTime', savedCurrentTime, '0');
            savedFitMode = getVal('fitMode', savedFitMode, 'contain');
            savedZoom = getVal('zoom', savedZoom, '1.0');
            savedTranslateX = getVal('translateX', savedTranslateX, '0');
            savedTranslateY = getVal('translateY', savedTranslateY, '0');
            savedEditFrameRate = getVal('editFrameRate', savedEditFrameRate, '30');
            const rawRandomMode = getVal('isRandomPlayMode', savedIsRandomPlayMode, 'false');
            savedIsRandomPlayMode = String(rawRandomMode); // true (boolean) を "true" (string) に変換            
            savedIsRepeatPlayMode = getVal('isRepeatPlayMode', savedIsRepeatPlayMode, 'none');
            const rawAutoShuffle = getVal('autoShuffle', savedAutoShuffle, 'true');
            savedAutoShuffle = String(rawAutoShuffle);
            savedShuffleOrder = getVal('shuffleOrder', savedShuffleOrder);
            savedShufflePosition = getVal('shufflePosition', savedShufflePosition, '0');
            savedAspectRatio = getVal('aspectRatio', savedAspectRatio, 'none');
            savedCurrentSortMode = getVal('playlistSortMode', savedCurrentSortMode, 'none');
            savedPlaylistDisplayMode = getVal('playlistDisplayMode', savedPlaylistDisplayMode, 'normal');
            savedSelectedAudioLabel = getVal('selectedAudioLabel', savedSelectedAudioLabel);
            savedSelectedAudioTrack = getVal('selectedAudioTrack', savedSelectedAudioTrack);
            savedSelectedSubtitleLabel = getVal('selectedSubtitleLabel', savedSelectedSubtitleLabel);
            savedSelectedSubtitleTrack = getVal('selectedSubtitleTrack', savedSelectedSubtitleTrack);
            savedWallpaperPath = getVal('wallpaperPath', savedWallpaperPath);
            const rawAlwaysOnTop = getVal('alwaysOnTop', savedAlwaysOnTop, 'false');
            savedAlwaysOnTop = String(rawAlwaysOnTop);
            const rawPauseShowControls = getVal('pauseShowControls', savedPauseShowControls, 'false');
            savedPauseShowControls = String(rawPauseShowControls);
            const rawHideCenterControls = getVal('hideCenterControls', savedHideCenterControls, 'false');
            savedHideCenterControls = String(rawHideCenterControls);
            savedAudioMotionMode = getVal('audioMotionMode', savedAudioMotionMode);
            savedImageEffectBgmMode = getVal('imageEffectBgmMode', savedImageEffectBgmMode);
            savedIsImageWallpaperEnabled = getVal('isImageWallpaperEnabled', savedIsImageWallpaperEnabled);
            savedFilterHistory = getVal('filterHistory', savedFilterHistory);
            savedOriginalOrder = getVal('originalLoadOrder', savedOriginalOrder);
            savedAudioMotionOptions = getVal('audioMotionOptions', savedAudioMotionOptions);
            savedAudioMotionNodes = getVal('audioMotionNodes', savedAudioMotionNodes);
            savedImageBgmPaths = getVal('imageBgmPaths', savedImageBgmPaths);		// 設定ファイルからの複数パス復元
            savedCurrentBgmIndex = getVal('currentBgmIndex', savedCurrentBgmIndex, '0');
            savedMaxImageCacheSize = getVal('maxImageCacheSize', savedMaxImageCacheSize, '0');
            savedMaxMediaCacheSize = getVal('maxMediaCacheSize', savedMaxMediaCacheSize, '0');

            // JSONファイルから DEFAULT_AUDIO_MOTION_OPTIONS を復元
            if (loadedSettings['audioMotionOptions']) {
                try {
                    const parsed = typeof loadedSettings['audioMotionOptions'] === 'string'
                        ? JSON.parse(loadedSettings['audioMotionOptions'])
                        : loadedSettings['audioMotionOptions'];
                    Object.assign(DEFAULT_AUDIO_MOTION_OPTIONS, parsed);
                } catch (e) {
                    console.error('audioMotionOptions の復元エラー:', e);
                }
            }
            // JSONファイルから AUDIOMOTION_NODES を復元
            if (loadedSettings['audioMotionNodes']) {
                try {
                    const parsed = typeof loadedSettings['audioMotionNodes'] === 'string' 
                        ? JSON.parse(loadedSettings['audioMotionNodes']) 
                        : loadedSettings['audioMotionNodes'];
                    Object.keys(AUDIOMOTION_NODES).forEach(key => delete AUDIOMOTION_NODES[key]);
                    Object.assign(AUDIOMOTION_NODES, parsed);
                } catch (e) {
                    console.error('audioMotionNodes の復元エラー:', e);
                }
            }
        }
    }

    // 各設定値の localStorageと設定ファイルを同期（主に多重起動用）
    await localStorageSetItemAndFile('volume', savedVolume);
    await localStorageSetItemAndFile('playbackSpeed', savedPlaybackSpeed);
    await localStorageSetItemAndFile('playlist', savedPlaylist);
    await localStorageSetItemAndFile('currentVideoIndex', savedCurrentVideoIndex);
    await localStorageSetItemAndFile('currentTime', savedCurrentTime);
    await localStorageSetItemAndFile('fitMode', savedFitMode);
    await localStorageSetItemAndFile('zoom', savedZoom);
    await localStorageSetItemAndFile('translateX', savedTranslateX);
    await localStorageSetItemAndFile('translateY', savedTranslateY);
    await localStorageSetItemAndFile('editFrameRate', savedEditFrameRate);
    await localStorageSetItemAndFile('isRandomPlayMode', savedIsRandomPlayMode);
    await localStorageSetItemAndFile('isRepeatPlayMode', savedIsRepeatPlayMode);
    await localStorageSetItemAndFile('autoShuffle', savedAutoShuffle);
    await localStorageSetItemAndFile('shuffleOrder', savedShuffleOrder);
    await localStorageSetItemAndFile('shufflePosition', savedShufflePosition);
    await localStorageSetItemAndFile('aspectRatio', savedAspectRatio);
    await localStorageSetItemAndFile('playlistSortMode', savedCurrentSortMode);
    await localStorageSetItemAndFile('playlistDisplayMode', savedPlaylistDisplayMode);
    await localStorageSetItemAndFile('selectedAudioLabel', savedSelectedAudioLabel);
    await localStorageSetItemAndFile('selectedAudioTrack', savedSelectedAudioTrack);
    await localStorageSetItemAndFile('selectedSubtitleLabel', savedSelectedSubtitleLabel);
    await localStorageSetItemAndFile('selectedSubtitleTrack', savedSelectedSubtitleTrack);
    await localStorageSetItemAndFile('wallpaperPath', savedWallpaperPath);
    await localStorageSetItemAndFile('alwaysOnTop', savedAlwaysOnTop);
    await localStorageSetItemAndFile('pauseShowControls', savedPauseShowControls);
    await localStorageSetItemAndFile('hideCenterControls', savedHideCenterControls);
    await localStorageSetItemAndFile('audioMotionMode', savedAudioMotionMode);
    await localStorageSetItemAndFile('imageEffectBgmMode', savedImageEffectBgmMode);
    await localStorageSetItemAndFile('isImageWallpaperEnabled', savedIsImageWallpaperEnabled);
    await localStorageSetItemAndFile('filterHistory', savedFilterHistory);
    await localStorageSetItemAndFile('originalLoadOrder', savedOriginalOrder);
    await localStorageSetItemAndFile('audioMotionOptions', savedAudioMotionOptions);
    await localStorageSetItemAndFile('audioMotionNodes', savedAudioMotionNodes);
    await localStorageSetItemAndFile('imageBgmPaths', savedImageBgmPaths);
    await localStorageSetItemAndFile('currentBgmIndex', savedCurrentBgmIndex);
    await localStorageSetItemAndFile('maxImageCacheSize', savedMaxImageCacheSize);
    await localStorageSetItemAndFile('maxMediaCacheSize', savedMaxMediaCacheSize);
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
                setTimeout(() => {
                    reject(new Error('クリップボードの読み込みがタイムアウトしました')) 
                }, TIMEOUT_MS)
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
        // filter-item クラスを持つ要素はサイズ調整の対象外にする
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
    
    // 毎回最新のdata-tooltipを反映
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
function showControlsAndFilename(compulsion = false) {
    if (!pauseShowControls || compulsion) {
        disabledControls(false);
        disabledfilename(false);
        if (messageOverlay.classList.contains('active')) {
            messageOverlay.style.display = 'block';
            messageOverlay.classList.add('active');
        }
        // コントロールパネルが表示されるタイミングでセンターコントロールも更新・表示
        updateCenterPlayPauseIcon();
        updateCenterControlsVisibility(compulsion);
    }

    clearTimeout(timeout);
    if (!isMouseOverControls && !isurlInputPanelVisible) {
        timeout = setTimeout(() => {
            if (!isMouseOverControls && !isFilterPanelVisible && !(isEditMode || (editPanel && window.getComputedStyle(editPanel).display !== 'none')) && modeChange !== 'join' && modeChange === 'video') {
                hideControlsAndFilename(); // ここで無効化
            }
        }, overlayTimeout);
    }
    resetCursorTimer(compulsion);
    updateIconOverlay();

    // センターコントロールの表示更新（強制表示フラグを渡す）
    updateCenterPlayPauseIcon();
    updateCenterControlsVisibility(compulsion);
}

// コントロール＋ファイル名非表示
function hideControlsAndFilename() {
    disabledControls(true);
    disabledfilename(true);
    hideMenus(false); // コントロール非表示時にメニューも強制非表示
    clearTimeout(timeout);
    videoPlayer.style.cursor = 'none';
    videoContainer.style.cursor = 'none';

    isFilterPanelVisible = false;
    if (filterPanel) filterPanel.style.display = 'none';

    updateIconOverlay();

    // コントロールパネル非表示時はセンターコントロールも非表示にする
    if (centerControls) {
        centerControls.style.display = 'none';
    }
}

// 編集パネル非表示
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
        ...(!isSettingsPanelOpen || hideAll ? ['.audio-motion-menu'] : []),
        ...(!isSettingsPanelOpen || hideAll ? ['.image-effectbgm-menu'] : []),
        ...(!isSettingsPanelOpen || hideAll ? ['.control-menu'] : []),
        '.import-export-menu'
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
        // pointer-events無効化 → 内包オブジェクト操作不可
        filename.style.pointerEvents = 'none';
    } else {
        filename.style.opacity = '1';
        // pointer-events有効化
        filename.style.pointerEvents = 'auto';
    }
}

// 再生時間表示更新
function updateTimeDisplay() {
    let current = 0;
    let total = 0;

    if (currentMediaType === 'image') {
        current = imageCurrentTime || 0;
        total = IMAGE_DURATION || 0;
    } else {
        current = videoPlayer.currentTime || 0;
        total = videoPlayer.duration || 0;
    }

    const currentTime = formatTime(current);
    const duration = formatTime(total);
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
    const prevZoomValue = zoomValue;
    const scale = (100 + zoomPercent) / 100;
    const targetElement = getMediaElement();

    targetElement.style.transformOrigin = 'center center';
    targetElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

    localStorageSetItemAndFile('translateX', translateX.toString());
    localStorageSetItemAndFile('translateY', translateY.toString());
    zoomValue = zoomPercent;
    localStorageSetItemAndFile('zoom', zoomValue.toString());
    
    if (zoomDisplay) {
        zoomDisplay.textContent = `${zoomValue > 0 ? '+' : ''}${zoomValue}%`;
    }
    if (isZoomMode && prevZoomValue !== zoomValue) {
        updateMessageOverlay(`🔍 ${zoomValue > 0 ? '+' : ''}${zoomValue}%`);
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
        fitModeBtn.classList.add('fitMode-fill');
        fitModeBtn.textContent = '⏺️';
        fitModeBtn.setAttribute('data-tooltip', '画像を満たす（Ctrl+x）');
    } else {
        fitMode = 'contain';
        fitModeBtn.textContent = '↔️';
        fitModeBtn.setAttribute('data-tooltip', '画像を含む（Ctrl+x）');
    }

    const targetElement = getMediaElement();
    targetElement.style.objectFit = fitMode;

    localStorageSetItemAndFile('fitMode', fitMode);
    applyAspectRatioSetting();
}

// アスペクト比適用
function applyAspectRatioSetting() {
    const selectedOption = ASPECT_NODES[currentAspectRatio];
    const targetElement = getMediaElement();

    // 不要なスタイルをクリア
    targetElement.style.aspectRatio = '';
    targetElement.style.width = '100%';
    targetElement.style.height = '100%';
    targetElement.style.maxWidth = '100%';
    targetElement.style.maxHeight = '100%';
    targetElement.style.objectFit = fitMode;
    targetElement.style.transformOrigin = 'center center';
    targetElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${(100 + zoomValue) / 100})`;

    if (selectedOption && currentAspectRatio !== 'none') {
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

        targetElement.style.aspectRatio = `${width} / ${height}`;
        targetElement.style.width = `${Math.round(targetWidth)}px`;
        targetElement.style.height = `${Math.round(targetHeight)}px`;
        targetElement.style.maxWidth = '100vw';
        targetElement.style.maxHeight = '100vh';
        targetElement.style.margin = '0 auto';
    }

    videoContainer.style.justifyContent = 'center';
    videoContainer.style.alignItems = 'center';
    localStorageSetItemAndFile('aspectRatio', currentAspectRatio);

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
            updateMessageOverlay(`📺 ${label}`);
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
            updateMessageOverlay(`🏳️‍🌈 ${label}`);
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

// オーディオモーシュン設定メニューコンテンツ作成・再描画関数
function buildImageEffectBgmMenuContent(menu) {
    menu.innerHTML = '';

    Object.entries(IMAGEEFFECTBGM_NODES).forEach(([key, mode]) => {
        // セパレーターの描画
        if (mode.isSeparator) {
            const separator = document.createElement('div');
            separator.style.margin = '6px 0';
            separator.style.borderTop = '1px solid #666';
            menu.appendChild(separator);
            return;
        }

        // 壁紙描画 設定/解除（トグル）処理
        if (key === 'wallpaper-set') {
            const item = document.createElement('div');
            item.className = 'menu-item';
            item.innerHTML = (isImageWallpaperEnabled ? '🖼️ ' : '　　') + mode.label;
        
            item.addEventListener('click', async (event) => {
                event.stopPropagation();
                
                // トグル切り替え
                isImageWallpaperEnabled = !isImageWallpaperEnabled;
                
                // localStorageに保存
                if (typeof localStorageSetItemAndFile === 'function') {
                    await localStorageSetItemAndFile('imageWallpaperEnabled', isImageWallpaperEnabled);
                } else {
                    localStorage.setItem('imageWallpaperEnabled', isImageWallpaperEnabled);
                }
        
                // 背景壁紙の表示状態を即時更新
                updateWallpaperDisplay();
        
                // メニューの再描画・閉じる処理
                menu.remove();
                updateMessageOverlay(`🖼️ 背景生成: ${isImageWallpaperEnabled ? 'ON' : 'OFF'}`);
            });
        
            item.addEventListener('mouseover', () => {
                item.style.background = 'rgba(0,123,255,0.2)';
            });
            item.addEventListener('mouseout', () => {
                item.style.background = 'none';
            });
        
            menu.appendChild(item);
            return;
        }

        // BGM設定（ファイル追加・ポップアップ表示）処理
        if (key === 'bgm-set') {
            const isSelected = Array.isArray(imageBgmPaths) && imageBgmPaths.length > 0;
            const bgm = document.createElement('div');
            bgm.className = 'menu-item bgm-menu-item';
            bgm.style.position = 'relative'; // ポップアップの基準位置設定
            
            const getFileName = (target) => {
                if (!target) return '';
                return typeof target === 'string' ? target.split(/[/\\]/).pop() : '';
            };
        
            // 演奏中の曲ファイル名を取得してラベルを生成
            let labelText = `　　${mode.label}`;
            if (isSelected) {
                // インデックス範囲チェック付きで演奏中のパスを取得
                const safeIndex = (typeof currentBgmIndex === 'number' && currentBgmIndex >= 0 && currentBgmIndex < imageBgmPaths.length) ? currentBgmIndex : 0;
                const playingFileName = getFileName(imageBgmPaths[safeIndex]);

                if (imageBgmPaths.length === 1) {
                    // リスト内１件の場合：「🎺 BGM設定（演奏中の曲ファイル名）」
                    labelText = `🎺 ${mode.label}（${playingFileName}）`;
                } else {
                    // リスト内ｎ件の場合：「🎺 BGM設定（演奏中の曲ファイル名＋ｎ-1件）」
                    labelText = `🎺 ${mode.label}（${playingFileName}＋${imageBgmPaths.length - 1}件）`;
                }
            }
            bgm.innerHTML = labelText;
        
            // クリック時にファイルダイアログを開く
            bgm.addEventListener('click', async (event) => {
                event.stopPropagation();
                
                const selectedBgms = await openBgmDialog();
                
                if (selectedBgms && selectedBgms.length > 0) {
                    const newPaths = selectedBgms.map(b => b.path);
                    const currentPaths = Array.isArray(imageBgmPaths) ? imageBgmPaths : [];
                    imageBgmPaths = Array.from(new Set([...currentPaths, ...newPaths]));
                } else {
                    return;
                }
        
                await localStorageSetItemAndFile('imageBgmPaths', imageBgmPaths);
                
                currentLoadedBgmPath = null;
                bgmAudio.removeAttribute('src');
                bgmAudio.load();
                await manageBgmState();
        
                updateImageEffectBgm();
                buildImageEffectBgmMenuContent(menu);
            });
        
            let tooltip = null;

            // ホバー時に一覧ポップアップを生成
            bgm.addEventListener('mouseenter', () => {
                bgm.style.background = 'rgba(0,123,255,0.2)';
            
                if (tooltip) return;
            
                if (Array.isArray(imageBgmPaths) && imageBgmPaths.length > 0) {
                    tooltip = document.createElement('div');
                    tooltip.className = 'bgm-popup-menu';
            
                    tooltip.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });

                    // tooltip自体の作成処理の中（tooltip = document.createElement('div'); 直後あたり）に追加
                    tooltip.addEventListener('mouseleave', (event) => {
                        // 親要素（bgm）に戻った場合は消さない
                        if (bgm === event.relatedTarget || bgm.contains(event.relatedTarget)) {
                            return;
                        }
                        bgm.style.background = 'none';
                        tooltip.remove();
                        tooltip = null;
                    });

                    // --- [ポップアップ内] すべて削除ボタン ---
                    const clearAllDiv = document.createElement('div');
                    clearAllDiv.className = 'bgm-clear-all-item';
                    clearAllDiv.innerHTML = '<span>🗑️ すべて削除</span>';
            
                    clearAllDiv.addEventListener('click', async (e) => {
                        e.stopPropagation();
            
                        imageBgmPaths = [];
                        currentBgmIndex = 0;
            
                        await localStorageSetItemAndFile('imageBgmPaths', imageBgmPaths);
                        await localStorageSetItemAndFile('currentBgmIndex', currentBgmIndex);
            
                        currentLoadedBgmPath = null;
                        bgmAudio.removeAttribute('src');
                        bgmAudio.load();
                        await manageBgmState();
                        updateImageEffectBgm();
                        buildImageEffectBgmMenuContent(menu);
                    });
                    tooltip.appendChild(clearAllDiv);
            
                    // --- 各BGMファイルのリスト生成 ---
                    imageBgmPaths.forEach((path, idx) => {
                        const itemDiv = document.createElement('div');
                        itemDiv.className = 'bgm-list-item';
            
                        const isPlaying = idx === currentBgmIndex;
                        if (isPlaying) {
                            itemDiv.classList.add('is-playing');
                        }
            
                        const titleSpan = document.createElement('span');
                        titleSpan.className = 'bgm-item-title';
                        const icon = isPlaying ? '▶️' : '🎵';
                        titleSpan.textContent = `${icon} ${idx + 1}. ${getFileName(path)}`;
                        titleSpan.title = path;

                        // 曲選択時
                        titleSpan.addEventListener('click', async (e) => {
                            e.stopPropagation();

                            // 1. 再生曲インデックスの更新と保存
                            currentBgmIndex = idx;
                            await localStorageSetItemAndFile('currentBgmIndex', currentBgmIndex);

                            // 2. オーディオ再生状態の更新
                            currentLoadedBgmPath = null;
                            bgmAudio.removeAttribute('src');
                            bgmAudio.load();
                            await manageBgmState();

                            updateImageEffectBgm();

                            // 3. 既存ポップアップの破棄
                            if (tooltip) {
                                tooltip.remove();
                                tooltip = null;
                            }

                            // 4. 親メニュー（menu）は閉じずにコンテンツのみ再描画（演奏中の曲名を即時更新）
                            buildImageEffectBgmMenuContent(menu);

                            // 5. 選択後にそのままホバーメニューを自動で再表示させたい場合（不要な場合は以下削除可能）
                            const targetBgmItem = menu.querySelector('.bgm-menu-item');
                            if (targetBgmItem) {
                                const mouseEnterEvent = new MouseEvent('mouseenter', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window
                                });
                                targetBgmItem.dispatchEvent(mouseEnterEvent);
                            }
                        });

						// 個別削除（ゴミ箱）
						const deleteBtn = document.createElement('span');
						deleteBtn.textContent = '🗑️';
						deleteBtn.style.cursor = 'pointer';
						deleteBtn.style.opacity = '0.7';
						deleteBtn.title = '削除';
						
						deleteBtn.addEventListener('mouseenter', (e) => {
						    e.stopPropagation();
						    deleteBtn.style.opacity = '1';
						});
						deleteBtn.addEventListener('mouseleave', (e) => {
						    e.stopPropagation();
						    deleteBtn.style.opacity = '0.7';
						});
						
						deleteBtn.addEventListener('click', async (e) => {
						    e.stopPropagation();
						
						    // 削除する曲が現在再生中（または選択中）だったかの判定
						    const isDeletingCurrent = (idx === currentBgmIndex);
						
						    // 配列から対象要素を削除
						    imageBgmPaths.splice(idx, 1);
						
						    // インデックスの補正処理
						    if (imageBgmPaths.length === 0) {
						        currentBgmIndex = 0;
						    } else if (idx < currentBgmIndex) {
						        // 現在再生中の曲より前の曲を消した場合はインデックスを1繰り上げる（再生中の曲自体は変えない）
						        currentBgmIndex--;
						    } else if (currentBgmIndex >= imageBgmPaths.length) {
						        // 末尾の曲を消してインデックスが範囲外になった場合は末尾に合わせる
						        currentBgmIndex = imageBgmPaths.length - 1;
						    }
						
						    // ストレージを更新
						    await localStorageSetItemAndFile('imageBgmPaths', imageBgmPaths);
						    await localStorageSetItemAndFile('currentBgmIndex', currentBgmIndex);
						
						    // 現在再生中の曲が削除された、またはリストが空になった場合のみオーディオを再ロード
						    if (isDeletingCurrent || imageBgmPaths.length === 0) {
						        currentLoadedBgmPath = null;
						        bgmAudio.removeAttribute('src');
						        bgmAudio.load();
						        await manageBgmState();
						    }
						
						    updateImageEffectBgm();
						    
						    // 親メニューを再描画（「演奏中の曲ファイル名×ｎ件」の表記を更新）
						    buildImageEffectBgmMenuContent(menu);
						
						    // リストに曲が残っている場合はポップアップを自動で再表示
						    if (imageBgmPaths.length > 0) {
						        const targetBgmItem = menu.querySelector('.bgm-menu-item');
						        if (targetBgmItem) {
						            const mouseEnterEvent = new MouseEvent('mouseenter', {
						                bubbles: true,
						                cancelable: true,
						                view: window
						            });
						            targetBgmItem.dispatchEvent(mouseEnterEvent);
						        }
						    }
						});
            
                        itemDiv.appendChild(titleSpan);
                        itemDiv.appendChild(deleteBtn);
                        tooltip.appendChild(itemDiv);
                    });
                    
					// 1. 一旦DOMに追加（描画サイズ計算のため）
                    bgm.appendChild(tooltip);
            
                    // --- 2. 【位置補正処理】親メニューに重ねて右下に少しずらして配置 ---
                    const parentRect = bgm.getBoundingClientRect();
                    
                    // 親基準で「重ねつつ右下にズラす」オフセット値（px）
                    const offsetX = 32; // 右へのズレ量
                    const offsetY = 32; // 下へのズレ量

                    // tooltipの基本スタイル設定（絶対配置）
                    tooltip.style.position = 'fixed'; 
                    tooltip.style.left = `${parentRect.left + offsetX}px`;
                    tooltip.style.top = `${parentRect.top + offsetY}px`;
                    tooltip.style.zIndex = '9999';

                    // --- 画面外（右・下）へのはみ出し対策 ---
                    const rect = tooltip.getBoundingClientRect();
                    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
                    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

                    // 右側にはみ出る場合は画面内に収まるよう調整
                    if (rect.right > viewportWidth) {
                        const overflowX = rect.right - viewportWidth;
                        tooltip.style.left = `${parentRect.left + offsetX - overflowX - 8}px`;
                    }

                    // 下側にはみ出る場合は上方向に押し上げる
                    if (rect.bottom > viewportHeight) {
                        const overflowY = rect.bottom - viewportHeight;
                        tooltip.style.top = `${parentRect.top + offsetY - overflowY - 8}px`;
                    }
                }
            });

			bgm.addEventListener('mouseleave', (event) => {
			    // 移動先（relatedTarget）が tooltip そのもの、または tooltip の子要素である場合は消さない
			    if (tooltip && (tooltip === event.relatedTarget || tooltip.contains(event.relatedTarget))) {
			        return;
			    }
			
			    if (tooltip) {
			        bgm.style.background = 'none';
			        tooltip.remove();
			        tooltip = null;
			    }
			});
        
            menu.appendChild(bgm);
            return;
        }

        // エフェクトモード選択アイテムの描画（none, effect1〜6, random）
        const isSelected = imageEffectBgmMode === key;
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.style.color = isSelected ? '#00ccff' : '#eee';
        item.innerHTML = (isSelected ? '✅ ' : '　　') + mode.label;

        item.addEventListener('click', async (event) => {
            event.stopPropagation();
            imageEffectBgmMode = key;
            await localStorageSetItemAndFile('imageEffectBgmMode', imageEffectBgmMode);
            updateImageEffectBgm();
            menu.remove();
            updateMessageOverlay(`💃 ${mode.label}`);
        });

        item.addEventListener('mouseover', () => {
            item.style.background = 'rgba(0,123,255,0.2)';
        });
        item.addEventListener('mouseout', () => {
            item.style.background = 'none';
        });

        menu.appendChild(item);
    });
}

// メニューコンテナ生成関数
function createImageEffectBgmMenu() {
    const menu = document.createElement('div');
    menu.className = 'image-effectbgm-menu';
    buildImageEffectBgmMenuContent(menu);
    return menu;
}

// 設定のエクスポート
async function exportSettingsToFile(targetFilePath = null) {
    try {
        let filePath = targetFilePath;
        // 引数の保存先ファイルパスが Null の場合
        if (!filePath) {
            const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
            const defaultName = `xPlayerSettings_${timestamp}.xpj`;
            const result = await showSaveSettingsDialog(defaultName);
            if (result.canceled || !result.filePath) {
                return;
            }
            filePath = result.filePath.replace(/\.json$/i, '.xpj');
        }

        let settings = {};
        if (!isSecondary) {
            // localStorage の内容をオブジェクトにまとめる
            for (let i = 0; i < localStorage.length; i += 1) {
                const key = localStorage.key(i);
                if (key) {
                    const rawValue = localStorage.getItem(key);
                    try {
                        settings[key] = JSON.parse(rawValue);
                    } catch {
                        settings[key] = rawValue;
                    }
                }
            }
        } else {
            // localSettings の内容をオブジェクトにまとめる
            // (localSettings がオブジェクトとして管理されているため、そのまま参照またはコピー)
            settings = { ...localSettings };
        }

        // 手動・自動を問わず playlist は file 情報を含むオブジェクト配列で保存する
        if (Object.prototype.hasOwnProperty.call(settings, 'playlist')) {
            const storedPlaylist = safeJSONParse(settings.playlist, []);
            if (Array.isArray(storedPlaylist)) {
                settings.playlist = (await Promise.all(
                    storedPlaylist.map(item => createPlaylistItem(item))
                )).filter(Boolean);
            }
        }

        // 指定されたパスにエクスポート（どちらの分岐を通っても正しいオブジェクト構造でシリアライズされる）
        await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf8');

        // ダイアログ経由（手動エクスポート）の場合のみオーバーレイメッセージを表示
        if (!targetFilePath) {
            const fileName = filePath.split(/[/\\]/).pop();
            updateMessageOverlay(`📤 エクスポート: ${fileName}`);
        }
    } catch (error) {
        console.error('設定エクスポート失敗:', error);
        if (!targetFilePath) {
            updateMessageOverlay('📤 設定のエクスポートに失敗しました', 6000);
        }
    }
}

// 設定のインポート
async function importSettingsFromFile(targetFilePath = null, applySettings = !targetFilePath) {
    const maxRetries = targetFilePath ? 3 : 1;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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

            // 手動インポートまたは起動引数指定の場合
            if (applySettings) {
                if (!isSecondary) {
                    // 初回起動時：設定ファイル→localStorage
                    localStorageClearAndFile();
                    Object.entries(settings).forEach(([key, value]) => {
                        if (typeof value === 'object' && value !== null) {
                            localStorageSetItemAndFile(key, JSON.stringify(value));
                        } else {
                            localStorageSetItemAndFile(key, String(value));
                        }
                    });
                } else {
                    // 多重起動時：pidを取得して設定ファイル→xPlayerSettings_(pid).json出力
                    const pidSettingsFilePath = settingsFilePath.replace(/\.xpj$/, `_${pid}.xpj`);
                    await fs.writeFile(pidSettingsFilePath, JSON.stringify(settings, null, 2), 'utf8');
                }

                // 強制リロード
                const fileName = filePath.split(/[/\\]/).pop();
                updateMessageOverlay(`📥 インポート: ${fileName}`);
                setTimeout(() => {
                    location.reload();
                }, 300);
            }

            // settings変数を返却
            return settings;

        } catch (error) {
            console.error(`設定インポート失敗 (${attempt}/${maxRetries}回目):`, error);

            if (attempt < maxRetries) {
                continue;
            }

            const errorMsg = (error instanceof SyntaxError)
                ? '📥 設定ファイルの形式（JSON）が破損しています'
                : '📥 設定のインポートに失敗しました';
            
            updateMessageOverlay(errorMsg, 6000);
            return null;
        }
    }
}

// ドラッグ＆ドロップの設定インポート
async function dropImportSettingsFromFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const settings = JSON.parse(content);
        if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
            throw new Error('設定ファイルの形式が正しくありません');
        }

        const pidSettingsFilePath = settingsFilePath.replace(/\.xpj$/, `_${pid}.xpj`);
        await fs.writeFile(pidSettingsFilePath, JSON.stringify(settings, null, 2), 'utf8');

        // 強制リロード
        const fileName = filePath.split(/[/\\]/).pop();
        updateMessageOverlay(`📥 インポート: ${fileName}`);
        setTimeout(() => {
            location.reload();
        }, 300);
    } catch (error) {
        console.error(`設定インポート失敗 (${attempt}/${maxRetries}回目):`, error);

        const errorMsg = (error instanceof SyntaxError)
            ? '📥 設定ファイルの形式（JSON）が破損しています'
            : '📥 設定のインポートに失敗しました';
        
        updateMessageOverlay(errorMsg, 6000);
    }
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
            localStorageSetItemAndFile('currentTime', videoPlayer.currentTime);
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
        localStorageSetItemAndFile('playlist', JSON.stringify(playlist));
        localStorageSetItemAndFile('currentVideoIndex', currentVideoIndex);
        localStorageSetItemAndFile('currentTime', videoPlayer.currentTime || 0);
    } else {
        localStorageRemoveItemAndFile('playlist');
        localStorageRemoveItemAndFile('currentVideoIndex');
        localStorageRemoveItemAndFile('currentTime');
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
    
    // 1. プレイメディアパネルの下端の座標を計算
    const filenameBottom = filename.offsetTop + filename.offsetHeight;
    
    // 2. プレイリストの top を計算（プレイメディアパネルの下端 + 余白 4px）
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
    localStorageSetItemAndFile('playlistDisplayMode', mode);
    if (isFilterPanelVisible) {
        // 表示形式変更時は、作成完了後でもサムネイル再生成の進捗を計測する
        showPlaylistProgress(true);
        displayFormatUpdateRequested = true;
    }
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

    const myUpdateId = ++currentUpdateId;
    const isDisplayFormatRender = displayFormatUpdateRequested;
    displayFormatUpdateRequested = false;
    const isCreationRender = isPlaylistCreationInProgress && (!filterText.trim() || isDisplayFormatRender);
    let createdItemCount = 0;

    filterList.innerHTML = '';
    if (playlist.length === 0) {
        filterList.innerHTML = '<div class="filter-empty">プレイリストが空です。</div>';
        updateItemCount(0, 0);
        finalizePlaylistProgress(isCreationRender);
        return;
    }

    const query = (filterText || '').trim().toLowerCase();
    const normalizedQuery = query.replace(/\u3000/g, ' ');
    
    const results = playlist
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => {
            if (normalizedQuery === '') return true;
            
            const name = (item.file?.path || '').toLowerCase();
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
        filterList.innerHTML = '<div class="filter-empty">一致するメディアがありません。</div>';
        finalizePlaylistProgress(isCreationRender);
        return;
    }

    const isTileMode = ['thumb-small', 'thumb-medium', 'thumb-large'].includes(playlistDisplayMode);
    const isListOrThumbListMode = ['list', 'thumb-list'].includes(playlistDisplayMode);
    const isGroupEnabledMode = isTileMode || isListOrThumbListMode;
    
    // ソート種別の判定を追加
    const isCreationTimeSort = ['ctime_asc', 'ctime_desc'].includes(currentSortMode);
    const isTypeSort = ['type_asc', 'type_desc'].includes(currentSortMode);
    const isNoSortOrRandom = ['none', 'random'].includes(currentSortMode);

    let lastGroupKey = null;
    let currentGroupItemsContainer = null;

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
        if (myUpdateId !== currentUpdateId) return;

        updateItemCount(index, playlist.length);

        let targetContainer = filterList;

        if (isGroupEnabledMode) {
            if (isTileMode && isNoSortOrRandom) {
                targetContainer = currentGroupItemsContainer;
            } else if (isListOrThumbListMode && isNoSortOrRandom) {
                targetContainer = filterList;
            } else {
                let currentGroupKey = '';

                if (isCreationTimeSort) {
                    let dateStr = '作成日不明';
                    if (item.file?.path) {
                        try {
                            const timeMs = item.file?.time;

                            if (timeMs && !isNaN(timeMs)) {
                                const d = new Date(timeMs);
                                const year = d.getFullYear();
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const date = String(d.getDate()).padStart(2, '0');
                                const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
                                
                                dateStr = `${year}年${month}月${date}日（${dayOfWeek}）`;
                            }
                        } catch (err) {
                            console.warn(`表示用stat失敗: ${item.file.path}`, err);
                        }
                    }
                    if (myUpdateId !== currentUpdateId) return;
                    currentGroupKey = dateStr;
                } else if (isTypeSort) {
                    // 種類▲・▼ の場合は拡張子でグループ化
                    currentGroupKey = (item.file?.ext || '拡張子なし').toUpperCase();
                } else {
                    // ファイル▲・▼ などの場合はフォルダパスでグループ化
                    const fullPath = item.file?.path || '無題';
                    const currentFolderPath = path.dirname(fullPath);
                    currentGroupKey = currentFolderPath === '.' ? 'ルートフォルダ' : currentFolderPath;
                }

                if (currentGroupKey !== lastGroupKey) {
                    lastGroupKey = currentGroupKey;

                    const folderGroup = document.createElement('div');
                    folderGroup.className = 'folder-group';

                    const folderTitle = document.createElement('div');
                    folderTitle.className = 'folder-group-title';
                    folderTitle.textContent = currentGroupKey;
                    folderGroup.appendChild(folderTitle);

                    currentGroupItemsContainer = document.createElement('div');
                    
                    if (isTileMode) {
                        currentGroupItemsContainer.className = 'folder-group-items';
                        currentGroupItemsContainer.classList.add(
                            playlistDisplayMode === 'thumb-small' ? 'playlist-grid-small' :
                            playlistDisplayMode === 'thumb-medium' ? 'playlist-grid-medium' :
                            'playlist-grid-large'
                        );
                    } else {
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

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'filter-item';
        button.dataset.index = index;
        if (index === currentVideoIndex) button.classList.add('current');
        if (index === selectedPlaylistIndex) button.classList.add('selected');

        const displayText = item.file?.path || '無題';
        const showPlaybackIcon = index === currentVideoIndex && !isVideoStopped();
        const fileName = item.file?.name || '無題';

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
            thumbWrap.style.background = '#000000'; // 黒背景を敷くことでcontain時の余白を目立ちにくくする
            
            const thumb = document.createElement('img');
            thumb.className = 'filter-item-thumb';
            thumb.style.width = '100%';
            thumb.style.height = '100%';
            thumb.style.objectFit = 'contain'; // 画像をアスペクト比固定で全体表示（contain）に設定
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

            const isAudioFile = (filePath) => {
                if (!filePath) return false;
                const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
                return typeof AUDIO_EXTENSIONS !== 'undefined' ? AUDIO_EXTENSIONS.includes(ext) : AUDIO_EXTENSIONS.includes(ext);
            };

            // 画像ファイルの判定関数
            const isImageFile = (filePath) => {
                if (!filePath) return false;
                const cleanPath = filePath.split('?')[0];
                const ext = cleanPath.substring(cleanPath.lastIndexOf('.')).toLowerCase();
                return IMAGE_EXTENSIONS.includes(ext);
            };
            
            try {
                if (isAudioFile(item.file?.path)) {
                    setMusicThumb();
                } else if (isImageFile(item.file?.path)) {
                    // 画像ファイルの場合はローカルファイルをそのままURL化してセット（高速化 & そのままサムネ化）
                    const imageUrl = await getOrGenerateImageThumbnail(item.file.path, thumbDims.width);
                    if (myUpdateId !== currentUpdateId) return;

                    if (imageUrl) {
                        thumb.src = imageUrl;
                    } else {
                        setFallbackThumb();
                    }
                } else {
                    // 動画等の場合
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
            selectedPlaylistIndex = index;

            filterList.querySelectorAll('.filter-item.selected').forEach(el => {
                el.classList.remove('selected');
            });
            button.classList.add('selected');

            if (modeChange === 'video') {
                await updateTrack('subtitle');
            } else {
                await updateTrack('audio');
            }
        });

        button.addEventListener('dblclick', async (e) => {
            selectedPlaylistIndex = index;
            currentVideoIndex = index;

            isFilterPanelVisible = false;
            if (filterPanel) filterPanel.style.display = 'none';

            await playVideo(item.file, 0);
            updatePlaylistDisplay();
            savePlaylistAndPlaybackState();
        });

        targetContainer.appendChild(button);
        createdItemCount += 1;
        if (isCreationRender) {
            setPlaylistProgress((createdItemCount / playlist.length) * 100);
        }
    }
    updateItemCount(results.length, playlist.length);

    if (myUpdateId === currentUpdateId) {
        adjustFilterPanelHeight();
        finalizePlaylistProgress(isCreationRender);
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
            const name = (item.file?.path || '').toLowerCase();
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
    localStorageSetItemAndFile('playlistSortMode', modeKey);

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
    const filteredIndices = getFilteredIndices(); // 現在の playlist 内でのインデックス配列
    if (filteredIndices.length === 0) return;

    // 1. オリジナル順のリストを取得
    const originalPlaylist = getPlaylistInOriginalOrder();

    // 2. フィルタ対象の「オリジナル順におけるインデックス」を取得
    const filteredPaths = new Set(filteredIndices.map(i => playlist[i]?.file?.path));
    const targetOriginalIndices = [];
    originalPlaylist.forEach((item, origIdx) => {
        if (filteredPaths.has(item?.file?.path)) {
            targetOriginalIndices.push(origIdx);
        }
    });

    // 3. フィルタ対象のインデックスのみを偏りなくシャッフル（SecureRandomInt 使用）
    const shuffledTargetIndices = [...targetOriginalIndices];
    for (let i = shuffledTargetIndices.length - 1; i > 0; i--) {
        const j = SecureRandomInt(i + 1);
        [shuffledTargetIndices[i], shuffledTargetIndices[j]] = [shuffledTargetIndices[j], shuffledTargetIndices[i]];
    }

    // 4. 現在再生中の曲をフィルタ内シャッフルの先頭に持ち上げる処理（選択的）
    const prevPath = currentVideoIndex >= 0 ? playlist[currentVideoIndex]?.file?.path : null;
    if (prevPath && filteredPaths.has(prevPath)) {
        const currentOrigIndex = originalPlaylist.findIndex(item => item?.file?.path === prevPath);
        const posInShuffled = shuffledTargetIndices.indexOf(currentOrigIndex);
        if (posInShuffled > -1) {
            shuffledTargetIndices.splice(posInShuffled, 1);
            shuffledTargetIndices.unshift(currentOrigIndex);
        }
    }

    // 5. 既存の shuffleOrder をベースに、フィルタ対象箇所のみを新しいランダム順で差し替える
    // (shuffleOrder が未定義またはサイズ不整合の場合は全件で再生成)
    if (!shuffleOrder || shuffleOrder.length !== originalPlaylist.length) {
        shuffleOrder = createShuffleOrder();
    } else {
        // shuffleOrder 内でフィルタ対象だった位置を、シャッフル後の値に順番に置換
        let fillIdx = 0;
        shuffleOrder = shuffleOrder.map(origIdx => {
            if (targetOriginalIndices.includes(origIdx)) {
                return shuffledTargetIndices[fillIdx++];
            }
            return origIdx;
        });
    }

    // 6. アプローチBに基づいて、（ランダム）状態のプレイリスト表示を適用・更新
    playlist = sortRandomPlaylist();

    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
    saveShuffleState();
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
    // if (selectedPlaylistIndex < 0 || selectedPlaylistIndex >= playlist.length) {
    //    const isValidCurrent = currentVideoIndex >= 0 && currentVideoIndex < playlist.length;
    //    selectedPlaylistIndex = isValidCurrent ? currentVideoIndex : 0;
    // }

    // 4. UI・表示の同期
    if (isFilterPanelVisible) debouncedUpdateFilterList();
    debouncedScrollCurrentFilterItem();
    updateIconOverlay();
    
    // ※フィルター絞り込み時の表示件数（filteredLengthなど）がある場合は第1引数に適用
    updateItemCount(playlist.length, playlist.length); 
}

// 現在再生中のメディアのパスを取得するヘルパー関数
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
        urlInputBtn.setAttribute('data-tooltip', 'ネットURLを開く (Ctrl+n)');
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

// 自動シャッフルボタンのUI更新
function updateAutoShuffleButtonUI() {
    if (!autoShuffleBtn) return;

    autoShuffleBtn.classList.toggle('auto-shuffle-active', autoShuffle);
    autoShuffleBtn.setAttribute(
        'data-tooltip',
        autoShuffle ? '自動シャッフル有効（Ctrl+w）' : '自動シャッフル無効（Ctrl+w）'
    );
}

// 自動シャッフル切替
function toggleAutoShuffle() {
    autoShuffle = !autoShuffle;
    localStorageSetItemAndFile('autoShuffle', autoShuffle);
    updateAutoShuffleButtonUI();
}

// ランダム再生トグル
function toggleRandomPlay() {
    const wasRandom = isRandomPlayMode;
    isRandomPlayMode = !isRandomPlayMode;
    localStorageSetItemAndFile('isRandomPlayMode', isRandomPlayMode);
    updateRandomButtonUI();

    if (isRandomPlayMode && !wasRandom) {
        const indices = getFilteredIndices();
        if (indices.length !== playlist.length && currentSortMode === 'random') {
            shuffleFiltered();
        } else {
            // 通常 → ランダム に変更（ケース1・3）
            
            // 1. 新しくシャッフルオーダーを作成（この時点で再生中アイテムは shuffleOrder[0] に配置される）
            shuffleOrder = createShuffleOrder();

            // 2. 現在の並び順モードが「（ランダム）」の場合は表示（playlist）を更新
            if (currentSortMode === 'random') {
                // アプローチB：常にオリジナル順に対して shuffleOrder を適用
                const originalPlaylist = getPlaylistInOriginalOrder();
                playlist = shuffleOrder.map(i => ({ ...originalPlaylist[i] }));

                // 先頭に再生中アイテムが来ているため、インデックスは 0 になる
                currentVideoIndex = 0;
            } else {
                // （ランダム）表示以外のモードの場合、現在再生中の曲が shuffleOrder の何番目にあるかを計算
                const currentPath = playlist[currentVideoIndex]?.file?.path;
                if (currentPath) {
                    const originalPlaylist = getPlaylistInOriginalOrder();
                    const origIdx = originalPlaylist.findIndex(item => item?.file?.path === currentPath);
                    const pos = shuffleOrder.indexOf(origIdx);
                    shufflePosition = pos >= 0 ? pos : 0;
                }
            }

            // （ランダム）表示中の場合、再生中の位置は先頭（0）
            if (currentSortMode === 'random') {
                shufflePosition = 0;
            }

            updatePlaylistDisplay();
            savePlaylistAndPlaybackState();
            saveShuffleState();
        }
    } else if (!isRandomPlayMode && wasRandom) {
        // ランダム → 通常 に変更（ケース2・4）
        shuffleOrder = [];
        shufflePosition = -1;
        saveShuffleState();
    }

    if (isFilterPanelVisible) debouncedUpdateFilterList();
    debouncedScrollCurrentFilterItem();
}

// 再シャッフル
function resetShuffle() {
    if (isRandomPlayMode) {
        // ランダムモードONになった → シャッフル順を今生成
        shuffleOrder = [...Array(playlist.length).keys()]; // 0〜length-1 の配列
        shuffleOrder = createShuffleOrder(); // シャッフル

        // 先頭に移動した再生中メディアからスタートするため、ポジションを 0 に設定
        shufflePosition = 0; 
        saveShuffleState();
    } else {
        // OFFになったらクリア
        shuffleOrder = [];
        shufflePosition = -1;
    }
}

// 全曲リピートの次周回用にシャッフル順を再生成
function reshuffleForNextCycle() {
    shuffleOrder = createShuffleOrder();
    shufflePosition = 0;

    // 「（ランダム）」表示中は、再シャッフル後の順序を表示にも反映する
    if (currentSortMode === 'random') {
        playlist = sortRandomPlaylist();
        currentVideoIndex = 0;
    }
}

// 前再生メディア取得
function getPrevVideoIndex() {
    if (playlist.length === 0) return -1;

    // 1. 1曲リピート時
    if (isRepeatPlayMode === 'single') {
        return modeChange === 'video' ? currentVideoIndex : -1;
    }

    // 2. ランダム再生 ON ＆ 並び順が「（ランダム）」以外（ファイル▲等）の場合
    if (isRandomPlayMode && currentSortMode !== 'random') {
        // 位置を 1 つ戻す
        shufflePosition--;

        // 先頭より前に行こうとした場合のループ／停止処理
        if (shufflePosition < 0) {
            if (isRepeatPlayMode === 'all') {
                if (modeChange === 'video') {
                    // 全曲リピート時は末尾へ移動
                    shufflePosition = shuffleOrder.length - 1;
                } else {
                    return -1;
                }
            } else {
                // リピートOFF時は先頭（0）に戻して停止
                shufflePosition = 0;
                saveShuffleState();
                return -1;
            }
        }
        saveShuffleState(); // 現在のシャッフル位置を保存

        // shuffleOrder が指す「オリジナル順のアイテム」を取得
        const originalPlaylist = getPlaylistInOriginalOrder();
        const targetOriginalIndex = shuffleOrder[shufflePosition];
        const targetItem = originalPlaylist[targetOriginalIndex];

        // 現在表示中の playlist 内で、そのアイテムが何番目にあるかを検索して返す
        if (targetItem) {
            const prevIndex = playlist.findIndex(item => item?.file?.path === targetItem.file?.path);
            return prevIndex >= 0 ? prevIndex : 0;
        }
        return 0;

    } else {
        // 3. 通常順（または表示自体が「（ランダム）」の場合）
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

// 次再生メディア取得
function getNextVideoIndex() {
    if (playlist.length === 0) return -1;
    if (isRepeatPlayMode === 'single') {
        return modeChange === 'video' ? currentVideoIndex : -1;
    }

    if (isRandomPlayMode && currentSortMode !== 'random') {
        // 1. 位置を更新
        shufflePosition++;
        if (shufflePosition >= shuffleOrder.length) {
            if (isRepeatPlayMode === 'all') {
                if (modeChange === 'video') {
                    if (autoShuffle) {
                        reshuffleForNextCycle();
                        shufflePosition = shuffleOrder.length > 1 ? 1 : 0;
                    } else {
                        shufflePosition = 0;
                    }
                } else {
                    return -1;
                }
            } else {
                shufflePosition = 0;
                saveShuffleState();
                return -1;
            }
        }
        saveShuffleState();

        // 2. shuffleOrder が指す「オリジナル順のアイテム」を取得
        const originalPlaylist = getPlaylistInOriginalOrder();
        const targetOriginalIndex = shuffleOrder[shufflePosition];
        const targetItem = originalPlaylist[targetOriginalIndex];

        // 3. 現在表示中の playlist 内で、そのアイテムが何番目にあるかを検索して返す
        if (targetItem) {
            const nextIndex = playlist.findIndex(item => item?.file?.path === targetItem.file?.path);
            return nextIndex >= 0 ? nextIndex : 0;
        }
        return 0;
    } else {
        // 通常順（または表示自体が「（ランダム）」の場合）
        let normalPosition = currentVideoIndex + 1;
        if (normalPosition >= playlist.length) {
            if (isRepeatPlayMode === 'all') {
                if (modeChange !== 'video') return -1;
                if (isRandomPlayMode && autoShuffle) {
                    reshuffleForNextCycle();
                    return playlist.length > 1 ? 1 : 0;
                }
                return 0;
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
        localStorageSetItemAndFile('shuffleOrder', JSON.stringify(shuffleOrder));
        localStorageSetItemAndFile('shufflePosition', shufflePosition.toString());
    } else {
        // ランダムOFFならクリア
        localStorageRemoveItemAndFile('shuffleOrder');
        localStorageRemoveItemAndFile('shufflePosition');
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

// 次のプレイリストアイテムを再生する汎用フォールバック関数
async function playNextPlaylistItem() {
    videoPlayer.currentTime = 0;
    localStorageSetItemAndFile('currentTime', 0);

    // 一時ファイル削除
    await deleteTempVideo();

    // 常にgetNextVideoIndex()を呼び、次があれば再生
    // （ランダムOFF・repeat 'none' でも次に進む）
    const nextIndex = getNextVideoIndex();
    if (nextIndex >= 0) {
        currentVideoIndex = nextIndex;
        await playVideo(playlist[currentVideoIndex].file, 0);
    } else {
        if (modeChange === 'convert') {
            seekBar.value = 0;
            updateMessageOverlay('🔄️ 変換完了');
        }
        currentVideoIndex = -1;  // 停止状態を明示
        selectedPlaylistIndex = -1;  // 停止状態を明示
        playStopBtn.click(); // プレイリストの最後で停止
    }
    savePlaylistAndPlaybackState();

    showControlsAndFilename();
    updateIconOverlay();
}

// メディアソース設定
async function setVideoSrc(file) {
    // 既存のタイマーがあればクリア
    if (imageTimer) {
        clearTimeout(imageTimer);
        imageTimer = null;
    }

    playPauseBtn.textContent = '⏸️';
    playPauseBtn.classList.remove('paused-active');
    playPauseBtn.setAttribute('data-tooltip', '一時停止（Space／Right Click）');
    
    let cleanPath = file.path;
    if (cleanPath.includes('?')) {
        cleanPath = cleanPath.split('?')[0];
    }
    const ext = path.extname(cleanPath).toLowerCase();
    const isAudio = isAudioFilePath(file.path);
    const isImage = isImageFilePath(file.path);

    // メディアタイプ判定
    if (isImage) {
        currentMediaType = 'image';
    } else if (isAudio) {
        currentMediaType = 'audio';
    } else {
        currentMediaType = 'video';
    }

    updateMediaPlayerDisplay();
    updateAudioMotion();
    toggleVisualizer(currentMediaType);
    updateImageEffectBgm();

    // 画像処理分岐
	if (isImage) {
	    isConverting = false;
	    
	    // 1. キャッシュから読み込み済み Image を検索
	    let cachedImg = imageCache.get(file.path);
	    let imageUrl;
	
	    if (cachedImg && cachedImg.complete) {
	        imageUrl = cachedImg.src;
	    } else {
	        imageUrl = `file://${file.path.replace(/\\/g, '/')}?t=${Date.now()}`;
	    }
	
	    // 2. 表示用 Image の読み込み完了を待機（キャッシュがあれば一瞬で完了）
	    const loadImagePromise = new Promise((resolve) => {
	        if (imagePlayer.src === imageUrl && imagePlayer.complete) {
	            resolve();
	            return;
	        }
	        imagePlayer.onload = () => resolve();
	        imagePlayer.onerror = () => resolve();
	        imagePlayer.src = imageUrl;
	    });
	
	    updateWallpaperDisplay(); // 壁紙の更新
	
	    // 動画/音声の停止・リセット
	    videoPlayerElement.pause();
	    videoPlayerElement.removeAttribute('src');
	    videoPlayerElement.load();
	    audioPlayer.removeAttribute('src');
	    audioPlayer.load();
	    videoPreview.removeAttribute('src');
	    videoPreview.load();
	
	    baseConvertFile = null;
	    tempConvertFile = null;
	
	    // 画像のデコード/ロード完了まで確実に待機
	    await loadImagePromise;
    } else {
        // 画像以外を表示する場合は img および 壁紙を非表示に
        imagePlayer.style.display = 'none';
        imagePlayer.removeAttribute('src');
        updateWallpaperDisplay();       // 壁紙の非表示更新
        videoPlayerElement.style.display = 'block';

        if (isVIDEO_EXTENSIONS(ext) && isAudio) {
            isConverting = false;
            const mediaUrl = `file://${file.path.replace(/\\/g, '/')}`;
            videoPlayerElement.src = mediaUrl;
            audioPlayer.src = mediaUrl;
            videoPreview.removeAttribute('src');
            videoPreview.load();
            baseConvertFile = null;
            tempConvertFile = null;
        } else if (isVIDEO_EXTENSIONS(ext)) {
            isConverting = false;
            const videoUrl = `file://${file.path.replace(/\\/g, '/')}`;
            videoPlayerElement.src = videoUrl;
            audioPlayer.src = videoUrl;
            videoPreview.src = videoUrl;
            baseConvertFile = null;
            tempConvertFile = null;
        } else {
            try {
                await deleteTempVideo();
                const wasIsPlaying = isPlaying;
                isConverting = true;
                updatePlaylistDisplay();

                currentConvertPromise = convertVideo(file.path, modeChange, currentAudioIndex);
                const convertedPath = await currentConvertPromise;

                const videoUrl = `file://${convertedPath}`;
                videoPlayerElement.src = videoUrl;
                audioPlayer.src = videoUrl;
                videoPreview.src = videoUrl;
                baseConvertFile = file.path;
                tempConvertFile = convertedPath;
                
                let cleanPath = baseConvertFile;
                if (cleanPath.includes('?')) {
                    cleanPath = cleanPath.split('?')[0];
                }
                const ext = path.extname(cleanPath).toLowerCase();
                const validExt = isVIDEO_EXTENSIONS(ext);
                delConvertFile = null;
                if (!validExt) {
                    if (baseConvertFile != tempConvertFile) {
                        delConvertFile = (modeChange === 'video') ? tempConvertFile : baseConvertFile;
                    }
                }            
                isPlaying = wasIsPlaying;
            } catch (err) {
                console.error("変換失敗:", err);
                isConverting = false;
                updateMessageOverlay('🔄️ 変換失敗', 6000);
                playlistPathArea.value = appNameAndCopyrightValueLine;
                updateIconOverlay();
                seekBar.value = 0;
                return;
            }
        }
    }

    // メディアタイプ切り替え時のBGM連動処理（画像以外なら自動一時停止）
    await manageBgmState();

    // トラック情報制御（画像以外）
    if (currentMediaType !== 'audio' && currentMediaType !== 'image') {
        if (modeChange === 'video') {
            await updateTrack('subtitle');
        } else {
            await updateTrack('audio');
        }
    }
    updateTrackButtonsVisibility();

    // 共通再生処理（動画/音声の場合）
    videoPlayer.load();
    videoPreview.load();
    videoPreview.pause();
    videoPlayer.playbackRate = currentPlaybackRate;
    videoPlayer.volume = volumeBar.value;
    bgmAudio.volume = videoPlayer.volume; // BGMも一緒に更新

    updateMediaPlayerDisplay();
    updatePlaylistDisplay();
}

// メディア再生
async function playVideo(file, currentTime) {
    if (!file?.path) return;

    if (imageTimer) {
        clearTimeout(imageTimer);
        imageTimer = null;
    }
    stopImageProgress();

    isPlaying = true;
    selectedPlaylistIndex = currentVideoIndex;

    // ランダム再生 ON ＆ 並び順が「（ランダム）」以外（ファイル名▲等）の場合、
    // 再生を開始したファイル（file.path）の shuffleOrder 内における位置（shufflePosition）を同期する
    if (isRandomPlayMode && currentSortMode !== 'random') {
        const originalPlaylist = getPlaylistInOriginalOrder();
        const origIdx = originalPlaylist.findIndex(item => item?.file?.path === file.path);
        
        if (origIdx !== -1 && shuffleOrder && shuffleOrder.length > 0) {
            const pos = shuffleOrder.indexOf(origIdx);
            if (pos >= 0) {
                shufflePosition = pos;
                saveShuffleState(); // 同期したシャッフル位置を保存
            }
        }
    }
    await setVideoSrc(file);

    // 動画・画像切り替え時に相互の設定（アスペクト比・描画モード・ズーム・パン）を適用
    syncDisplaySettingsToCurrentMedia();

	if (currentMediaType === 'image') {
	    // 選択されたトランジションエフェクトを適用
	    applyImageEffect();
	
	    playPauseBtn.textContent = '⏸️';
	    playPauseBtn.classList.remove('paused-active');
	    playPauseBtn.setAttribute('data-tooltip', '一時停止（Space／Right Click）');
	
	    imageCurrentTime = (!isNaN(currentTime) && currentTime >= 0) ? Math.min(IMAGE_DURATION, currentTime) : 0;
	    
	    seekBar.value = (100 / IMAGE_DURATION) * imageCurrentTime;
	    updateTimeDisplay();
	
	    // isPlaying が true の場合のみタイマーをセット
	    if (isPlaying) {
	        const remainingMs = ((IMAGE_DURATION - imageCurrentTime) / (currentPlaybackRate || 1.0)) * 1000;
	
	        startPeriodicSave();
	        startImageProgress();
	
	        imageTimer = setTimeout(async () => {
	            imageTimer = null;
	            stopImageProgress();
	            await playNextPlaylistItem();
	        }, remainingMs);
	    }
	
	    await manageBgmState();
    } else {
        if (modeChange === 'convert') {
            setVideoDurationTime();
        } else {
            if (!isNaN(currentTime) && currentTime >= 0) {
                videoPlayer.currentTime = currentTime;
                localStorageSetItemAndFile('currentTime', videoPlayer.currentTime);
            }
        }

        videoPlayer.playbackRate = currentPlaybackRate || 1.0;

        startPeriodicSave();
        videoPlayer.play().catch(() => {
            playPauseBtn.textContent = '▶️';
            playPauseBtn.classList.add('paused-active');
            playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
            stopPeriodicSave();
        });

        // 動画・音声再生時はBGMを自動一時停止
        await manageBgmState();
    }

    // 次のメディアをバックグラウンドで先読み開始
    preloadNextPlaylistItem();

    updatePlaylistDisplay();
    showControlsAndFilename();
    updateIconOverlay();
}

// 再生/一時停止切替
async function togglePlayPause() {
    // 停止後の再生開始インデックスを取得するヘルパー関数
    const getStartIndex = () => {
        // 一時停止からの再開
        if (currentVideoIndex >= 0) {
            return currentVideoIndex;
        }

        // 手動停止からの再開
        if (currentVideoIndex === -1 && selectedPlaylistIndex >= 0) {
            // UI上の選択インデックス（selectedPlaylistIndex）のアイテムをそのまま再生
            return selectedPlaylistIndex;
        }

        // 自動停止（終端再生終了）からの再開
        if (isRandomPlayMode) {
            if (currentSortMode === 'random') {
                return 0;
            } else {
                // シャッフル順の先頭のアイテムの元インデックス/表示インデックスを返す
                const targetOrigIdx = (shuffleOrder && shuffleOrder.length > 0) ? shuffleOrder[0] : 0;
                const originalPlaylist = getPlaylistInOriginalOrder();
                if (playlist && playlist.length > 0) {
                    const idx = playlist.findIndex(item => item?.file?.path === originalPlaylist[targetOrigIdx]?.file?.path);
                    return idx !== -1 ? idx : 0;
                }
                return 0;
            }
        } else {
            // 通常再生モード（ランダム再生OFF）
            return 0;
        }
    };

    // 画像表示中のトグル処理
    if (currentMediaType === 'image') {
        // 停止状態（インデックス初期化時）からの再生の場合
        if (currentVideoIndex === -1 || !imagePlayer.getAttribute('src')) {
            currentVideoIndex = getStartIndex();
            
            // 仕様「メディア再生時に再生メディアの位置（currentVideoIndex）でリセットする」
            selectedPlaylistIndex = currentVideoIndex; 

            const file = playlist[currentVideoIndex]?.file;
            if (file) {
                isPlaying = true;
                await playVideo(file, 0); // 0秒から再生開始
            }
            return;
        }

        if (imageTimer) {
            // 【再生中 → 一時停止】タイマーを停止
            isPlaying = false;
            clearTimeout(imageTimer);
            imageTimer = null;
            stopImageProgress();
            // paused クラスの追加先を imageWrapper に変更
            if (imageWrapper) imageWrapper.classList.add('paused');
            
            playPauseBtn.textContent = '▶️';
            playPauseBtn.classList.add('paused-active');
            playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
            stopPeriodicSave();
        } else {
            // 【一時停止中 → 再開】
            isPlaying = true;
            // paused クラスの除去先を imageWrapper に変更
            if (imageWrapper) imageWrapper.classList.remove('paused');
            
            playPauseBtn.textContent = '⏸️';
            playPauseBtn.classList.remove('paused-active');
            playPauseBtn.setAttribute('data-tooltip', '一時停止（Space／Right Click）');
            
            startPeriodicSave();
            startImageProgress();

            const remainingMs = ((IMAGE_DURATION - imageCurrentTime) / (currentPlaybackRate || 1.0)) * 1000;
            
            imageTimer = setTimeout(async () => {
                imageTimer = null;
                stopImageProgress();
                await playNextPlaylistItem();
            }, remainingMs > 0 ? remainingMs : 0);
        }

        // 一時停止/再開にBGMを追従
        await manageBgmState();

        updatePlaylistDisplay();
        showControlsAndFilename();
        updateIconOverlay();
        return;
    }

    isPlaying = true;
    // 動画・音声のトグル処理
    if (videoPlayer.paused) {
        if (isVideoStopped() || currentVideoIndex === -1) {
            // 手動停止時：停止位置から再開、自動停止（終端再生終了）時：条件に応じたインデックスから再生
            currentVideoIndex = getStartIndex();
            const file = playlist[currentVideoIndex]?.file;
            if (file) {
                await playVideo(file, 0); // 再生・同期処理を一括して行うため playVideo に移譲
            }
            return;
        } else {
            playPauseBtn.textContent = '⏸️';
            playPauseBtn.classList.remove('paused-active');
            playPauseBtn.setAttribute('data-tooltip', '一時停止（Space／Right Click）');
        }

        if (modeChange === 'convert') {
            setVideoDurationTime();
        } else {
            const isInEditMode = isEditMode || (editPanel && window.getComputedStyle(editPanel).display !== 'none');
            if (isInEditMode && cutRanges.length > 0) {
                const nextPos = findNextValidPosition(videoPlayer.currentTime);
                if (nextPos >= 0 && nextPos < videoPlayer.duration) {
                    videoPlayer.currentTime = nextPos;
                }
            }
        }
        
        startPeriodicSave();
        videoPlayer.play().catch(() => {
            playPauseBtn.textContent = '▶️';
            playPauseBtn.classList.add('paused-active');
            playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
            stopPeriodicSave();
        });
    } else {
        videoPlayer.pause();
        playPauseBtn.textContent = '▶️';
        playPauseBtn.classList.add('paused-active');
        playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
        localStorageSetItemAndFile('currentTime', videoPlayer.currentTime);
        stopPeriodicSave();
    }

    // 動画・音声側で再生/一時停止操作された場合はBGMを自動一時停止
    await manageBgmState();

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

// メディアのメタデータがロードされてから currentTime を操作するヘルパー
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

// 画像ファイル判定ヘルパー
function isImageFilePath(filePath) {
    if (!filePath) return false;
    const cleanPath = filePath.split('?')[0];
    const ext = path.extname(cleanPath).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
}

// メディアの停止中判定（動画・音声・画像に対応）
function isVideoStopped() {
    if (playlist.length === 0) return false;

    // 画像の場合：画像が表示されていなければ停止中（または imagePlayer.src が空）
    if (currentMediaType === 'image') {
        return !imagePlayer.src || imagePlayer.style.display === 'none';
    }

    // 音声の場合：audioPlayer が停止中でかつ src が設定されていない場合
    if (currentMediaType === 'audio') {
        return audioPlayer.paused && !audioPlayer.src;
    }

    // 動画の場合：videoPlayer が停止中でかつ src が設定されていない場合
    return videoPlayer.paused && !videoPlayer.currentSrc;
}

// Url再生完成
async function urlInputEnter() {
    const inputUrl = urlInput.value.trim();
    if (!inputUrl) {
        updateMessageOverlay('🌐 入力URL不正', 6000);
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
            updateMessageOverlay('🌐 無効なTwitch URL', 6000);
            updateIconOverlay();
            return;
        }
        videoUrl = `https://player.twitch.tv/?video=${videoId}&parent=twitch.tv&player=popout`;
    } else if (platform === 'YouTube') {
        playlistId = extractYouTubePlaylistId(inputUrl);
        videoId = extractYouTubeVideoId(inputUrl);
        if (!videoId) {
            updateMessageOverlay('🌐 無効なYouTube URL', 6000);
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
        updateMessageOverlay('🌐 無効なURL', 6000);
        updateIconOverlay();
        return;
    }

    try {
        const result = await openVideoInBrowser(inputUrl);
    
        if (result.success) {
            console.log("ブラウザ起動依頼成功", result.message);
        } else {
            updateMessageOverlay(`🌐 ブラウザ起動失敗（${result.messag}）。`, 6000);
        }

        hideURLInputControls();
        filenamePanel.style.display = 'flex';
        showControlsAndFilename();
        updateIconOverlay();
    } catch (error) {
        console.error("IPCエラー:", err);
        updateMessageOverlay(`🌐 ネットURLの設定失敗（${error.message}）。別のURLを試してください。`, 6000);
        updateIconOverlay();
    }
}

// ネットURLプラットフォーム判定
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

// TwitchのID抽出
function extractTwitchVideoId(url) {
    const regex = /twitch\.tv\/videos\/(\d+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// YouTubeのリストID抽出
function extractYouTubePlaylistId(url) {
    const regex = /[?&]list=([^&#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// YouTubeのID抽出
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

// プレイリスト項目を共通形式へ正規化
async function createPlaylistItem(file) {
    const fileData = typeof file === 'string' ? {} : (file?.file || file || {});
    const filePath = typeof file === 'string' ? file : fileData.path;
    if (!filePath) return null;

    let time = typeof fileData.time === 'number' ? fileData.time : 0;
    if (!time) {
        try {
            const stats = await fs.stat(filePath);
            time = stats.mtimeMs || 0;
        } catch (error) {
            console.warn(`ファイル情報取得失敗: ${filePath}`, error);
        }
    }

    return {
        file: {
            ...fileData,
            path: filePath,
            name: fileData.name || path.basename(filePath),
            ext: fileData.ext || path.extname(filePath).toLowerCase(),
            time
        }
    };
}

// プレイリストのファイル追加
async function playlistAdd(videoFiles) {
    if (!videoFiles || videoFiles.length === 0) {
        hideMessageOverlay();
        return;
    }

    // 既存のプレイリスト内のパス一覧
    const existingPaths = new Set(playlist.map(item => item?.file?.path));

    // 多重を除外した新しいファイルのみを抽出（追加リスト内での多重も排除）
    const uniqueVideoFiles = [];
    for (const file of videoFiles) {
        const filePath = file?.path || file?.file?.path;
        if (filePath && !existingPaths.has(filePath)) {
            existingPaths.add(filePath);
            uniqueVideoFiles.push(file);
        }
    }

    // すべて多重していて追加対象がない場合は中断
    if (uniqueVideoFiles.length === 0) {
        hideMessageOverlay();
        return;
    }

    // 実際に生成に成功した要素のみを取得
    const mappedNewFiles = (await Promise.all(uniqueVideoFiles.map(file => createPlaylistItem(file))))
        .filter(Boolean);

    if (mappedNewFiles.length === 0) {
        hideMessageOverlay();
        return;
    }

    const isFirstTime = playlist.length === 0;

    // 既存の playlist の末尾に追加
    playlist.push(...mappedNewFiles);

    // 実際に playlist に追加された要素からパスを取得して originalLoadOrder に追加
    const addedPaths = mappedNewFiles.map(item => item.file.path);
    originalLoadOrder.push(...addedPaths);
    localStorageSetItemAndFile('originalLoadOrder', JSON.stringify(originalLoadOrder));

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
    if (!videoFiles || videoFiles.length === 0) {
        isPlaylistCreationInProgress = false;
        hidePlaylistProgress();
        hideMessageOverlay();
        return;
    }
    await cleanupTempFiles();

    // 実際に生成に成功した要素のみを取得
    const newPlaylist = (await Promise.all(videoFiles.map(file => createPlaylistItem(file))))
        .filter(Boolean);

    if (newPlaylist.length === 0) {
        isPlaylistCreationInProgress = false;
        hidePlaylistProgress();
        hideMessageOverlay();
        return;
    }

    // playlist を初期設定
    playlist = newPlaylist;

    // 生成成功した playlist の要素から元の読み込み順（Base順）を作成・保存
    originalLoadOrder = playlist.map(item => item.file.path);
    localStorageSetItemAndFile('originalLoadOrder', JSON.stringify(originalLoadOrder));

    // 現状の並び替えモード（currentSortMode）を適用
    await applySort(currentSortMode);

    currentVideoIndex = 0;
    selectedPlaylistIndex = 0;
    await playVideo(playlist[currentVideoIndex].file, 0);
    savePlaylistAndPlaybackState();
    resetShuffle();
    saveShuffleState();
    updateIconOverlay();
    setPlaylistProgress(100);
}

// HTML5対応拡張子判定
function isVIDEO_EXTENSIONS(ext) {
    const cleanExt = ext.split('?')[0].toLowerCase();
    if (modeChange === 'video') {
        return VIDEO_EXTENSIONS.includes(cleanExt) || AUDIO_EXTENSIONS.includes(cleanExt);
    } else {
        return VIDEO_EXTENSIONS_CONVERT.includes(cleanExt);
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
            playPauseBtn.textContent = '▶️';
            playPauseBtn.classList.add('paused-active');
            playPauseBtn.setAttribute('data-tooltip', '再生（Space／Right Click）');
            localStorageSetItemAndFile('currentTime', videoPlayer.currentTime);
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
async function insertFilesIntoPlaylist(files, addPosition = 0) {
    if (!files || files.length === 0) {
        hideMessageOverlay();
        return;
    }

    // 既存のプレイリスト内のパス一覧（Setで高速化）
    const existingPaths = new Set(playlist.map(item => item?.file?.path));

    const normalizedFiles = files
        .map(file => ({
            path: file?.path || file?.file?.path || null,
            name: file?.name || path.basename(file?.path || file?.file?.path || '')
        }))
        // パスが存在し、かつ既存のプレイリストに含まれていないものだけを抽出
        .filter(file => file.path && !existingPaths.has(file.path));

    // 追加する新規ファイル内での多重も排除したい場合（必要に応じて）
    const uniqueFiles = [];
    for (const file of normalizedFiles) {
        if (!existingPaths.has(file.path)) {
            existingPaths.add(file.path);
            uniqueFiles.push(file);
        }
    }

    if (uniqueFiles.length === 0) {
        hideMessageOverlay();
        return;
    }

    const insertIndex = getPlaylistInsertIndex(addPosition);
    const formattedFiles = (await Promise.all(uniqueFiles.map(file => createPlaylistItem(file))))
        .filter(Boolean);
    playlist.splice(insertIndex, 0, ...formattedFiles);
    if (selectedPlaylistIndex < 0) selectedPlaylistIndex = insertIndex;

    if (currentVideoIndex >= 0 && insertIndex <= currentVideoIndex) {
        currentVideoIndex += formattedFiles.length;
    }

    // 追加後も「現在のプレイリスト順」を「なし」の基準とする
    const currentPaths = playlist.map(item => item.file.path);
    originalLoadOrder = [...currentPaths];
    localStorageSetItemAndFile('originalLoadOrder', JSON.stringify(originalLoadOrder));

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

// プレイリスト削除
async function removeFromPlaylist() {
    const selectedIndex = selectedPlaylistIndex >= 0 && selectedPlaylistIndex < playlist.length ? selectedPlaylistIndex : currentVideoIndex;
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= playlist.length) {
        updateMessageOverlay('📚 削除するメディアを選択してください');
        return;
    }

    await cleanupTempFiles();
    
    // 現在再生されているメディアが削除対象、かつ実際に再生中（paused ではない）かを判定
    const isCurrentlyPlaying = currentVideoIndex === selectedIndex && !videoPlayer.paused;

    // 削除対象のファイルパスを取得（spliceする前に保存）
    const removedItem = playlist[selectedIndex];

    // 削除実行
    playlist.splice(selectedIndex, 1);

    // --- originalLoadOrder から削除対象パスを除去して localStorage に保存 ---
    if (removedItem && Array.isArray(originalLoadOrder)) {
        originalLoadOrder = originalLoadOrder.filter(path => path !== removedItem.file.path);
        localStorageSetItemAndFile('originalLoadOrder', JSON.stringify(originalLoadOrder));
    }
    // ---------------------------------------------------------------------------------

    // 削除後の新しいインデックスを計算
    let newIndex;
    if (selectedIndex < playlist.length) {
        // 次がある → 次を選択
        newIndex = selectedIndex;
    } else {
        // 次がない（最終行）→ 前を選択
        newIndex = Math.max(0, playlist.length - 1);
    }

    if (playlist.length > 0) {
        // 削除対象が現在読み込まれているメディア（currentVideoIndex）の場合の処理
        if (currentVideoIndex === selectedIndex) {
            currentVideoIndex = newIndex;
            const nextFile = playlist[newIndex].file;

            if (isCurrentlyPlaying) {
                // 【再生中だった場合】新しいメディアを playVideo() で自動再生
                await playVideo(nextFile);
            } else {
                // 【一時停止・停止中だった場合】新しいメディアを読み込んで停止状態にする
                await setVideoSrc(nextFile);
                isPlaying = false;
                videoPlayer.pause();
            }
        } else if (currentVideoIndex > selectedIndex) {
            // 削除位置より後ろにあった場合、インデックスを1繰り下げる
            currentVideoIndex -= 1;
        }

        selectedPlaylistIndex = newIndex;
        updatePlaylistDisplay();
    } else {
        // プレイリストが空になった場合
        videoPlayer.pause();
        isPlaying = false;
        videoPlayerElement.removeAttribute('src');
        audioPlayer.removeAttribute('src');
        playlistPathArea.value = appNameAndCopyrightValueLine;
        updateIconOverlay();
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

    // クリアしたら基準順もクリア
    originalLoadOrder = [];
    localStorageRemoveItemAndFile('originalLoadOrder');

    savePlaylistAndPlaybackState();
    resetShuffle();
    saveShuffleState();
    showControlsAndFilename();
}

// プレイリスト保存
async function savePlaylist() {
    if (playlist.length === 0) {
        updateMessageOverlay('📚 保存するメディアがありません', 6000);
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
        updateMessageOverlay(`📚 保存完了: ${path.basename(result.filePath)}`);
    } else {
        updateMessageOverlay('📚 保存に失敗しました', 6000);
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
    } else {
        hidePlaylistProgress();
    }
}

// 動画変換中止・一時ファイル削除
async function cleanupTempFiles() {
    // FFmpeg変換中断
    if (isConverting) {
        await cancelConversion();  // 即中断
        isConverting = false;
        updateMessageOverlay('🔄️ 変換中止');
    }

    // 一時ファイル削除
    await deleteTempVideo();
}

// 全動画結合処理
async function joinPlaylistVideos() {
    // プレイリストから動画ファイルのみを抽出（拡張子を抽出して判定）
    const videoFiles = playlist.filter(item => {
        const filePath = item.file?.path || '';
        const ext = filePath.substring(filePath.lastIndexOf('.'));
        return VIDEO_EXTENSIONS.includes(ext);
    });

    // 動画ファイルの数で判定
    if (videoFiles.length < 2) {
        updateMessageOverlay(
            videoFiles.length === 0 
                ? '🎞️ 動画ファイルが含まれていません' 
                : '🎞️ 動画が1つだけなので結合不要です'
        );
        return;
    }

    // デフォルトファイル名（最初の「動画」名 + _join.mp4）
    const firstFile = videoFiles[0].file.path;
    const baseName = path.parse(path.basename(firstFile)).name;
    const fileCount = videoFiles.length; // 動画ファイルの数を使用
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
    updateMessageOverlay('🎞️ 動画結合準備中…', 0);

    try {
        // 動画ファイルのみのパスリストを作成
        const videoPaths = videoFiles.map(item => item.file.path);

        const result = await joinVideos({
            inputPaths: videoPaths,
            outputPath: outputPath,
            frameRate: editFrameRate || 30
        });

        if (result && result.outputPath) {
            updateMessageOverlay(`🎞️ 動画結合完了`);
        } else {
            updateMessageOverlay('🎞️ 動画結合が中断されました');
        }
    } catch (err) {
        console.error('結合エラー:', err);
        updateMessageOverlay(`🎞️ 動画結合失敗: ${err.message || '不明なエラー'}`, 6000);
    } finally {
        isJoinEditing = false;
        cutCancelBtn.style.display = 'none';
    }
}

// 全音声結合処理
async function joinPlaylistAudios() {
    // プレイリストから音声ファイルのみを抽出
    const audioFiles = playlist.filter(item => {
        const filePath = item.file?.path || '';
        const ext = filePath.substring(filePath.lastIndexOf('.'));
        return AUDIO_EXTENSIONS.includes(ext); // 音声用判定関数
    });

    // 音声ファイルの数で判定
    if (audioFiles.length < 2) {
        updateMessageOverlay(
            audioFiles.length === 0 
                ? '🎵 音声ファイルが含まれていません' 
                : '🎵 音声が1つだけなので結合不要です'
        );
        return;
    }

    // デフォルトファイル名（最初の音声名 + _join×件数.m4a）
    const firstFile = audioFiles[0].file.path;
    const baseName = path.parse(path.basename(firstFile)).name;
    const fileCount = audioFiles.length;
    const defaultName = `${baseName}_join×${fileCount}.m4a`;

    // 保存ダイアログを表示
    const saveResult = await showSaveAudioJoinDialog({ fileName: defaultName });

    if (saveResult.canceled || !saveResult.filePath) {
        return;
    }

    const outputPath = saveResult.filePath;

    // 結合開始
    isJoinEditing = true;           // 中断ボタン制御用
    cutCancelBtn.style.display = 'inline-block';
    updateMessageOverlay('🎵 音声結合準備中…', 0);

    try {
        const audioPaths = audioFiles.map(item => item.file.path);

        const result = await joinAudios({
            inputPaths: audioPaths,
            outputPath: outputPath
        });

        if (result && result.outputPath) {
            updateMessageOverlay(`🎵 音声結合完了`);
        } else {
            updateMessageOverlay('🎵 結合が中断されました');
        }
    } catch (err) {
        console.error('音声結合エラー:', err);
        updateMessageOverlay(`🎵 音声結合失敗: ${err.message || '不明なエラー'}`, 6000);
    } finally {
        isJoinEditing = false;
        cutCancelBtn.style.display = 'none';
    }
}

// 再生速度設定
function setPlaybackRate(rate, showOverlay = true) {
    if (isNaN(rate) || rate <= 0) return;
    currentPlaybackRate = rate;
    videoPlayer.playbackRate = rate;

    if (speedSelect) speedSelect.value = parseFloat(rate).toFixed(2);
    localStorageSetItemAndFile('playbackSpeed', rate);

    if (showOverlay) {
        updateMessageOverlay(`🏃‍♂️‍➡️ ${rate}x`);
    }

    // 画像表示中の場合は進行タイマーと切り替えタイマーを現在速度で再構築
    if (currentMediaType === 'image' && imageTimer) {
        clearTimeout(imageTimer);
        stopImageProgress();

        const remainingMs = ((IMAGE_DURATION - imageCurrentTime) / currentPlaybackRate) * 1000;
        if (remainingMs <= 0) {
            playNextPlaylistItem();
        } else {
            startImageProgress();
            imageTimer = setTimeout(async () => {
                imageTimer = null;
                stopImageProgress();
                await playNextPlaylistItem();
            }, remainingMs);
        }
    }
}

// 再生速度変更（増速／減速）
function changePlaybackRate(direction) { // direction: 1 増速, -1 減速
    // 動画/画像問わず currentPlaybackRate から現在のインデックスを取得
    const current = parseFloat(currentPlaybackRate || 1.0);
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
        updateMessageOverlay(`🏃‍♂️‍➡️ ${playbackRates[newIdx]}x`);
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
        let longestCutIndex = -1;           // 最長のカット番号（0ベース）

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
        
            // を表示するかどうか判定
            let showStar = false;
        
            // 1. 10分超えているか
            if (durationSec > 600) {
                // 2. 最後のカット範囲（idx === cutRanges.length - 1）かどうか
                if (idx === cutRanges.length - 1) {
                    // 最後の範囲が動画の最後までカバーしているか
                    const lastRange = cutRanges[cutRanges.length - 1];
                    const isLastToEnd = lastRange && Math.abs(lastRange.out - videoPlayer.duration) < 1.0;
        
                    // 最後までカット範囲 → 非表示
                    showStar = !isLastToEnd;
                } else {
                    // 最後のカット範囲ではない → 表示
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
    }

	// タイムラインバー部分
	if (!cutTimelineContainer || !cutTimelineBar) return;
	
	cutTimelineBar.innerHTML = ''; // クリア
	
	// 動画の総再生時間（duration）がない場合はここで終了
	if (!videoPlayer.duration) return;
	
	const duration = videoPlayer.duration;
	
	// 1. カット範囲（赤バー）の描画（cutRanges が存在する場合のみ実行）
	if (cutRanges && cutRanges.length > 0) {
	    cutRanges.forEach((range) => {
	        const leftPercent  = (range.in  / duration) * 100;
	        const widthPercent = ((range.out - range.in) / duration) * 100;
	
	        const bar = document.createElement('div');
	        bar.className = 'cut-range-bar';
	        bar.style.left  = `${leftPercent}%`;
	        bar.style.width = `${widthPercent}%`;
	
	        cutTimelineBar.appendChild(bar);
	    });
	}

	// 2. Inマーク（白い縦線）
	if (typeof editInMark === 'number' && editInMark >= 0 && editInMark <= duration) {
	    const inLeft = (editInMark / duration) * 100;
	    const inMarker = document.createElement('div');
	    inMarker.className = 'edit-in-marker';
	    inMarker.style.left = `${inLeft}%`;
	    
	    const inLine = document.createElement('div');
	    inLine.className = 'marker-line';
	    inMarker.appendChild(inLine);
	    
	    cutTimelineBar.appendChild(inMarker);
	}
	
	// 3. Outマーク（白い縦線）
	if (typeof editOutMark === 'number' && editOutMark >= 0 && editOutMark <= duration) {
	    const outLeft = (editOutMark / duration) * 100;
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
    const sorted = [...getPlaylistInOriginalOrder()];
    
    const itemsWithTime = sorted.map(item => ({ ...item, ctime: item.file?.time || 0 }));

    // 昇順／降順でソート
    itemsWithTime.sort((a, b) => ascending ? a.ctime - b.ctime : b.ctime - a.ctime);

    return itemsWithTime;
}

// 安全に JSON パースを行うヘルパー関数
// @param {any} input - パース対象の値
// @param {any} fallback - エラー時または無効な場合のデフォルト値
function safeJSONParse(input, fallback = []) {
    if (!input) return fallback;
    // 既に配列やオブジェクトの場合はそのまま返す
    if (typeof input === 'object') return input;
    
    if (typeof input === 'string') {
        try {
            return JSON.parse(input);
        } catch (e) {
            return fallback;
        }
    }
    return fallback;
}

// 元の順番を localStorage から復元するヘルパー関数
function getStoredOriginalLoadOrder() {
    try {
        if (!originalLoadOrder) return [];
        
        // 既に配列になっている場合はそのまま返す
        if (Array.isArray(originalLoadOrder)) {
            return originalLoadOrder;
        }

        // 文字列の場合は JSON.parse を試みる
        if (typeof originalLoadOrder === 'string') {
            const parsed = JSON.parse(originalLoadOrder);
            return Array.isArray(parsed) ? parsed : [];
        }

        return [];
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
        localStorageSetItemAndFile('originalLoadOrder', JSON.stringify(originalLoadOrder));
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

// 並び順メニュー「（ランダム）」選択時
function sortRandomPlaylist() {
    // ケース5：🔀 が OFF なら表示を一切変えない（そのまま返す）
    if (!isRandomPlayMode) {
        return [...playlist];
    }

    // ケース6：🔀 が ON なら既存の shuffleOrder を表示に適用
    if (!shuffleOrder || shuffleOrder.length !== playlist.length) {
        console.warn('shuffleOrder が不整合のため、表示変更をスキップ');
        return [...playlist];
    }

    // 1. 常に「オリジナル（ソートなし）のプレイリスト」を取得
    const originalPlaylist = getPlaylistInOriginalOrder();

    // 2. オリジナル配列のインデックスに従ってランダム順の新しい配列を生成
    const newPlaylist = shuffleOrder.map(idx => ({ ...originalPlaylist[idx] }));

    // 3. 現在再生中のファイルパスを取得（変更前の再生位置保持用）
    const isStopped = (currentVideoIndex === -1);
    const currentPath = !isStopped ? playlist[currentVideoIndex]?.file?.path : null;

    // 4. 新しいリスト内での再生位置（currentVideoIndex）を計算
    if (currentPath) {
        const newIndex = newPlaylist.findIndex(item => item.file?.path === currentPath);
        currentVideoIndex = newIndex >= 0 ? newIndex : 0;
    } else if (isStopped) {
        currentVideoIndex = -1; // 停止状態なら -1 を維持
    } else {
        currentVideoIndex = 0;
    }

    shufflePosition = currentVideoIndex; // 表示順の位置を shufflePosition とする

    // ※ ここにあった `playlist = newPlaylist;` の直接上書きは削除します。
    // （applySort 側の `playlist = await SORT_MODES[modeKey].fn();` で安全に反映されます）

    return newPlaylist;
}

// 並び替え実行関数
async function applySort(modeKey = currentSortMode) {
    if (!SORT_MODES[modeKey]) return;

    currentSortMode = modeKey;
    localStorageSetItemAndFile('playlistSortMode', modeKey);

    // 変更前の対象インデックスを特定（再生中なら currentVideoIndex、手動停止中なら selectedPlaylistIndex）
    const targetIdx = currentVideoIndex >= 0 ? currentVideoIndex : selectedPlaylistIndex;

    // 変更前の選択/再生中のファイルパスを取得（自動停止時などで対象が無い場合は null）
    const prevSelectedPath = (targetIdx >= 0 && playlist[targetIdx]) ? playlist[targetIdx].file?.path : null;

    // リストを並び替え
    playlist = await SORT_MODES[modeKey].fn();

    // --- 再生位置 (currentVideoIndex) および selectedPlaylistIndex / shufflePosition の再調整 ---
    if (prevSelectedPath) {
        // 再生中、または手動停止中の場合（選択していたパスが存在する）
        const newIndex = playlist.findIndex(item => item.file?.path === prevSelectedPath);
        const resolvedIndex = newIndex >= 0 ? newIndex : 0;

        // 再生中なら currentVideoIndex を更新
        if (currentVideoIndex >= 0) {
            currentVideoIndex = resolvedIndex;
        }

        // 手動停止中・再生中に応じて selectedPlaylistIndex を並び替え後の位置に追従させる
        selectedPlaylistIndex = resolvedIndex;

        // ランダム再生 ON ＆「（ランダム）」以外の表示モード時、
        // 選択中の曲が shuffleOrder の何番目（インデックス）にあるかを計算して sync する
        if (isRandomPlayMode && currentSortMode !== 'random') {
            const originalPlaylist = getPlaylistInOriginalOrder();
            const origIdx = originalPlaylist.findIndex(item => item?.file?.path === prevSelectedPath);
            
            if (origIdx !== -1 && shuffleOrder) {
                const pos = shuffleOrder.indexOf(origIdx);
                shufflePosition = pos >= 0 ? pos : 0;
            } else {
                shufflePosition = 0;
            }
        }
    } else {
        // 終端再生終了時（自動停止中）など、選択パスがない場合
        currentVideoIndex = -1;
        selectedPlaylistIndex = -1;
        shufflePosition = 0;
    }

    updatePlaylistDisplay();
    savePlaylistAndPlaybackState();
    saveShuffleState();
}

// 並び替えポップアップメニュー作成関数
function createSortMenu() {
    const menu = document.createElement('div');
    menu.className = 'sort-playlist-menu';

    Object.entries(SORT_MODES).forEach(([key, {label}]) => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.style.color = currentSortMode === key ? '#00ccff' : '#eee';
        item.innerHTML = (currentSortMode === key ? '✅ ' : '　　') + label;

        item.addEventListener('click', async (event) => {
            event.stopPropagation();
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

// ファイルパスから拡張子（小文字）を取得するヘルパー関数
function getFileExtension(filePath) {
    if (!filePath) return '';
    const ext = path.extname(filePath).toLowerCase();
    return ext ? ext : '拡張子なし';
}

// 並び替えボタンのUI更新関数
function updateRepeatButtonUI() {
    const btn = repeatPlayBtn;

    btn.classList.remove('repeat-all', 'repeat-single');
    btn.textContent = '🔁';  // デフォルト

    if (isRepeatPlayMode === 'all') {
        btn.classList.add('repeat-all');
        btn.setAttribute('data-tooltip', '全メディア繰り返し再生中（Ctrl+Shift+r）');
    } else if (isRepeatPlayMode === 'single') {
        btn.classList.add('repeat-single');
        btn.textContent = '🔂';
        btn.setAttribute('data-tooltip', '1メディア繰り返し再生中（Ctrl+Shift+r）');
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
    localStorageSetItemAndFile('isRepeatPlayMode', isRepeatPlayMode);
    updateRepeatButtonUI();
}

// 共通の追加処理ハンドラー
async function addFilesToPlaylist(getPathsFn, getFilesFn) {
    try {
        const paths = await getPathsFn();
        if (!paths || (Array.isArray(paths) && paths.length === 0)) return;
        
        updateMessageOverlay(`📚 プレイリスト追加中...`, 0, false);
        const videoFiles = await getFilesFn(paths);
        await insertFilesIntoPlaylist(videoFiles, getCurrentAddModePosition());
        hideMessageOverlay(true);
    } catch (e) {
        console.error('プレイリスト追加エラー:', e);
        updateMessageOverlay('📚 追加に失敗', 6000);
    }
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

    // ADD_MODES をループしてメニューアイテムを一括生成
    Object.entries(ADD_MODES).forEach(([key, mode]) => {
        // セパレーターの描画
        if (mode.isSeparator) {
            const separator = document.createElement('div');
            separator.style.margin = '6px 0';
            separator.style.borderTop = '1px solid #666';
            menu.appendChild(separator);
            return;
        }

        // 即時実行アクション（フォルダ／ファイル選択）の場合
        if (mode.isAction) {
            const item = createMenuItem(mode.label, false, async () => {
                menu.remove();
                await mode.fn();
            });
            menu.appendChild(item);
            return;
        }

        // モード切り替え（選択行に追加／選択行の下に追加）の場合
        const isSelected = currentAddMode === key;
        const item = createMenuItem((isSelected ? '✅ ' : '　　') + mode.label, isSelected, () => {
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
function resetCursorTimer(compulsion = false) {
    if (!pauseShowControls || compulsion) {
	    if (isPanning) {    
	        videoPlayer.style.cursor = 'grabbing'; 
	    } else {
	        videoPlayer.style.cursor = 'auto'; 
	    }
	    videoContainer.style.cursor = 'auto'; 
	}
	
    // 既存のタイマーがあればクリア
    if (hideMouseTimeout) {
        clearTimeout(hideMouseTimeout);
    }
    
    // プレイリスト表示中は、これ以上（非表示へのタイマー移行）の処理を行わない
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

    // 座標基準を window / document.body に統一（フルスクリーンでも安全）
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
            updateMessageOverlay(`🔠 字幕ファイルが存在しません`, 6000);
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
        selectedSubtitleLabel !== '（なし）' ? subtitleSelectBtn.classList.add('subtitles-active') : null;
        localStorageSetItemAndFile('selectedSubtitleTrack', JSON.stringify(currentSubtitleTrack));
        localStorageSetItemAndFile('selectedSubtitleLabel', selectedSubtitleLabel);
    } else {
        updateVideoAudio(trackObj, currentTracks);
        
        currentAudioTrack = trackObj;
        selectedAudioLabel = trackObj ? getCleanLabel(fullLabel) : '日本語';
        localStorageSetItemAndFile('selectedAudioTrack', JSON.stringify(currentSubtitleTrack));
        localStorageSetItemAndFile('selectedAudioLabel', selectedAudioLabel);
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
            // すでに配列ならそのまま使い、文字列なら JSON.parse する
            if (Array.isArray(savedFilterHistory)) {
                filterHistory = savedFilterHistory;
            } else if (typeof savedFilterHistory === 'string') {
                filterHistory = JSON.parse(savedFilterHistory);
            } else {
                filterHistory = [];
            }

            // 件数制限
            if (filterHistory.length > 1000) {
                filterHistory = filterHistory.slice(-1000);
            }
        } catch (e) {
            console.error('filterHistory の読み込みエラー:', e);
            filterHistory = [];
        }
    } else {
        filterHistory = [];
    }
    updateFilterHistoryList();
}

// フィルタ履歴をlocalStorageに保存
function saveFilterHistory() {
    localStorageSetItemAndFile('filterHistory', JSON.stringify(filterHistory));
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
    
    // .slice().reverse() で最新の入力が上にくるよう逆順でループ処理
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
    // 絞り込み後のリスト要素が存在する場合のみ表示する
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

// 常に最前面ボタンのUI更新
function updateAlwaysOnTopButtonUI() {
    if (!alwaysOnTopBtn) return;
    alwaysOnTopBtn.classList.toggle('always-on-top-active', isAlwaysOnTop);
    alwaysOnTopBtn.setAttribute('data-tooltip', isAlwaysOnTop ? '常に最前面を解除（Ctrl+1）' : '常に最前面を設定（Ctrl+1）');
}

// 常に最前面切替
async function toggleAlwaysOnTop() {
    isAlwaysOnTop = !isAlwaysOnTop;
    await setAlwaysOnTop(isAlwaysOnTop);
    localStorageSetItemAndFile('alwaysOnTop', isAlwaysOnTop ? 'true' : 'false');
    updateAlwaysOnTopButtonUI();
}

// メディアファイルの拡張子を取得する関数
function getMediaFileExtension(filePath) {
    if (!filePath) return '';
    const cleanPath = filePath.split('?')[0];
    return path.extname(cleanPath).toLowerCase();
}

// メディアファイルが音声ファイルかどうかを判定する関数
function isAudioFilePath(filePath) {
    const ext = getMediaFileExtension(filePath);
    return AUDIO_EXTENSIONS.includes(ext);
}

// メディアプレイヤーの表示を更新する関数
function updateMediaPlayerDisplay() {
    const isAudio = currentMediaType === 'audio';
    const isImage = currentMediaType === 'image';

    // 動画プレイヤーの表示切替
    if (videoPlayerElement) {
        videoPlayerElement.style.display = (isAudio || isImage) ? 'none' : 'block';
    }

    // 音声プレイヤーの表示切替
    if (audioPlayer) {
        audioPlayer.style.display = isAudio ? 'block' : 'none';
    }

    // 画像ラッパーおよび画像要素の表示切替
    if (imageWrapper) {
        imageWrapper.style.display = isImage ? 'block' : 'none';
    }
    if (imagePlayer) {
        imagePlayer.style.display = isImage ? 'block' : 'none';
    }

    // ビデオプレビューの表示切替
    if (videoPreview) {
        videoPreview.style.display = 'none';
    }
}

// メディアプレイヤーのプロキシを作成する関数
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
        return VIDEO_EXTENSIONS.includes(cleanExt);
    } else {
        return VIDEO_EXTENSIONS_CONVERT.includes(cleanExt);
    }
}

// オーディオモーションの初期化関数
function updateAudioMotion() {
    if (audioMotionBtn) {
        // 一旦クラスをクリアして状態に応じて適切なクラスを付与
        audioMotionBtn.classList.remove('audio-motion-active', 'random-motion-active');

        if (audioMotionMode === 'random') {
            audioMotionBtn.classList.add('random-motion-active');
        } else if (audioMotionMode && audioMotionMode !== 'none') {
            audioMotionBtn.classList.add('audio-motion-active');
        }
    }
    
    localStorageSetItemAndFile('audioMotionMode', audioMotionMode);

    const visualizerContainer = document.getElementById('visualizerContainer');
    const audioPlayer = document.getElementById('audioPlayer');

    // 「（なし）」または未定義の場合
    if (!audioMotionMode || audioMotionMode === 'none') {
        window.AudioMotionAPI.disable();
        return;
    }

    // 実際に適用するモードのキーを決定
    let targetMode = audioMotionMode;
    if (targetMode === 'random') {
        // AUDIOMOTION_NODES から「なし」と「ランダム」を除外したキーを動的に取得
        // ※除外対象のキー名や日本語ラベルに合わせて条件を調整してください
        const excludeKeys = ['none', 'random', 'なし', 'ランダム', '（なし）', '（ランダム）'];
        const presets = Object.keys(AUDIOMOTION_NODES).filter(
            key => !excludeKeys.includes(key) && !excludeKeys.includes(AUDIOMOTION_NODES[key]?.label)
        );
        // 前回選ばれたプリセットを除外した候補リストを作成
        const availablePresets = presets.filter(preset => preset !== lastRandomPreset);
        // 候補の中からランダムで選択（候補が存在する場合）
        if (availablePresets.length > 0) {
            targetMode = availablePresets[Math.floor(Math.random() * availablePresets.length)];
        } else if (presets.length > 0) {
            // 万が一前回と同じ1つしか候補がない場合などのフォールバック
            targetMode = presets[0];
        }
        // 今回選ばれたプリセットを記憶
        lastRandomPreset = targetMode;
    } else {
        // ランダム以外のモード（個別のプリセットやnoneなど）が手動選択された場合は記憶をリセット
        lastRandomPreset = null;
    }

    // 選択されたノードを取得（存在しないキーの場合は default を参照）
    const presetNode = AUDIOMOTION_NODES[targetMode] || AUDIOMOTION_NODES['none'];

    // デフォルトオプションに選択プリセットの固有設定をマージ
    const newOptions = Object.assign({}, DEFAULT_AUDIO_MOTION_OPTIONS, presetNode.options);

    try {
        // preload 側の実体に対して処理を委託する
        window.AudioMotionAPI.initOrUpdate(visualizerContainer, audioPlayer, newOptions);
    } catch (err) {
        console.error('AudioMotion の初期化・更新に失敗しました:', err);
    }
}

// オーディオモーションの表示切替
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

// DEFAULT_AUDIO_MOTION_OPTIONS を localStorage に保存する
function saveAudioMotionOptions() {
    try {
        localStorageSetItemAndFile('audioMotionOptions', JSON.stringify(DEFAULT_AUDIO_MOTION_OPTIONS));
    } catch (err) {
        console.error('DEFAULT_AUDIO_MOTION_OPTIONS の保存に失敗しました:', err);
    }
}

// DEFAULT_AUDIO_MOTION_OPTIONS を localStorage から読み込んで復元する
// 保存されていない場合はデフォルト値をそのまま使用し、localStorage に初期保存する
function loadAudioMotionOptions() {
    const jsonStr = localStorage.getItem('audioMotionOptions');
    if (jsonStr) {
        try {
            const parsed = JSON.parse(jsonStr);
            // 既存の DEFAULT_AUDIO_MOTION_OPTIONS のプロパティを上書き・復元
            Object.assign(DEFAULT_AUDIO_MOTION_OPTIONS, parsed);
        } catch (err) {
            console.error('DEFAULT_AUDIO_MOTION_OPTIONS の復元に失敗したため初期値を使用します:', err);
            saveAudioMotionOptions();
        }
    } else {
        // localStorage に存在しない場合はデフォルト値を保存
        saveAudioMotionOptions();
    }
}

// AUDIOMOTION_NODES を localStorage に保存する
function saveAudioMotionNodes() {
    try {
        localStorageSetItemAndFile('audioMotionNodes', JSON.stringify(AUDIOMOTION_NODES));
    } catch (err) {
        console.error('AUDIOMOTION_NODES の保存に失敗しました:', err);
    }
}

// AUDIOMOTION_NODES を localStorage から読み込んで復元する
// 保存されていない場合はデフォルト値をそのまま使用し、localStorage に初期保存する
function loadAudioMotionNodes() {
    const jsonStr = localStorage.getItem('audioMotionNodes');
    if (jsonStr) {
        try {
            const parsed = JSON.parse(jsonStr);
            Object.keys(AUDIOMOTION_NODES).forEach(key => delete AUDIOMOTION_NODES[key]);
            Object.assign(AUDIOMOTION_NODES, parsed);
        } catch (err) {
            console.error('AUDIOMOTION_NODES の復元に失敗したため初期値を使用します:', err);
            saveAudioMotionNodes();
        }
    } else {
        saveAudioMotionNodes();
    }
}

// イメージエフェクト＆BGMの初期化関数
function updateImageEffectBgm() {
    // イメージエフェクト＆BGM設定ボタンの背景色設定
    if (imageEffectBgmBtn) {
        imageEffectBgmBtn.classList.remove('image-effectbgm-active', 'random-effectbgm-active');
        if (imageEffectBgmMode === 'random') {
            imageEffectBgmBtn.classList.add('random-effectbgm-active');
        } else if (imageEffectBgmMode && imageEffectBgmMode !== 'none') {
            imageEffectBgmBtn.classList.add('image-effectbgm-active');
        }
    }
}

// localStorageバックアップファイル更新付きlocalStrage.setItem
async function localStorageSetItemAndFile(key, value) {
    let parsedValue = value;
    let stringValue = value;

    if (typeof value === 'string') {
        // value がすでに JSON 文字列化されている場合はオブジェクトに復元（二重化防止）
        try {
            parsedValue = JSON.parse(value);
        } catch (e) {
            // 通常の文字列の場合はそのまま保持
            parsedValue = value;
        }
    } else {
        // value がオブジェクト/配列等の場合は JSON 文字列に変換
        stringValue = JSON.stringify(value);
    }
    // 1. メモリ上のオブジェクトには生データ（オブジェクト/配列/基本型）を保持
    localSettings[key] = parsedValue;

    if (!isSecondary) {
        // 2. localStorage には文字列化されたデータを保存
        localStorage.setItem(key, stringValue);
        // 3. ファイルへ保存
        await exportSettingsToFile(settingsFilePath);
    }
}

// localStorageバックアップファイル更新付きlocalStrage.removeItem
async function localStorageRemoveItemAndFile(key) {
    // メモリ上のオブジェクトから削除
    delete localSettings[key];
        
    if (!isSecondary) {
        localStorage.removeItem(key);
        await exportSettingsToFile(settingsFilePath);
    }
}

// localStorageバックアップファイル更新付きlocalStrage.clear
async function localStorageClearAndFile() {
    // メモリ上のオブジェクトを空にする
    localSettings = {};

    if (!isSecondary) {
        localStorage.clear();
        await exportSettingsToFile(settingsFilePath);
    }
}

// オーバーレイ表示
function updateMessageOverlay(content, autoHideAfter = overlayTimeout, isShowControls = true) {
    if (content.includes('プレイリスト作成中')) {
        showPlaylistProgress();
    }
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
    if (isShowControls) {
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
            hideMessageOverlay();
        }, autoHideAfter);
        disableMessageOverlay = false;
    } else {
        disableMessageOverlay = true;
    }
}

// プレイリスト作成中の進捗バー表示
function showPlaylistProgress(resetProgress = true) {
    isPlaylistCreationInProgress = true;
    if (playlistProgressBar) {
        if (resetProgress) {
            playlistProgressBar.style.width = '0%';
            playlistProgressBar.setAttribute('aria-valuenow', '0');
        }
        playlistProgressBar.style.display = 'block';
    }
}

// プレイリスト作成中の進捗バー更新
function setPlaylistProgress(percent) {
    if (!playlistProgressBar) return;
    const progress = Math.max(0, Math.min(100, Math.round(percent)));
    playlistProgressBar.style.width = `${progress}%`;
    playlistProgressBar.setAttribute('aria-valuenow', String(progress));
}

// プレイリスト作成完了時の処理
function finishPlaylistCreation() {
    setPlaylistProgress(100);
    isPlaylistCreationInProgress = false;
    hidePlaylistProgress();
}

function finalizePlaylistProgress(isCreationRender) {
    if (isPlaylistCreationInProgress && filterText.trim()) {
        showPlaylistProgress(false);
        return;
    }
    if (isCreationRender) {
        finishPlaylistCreation();
    } else if (!isPlaylistCreationInProgress) {
        hidePlaylistProgress();
    }
}

// プレイリスト作成中の進捗バー非表示
function hidePlaylistProgress() {
    if (playlistProgressBar) {
        playlistProgressBar.style.display = 'none';
    }
}

// オーバーレイメッセージ非表示
function hideMessageOverlay(compulsion = false) {
    if (!disableMessageOverlay || compulsion) {
        messageOverlay.classList.remove('active');
        messageOverlay.style.display = 'none';
        disableMessageOverlay = false;
        updateIconOverlay();
    }
}

// メディアの総再生時間を取得（画像は5秒固定）
function getMediaDuration() {
    if (currentMediaType === 'image') return IMAGE_DURATION;
    return videoPlayer.duration || 0;
}

// メディアの現在再生時間を取得
function getMediaCurrentTime() {
    if (currentMediaType === 'image') return imageCurrentTime;
    return videoPlayer.currentTime || 0;
}

// メディアの現在再生時間を設定・シーク
function setMediaCurrentTime(time) {
    const duration = getMediaDuration();
    const clampedTime = Math.max(0, Math.min(duration, time));

    if (currentMediaType === 'image') {
        imageCurrentTime = clampedTime;

        seekBar.value = (100 / IMAGE_DURATION) * imageCurrentTime;
        updateTimeDisplay();

        if (imageTimer) {
            clearTimeout(imageTimer);
            stopImageProgress();

            // 速度で除算して実際のタイマーミリ秒を算出
            const remainingMs = ((IMAGE_DURATION - imageCurrentTime) / (currentPlaybackRate || 1.0)) * 1000;
            if (remainingMs <= 0) {
                playNextPlaylistItem();
            } else {
                startImageProgress();
                imageTimer = setTimeout(async () => {
                    imageTimer = null;
                    stopImageProgress();
                    await playNextPlaylistItem();
                }, remainingMs);
            }
        }
    } else {
        videoPlayer.currentTime = clampedTime;
        if (duration > 0) {
            seekBar.value = (100 / duration) * clampedTime;
        }
        updateTimeDisplay();
    }

    localStorageSetItemAndFile('currentTime', clampedTime);
}

// 画像の100ms周期プログレス更新タイマー
function startImageProgress() {
    if (imageProgressInterval) clearInterval(imageProgressInterval);

    seekBar.value = (100 / IMAGE_DURATION) * imageCurrentTime;
    updateTimeDisplay();

    let lastTimestamp = performance.now();

    imageProgressInterval = setInterval(() => {
        const now = performance.now();
        // 実時間差(秒) × 再生速度
        const delta = ((now - lastTimestamp) / 1000) * (currentPlaybackRate || 1.0);
        lastTimestamp = now;

        if (imageCurrentTime < IMAGE_DURATION) {
            imageCurrentTime = Math.min(IMAGE_DURATION, imageCurrentTime + delta);
            seekBar.value = (100 / IMAGE_DURATION) * imageCurrentTime;
            updateTimeDisplay();
        } else {
            stopImageProgress();
        }
    }, 50);
}

// 画像再生状況の表示を停止
function stopImageProgress() {
    if (imageProgressInterval) {
        clearInterval(imageProgressInterval);
        imageProgressInterval = null;
    }
}

// 現在表示中のメディア要素（videoPlayer または imagePlayer）を取得するヘルパー関数
function getMediaElement() {
    if (currentMediaType === 'image' && typeof imagePlayer !== 'undefined' && imagePlayer) {
        return imagePlayer;
    }
    return videoPlayer;
}

// 現在保持している表示設定（アスペクト比、描画モード、ズーム、パン）を
// 切り替わったメディア（画像/動画）に即時反映させる共通関数
function syncDisplaySettingsToCurrentMedia() {
    // 1. アスペクト比の設定を適用
    applyAspectRatioSetting();

    // 2. 描画モードの設定を適用（既存の fitMode 変数を引き継ぐ）
    if (typeof fitMode !== 'undefined') {
        applyFitModeSetting(fitMode);
    }

    // 3. ズームおよびパン位置（translateX, translateY）を再適用
    if (typeof zoomValue !== 'undefined') {
        applyZoom(zoomValue);
    }
}

// コントロール自動表示抑止の切り替え（現在の状態を返す）
function togglePauseShowControls() {
    pauseShowControls = !pauseShowControls;
    localStorageSetItemAndFile('pauseShowControls', pauseShowControls);
    return pauseShowControls;
}

// センターコントロール無効の切り替え（現在の状態を返す）
function toggleHideCenterControls() {
    hideCenterControls = !hideCenterControls;
    localStorageSetItemAndFile('hideCenterControls', hideCenterControls);
    return hideCenterControls;
}

// BGMの再生状態を一括制御する関数（複数BGM・継続再生対応版）
async function manageBgmState() {
    // 配列の存在チェックと、現在再生対象のパスを取得
    const currentPath = (Array.isArray(imageBgmPaths) && imageBgmPaths.length > 0)
        ? imageBgmPaths[currentBgmIndex || 0]
        : null;

    // BGMパスが未設定、または画像以外（動画・音声）再生時はBGMを一時停止
    if (!currentPath || currentMediaType !== 'image') {
        if (!bgmAudio.paused) bgmAudio.pause();
        return;
    }

    // 画像スライドショーが再生中の場合
    if (isPlaying) {
        // ファイルパス自体が変更された場合のみ src を更新して読み込む（リセット防止）
        if (currentLoadedBgmPath !== currentPath) {
            currentLoadedBgmPath = currentPath;
            bgmAudio.src = `file://${currentPath.replace(/\\/g, '/')}`;
            bgmAudio.load();
        }

        try {
            // 一時停止中（再生されていない）場合のみ再生開始（現在の再生位置から継続）
            if (bgmAudio.paused) {
                if (volumeBar) bgmAudio.volume = parseFloat(volumeBar.value);
                bgmAudio.muted = videoPlayer.muted;
                await bgmAudio.play();
            }
        } catch (err) {
            console.error("BGM再生エラー:", err);
        }
    } else {
        // スライドショー一時停止時は BGM もその位置で一時停止（Resetはしない）
        if (!bgmAudio.paused) bgmAudio.pause();
    }
}

// 画像にエフェクトクラスを適用する関数
function applyImageEffect() {
    const imageWrapper = document.getElementById('imageWrapper');
    if (!imageWrapper || !imagePlayer) return;

    // 1. 一旦アニメーション関連クラスをすべて除去し、CSSアニメーションをリセット
    imageWrapper.classList.remove('paused');
    imageWrapper.style.animation = 'none'; // アニメーションを明示的に一時解除

    Object.values(IMAGEEFFECTBGM_NODES).forEach(node => {
        if (node.className) {
            imageWrapper.classList.remove(node.className);
        }
    });

    let activeKey = imageEffectBgmMode || 'none';

    if (activeKey === 'random') {
        const availableEffectKeys = Object.keys(IMAGEEFFECTBGM_NODES).filter(
            key => IMAGEEFFECTBGM_NODES[key].className && key !== 'none'
        );

        if (availableEffectKeys.length > 0) {
            if (availableEffectKeys.length > 1) {
                let randomIndex;
                let selectedKey;
                do {
                    randomIndex = Math.floor(Math.random() * availableEffectKeys.length);
                    selectedKey = availableEffectKeys[randomIndex];
                } while (selectedKey === lastEffectKey);
                
                activeKey = selectedKey;
            } else {
                activeKey = availableEffectKeys[0];
            }
        } else {
            activeKey = 'none';
        }
    }

    lastEffectKey = activeKey;

    const targetNode = IMAGEEFFECTBGM_NODES[activeKey];
    const cssClass = targetNode?.className || IMAGEEFFECTBGM_NODES['none'].className;

    if (typeof IMAGE_DURATION !== 'undefined' && activeKey !== 'none') {
        const rate = currentPlaybackRate || 1.0;
        const durationSec = IMAGE_DURATION / rate;
        imageWrapper.style.animationDuration = `${durationSec}s`;
    } else {
        imageWrapper.style.animationDuration = '';
    }

    // 2. 強制リフロー (スタイルリセットの適用)
    void imageWrapper.offsetWidth;

    // 3. アニメーションプロパティを戻してからクラスを追加
    imageWrapper.style.animation = '';
    imageWrapper.classList.add('image-effect');
    if (cssClass) {
        imageWrapper.classList.add(cssClass);
    }
}

// 簡易ハッシュ関数（ファイルパスから一意なファイル名を生成）
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

// 画像を指定サイズにリサイズ（圧縮）し、メモリキャッシュに保持する関数
async function getOrGenerateImageThumbnail(filePath, targetWidth = 180) {
    if (!filePath) return '';
    const cacheKey = `${filePath}|${targetWidth}`;

    // 1. メモリキャッシュが存在する場合は即座に返却
    if (imageThumbnailCache.has(cacheKey)) {
        const cached = imageThumbnailCache.get(cacheKey);
        if (cached) return cached;
    }

    try {
        // 2. HTMLImageElement を使って非同期ロード
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        const imageLoaded = new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (err) => reject(err);
        });
        img.src = `file://${filePath.replace(/\\/g, '/')}`;
        await imageLoaded;

        // アスペクト比を維持して縦横サイズを計算
        const aspectRatio = img.naturalHeight / img.naturalWidth;
        const targetHeight = Math.round(targetWidth * aspectRatio);

        // 3. Canvas を使用して画像を縮小描画
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // 4. Canvasから軽量なDataURL (PNG) を取得
        const dataUrl = canvas.toDataURL('image/png');

        // 5. メモリキャッシュに保存して返却
        if (dataUrl) {
            imageThumbnailCache.set(cacheKey, dataUrl);
            return dataUrl;
        } else {
            return '';
        }
    } catch (err) {
        console.warn('[image-thumbnail] renderer fallback failed:', filePath, err.message);
        // 失敗時はキャッシュに登録せず空文字を返す（次回表示時などに再試行可能）
        return '';
    }
}

// 結合ポップアップメニュー作成関数
function createJoinMenu() {
    const menu = document.createElement('div');
    menu.className = 'join-playlist-menu'; // クラス名は結合メニュー用に変更

    buildJoinMenuContent(menu);
    return menu;
}

// 結合ポップアップメニューコンテンツ構築関数
function buildJoinMenuContent(menu) {
    menu.innerHTML = '';

    const createMenuItem = (label, onClick = null) => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.style.color = '#eee';
        item.style.padding = '6px 12px';
        item.style.cursor = 'pointer';
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

    // JOIN_MODES をループしてメニューアイテムを一括生成
    Object.entries(JOIN_MODES).forEach(([key, mode]) => {
        const item = createMenuItem(mode.label, async () => {
            menu.remove(); // 実行時にメニューを閉じる
            await mode.fn();
        });
        menu.appendChild(item);
    });
}

// センターコントロールの表示更新関数
function updateCenterControlsVisibility(compulsion = false) {
    // 1. センターコントロールが無効化されている場合は即非表示
    if (typeof hideCenterControls !== 'undefined' && hideCenterControls) {
        if (centerControls) centerControls.style.display = 'none';
        return;
    }

    // コントロールパネルの表示／非表示状態が確定するまで待つ
    setTimeout(() => {
        // 2. メディア準備状態チェック
        const isImageReady = imagePlayer && imagePlayer.complete && imagePlayer.naturalWidth > 0 && imageWrapper && window.getComputedStyle(imageWrapper).display !== 'none';
        const isMediaReady = videoPlayer.readyState > 0 || audioPlayer.readyState > 0 || isImageReady;
        // 3. プレイリスト（filterPanel）非表示チェック
        const isPlaylistHidden = !filterPanel || window.getComputedStyle(filterPanel).display === 'none';
        // 3. プレイリスト（filterPanel）非表示チェック
        const isEditHidden = !editPanel || window.getComputedStyle(editPanel).display === 'none';
        // 4. コントロールパネルが実際に表示されているか（opacityが0でないか）
        const isControlsVisible = controls && window.getComputedStyle(controls).opacity !== '0';
        // 5. 表示許可判定（強制表示 OR （自動抑止OFF かつ コントロールパネル表示中））
        const isAllowed = compulsion || (!pauseShowControls && isControlsVisible);

        // すべての条件を満たした場合のみ表示
        if (isAllowed && isMediaReady && isPlaylistHidden && isEditHidden) {
            centerControls.style.display = 'flex';
        } else {
            if (!isControlsVisible || !isPlaylistHidden || !isEditHidden) {
                centerControls.style.display = 'none';
            } else {
                centerControls.style.display = 'flex';
            }
        }
    }, 100);
}

// 再生/一時停止アイコンの同期切り替え関数
function updateCenterPlayPauseIcon() {
    // コントロールパネルの表示／非表示状態が確定するまで待つ
    setTimeout(() => {
        if (playPauseBtn.textContent === '▶️') {
            centerPlayPauseBtn.src = 'control_play.png';
        } else {
            centerPlayPauseBtn.src = 'control_pause.png';
        }
    }, 100);
}

// インポート・エクスポートポップアップメニュー作成関数
function createImportExportMenu() {
    const menu = document.createElement('div');
    menu.className = 'import-export-menu';

    buildImportExportMenuContent(menu);
    return menu;
}

// インポート・エクスポートポップアップメニューコンテンツ構築関数
function buildImportExportMenuContent(menu) {
    menu.innerHTML = '';

    Object.entries(IMPORT_EXPORT_MODES).forEach(([key, mode]) => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.style.color = '#eee';
        item.style.padding = '6px 12px';
        item.style.cursor = 'pointer';
        item.textContent = mode.label;

        item.addEventListener('click', async (event) => {
            event.stopPropagation();
            menu.remove();
            await mode.fn();
        });

        item.addEventListener('mouseover', () => {
            item.style.background = 'rgba(0,123,255,0.2)';
        });
        item.addEventListener('mouseout', () => {
            item.style.background = 'none';
        });

        menu.appendChild(item);
    });
}

// コントロール制御ポップアップメニュー作成関数
function createControlMenu() {
    const menu = document.createElement('div');
    menu.className = 'control-menu';

    buildControlMenuContent(menu);
    return menu;
}

// コントロール制御ポップアップメニューコンテンツ構築関数
function buildControlMenuContent(menu) {
    menu.innerHTML = '';

    const createMenuItem = (label, isChecked, onClick = null) => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.style.color = '#eee';
        item.style.padding = '6px 12px';
        item.style.cursor = 'pointer';

        // 有効時は先頭に ✅ を付与
        const checkMark = isChecked ? '✅ ' : '　　'; // 幅を揃えるための全角スペース
        item.innerHTML = `${checkMark}${label}`;

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

    // CONTROL_MODES をループしてメニューアイテムを生成
    Object.entries(CONTROL_MODES).forEach(([key, mode]) => {
        // 現在の状態判定（各フラグの判定）
        const isChecked = key === 'display-disable' ? pauseShowControls : hideCenterControls;

        const item = createMenuItem(mode.label, isChecked, async () => {
            menu.remove(); // 実行時にメニューを閉じる
            await mode.fn();
            updateIconOverlay();
        });
        menu.appendChild(item);
    });
}

// コントロールパネル＆再生中パスパネル自動非表示無効
function disableAutoHideControls() {
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
}

// コントロールパネル＆再生中パスパネル自動非表示有効
function enableAutoHideControls() {
    if (controls.style.opacity === '1' || filename.style.opacity === '1') {
        isMouseOverControls = false;
        showControlsAndFilename();
        updateIconOverlay();
    }
}

// 壁紙の表示状態と画像を更新する関数
function updateWallpaperDisplay() {
    if (!imageWallpaper || !imageWallpaperImg) return;

    if (currentMediaType === 'image' && isImageWallpaperEnabled && imagePlayer.src) {
        imageWallpaperImg.src = imagePlayer.src;
        imageWallpaper.style.display = 'block';
    } else {
        imageWallpaper.style.display = 'none';
        imageWallpaperImg.removeAttribute('src');
    }
}

// 偏りのない乱数を生成するヘルパー関数
// Math.random() の偏りを避け、暗号学的に安全な乱数（0 ～ max - 1）を返します。
function SecureRandomInt(max) {
    if (max <= 1) return 0;
    const array = new Uint32Array(1);
    const maxUint32 = 0xFFFFFFFF;
    const limit = maxUint32 - (maxUint32 % max); // モジュロバイアス（偏り）を完全に除去

    let rand;
    do {
        crypto.getRandomValues(array);
        rand = array[0];
    } while (rand >= limit);

    return rand % max;
}

// シャッフル再生用のオリジナル順インデックス配列を生成する関数
function createShuffleOrder() {
    const originalPlaylist = getPlaylistInOriginalOrder();
    const length = originalPlaylist.length;

    if (length === 0) return [];

    // 1. オリジナル順のインデックス配列を作成 [0, 1, 2, ..., N-1]
    const indices = Array.from({ length }, (_, i) => i);

    // 2. 高精度 Fisher-Yates シャッフル（ランダム性強化）
    for (let i = length - 1; i > 0; i--) {
        const j = SecureRandomInt(i + 1);
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // 3. 現在再生中メディアを先頭（0番目）に配置
    if (typeof currentVideoIndex !== 'undefined' && currentVideoIndex !== null && currentVideoIndex >= 0) {
        // 現在表示中の playlist から再生中アイテムのファイルパスを取得
        const currentPath = playlist[currentVideoIndex]?.file?.path;

        if (currentPath) {
            // originalPlaylist 上でのインデックス（ID）を特定
            const originalIndex = originalPlaylist.findIndex(item => item?.file?.path === currentPath);

            if (originalIndex !== -1) {
                // シャッフル後の配列から対象のインデックスを探して先頭へ移動
                const posInIndices = indices.indexOf(originalIndex);
                if (posInIndices > 0) { // 既に先頭(0)にある場合は移動不要
                    indices.splice(posInIndices, 1);
                    indices.unshift(originalIndex);
                }
            }
        }
    }

    return indices;
}

// 画像をメモリ上に先読み・キャッシュする関数
// @param {string} filePath - 画像ファイルのパス
function preloadImage(filePath) {
    if (maxImageCacheSize <= 0) return; // 0以下なら処理をスキップ
    if (!filePath || !isImageFilePath(filePath)) return;

    const imageUrl = `file://${filePath.replace(/\\/g, '/')}?t=${Date.now()}`;

    // すでにキャッシュ済みの場合は順番を最新に更新して終了
    if (imageCache.has(filePath)) {
        const cachedImg = imageCache.get(filePath);
        imageCache.delete(filePath);
        imageCache.set(filePath, cachedImg);
        return;
    }

    // キャッシュサイズ上限に達した場合は古いものから削除（LRU風管理）
    if (imageCache.size >= maxImageCacheSize) {
        const oldestKey = imageCache.keys().next().value;
        imageCache.delete(oldestKey);
    }

    // バックグラウンドで読み込み
    const img = new Image();
    img.src = imageUrl;
    
    // メモリキャッシュに保持
    imageCache.set(filePath, img);
}

// 動画・音声をメモリ上のメディア要素で先読みする関数
function preloadMedia(file) {
    if (maxMediaCacheSize <= 0) return; // 0以下なら処理をスキップ
    if (!file?.path || isImageFilePath(file.path)) return;

    const cleanPath = file.path.split('?')[0];
    const ext = path.extname(cleanPath).toLowerCase();
    const mediaType = isAudioFilePath(cleanPath) ? 'audio' : (isVIDEO_EXTENSIONS(ext) ? 'video' : null);
    if (!mediaType) return;

    const cacheKey = `${mediaType}:${file.path}`;
    if (mediaCache.has(cacheKey)) {
        const cachedMedia = mediaCache.get(cacheKey);
        mediaCache.delete(cacheKey);
        mediaCache.set(cacheKey, cachedMedia);
        return;
    }

    if (mediaCache.size >= maxMediaCacheSize) {
        const oldestKey = mediaCache.keys().next().value;
        const oldestMedia = mediaCache.get(oldestKey);
        oldestMedia?.removeAttribute('src');
        oldestMedia?.load();
        mediaCache.delete(oldestKey);
    }

    const media = document.createElement(mediaType);
    const mediaUrl = `file://${cleanPath.replace(/\\/g, '/')}`;
    media.preload = 'auto';
    media.addEventListener('error', () => {
        mediaCache.delete(cacheKey);
    }, { once: true });
    media.src = mediaUrl;
    media.load();
    mediaCache.set(cacheKey, media);
}

// 次の再生対象アイテムを取得して先読みを実行する関数
function preloadNextPlaylistItem() {
    if (!playlist || playlist.length <= 1) return;

    // 現在のインデックスから次のインデックスを算出（シャッフル等も考慮）
    let nextIndex = -1;

    if (isRandomPlayMode) {
        if (shuffleOrder && shuffleOrder.length > 0) {
            const nextPos = (shufflePosition + 1) % shuffleOrder.length;
            nextIndex = shuffleOrder[nextPos];
        }
    } else {
        nextIndex = (currentVideoIndex + 1) % playlist.length;
    }

    if (nextIndex !== -1 && playlist[nextIndex]?.file?.path) {
        const nextFile = playlist[nextIndex].file;
        if (isImageFilePath(nextFile.path)) preloadImage(nextFile.path);
        else preloadMedia(nextFile);
    }
}
