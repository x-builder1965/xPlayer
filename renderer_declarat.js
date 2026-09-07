// -- renderer_declarat.js ---------------------------------------------
const copyright = 'Copyright © 2025- @x-builder, Japan';
const email = 'x-builder@gmail.com';
const appName = 'xPlayer -メディアプレイヤー- Ver6.02.0';
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
const overlayTimeout = 3000;                    // オーバーレイ表示の自動非表示までの時間（ミリ秒）
const seekSensitivity = 0.3;                    // シーク操作の感度（0.1～1.0）: 1.0でマウス移動量と同じ、0.5で半分、0.3で3分の1    
const volumeStep = 0.001;                       // 音量操作のステップ値（0.001～0.1）: 0.01で1%、0.001で0.1%単位
const playbackRates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 5.0];  // 再生速度の選択肢（0.25倍速～5倍速）
const appNameAndCopyrightValue = `${appName}\n${copyright}`;                        // アプリ名と著作権表示の値
const appNameAndCopyrightValueLine = `${appName}　${copyright}`;                    // アプリ名と著作権表示の1行バージョン
const bgmAudio = new Audio();                   // BGM再生用のAudio要素
const imageThumbnailCache = new Map();		    // 画像サムネイル用キャッシュ（Mapオブジェクト）
const dragThreshold = 5;                        // ドラッグ判定用の移動閾値（手ぶれ考慮: 5ピクセル）
const imageCache = new Map();		            // 画像キャッシュストレージ（メモリ内）
const mediaCache = new Map();	                // 動画・音声の先読み要素キャッシュ

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.m4v', '.mkv'];             // 動画再生対象拡張子
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.oga', '.m4a', '.aac', '.opus', '.wma', '.aiff', '.aif', '.alac', '.ape'];  // 音声再生対象拡張子
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];   // 画像再生対象拡張子
const VIDEO_EXTENSIONS_CONVERT = [];            // 動画変換対象外拡張子
const SETTINGS_FILE_REGEX = /\.(json|xpj)$/i;   // 設定ファイルの拡張子判定用正規表現
const IMAGE_DURATION = 5;                       // 画像の再生時間（秒）
const MAX_IMAGE_CACHE_SIZE = 5; 			    // メモリを圧迫しないよう保持数を制限（0は無効）
const MAX_MEDIA_CACHE_SIZE = 3; 	            // メモリを圧迫しないよう保持数を制限（0は無効）
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
    'none':    { label: '（なし）', options: {} },
    'preset1': { label: 'LEDオーディオコンポ', 
        options: { 
            mode: 3, 
            barSpace: 0.2, 
            ledBars: true 
        } 
    },
    'preset2': { label: 'レインボウ・サイバーパンク', 
        options: { 
            mode: 2, 
            gradient: 'rainbow', 
            showPeaks: true, 
            linearBar: true, 
            bgAlpha: 0.7, 
            fillAlpha: 1, 
            reflexRatio: 0.3, 
            reflexAlpha: 0.5 
        } 
    },
    'preset3': { label: 'ミニマル・クラシック',      
        options: { 
            mode: 1, 
            barSpace: 0.25, 
            gradient: 'prism', 
            showBgColor: false, 
            showScaleX: false, 
            showScaleY: false, 
            showPeaks: false, 
            outlineBars: false 
        } 
    },
    'preset4': { label: 'レトロ・ヴァイブ',          
        options: { 
            mode: 0, 
            ledBars: true, 
            showPeaks: true 
        } 
    },
    'preset5': { label: 'センタースプリット',        
        options: { 
            mode: 2, 
            barSpace: 0.2, 
            gradient: 'rainbow', 
            fillAlpha: 0.85, 
            showPeaks: false, 
            reflexRatio: 0.5, 
            reflexAlpha: 1, 
            reflexBright: false, 
            reflexFit: true 
        } 
    },
    'preset6': { label: 'サークル・ヴォルテックス',   
        options: { 
            mode: 3, 
            radial: true, 
            spin: true, 
            spinSpeed: 1, 
            gradient: 'prism', 
            mirror: 1 
        } 
    },
    'preset7': { label: 'クリスタル・スペクトラム',   
        options: { 
            mode: 10, 
            barSpace: 0.25, 
            gradient: 'rainbow', 
            showPeaks: true, 
            lineWidth: 1, 
            fillAlpha: 0.7, 
            reflexRatio: 0.5, 
            reflexAlpha: 1, 
            reflexBright: 1, 
            reflexFit: -1, 
            mirror: 1 
        } 
    },
    'preset8': { label: 'プリズム・リフレクト',       
        options: { 
            mode: 4, 
            barSpace: 0.25, 
            gradient: 'prism', 
            showPeaks: false, 
            reflexRatio: 0.5, 
            reflexAlpha: 1, 
            reflexBright: 1, 
            reflexFit: 0, 
            roundBars: true 
        } 
    },
    'preset9': { label: 'デュアルグロウ・セグメント', 
        options: { 
            mode: 10, 
            ledBars: true, 
            showPeaks: false, 
            gradient: 'steelblue', 
            gradientLeft: 'steelblue', 
            gradientRight: 'orangered', 
            channelLayout: 'dual-combined', 
            lineWidth: 2, 
            fillAlpha: 0.5 
        } 
    },
    'random':  { label: '（ランダム）', options: {} }
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
    'effect10':      { label: 'スイング（振り子）', className: 'effect-swing-top' },
    'effect11':      { label: 'スイング（扇）',     className: 'effect-swing-bottom' },
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
let videoPlayerElement = null;                  // 動画プレイヤーのDOM要素
let audioPlayer = null;                         // 音声プレイヤーのDOM要素
let videoPlayer = null;                         // 動画・音声共通プレイヤーのプロキシ
let videoPreview = null;                        // シーク時の動画プレビュー要素
let mainContainer = null;                       // アプリ全体のメインコンテナ
let videoContainer = null;                      // メディア表示コンテナ
let dropzone = null;                            // ファイルドロップ領域
let controls = null;                            // 再生コントロールパネル
let folderInput = null;                         // フォルダ選択ボタン
let videoInput = null;                          // メディアファイル選択ボタン
let urlInputBtn = null;                         // URL入力パネル切替ボタン
let urlInput = null;                            // URL入力欄
let urlClearBtn = null;                         // URL入力クリアボタン
let urlConfirmBtn = null;                       // URL再生確定ボタン
let urlInputPanel = null;                       // URL入力パネル
let prevVideoBtn = null;                        // 前のメディアボタン
let rewindBtn = null;                           // 30秒戻るボタン
let playPauseBtn = null;                        // 再生・一時停止ボタン
let playStopBtn = null;                         // 停止ボタン
let fastForwardBtn = null;                      // 30秒進むボタン
let nextVideoBtn = null;                        // 次のメディアボタン
let seekBar = null;                             // 再生位置シークバー
let volumeMuteBtn = null;                       // ミュート切替ボタン
let volumeBar = null;                           // 音量バー
let speedSelect = null;                         // 再生速度選択
let zoomBtn = null;                             // ズームモード切替ボタン
let zoomPanel = null;                           // ズーム操作パネル
let zoomBar = null;                             // ズーム値スライダー
let zoomDisplay = null;                         // ズーム値表示
let zoomResetBtn = null;                        // ズームリセットボタン
let snapshotBtn = null;                         // スクリーンショットボタン
let aspectRatioBtn = null;                      // アスペクト比ボタン
let zoomEndBtn = null;                          // ズーム終了ボタン
let fullscreenBtn = null;                       // フルスクリーン切替ボタン
let fitModeBtn = null;                          // 描画モード切替ボタン
let filename = null;                            // ファイル名表示要素
let filenamePanel = null;                       // ファイル名表示パネル
let timeDisplay = null;                         // 再生時間表示
let volumeDisplay = null;                       // 音量表示
let messageOverlay = null;                      // メッセージオーバーレイ
let iconOverlay = null;                         // 再生状態アイコンオーバーレイ
let appNameAndCopyright = null;                 // アプリ名・著作権表示
let wallpaperBtn = null;                        // 壁紙選択ボタン
let importExportBtn = null;                     // 設定入出力ボタン
let alwaysOnTopBtn = null;                      // 常に最前面ボタン
let audioMotionBtn = null;                      // オーディオモーション設定ボタン
let imageEffectBgmBtn = null;                   // 画像エフェクト・BGM設定ボタン
let autoShuffleBtn = null;                      // 自動シャッフルボタン
let settingsBtn = null;                         // 設定パネル切替ボタン
let settingsPanel = null;                       // 設定パネル
let settingsCloseBtn = null;                    // 設定パネル閉じるボタン
let helpOpenBtn = null;                         // ヘルプ表示ボタン
let helpCloseBtn = null;                        // ヘルプ閉じるボタン
let helpContainer = null;                       // ヘルプ表示コンテナ
let helpTitle = null;                           // ヘルプタイトル
let tooltipElements = null;                     // ツールチップ対象要素
let filenameMenus = null;                       // ファイル名メニュー群
let filenameMenu = null;                        // ファイル名メニュー
let upMovePlaylistBtn = null;                   // プレイリスト上移動ボタン
let downMovePlaylistBtn = null;                 // プレイリスト下移動ボタン
let addPlaylistBtn = null;                      // プレイリスト追加ボタン
let removePlaylistBtn = null;                   // プレイリスト削除ボタン
let clearPlaylistBtn = null;                    // プレイリストクリアボタン
let savePlaylistBtn = null;                     // プレイリスト保存ボタン
let modeChangeBtn = null;                       // 視聴・変換モード切替ボタン
let editPanel = null;                           // カット編集パネル
let editModeBtn = null;                         // 編集モード切替ボタン
let setInMarkBtn = null;                        // 編集インマーク設定ボタン
let setOutMarkBtn = null;                       // 編集アウトマーク設定ボタン
let addCutRangeBtn = null;                      // カット範囲追加ボタン
let saveVideoBtn = null;                        // カット保存ボタン
let cutRangesList = null;                       // カット範囲一覧
let clearEditBtn = null;                        // 編集内容クリアボタン
let inMarkDisplay = null;                       // インマーク表示
let outMarkDisplay = null;                      // アウトマーク表示
let editSeekBar = null;                         // 編集用シークバー
let cutCancelBtn = null;                        // カット・結合中止ボタン
let randomPlayBtn = null;                       // ランダム再生ボタン
let repeatPlayBtn = null;                       // 繰り返し再生ボタン
let joinPlaylistBtn = null;                     // プレイリスト結合ボタン
let sortPlaylistBtn = null;                     // プレイリスト並び替えボタン
let playlistDisplayBtn = null;                  // プレイリスト表示形式ボタン
let filterPanel = null;                         // プレイリストパネル
let playlistFilterInput = null;                 // プレイリスト検索欄
let filterClearBtn = null;                      // 検索条件クリアボタン
let filterList = null;                          // プレイリスト一覧
let playlistProgressBar = null;                 // プレイリスト作成進捗バー
let isPlaylistCreationInProgress = false;       // プレイリスト作成中フラグ
let darkOverlay = null;                         // シーク・編集時の暗幕
let voiceSelectBtn = null;                      // 音声トラック選択ボタン
let subtitleSelectBtn = null;                   // 字幕トラック選択ボタン
let itemCount = null;                           // プレイリスト件数表示
let playlistPathArea = null;                    // 再生中パス表示欄
let cutTimelineContainer = null;                // カットタイムラインコンテナ
let cutTimelineBar = null;                      // カットタイムラインバー
let filterHistoryList = null;                   // フィルタ履歴一覧
let changelogBtn = null;                        // 変更履歴切替ボタン
let changelogContent = null;                    // 変更履歴本文
let tableContainer = null;                      // 変更履歴テーブルコンテナ
let mediaContainer = null;                      // メディア操作コンテナ
let imagePlayer = null;                         // 画像プレイヤー
let imageWrapper = null;                        // 画像表示ラッパー
let centerControls = null;                      // センターコントロール
let centerPrevBtn = null;                       // センター前メディアボタン
let centerPlayPauseBtn = null;                  // センター再生・一時停止ボタン
let centerNextBtn = null;                       // センター次メディアボタン
let imageWallpaper = null;                      // 画像壁紙要素
let imageWallpaperImg = null;                   // 画像壁紙表示画像

