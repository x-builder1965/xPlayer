// -- renderer_initializ.js --------------------------------------------
// const copyright = 'Copyright © 2025- @x-builder, Japan';
// const email = 'x-builder@gmail.com';
// const appName = 'xPlayer -メディアプレイヤー- Ver6.02.0';
// ---------------------------------------------------------------------
// 🔲初期処理🔲
// DOMContentロード完了（初期処理）
document.addEventListener('DOMContentLoaded', async () => {
    Initializing = true;

    // 🔲起動設定🔲
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

    // 🔲初期設定🔲
    // 【初期設定】メディア初期化（未設定状態）
    setupMediaPlayerClear();
    // 【初期設定】ネットURL選択のアイコン表示更新
    updateUrlButtonIcon();
    // 【初期設定】フィルタ履歴をlocalStorageから復元
    setupFilterHistory();
    // 【初期設定】ツールチップイベント設定
    setupTooltipEvents();
    // 【初期設定】背景壁紙の復元
    setupWallpaper();
    // 【初期設定】背景壁紙ボタンの状態反映（設定済みなら赤、未設定なら青）
    setupWallpaperButtonState();
    // 【初期設定】コントロール表示抑止の復元
    setupPauseShowControls();
    // 【初期設定】センターコントロール無効の復元
    setupHideCenterControls();
    // 【初期設定】ボリューム復元
    setupVolume();
    // 【初期設定】再生速度復元
    setupPlaybackSpeed();
    // 【初期設定】描画モード復元
    setupFitMode();
    // 【初期設定】常に最前面復元
    setupAlwaysOnTop();
    // 【初期設定】オーディオモーションのオプション、ノード設定を復元
    setupAudioMotionSettings();
    // 【初期設定】オーディオモーション復元
    setupAudioMotionMode();
    // 【初期設定】イメージエフェクト復元
    setupImageEffectBgmMode();
    // 【初期設定】イメージ壁紙表示の復元
    setupImageWallpaperSetting();
    // 【初期設定】イメージBGM復元
    setupImageBgmPaths();
    // 【初期設定】イメージBGM演奏曲の復元
    setupCurrentBgmIndex();
    // 【初期設定】音量バーの入力変更をBGM音量に同期
    setupVolumeBarSync();
    // 【初期設定】ズーム値復元
    setupZoomValue();
    // 【初期設定】画像移動値復元
    setupTranslateValues();
    // 【初期設定】描画モード復元
    applyFitModeSetting(fitMode);
    // 【初期設定】プレイリスト表示モード復元
    setupPlaylistDisplayMode();
    // 【初期設定】アスペクト比復元
    setupAspectRatio();
    // 【初期設定】繰り返し再生モード復元
    setupRepeatPlayMode();
    // 【初期設定】再生モード復元
    setupRandomPlayMode();
    // 【初期設定】自動シャッフル復元
    setupAutoShuffle();
    // 【初期設定】ランダム再生リスト復元
    setupShuffleOrder();
    // 【初期設定】ランダム再生ポジション復元
    setupShufflePosition();
    // 【初期設定】画像用キャッシュサイズ復元
    setupMaxImageCacheSize();
    // 【初期設定】動画・音声用キャッシュサイズ復元
    setupMaxMediaCacheSize();
    // 【初期設定】コントロールサイズ適用
    setupControlSize();
    // 【初期設定】Bluetooth／システムメディアキー対応（Windows11対応）
    settingBluetoothMedhiaKey();
    // 【初期設定】カット編集・結合編集のフレームレイトの復元
    setupEditFrameRate();
    // 【初期設定】並び替えメニューの復元
    setupCurrentSortMode();
    // 【初期設定】音声言語の復元
    setupSelectedAudioLabel();
    // 【初期設定】字幕言語の復元
    setupSelectedSubtitleLabel();
    // 【初期設定】音声メニューボタン・字幕メニューボタン切替（初期化）
    updateTrackButtonsVisibility();
    // 【初期設定】プレイリストと再生状態の復元
    setupPlaylistAndState();

    // 🔲個別イベントリスナー登録🔲
	// 【個別イベント】🌐ネットURL選択
	registerUrlInputBtnEvents();
	// 【個別イベント】📁フォルダ選択
	registerFolderInputEvents();
	// 【個別イベント】🗒️ファイル選択
	registerVideoInputEvents();
	// 【個別イベント】🎬／🔄️動作モード切替（視聴／変換）
	registerModeChangeBtnEvents();
	// 【個別イベント】🔘URLクリア
	registerUrlClearBtnEvents();
	// 【個別イベント】✅URL再生
	registerUrlConfirmBtnEvents();
	// 【個別イベント】再生中メディアパス表示エリアクリック
	registerPlaylistPathAreaClickEvents();
	// 【個別イベント】フォーカス時のイベントハンドラ
	registerPlaylistPathAreaFocusEvents();
	// 【個別イベント】ロストフォーカス時のイベントハンドラ
	registerPlaylistPathAreaBlurEvents();
	// 【個別イベント】▶️／⏸️再生/一時停止
	registerPlayPauseBtnEvents();
	// 【個別イベント】⏹️再生停止ボタン
	registerPlayStopBtnEvents();
	// 【個別イベント】⏮️前ヘ
	registerPrevVideoBtnEvents();
	// 【個別イベント】⏪30秒戻る（画像の場合は先頭へ戻す）
	registerRewindBtnEvents();
	// 【個別イベント】⏩30秒進む（画像の場合は末尾へ進み次のメディアへ）
	registerFastForwardBtnEvents();
	// 【個別イベント】⏭️次へ
	registerNextVideoBtnEvents();
	// 【個別イベント】🔊／🔇ミュート/解除
	registerVolumeMuteBtnEvents();
	// 【個別イベント】🖥️フルスクリーン切替
	registerFullscreenBtnEvents();
	// 【個別イベント】↔️／↕️／⏺️描画モード切替
	registerFitModeBtnEvents();
	// 【個別イベント】🔍ズームパネルマウスオーバー
	registerZoomPanelEvents();
	// 【個別イベント】🔍ズームモード切替
	registerZoomBtnEvents();
	// 【個別イベント】プレイリストフィルタ入力
	registerPlaylistFilterInputEvents();
	// 【個別イベント】フォーカス時／入力時にリストを表示
	registerPlaylistFilterInputDblClickEvents();
	// 【個別イベント】入力欄からフォーカスが外れたら非表示
	registerPlaylistFilterInputClickBlurEvents();
	// 【個別イベント】Enterキーで履歴に追加して非表示にする
	registerPlaylistFilterInputKeyDownEvents();
	// 【個別イベント】🔘フィルタ条件クリアボタン
	registerFilterClearBtnEvents();
	// 【個別イベント】🔀ランダム再生ボタンクリック
	registerRandomPlayBtnEvents();
	// 【個別イベント】🔁／🔂繰り返し再生ボタンクリック
	registerRepeatPlayBtnEvents();
	// 【個別イベント】📺アスペクト比設定ボタン
	registerAspectRatioBtnEvents();
	// 【個別イベント】ズームスライダー変更
	registerZoomBarEvents();
	// 【個別イベント】🔘ズームリセット
	registerZoomResetBtnEvents();
	// 【個別イベント】📷スナップショット
	registerSnapshotBtnEvents();
	// 【個別イベント】❌ズーム終了（Ctrl+z）
	registerZoomEndBtnEvents();
	// 【個別イベント】⚙️設定パネル切替
	registerSettingsBtnEvents();
	// 【個別イベント】🔀自動シャッフル切替
	registerAutoShuffleBtnEvents();
	// 【個別イベント】🖼️背景壁紙選択
	registerWallpaperBtnEvents();
	// 【個別イベント】🏳️‍🌈オーディオモーシュン設定ボタン
	registerAudioMotionBtnEvents();
	// 【個別イベント】💃イメージエフェクト＆BGM設定ボタン
	registerImageEffectBgmBtnEvents();
	// 【個別イベント】曲終了時に次のBGMへ自動遷移する処理を追加
	registerBgmAudioEvents();
	// 【個別イベント】👁️ コントロール制御ボタンのクリックイベント
	registerPauseShowBtnEvents();
	// 【個別イベント】🔝常に前面設定
	registerAlwaysOnTopBtnEvents();
	// 【個別イベント】🍥インポート・エクスポート
	registerImportExportBtnEvents();
	// 【個別イベント】❌設定モード終了
	registerSettingsCloseBtnEvents();
	// 【個別イベント】❔ヘルプ（開く）イベントリスナー
	registerHelpOpenBtnEvents();
	// 【個別イベント】❌ヘルプ（閉じる）イベントリスナー
	registerHelpCloseBtnEvents();
	// 【個別イベント】▶️メディア再生
	registerVideoPlayerPlayEvents();
	// 【個別イベント】⏸️メディア一時停止
	registerVideoPlayerPauseEvents();
	// 【個別イベント】メディアメタデータ読み込み
	registerVideoPlayerLoadedMetadataEvents();
	// 【個別イベント】🎞️結合編集ボタンクリック
	registerJoinPlaylistBtnEvents();
	// 【個別イベント】🎬メディアエラー（共通化・安全・モード対応）
	registerVideoPlayerErrorEvents();
	// 【個別イベント】再生時間更新
	registerVideoPlayerTimeUpdateEvents();
	// 【個別イベント】メディア終了、次へ
	registerVideoEndedListener();
	// 【個別イベント】メディアクリック
	registerMediaContextMenuListener();
	// 【個別イベント】メディアダブルクリック
	registerMediaDblClickListener();
	// 【個別イベント】マウス押下
	registerMediaMouseDownListener();
	// 【個別イベント】マウス移動（ドラッグシーク）
	registerMediaMouseMoveListener();
	// 【個別イベント】マウス解放
	registerMediaMouseUpListener();
	// 【個別イベント】マウスリーブ
	registerMediaMouseLeaveListener();
	// 【個別イベント】マウス左クリックで表示/非表示をトグル
	registerMediaClickListener();
	// 【個別イベント】マウスホイール
	registerMediaWheelListener();
	// 【個別イベント】カット編集シークバー ドラッグ
	registerEditSeekBarInputListener();
	// 【個別イベント】カット編集シークバー スライダー変更
	registerEditSeekBarChangeListener();
	// 【個別イベント】カット編集シークバー マウスクリック
	registerEditSeekBarMouseDownListener();
	// 【個別イベント】カット編集シークバー マウスオーバー
	registerEditSeekBarMouseOverListener();
	// 【個別イベント】カット編集シークバー マウス移動
	registerEditSeekBarMouseMoveListener();
	// 【個別イベント】カット編集シークバー マウスアウト
	registerEditSeekBarMouseOutListener();
	// 【個別イベント】カット編集シークバー マウスリーブ
	registerEditSeekBarMouseLeaveListener();
	// 【個別イベント】シークバー ドラッグ
	registerSeekBarInputListener();
	// 【個別イベント】シークバー スライダー変更
	registerSeekBarChangeListener();
	// 【個別イベント】シークバー マウスクリック
	registerSeekBarMouseDownListener();
	// 【個別イベント】シークバー マウスオーバー
	registerSeekBarMouseOverListener();
	// 【個別イベント】シークバー マウス移動
	registerSeekBarMouseMoveListener();
	// 【個別イベント】シークバー マウスアウト
	registerSeekBarMouseOutListener();
	// 【個別イベント】シークバー マウスリーブ
	registerSeekBarMouseLeaveListener();
	// 【個別イベント】音量バー入力
	registerVolumeBarInputListener();
	// 【個別イベント】音量バーマウス移動
	registerVolumeBarMousemoveEvent();
	// 【個別イベント】音量バーマウスリーブ
	registerVolumeBarMouseleaveEvent();
	// 【個別イベント】再生速度セレクト
	registerSpeedSelectChangeEvent();
	// 【個別イベント】コントロールマウスオーバー
	registerControlsMouseoverEvent();
	// 【個別イベント】コントロールマウスリーブ
	registerControlsMouseleaveEvent();
	// 【個別イベント】ファイル名マウスオーバー
	registerFilenameMouseoverEvent();
	// 【個別イベント】ファイル名マウスリーブ
	registerFilenameMouseleaveEvent();
	// 【個別イベント】📩並び替えボタンクリックイベント（トグル実装）
	registerSortPlaylistBtnClickEvent();
	// 【個別イベント】📚表示形式ボタン
	registerPlaylistDisplayBtnClickEvent();
	// 【個別イベント】🔼上へボタン
	registerUpMovePlaylistBtnClickEvent();
	// 【個別イベント】🔽下へボタン
	registerDownMovePlaylistBtnClickEvent();
	// 【個別イベント】＋追加ボタン
	registerAddPlaylistBtnClickEvent();
	// 【個別イベント】－削除ボタン
	registerRemovePlaylistBtnClickEvent();
	// 【個別イベント】🆑プレイリストクリアボタン
	registerClearPlaylistBtnClickEvent();
	// 【個別イベント】💾保存ボタン
	registerSavePlaylistBtnClickEvent();
	// 【個別イベント】既存のドラッグ＆ドロップ処理無効化
	registerDropzoneDragEvents();
	// 【個別イベント】ドラッグ＆ドロップ処理
	registerDropzoneDropEvent();
	// 【個別イベント】✂️編集モード切替
	registerEditModeBtnClickEvent();
	// 【個別イベント】❌カット中断
	registerCutCancelBtnClickEvent();
	// 【個別イベント】📍←インマーク設定
	registerSetInMarkBtnClickEvent();
	// 【個別イベント】→📍アウトマーク設定
	registerSetOutMarkBtnClickEvent();
	// 【個別イベント】編集シークバー
	registerEditSeekBarInputEvent();
	// 【個別イベント】🆑カット編集クリアボタン
	registerClearEditBtnClickEvent();
	// 【個別イベント】✅カット範囲追加
	registerAddCutRangeBtnClickEvent();
	// 【個別イベント】💾カット保存（動画・音声対応）
	registerSaveVideoBtnClickEvent();
	// 【個別イベント】編集モード時にシークバーを同期
	registerVideoPlayerTimeupdateEvent();
	// 【個別イベント】🎤音声選択クリック時
	registerVoiceSelectBtnClickEvent();
	// 【個別イベント】🔠字幕選択クリック時
	registerSubtitleSelectBtnClickEvent();
	// 【個別イベント】変更履歴の表示／非表示トグル
	registerChangelogBtnClickEvent();
	// 【個別イベント】センターコントロールの前へボタンクリックイベント
	registerCenterPrevBtnClickEvent();
	// 【個別イベント】センターコントロールの再生/一時停止ボタンクリックイベント
	registerCenterPlayPauseBtnClickEvent();
	// 【個別イベント】センターコントロールの次へボタンクリックイベント
	registerCenterNextBtnClickEvent();
	// 【個別イベント】センターコントロールの前へボタンマウスオーバーイベント
	registerCenterPrevBtnMouseoverEvent();
	// 【個別イベント】センターコントロールの再生/一時停止ボタンマウスオーバーイベント
	registerCenterPlayPauseBtnMouseoverEvent();
	// 【個別イベント】センターコントロールの次へボタンマウスオーバーイベント
	registerCenterNextBtnMouseoverEvent();
	// 【個別イベント】センターコントロールの前へボタンマウスリーブイベント
	registerCenterPrevBtnMouseleaveEvent();
	// 【個別イベント】センターコントロールの再生/一時停止ボタンマウスリーブイベント
	registerCenterPlayPauseBtnMouseleaveEvent();
	// 【個別イベント】センターコントロールの次へボタンマウスリーブイベント
	registerCenterNextBtnMouseleaveEvent();

	// 🔲documentイベントリスナー登録🔲
	// 【documentイベント】ショートカットキー（イベントリスナー）
	registerDocumentKeydownEvents();
	// 【documentイベント】グローバル mouseup でドラッグ終了を確実に検知
	registerDocumentMouseupEvents();
	// 【documentイベント】フルスクリーン変更
	registerDocumentFullscreenchangeEvents();
	
	// 🔲windowイベントリスナー登録🔲
	// 【windowイベント】ウィンドウリサイズ
	registerWindowResizeEvents();
	// 【windowイベント】ウィンドウ終了前
	registerWindowBeforeunloadEvents();
	// 【windowイベント】ウィンドウ終了
	registerWindowUnloadEvents();
	
	// 🔲ipcRendererイベントハンドラ登録🔲
	// 【ipcRendererイベント】自動再生指示を受信
	registerIpcRendererAutoPlayFilesEvents();
	// 【ipcRendererイベント】起動時設定インポート指示を受信
	registerIpcRendererAutoImportSettingsEvents();
	// 【ipcRendererイベント】変換進捗受信
	registerIpcRendererConvertProgressEvents();
	// 【ipcRendererイベント】字幕ファイル出力開始受信
	registerIpcRendererSubtitleExtractionProgressEvents();
	// 【ipcRendererイベント】変換エラー受信
	registerIpcRendererConvertErrorEvents();
	// 【ipcRendererイベント】カット進捗受信（ 詳細ペイロード対応）
	registerIpcRendererCutProgressEvents();
	// 【ipcRendererイベント】結合進捗受信（詳細ペイロード対応）
	registerIpcRendererJoinProgressEvents();

    Initializing = false;
});

// 🔲初期設定関数🔲
// 【初期設定】メディアプレーヤーの初期化
function setupMediaPlayerClear() {
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
    audioPlayer.removeAttribute('src');
    audioPlayer.load();
    videoPreview.removeAttribute('src');
    videoPreview.load();
    updateMediaPlayerDisplay();
}

// 【初期設定】ツールチップイベント設定
function setupTooltipEvents() {
    tooltipElements.forEach(element => {
        const show = () => showTooltip(element);
        const hide = () => hideTooltip(element);

        element.addEventListener('mouseenter', show);
        element.addEventListener('mouseleave', hide);
        element.addEventListener('focusout', hide);
        element.addEventListener('click', hide);
    });
}

// 【初期設定】背景壁紙の復元
function setupWallpaper() {
    if (savedWallpaperPath) {
        videoContainer.style.backgroundImage = savedWallpaperPath;
    } else {
        videoContainer.style.backgroundImage = 'none';
    }
}

// 【初期設定】背景壁紙ボタンの状態反映（設定済みなら赤、未設定なら青）
function setupWallpaperButtonState() {
    if (wallpaperBtn) {
        if (savedWallpaperPath && savedWallpaperPath !== 'none' && savedWallpaperPath.trim() !== '') {
            wallpaperBtn.classList.add('wallpaper-active');
            wallpaperBtn.style.background = '';
        } else {
            wallpaperBtn.classList.remove('wallpaper-active');
        }
    }
}