// localStorage・設定ファイルから読み込む保存値の一時保持領域
// allLocalStorageSetting() が起動時に値を取得し、DOMContentLoaded 内で各状態へ適用する。
let savedVolume = null;                         // 保存済み音量
let savedPlaybackSpeed = null;                  // 保存済み再生速度
let savedPlaylist = null;                       // 保存済みプレイリスト
let savedCurrentVideoIndex = null;              // 保存済み再生位置インデックス
let savedCurrentTime = null;                    // 保存済み再生時間
let savedFitMode = null;                        // 保存済み描画モード
let savedZoom = null;                           // 保存済みズーム値
let savedTranslateX = null;                     // 保存済み横方向パン位置
let savedTranslateY = null;                     // 保存済み縦方向パン位置
let savedEditFrameRate = null;                  // 保存済み編集フレームレート
let savedIsRandomPlayMode = null;               // 保存済みランダム再生状態
let savedIsRepeatPlayMode = null;               // 保存済み繰り返し再生モード
let savedAutoShuffle = null;                    // 保存済み自動シャッフル状態
let savedShuffleOrder = null;                   // 保存済みシャッフル順
let savedShufflePosition = null;                // 保存済みシャッフル位置
let savedAspectRatio = null;                    // 保存済みアスペクト比
let savedCurrentSortMode = null;                // 保存済み並び替えモード
let savedPlaylistDisplayMode = null;            // 保存済みプレイリスト表示形式
let savedSelectedAudioLabel = null;             // 保存済み音声トラック名
let savedSelectedAudioTrack = null;             // 保存済み音声トラック
let savedSelectedSubtitleLabel = null;          // 保存済み字幕トラック名
let savedSelectedSubtitleTrack = null;          // 保存済み字幕トラック
let savedWallpaperPath = null;                  // 保存済み壁紙パス
let savedAlwaysOnTop = null;                    // 保存済み常に最前面状態
let savedPauseShowControls = null;              // 保存済み自動表示抑止状態
let savedHideCenterControls = null;             // 保存済みセンターコントロール無効状態
let savedAudioMotionMode = null;                // 保存済みオーディオモーション設定
let savedImageEffectBgmMode = null;             // 保存済み画像エフェクト設定
let savedIsImageWallpaperEnabled = null;        // 保存済み画像壁紙状態
let savedFilterHistory = null;                  // 保存済みフィルタ履歴
let savedOriginalOrder = null;                  // 保存済みプレイリスト元順
let savedAudioMotionOptions = null;             // 保存済みオーディオモーションオプション
let savedAudioMotionNodes = null;               // 保存済みオーディオモーション設定
let savedImageBgmPaths = null;                  // 保存済みBGMパス一覧
let savedCurrentBgmIndex = null;                // 保存済みBGM再生位置
let savedMaxImageCacheSize = null;              // 保存済み画像キャッシュサイズ
let savedMaxMediaCacheSize = null;              // 保存済みメディアキャッシュサイズ