// 【初期設定】コントロール表示抑止の復元
function setupPauseShowControls() {
    if (savedPauseShowControls === 'true') {
        pauseShowControls = true;
    } else {
        pauseShowControls = false;
    }
}

// 【初期設定】センターコントロール無効の復元
function setupHideCenterControls() {
    if (savedHideCenterControls === 'true') {
        hideCenterControls = true;
    } else {
        hideCenterControls = false;
    }
}

// 【初期設定】ボリューム復元
function setupVolume() {
    const restoredVolume = Number(savedVolume);
    if (Number.isFinite(restoredVolume) && restoredVolume >= 0 && restoredVolume <= 1) {
        volumeBar.value = restoredVolume;
        lastVolume = restoredVolume;
        volumeMuteBtn.textContent = restoredVolume === 0 ? '🔇' : '🔊';
        volumeMuteBtn.classList.toggle('muted-active', restoredVolume === 0);
        volumeMuteBtn.setAttribute('data-tooltip', restoredVolume === 0 ? 'ミュート解除（Ctrl+m）' : 'ミュート（Ctrl+m）');
        updateVolumeDisplay();
    } else {
        volumeBar.value = 0.2;
        lastVolume = 0.2;
        volumeMuteBtn.textContent = '🔊';
        volumeMuteBtn.classList.remove('muted-active');
        volumeMuteBtn.setAttribute('data-tooltip', 'ミュート（Ctrl+m）');
        updateVolumeDisplay();
    }
}

// 【初期設定】再生速度復元
function setupPlaybackSpeed() {
    if (savedPlaybackSpeed && !isNaN(savedPlaybackSpeed) && parseFloat(savedPlaybackSpeed) > 0) {
        currentPlaybackRate = parseFloat(savedPlaybackSpeed);
        if (speedSelect) speedSelect.value = currentPlaybackRate.toFixed(2);
    } else {
        currentPlaybackRate = 1.0;
        if (speedSelect) speedSelect.value = "1.00";
    }
    if (speedSelect) speedSelect.value = currentPlaybackRate.toFixed(2);
}

// 【初期設定】描画モード復元
function setupFitMode() {
    if (savedFitMode) {
        fitMode = savedFitMode;
    } else {
        fitMode = 'contain';
    }
}

// 【初期設定】常に最前面復元
async function setupAlwaysOnTop() {
    if (savedAlwaysOnTop === 'true') {
        isAlwaysOnTop = true;
        await setAlwaysOnTop(true);
    }
    updateAlwaysOnTopButtonUI();
}

// 【初期設定】オーディオモーション復元
function setupAudioMotionMode() {
    if (savedAudioMotionMode && AUDIOMOTION_NODES[savedAudioMotionMode]) {
        audioMotionMode = savedAudioMotionMode;
    } else {
        audioMotionMode = 'preset1';
    }
}