// グローバル（共通）変数
let localSettings = {};                         // 多重起動時に扱う設定値
let Initializing = true;                        // 初期化中フラグ
let playlist = [];                              // 現在表示中のプレイリスト
let currentVideoIndex = 0;                      // 現在再生中のプレイリスト位置
let selectedPlaylistIndex = -1;                 // 選択中のプレイリスト位置
let timeout;                                    // コントロール自動非表示タイマー
let isDragging = false;                         // メディア操作ドラッグ中フラグ
let dragStartX = 0;                             // ドラッグ開始時のX座標
let dragStartY = 0;                             // ドラッグ開始時のY座標
let isVolumeDragging = false;                   // 音量ドラッグ中フラグ
let lastVolume = 0.2;                           // ミュート解除時に戻す音量
let isPanning = false;                          // ズーム時のパン操作中フラグ
let panStartX = 0;                              // パン開始時のX座標
let panStartY = 0;                              // パン開始時のY座標
let translateX = 0;                             // メディアの横方向移動量
let translateY = 0;                             // メディアの縦方向移動量
let isMouseOverControls = false;                // コントロール上にマウスがあるか
let saveInterval = null;                        // 再生状態定期保存タイマー
let fitMode = 'contain';                        // メディア描画モード
let zoomValue = 0;                              // ズーム値
let isAlwaysOnTop = false;                      // 常に最前面状態
let isZoomMode = false;                         // ズームモード状態
let isSettingsPanelOpen = false;                // 設定パネル表示状態
let isHelpOpen = false;                         // ヘルプ表示状態
let isSeekDragging = false;                     // シークバー操作中フラグ
let isMouseOverSeekBar = false;                 // シークバー上にマウスがあるか
let currentConvertPromise = null;               // 現在の変換処理
let isPlaying = false;                          // メディア再生中フラグ
let isConverting = false;                       // 変換中フラグ
let modeChange = 'video';                       // 視聴・変換モード
let baseConvertFile = null;                     // 変換元ファイル
let tempConvertFile = null;                     // 変換一時ファイル
let isEditMode = false;                         // カット編集モード状態
let isFilterPanelVisible = false;               // プレイリストパネル表示状態
let filterText = '';                            // プレイリスト検索文字列
let filterHistory = [];                         // プレイリスト検索履歴
let editInMark = -1;                            // カット開始位置（秒）
let editOutMark = -1;                           // カット終了位置（秒）
let cutRanges = [];                             // カット範囲一覧
let currentPlaybackRate = 1.0;                  // 現在の再生速度
let isurlInputPanelVisible = false;             // URL入力パネル表示状態
let isCutEditing = false;                       // カット処理中フラグ
let isJoinEditing = false;                      // 結合処理中フラグ
let isRandomPlayMode = false;                   // ランダム再生状態
let autoShuffle = true;                         // 周回時の自動シャッフル状態
let isRepeatPlayMode = 'none';                  // 繰り返し再生モード
let shuffleOrder = [];                          // シャッフル順のインデックス配列
let shufflePosition = -1;                       // シャッフル順の現在位置
let isEditSeekDragging = false;                 // 編集シークバー操作中フラグ
let isMouseOverEditSeekBar = false;             // 編集シークバー上にマウスがあるか
let originalLoadOrder = [];                     // プレイリストの元の読み込み順
let hideMouseTimeout = null;                    // マウスカーソル自動非表示タイマー
let editFrameRate = 30;                         // カット編集フレームレート
let currentSortMode = '（なし）';               // 現在の並び替えモード
let currentAddMode = 'Add0';                    // プレイリスト追加位置モード
let playlistDisplayMode = null;                 // プレイリスト表示形式
let playlistThumbnailCache = new Map();         // プレイリストサムネイルキャッシュ
let displayFormatUpdateRequested = false;       // 表示形式更新要求フラグ
let selectedAudioLabel = '日本語';              // 選択中の音声トラック名
let selectedAudioTrack = [];                    // 選択中の音声トラック
let selectedSubtitleLabel = '（なし）';         // 選択中の字幕トラック名
let selectedSubtitleTrack = [];                 // 選択中の字幕トラック
let currentAudioIndex = 0;                      // 現在の音声トラック位置
let currentSubtitlesIndex = 0;                  // 現在の字幕トラック位置
let currentAudioTracks = [];                    // 検出済み音声トラック一覧
let currentSubtitleTracks = [];                 // 検出済み字幕トラック一覧
let currentAudioTrack = null;                   // 現在の音声トラック
let currentSubtitleTrack = null;                // 現在の字幕トラック
let delConvertFile = null;                      // 削除待ちの変換ファイル
let currentAspectRatio = 'none';                // 現在のアスペクト比
let currentUpdateId = 0;                        // プレイリスト表示更新の世代番号
let scrollInterval = null;                      // パス表示スクロール間隔タイマー
let scrollTimeout = null;                       // パス表示スクロール待機タイマー
let currentMediaType = 'video';                 // 現在のメディア種別
let audioMotion = null;                         // オーディオモーション実体
let audioMotionMode = null;                     // オーディオモーション設定
let imageEffectBgmMode = null;                  // 画像エフェクト・BGM設定
let isImageWallpaperEnabled = null;             // 画像壁紙表示状態
let lastRandomPreset = null;                    // 直前に選択したランダムプリセット
let isSecondary = null;                         // 多重起動時のセカンダリ状態
let disableMessageOverlay = false;              // メッセージ固定表示状態
let imageTimer = null;                          // 画像再生タイマー
let imageCurrentTime = 0;                       // 画像の現在再生時間
let imageProgressInterval = null;               // 画像進捗更新タイマー
let pauseShowControls = false;                  // コントロール自動表示抑止状態
let hideCenterControls = false;                 // センターコントロール無効状態
let imageBgmPaths = [];                         // 画像再生用BGMパス一覧
let currentBgmIndex = 0;                        // 現在のBGM位置
let currentLoadedBgmPath = null;                // 読み込み済みBGMパス
let lastEffectKey = null;                       // 直前に適用したエフェクトキー
let hasMoved = false;                           // ドラッグ中の移動有無
let forceStop = true;                           // 起動時に一時停止するか
let maxImageCacheSize = 0;                      // 画像キャッシュ上限
let maxMediaCacheSize = 0;                      // 動画・音声キャッシュ上限