// 【初期設定】イメージエフェクト復元
function setupImageEffectBgmMode() {
    if (savedImageEffectBgmMode && IMAGEEFFECTBGM_NODES[savedImageEffectBgmMode]) {
        imageEffectBgmMode = savedImageEffectBgmMode;
    } else {
        imageEffectBgmMode = 'effect1';
    }
}

// 【初期設定】イメージ壁紙表示の復元
function setupImageWallpaperSetting() {
    if (savedIsImageWallpaperEnabled === 'true') {
        isImageWallpaperEnabled = true;
    } else {
        isImageWallpaperEnabled = false;
    }
}

// 【初期設定】イメージBGM復元
function setupImageBgmPaths() {
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
}

// 【初期設定】イメージBGM演奏曲の復元
function setupCurrentBgmIndex() {
    if (savedCurrentBgmIndex !== null && Number.isInteger(Number(savedCurrentBgmIndex))) {
        currentBgmIndex = Number(savedCurrentBgmIndex);
        if (currentBgmIndex < 0 || currentBgmIndex >= imageBgmPaths.length) currentBgmIndex = 0;
    } else {
        currentBgmIndex = 0;
    }
}

// 【初期設定】音量バーの入力変更をBGM音量に同期
function setupVolumeBarSync() {
    if (volumeBar) {
        bgmAudio.volume = parseFloat(volumeBar.value);
        volumeBar.addEventListener('input', () => {
            bgmAudio.volume = parseFloat(volumeBar.value);
        });
    }
}

// 【初期設定】ズーム値復元
function setupZoomValue() {
    const restoredZoom = Number(savedZoom);
    if (Number.isFinite(restoredZoom)) {
        zoomValue = Math.trunc(restoredZoom);
        zoomBar.value = zoomValue.toString();
    } else {
        zoomValue = 0;
        zoomBar.value = '0';
    }
}

// 【初期設定】画像移動値復元
function setupTranslateValues() {
    const restoredTranslateX = Number(savedTranslateX);
    const restoredTranslateY = Number(savedTranslateY);
    if (Number.isFinite(restoredTranslateX) && Number.isFinite(restoredTranslateY)) {
        translateX = Math.trunc(restoredTranslateX);
        translateY = Math.trunc(restoredTranslateY);
    } else {
        translateX = 0;
        translateY = 0;
    }
}

// 【初期設定】プレイリスト表示モード復元
function setupPlaylistDisplayMode() {
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
}

// 【初期設定】アスペクト比復元
function setupAspectRatio() {
    if (savedAspectRatio && ASPECT_NODES[savedAspectRatio]) {
        currentAspectRatio = savedAspectRatio;
    } else {
        currentAspectRatio = 'none';
    }
    applyAspectRatioSetting();
    applyZoom(zoomValue);
}

// 【初期設定】繰り返し再生モード復元
function setupRepeatPlayMode() {
    if (savedIsRepeatPlayMode && ['none', 'all', 'single'].includes(savedIsRepeatPlayMode)) {
        isRepeatPlayMode = savedIsRepeatPlayMode;
    } else {
        isRepeatPlayMode = 'none';
    }
    updateRepeatButtonUI();
}

// 【初期設定】再生モード復元
function setupRandomPlayMode() {
    if (savedIsRandomPlayMode === 'true') {
        isRandomPlayMode = true;
    }
    updateRandomButtonUI();
}

// 【初期設定】自動シャッフル復元
function setupAutoShuffle() {
    if (savedAutoShuffle === 'false') {
        autoShuffle = false;
    }
    updateAutoShuffleButtonUI();
}

// 【初期設定】ランダム再生リスト復元
function setupShuffleOrder() {
    if (savedShuffleOrder) {
        try {
            const parsedPlaylist = safeJSONParse(savedPlaylist, []);
            const parsedShuffleOrder = safeJSONParse(savedShuffleOrder, []);
            const playlistLength = Array.isArray(parsedPlaylist) ? parsedPlaylist.length : 0;
            const isValidShuffleOrder = Array.isArray(parsedShuffleOrder)
                && parsedShuffleOrder.length === playlistLength
                && parsedShuffleOrder.every(index => Number.isInteger(index) && index >= 0 && index < playlistLength)
                && new Set(parsedShuffleOrder).size === playlistLength;
            if (isValidShuffleOrder) {
                shuffleOrder = parsedShuffleOrder;
            } else {
                shuffleOrder = [];
            }
        } catch (e) {
            console.warn('shuffleOrder の復元に失敗:', e);
            shuffleOrder = [];
        }
    }
}

// 【初期設定】ランダム再生ポジション復元
function setupShufflePosition() {
    if (savedShufflePosition !== 'null') {
        shufflePosition = parseInt(savedShufflePosition, 10);
        if (isNaN(shufflePosition) || shufflePosition < -1) {
            shufflePosition = -1;
        }
    }
}

// 【初期設定】画像用キャッシュサイズ復元
function setupMaxImageCacheSize() {
    if (savedMaxImageCacheSize !== 'null') {
        const restoredImageCacheSize = Number(savedMaxImageCacheSize);
        maxImageCacheSize = Number.isInteger(restoredImageCacheSize) && restoredImageCacheSize >= 0
            ? restoredImageCacheSize : MAX_IMAGE_CACHE_SIZE;
    } else {
        maxImageCacheSize = MAX_IMAGE_CACHE_SIZE;
    }
    localStorageSetItemAndFile('maxImageCacheSize', maxImageCacheSize);
}

// 【初期設定】動画・音声用キャッシュサイズ復元
function setupMaxMediaCacheSize() {
    if (savedMaxMediaCacheSize !== 'null') {
        const restoredMediaCacheSize = Number(savedMaxMediaCacheSize);
        maxMediaCacheSize = Number.isInteger(restoredMediaCacheSize) && restoredMediaCacheSize >= 0
            ? restoredMediaCacheSize : MAX_MEDIA_CACHE_SIZE;
    } else {
        maxMediaCacheSize = MAX_MEDIA_CACHE_SIZE;
    }
    localStorageSetItemAndFile('maxMediaCacheSize', maxMediaCacheSize);
}

// 【初期設定】コントロールサイズ適用
function setupControlSize() {
    const controlSizeX = calculateControlSizeX();
    const controlSizeY = calculateControlSizeY();
    localStorageSetItemAndFile('controlSizeX', controlSizeX);
    localStorageSetItemAndFile('controlSizeY', controlSizeY);
    updateControlSize(controlSizeX, controlSizeY);
    adjustFilterPanelHeight();
    applyAspectRatioSetting();
}

// 【初期設定】Bluetooth／システムメディアキー対応（Windows11対応）
function settingBluetoothMedhiaKey() {
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
}

// 【初期設定】カット編集・結合編集のフレームレイトの復元
function setupEditFrameRate() {
    if (!savedEditFrameRate) {
        editFrameRate = 30;
    } else {
        editFrameRate = savedEditFrameRate;
    }
}

// 【初期設定】並び替えメニューの復元
function setupCurrentSortMode() {
    sortPlaylistBtn.classList.remove('sorted-active', 'random-sorted-active');
    if (!SORT_MODES[savedCurrentSortMode]) {
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
}

// 【初期設定】音声言語の復元
function setupSelectedAudioLabel() {
    if (!savedSelectedAudioLabel) {
        selectedAudioLabel = '日本語';
    } else {
        selectedAudioLabel = savedSelectedAudioLabel;
    }
    if (savedSelectedAudioTrack) {
        try {
            const parsedAudioTrack = typeof savedSelectedAudioTrack === 'string'
                ? JSON.parse(savedSelectedAudioTrack) : savedSelectedAudioTrack;
            selectedAudioTrack = Array.isArray(parsedAudioTrack) ? parsedAudioTrack : [];
        } catch (e) {
            console.warn('selectedAudioTrack の復元に失敗:', e);
            selectedAudioTrack = [];
        }
        currentAudioTrack = selectedAudioTrack;
    }
}

// 【初期設定】字幕言語の復元
function setupSelectedSubtitleLabel() {
    if (!savedSelectedSubtitleLabel) {
        selectedSubtitleLabel = '（なし）';
    } else {
        selectedSubtitleLabel = savedSelectedSubtitleLabel;
    }
    if (savedSelectedSubtitleTrack) {
        try {
            const parsedSubtitleTrack = typeof savedSelectedSubtitleTrack === 'string'
                ? JSON.parse(savedSelectedSubtitleTrack) : savedSelectedSubtitleTrack;
            selectedSubtitleTrack = Array.isArray(parsedSubtitleTrack) ? parsedSubtitleTrack : [];
        } catch (e) {
            console.warn('selectedSubtitleTrack の復元に失敗:', e);
            selectedSubtitleTrack = [];
        }
        currentSubtitleTrack = selectedSubtitleTrack;
    }
}

// 【初期設定】プレイリストおよび再生状態の復元
async function setupPlaylistAndState() {
    // リロード判定（PerformanceNavigationTiming API）
    const navEntries = performance.getEntriesByType('navigation');
    const isReload = navEntries.length > 0 && navEntries[0].type === 'reload';
    
    // 起動時の引数有無判定
    const args = await getCommandLineArgs();
    if (!isReload && args && args.length > 0) {
        updateMessageOverlay('📚 プレイリスト作成中...', 0, false);
        // main.js が auto-play-files を送信するので、ここでは何もしない
        return;
    }

    // 引数なし → originalLoadOrder の復元
    if (savedOriginalOrder) {
        try {
            const parsedOriginalOrder = safeJSONParse(savedOriginalOrder, []);
            originalLoadOrder = Array.isArray(parsedOriginalOrder)
                ? parsedOriginalOrder.filter(Boolean)
                : [];
        } catch (e) {
            console.warn('originalLoadOrder の復元に失敗:', e);
            originalLoadOrder = [];
        }
    }

    // 引数なし → プレイリストと再生状態復元
    if (savedPlaylist && savedCurrentVideoIndex != null && savedCurrentTime != null) {
        try {
            // すでに配列の場合はそのまま、文字列の場合は JSON Parse
            const parsedPlaylist = typeof savedPlaylist === 'string' 
                ? safeJSONParse(savedPlaylist, []) 
                : savedPlaylist;

            if (Array.isArray(parsedPlaylist) && parsedPlaylist.length > 0) {
                // プレイリスト復元
                updateMessageOverlay('📚 プレイリスト作成中...', 0, false);
                
                const loadedPlaylist = await Promise.all(
                    parsedPlaylist.map(file => createPlaylistItem(file))
                );
                playlist = loadedPlaylist.filter(Boolean);

                if (playlist.length === 0) {
                    throw new Error('復元可能なプレイリスト項目がありません');
                }

                synchronizeOriginalLoadOrder();

                const parsedIndex = Number.parseInt(savedCurrentVideoIndex, 10);
                currentVideoIndex = Number.isInteger(parsedIndex) && parsedIndex >= 0
                    ? Math.min(parsedIndex, playlist.length - 1)
                    : 0;

                await debouncedUpdateFilterList();
                await debouncedScrollCurrentFilterItem();

                // 復元メディアの再生
                const restoredCurrentTime = Number(savedCurrentTime);
                const targetTime = Number.isFinite(restoredCurrentTime) && restoredCurrentTime >= 0 
                    ? restoredCurrentTime 
                    : 0;

                await playVideo(playlist[currentVideoIndex].file, targetTime);

                if (forceStop) {
                    // 起動時は一時停止状態にする
                    await togglePlayPause();
                }

                hideMessageOverlay(true);
                updateIconOverlay();
            } else {
                resetPlaylistState();
            }
        } catch (e) {
            console.error('プレイリスト復元エラー:', e);
            resetPlaylistState();
            hideMessageOverlay(true);
        }
    } else {
        resetPlaylistState();
    }
}

// 【初期設定】復元失敗時・データ非存在時の画面表示をリセットする処理
function resetPlaylistState() {
    playlistPathArea.value = appNameAndCopyrightValueLine;
    updateIconOverlay();
}
