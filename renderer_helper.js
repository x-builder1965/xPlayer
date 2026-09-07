// -- renderer_event.js ------------------------------------------------
// const copyright = 'Copyright © 2025- @x-builder, Japan';
// const email = 'x-builder@gmail.com';
// const appName = 'xPlayer -メディアプレイヤー- Ver6.02.0';
// ---------------------------------------------------------------------
// 🔲個別イベントリスナー登録関数🔲
// 【個別イベント】🌐ネットURL選択
function registerUrlInputBtnEvents() {
    urlInputBtn.addEventListener('click', async () => {
        if (isurlInputPanelVisible) {
            // 現在表示中 → キャンセル
            await toggleurlInputPanel(false);
        } else {
            // 非表示 → 表示を試みる（クリップボードチェックあり）
            await toggleurlInputPanel(true);
        }
    });
}

// 【個別イベント】📁フォルダ選択
function registerFolderInputEvents() {
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
}

// 【個別イベント】🗒️ファイル選択
function registerVideoInputEvents() {
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
}

// 【個別イベント】🎬／🔄️動作モード切替（視聴／変換）
function registerModeChangeBtnEvents() {
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
}

// 【個別イベント】🔘URLクリア
function registerUrlClearBtnEvents() {
    urlClearBtn.addEventListener('click', () => {
        hideMessageOverlay();
        urlInput.value = '';
        urlInput.focus();
    });
}

// 【個別イベント】✅URL再生
function registerUrlConfirmBtnEvents() {
    urlConfirmBtn.addEventListener('click', () => {
        urlInputEnter();
    });
}

// 【個別イベント】再生中メディアパス表示エリアクリック
function registerPlaylistPathAreaClickEvents() {
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
}

// 【個別イベント】フォーカス時のイベントハンドラ
function registerPlaylistPathAreaFocusEvents() {
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
}

// 【個別イベント】ロストフォーカス時のイベントハンドラ
function registerPlaylistPathAreaBlurEvents() {
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
}

// 【個別イベント】▶️／⏸️再生/一時停止
function registerPlayPauseBtnEvents() {
    playPauseBtn.addEventListener('click', async () => {
        await togglePlayPause()
    });
}

// 【個別イベント】⏹️再生停止ボタン
function registerPlayStopBtnEvents() {
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
            imageWallpaper.className = '';          // 必要に応じてクラスもクリア
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
}

// 【個別イベント】⏮️前ヘ
function registerPrevVideoBtnEvents() {
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
}

// 【個別イベント】⏪30秒戻る（画像の場合は先頭へ戻す）
function registerRewindBtnEvents() {
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
}

// 【個別イベント】⏩30秒進む（画像の場合は末尾へ進み次のメディアへ）
function registerFastForwardBtnEvents() {
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
}

// 【個別イベント】⏭️次へ
function registerNextVideoBtnEvents() {
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
}

// 【個別イベント】🔊／🔇ミュート/解除
function registerVolumeMuteBtnEvents() {
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
}

// 【個別イベント】🖥️フルスクリーン切替
function registerFullscreenBtnEvents() {
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
}

// 【個別イベント】↔️／↕️／⏺️描画モード切替
function registerFitModeBtnEvents() {
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
}

// 【個別イベント】🔍ズームパネルマウスオーバー
function registerZoomPanelEvents() {
    zoomPanel.addEventListener('mouseover', () => {
        if (isZoomMode) {
            zoomPanel.style.cursor = 'auto';
            updateIconOverlay();
        }
    });
}

// 【個別イベント】🔍ズームモード切替
function registerZoomBtnEvents() {
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
}

// 【個別イベント】プレイリストフィルタ入力
function registerPlaylistFilterInputEvents() {
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
}

// 【個別イベント】フォーカス時／入力時にリストを表示
function registerPlaylistFilterInputDblClickEvents() {
    playlistFilterInput.addEventListener('dblclick', showHistoryList);
}

// 【個別イベント】入力欄からフォーカスが外れたら非表示
function registerPlaylistFilterInputClickBlurEvents() {
    playlistFilterInput.addEventListener('click', hideHistoryList);
    playlistFilterInput.addEventListener('blur', hideHistoryList);
}

// 【個別イベント】Enterキーで履歴に追加して非表示にする
function registerPlaylistFilterInputKeyDownEvents() {
    playlistFilterInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const text = playlistFilterInput.value;
            if (text.trim() !== '') {
                addToFilterHistory(text);
                hideHistoryList();
            }
        }
    });
}

// 【個別イベント】🔘フィルタ条件クリアボタン
function registerFilterClearBtnEvents() {
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
}

// 【個別イベント】🔀ランダム再生ボタンクリック
function registerRandomPlayBtnEvents() {
    randomPlayBtn.addEventListener('click', () => {
        toggleRandomPlay();
    });
}

// 【個別イベント】🔁／🔂繰り返し再生ボタンクリック
function registerRepeatPlayBtnEvents() {
    repeatPlayBtn.addEventListener('click', () => {
        toggleRepeatPlay();
    });
}

// 【個別イベント】📺アスペクト比設定ボタン
function registerAspectRatioBtnEvents() {
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
}

// 【個別イベント】ズームスライダー変更
function registerZoomBarEvents() {
    zoomBar.addEventListener('input', () => {
        const zoomPercent = parseInt(zoomBar.value);
        applyZoom(zoomPercent);
    });
}

// 【個別イベント】🔘ズームリセット
function registerZoomResetBtnEvents() {
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
}

// 【個別イベント】📷スナップショット
function registerSnapshotBtnEvents() {
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
}

// 【個別イベント】❌ズーム終了（Ctrl+z）
function registerZoomEndBtnEvents() {
    zoomEndBtn.addEventListener('click', () => {
        isZoomMode = false;
        hideMenus();
        zoomPanel.style.display = 'none';
        zoomBtn.textContent = '🔍';
        zoomBtn.classList.remove('mode-active');
        zoomBtn.setAttribute('data-tooltip', 'ズームモード開始（Ctrl+z）');
    });
}

// 【個別イベント】⚙️設定パネル切替
function registerSettingsBtnEvents() {
    settingsBtn.addEventListener('click', () => {
        toggleSettingsPanel(!isSettingsPanelOpen);
    });
}

// 【個別イベント】🔀自動シャッフル切替
function registerAutoShuffleBtnEvents() {
    autoShuffleBtn.addEventListener('click', () => {
        toggleAutoShuffle();
    });
}

// 【個別イベント】🖼️背景壁紙選択
function registerWallpaperBtnEvents() {
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
}

// 【個別イベント】🏳️‍🌈オーディオモーシュン設定ボタン
function registerAudioMotionBtnEvents() {
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
}

// 【個別イベント】💃イメージエフェクト＆BGM設定ボタン
function registerImageEffectBgmBtnEvents() {
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
}

// 【個別イベント】曲終了時に次のBGMへ自動遷移する処理を追加
function registerBgmAudioEvents() {
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
}

// 【個別イベント】👁️ コントロール制御ボタンのクリックイベント
function registerPauseShowBtnEvents() {
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
}

// 【個別イベント】🔝常に前面設定
function registerAlwaysOnTopBtnEvents() {
    alwaysOnTopBtn.addEventListener('click', () => {
        toggleAlwaysOnTop();
    });
}

// 【個別イベント】🍥インポート・エクスポート
function registerImportExportBtnEvents() {
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
}

// 【個別イベント】❌設定モード終了
function registerSettingsCloseBtnEvents() {
    settingsCloseBtn.addEventListener('click', () => {
        toggleSettingsPanel(false);
    });
}

// 【個別イベント】❔ヘルプ（開く）イベントリスナー
function registerHelpOpenBtnEvents() {
    helpOpenBtn.addEventListener('click', openHelp);
}

// 【個別イベント】❌ヘルプ（閉じる）イベントリスナー
function registerHelpCloseBtnEvents() {
    helpCloseBtn.addEventListener('click', closeHelp);
}

// 【個別イベント】▶️メディア再生
function registerVideoPlayerPlayEvents() {
    videoPlayer.addEventListener('play', () => {
        // メディアナビゲータ再生中設定
        navigator.mediaSession.playbackState = 'playing';
    });
}

// 【個別イベント】⏸️メディア一時停止
function registerVideoPlayerPauseEvents() {
    videoPlayer.addEventListener('pause', () => {
        // メディアナビゲータ一時停止設定
        navigator.mediaSession.playbackState = 'paused';
    });
}

// 【個別イベント】メディアメタデータ読み込み
function registerVideoPlayerLoadedMetadataEvents() {
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
}

// 【個別イベント】🎞️結合編集ボタンクリック
function registerJoinPlaylistBtnEvents() {
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
}

// 【個別イベント】🎬メディアエラー（共通化・安全・モード対応）
function registerVideoPlayerErrorEvents() {
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
}

// 【個別イベント】再生時間更新
function registerVideoPlayerTimeUpdateEvents() {
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
}

// 【個別イベント】メディア終了、次へ
function registerVideoEndedListener() {
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
}

// 【個別イベント】メディアクリック
function registerMediaContextMenuListener() {
    mediaContainer.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (event.ctrlKey) {
            playStopBtn.click();
        } else {
            playPauseBtn.click();
        }
    });
}

// 【個別イベント】メディアダブルクリック
function registerMediaDblClickListener() {
    mediaContainer.addEventListener('dblclick', (event) => {
        event.preventDefault();
        fullscreenBtn.click();
    });
}

// 【個別イベント】マウス押下
function registerMediaMouseDownListener() {
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
}

// 【個別イベント】マウス移動（ドラッグシーク）
function registerMediaMouseMoveListener() {
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
}

// 【個別イベント】マウス解放
function registerMediaMouseUpListener() {
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
}

// 【個別イベント】マウスリーブ
function registerMediaMouseLeaveListener() {
    mediaContainer.addEventListener('mouseleave', () => {
        isDragging = false;
        isVolumeDragging = false;
        isPanning = false;
        updateIconOverlay();
    });
}

// 【個別イベント】マウス左クリックで表示/非表示をトグル
function registerMediaClickListener() {
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
}

// 【個別イベント】マウスホイール
function registerMediaWheelListener() {
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
}

// 【個別イベント】カット編集シークバー ドラッグ
function registerEditSeekBarInputListener() {
    editSeekBar.addEventListener('input', (e) => {
        if (filename.style.opacity !== '1') return;
        if (!videoPlayer.duration) return;
        const time = videoPlayer.duration * (editSeekBar.value / 100);
        videoPlayer.currentTime = time;
        seekBar.value = (time / videoPlayer.duration) * 100;
        updateTimeDisplay();
        updateMessageOverlay(`🕓 ${formatTime(time)}`);
    });
}

// 【個別イベント】カット編集シークバー スライダー変更
function registerEditSeekBarChangeListener() {
    editSeekBar.addEventListener('change', () => {
        if (filename.style.opacity !== '1') return;
        if (!videoPlayer.duration) return;
        // 最後にユーザーがセットした値を優先して使う
        updateTimeDisplay();                       // 正しい時間で更新
        localStorageSetItemAndFile('currentTime', videoPlayer.currentTime);
    });
}

// 【個別イベント】カット編集シークバー マウスクリック
function registerEditSeekBarMouseDownListener() {
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
}

// 【個別イベント】カット編集シークバー マウスオーバー
function registerEditSeekBarMouseOverListener() {
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
}

// 【個別イベント】カット編集シークバー マウス移動
function registerEditSeekBarMouseMoveListener() {
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
}

// 【個別イベント】カット編集シークバー マウスアウト
function registerEditSeekBarMouseOutListener() {
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
}

// 【個別イベント】カット編集シークバー マウスリーブ
function registerEditSeekBarMouseLeaveListener() {
    editSeekBar.addEventListener('mouseleave', () => {
        if (filename.style.opacity !== '1') return;
        if (isEditSeekDragging && !filename.matches(':active')) {
            seekBar.value = editSeekBar.value; // シークバーも同期
            isEditSeekDragging = false;
            darkOverlay.style.display = 'none';
        }
    });
}

// 【個別イベント】シークバー ドラッグ
function registerSeekBarInputListener() {
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
}

// 【個別イベント】シークバー スライダー変更
function registerSeekBarChangeListener() {
    seekBar.addEventListener('change', () => {
        if (controls.style.opacity !== '1') return;
        const duration = getMediaDuration();
        if (!duration) return;
        
        updateTimeDisplay();
        localStorageSetItemAndFile('currentTime', getMediaCurrentTime());
    });
}

// 【個別イベント】シークバー マウスクリック
function registerSeekBarMouseDownListener() {
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
}

// 【個別イベント】シークバー マウスオーバー
function registerSeekBarMouseOverListener() {
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
}

// 【個別イベント】シークバー マウス移動
function registerSeekBarMouseMoveListener() {
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
}

// 【個別イベント】シークバー マウスアウト
function registerSeekBarMouseOutListener() {
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
}

// 【個別イベント】シークバー マウスリーブ
function registerSeekBarMouseLeaveListener() {
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
}

// 【個別イベント】音量バー入力
function registerVolumeBarInputListener() {
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
}

// 【個別イベント】音量バーマウス移動
function registerVolumeBarMousemoveEvent() {
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
}

// 【個別イベント】音量バーマウスリーブ
function registerVolumeBarMouseleaveEvent() {
    volumeBar.addEventListener('mouseleave', () => {
        if (controls.style.opacity !== '1') return;
        if (!isDragging && !volumeBar.matches(':active')) {
            if (!isVolumeDragging && !volumeBar.matches(':active')) {
                hideMessageOverlay();
            }
            updateIconOverlay();
        }
    });
}

// 【個別イベント】再生速度セレクト
function registerSpeedSelectChangeEvent() {
    speedSelect.addEventListener('change', (e) => {
        if (controls.style.opacity !== '1') return;
        const rate = parseFloat(e.target.value);
        if (!isNaN(rate) && rate > 0) {
            setPlaybackRate(rate);
        }
    });
}

// 【個別イベント】コントロールマウスオーバー
function registerControlsMouseoverEvent() {
    controls.addEventListener('mouseover', () => {
        disableAutoHideControls();
    });
}

// 【個別イベント】コントロールマウスリーブ
function registerControlsMouseleaveEvent() {
    controls.addEventListener('mouseleave', () => {
        enableAutoHideControls();
    });
}

// 【個別イベント】ファイル名マウスオーバー
function registerFilenameMouseoverEvent() {
    filename.addEventListener('mouseover', () => {
        disableAutoHideControls();
    });
}

// 【個別イベント】ファイル名マウスリーブ
function registerFilenameMouseleaveEvent() {
    filename.addEventListener('mouseleave', () => {
        enableAutoHideControls();
    });
}

// 【個別イベント】📩並び替えボタンクリックイベント（トグル実装）
function registerSortPlaylistBtnClickEvent() {
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
}

// 【個別イベント】📚表示形式ボタン
function registerPlaylistDisplayBtnClickEvent() {
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
}

// 【個別イベント】🔼上へボタン
function registerUpMovePlaylistBtnClickEvent() {
    upMovePlaylistBtn.addEventListener('click', () => {
        clearPlaylistFilter();
        upMovePlaylist();
    });
}

// 【個別イベント】🔽下へボタン
function registerDownMovePlaylistBtnClickEvent() {
    downMovePlaylistBtn.addEventListener('click', () => {
        clearPlaylistFilter();
        downMovePlaylist();
    });
}

// 【個別イベント】＋追加ボタン
function registerAddPlaylistBtnClickEvent() {
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
}

// 【個別イベント】－削除ボタン
function registerRemovePlaylistBtnClickEvent() {
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
}

// 【個別イベント】🆑プレイリストクリアボタン
function registerClearPlaylistBtnClickEvent() {
    clearPlaylistBtn.addEventListener('click', () => {
        clearPlaylistFilter();
        clearPlaylist();

        shuffleOrder = [];
        shufflePosition = -1;
        saveShuffleState();

        updatePlaylistDisplay();
        savePlaylistAndPlaybackState();
    });
}

// 【個別イベント】💾保存ボタン
function registerSavePlaylistBtnClickEvent() {
    savePlaylistBtn.addEventListener('click', () => {
        savePlaylist();
    });
}

// 【個別イベント】既存のドラッグ＆ドロップ処理無効化
function registerDropzoneDragEvents() {
    ['dragover', 'dragenter', 'dragleave'].forEach(evt => {
        dropzone.addEventListener(evt, (e) => {
            e.preventDefault();
        });
    });
}

// 【個別イベント】ドラッグ＆ドロップ処理
function registerDropzoneDropEvent() {
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
}

// 【個別イベント】✂️編集モード切替
function registerEditModeBtnClickEvent() {
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
}

// 【個別イベント】❌カット中断
function registerCutCancelBtnClickEvent() {
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
}

// 【個別イベント】📍←インマーク設定
function registerSetInMarkBtnClickEvent() {
    setInMarkBtn.addEventListener('click', () => {
        if (videoPlayer.duration) {
            editInMark = videoPlayer.currentTime;
            inMarkDisplay.textContent = `${formatTime(editInMark)} (${Math.round(editInMark * editFrameRate)}f)`;
        }
        renderCutRanges();
    });
}

// 【個別イベント】→📍アウトマーク設定
function registerSetOutMarkBtnClickEvent() {
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
}

// 【個別イベント】編集シークバー
function registerEditSeekBarInputEvent() {
    editSeekBar.addEventListener('input', () => {
        if (videoPlayer.duration) {
            const newTime = (parseFloat(editSeekBar.value) / 100) * videoPlayer.duration;
            videoPlayer.currentTime = newTime;
            // seekBarも同期
            seekBar.value = (newTime / videoPlayer.duration) * 100;
            updateTimeDisplay();
        }
    });
}

// 【個別イベント】🆑カット編集クリアボタン
function registerClearEditBtnClickEvent() {
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
}

// 【個別イベント】✅カット範囲追加
function registerAddCutRangeBtnClickEvent() {
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
}

// 【個別イベント】💾カット保存（動画・音声対応）
function registerSaveVideoBtnClickEvent() {
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
}

// 【個別イベント】編集モード時にシークバーを同期
function registerVideoPlayerTimeupdateEvent() {
    videoPlayer.addEventListener('timeupdate', () => {
        if (isEditMode && videoPlayer.duration && !isMouseOverSeekBar) {
            editSeekBar.value = (videoPlayer.currentTime / videoPlayer.duration) * 100;
            // 双方のシークバーを同期
            seekBar.value = (videoPlayer.currentTime / videoPlayer.duration) * 100;
        }
    });
}

// 【個別イベント】🎤音声選択クリック時
function registerVoiceSelectBtnClickEvent() {
    voiceSelectBtn.addEventListener('click', (e) => {
        if (modeChange !== 'convert') return;
        if (playlist.length === 0) return;

        toggleTrackMenu(e, 'audio', voiceSelectBtn);

        showControlsAndFilename();
        updateIconOverlay();
    });
}

// 【個別イベント】🔠字幕選択クリック時
function registerSubtitleSelectBtnClickEvent() {
    subtitleSelectBtn.addEventListener('click', (e) => {
        if (modeChange !== 'video') return;
        if (playlist.length === 0) return;

        toggleTrackMenu(e, 'subtitle', subtitleSelectBtn);
        
        showControlsAndFilename();
        updateIconOverlay();
    });
}

// 【個別イベント】変更履歴の表示／非表示トグル
function registerChangelogBtnClickEvent() {
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
}

// 【個別イベント】センターコントロールの前へボタンクリックイベント
function registerCenterPrevBtnClickEvent() {
    centerPrevBtn.addEventListener('click', () => {
        if (prevVideoBtn) prevVideoBtn.click();
    });
}

// 【個別イベント】センターコントロールの再生/一時停止ボタンクリックイベント
function registerCenterPlayPauseBtnClickEvent() {
    centerPlayPauseBtn.addEventListener('click', () => {
        if (playPauseBtn) playPauseBtn.click();
    });
}

// 【個別イベント】センターコントロールの次へボタンクリックイベント
function registerCenterNextBtnClickEvent() {
    centerNextBtn.addEventListener('click', () => {
        if (nextVideoBtn) nextVideoBtn.click();
    });
}

// 【個別イベント】センターコントロールの前へボタンマウスオーバーイベント
function registerCenterPrevBtnMouseoverEvent() {
    centerPrevBtn.addEventListener('mouseover', () => {
        disableAutoHideControls();
    });
}

// 【個別イベント】センターコントロールの再生/一時停止ボタンマウスオーバーイベント
function registerCenterPlayPauseBtnMouseoverEvent() {
    centerPlayPauseBtn.addEventListener('mouseover', () => {
        disableAutoHideControls();
    });
}

// 【個別イベント】センターコントロールの次へボタンマウスオーバーイベント
function registerCenterNextBtnMouseoverEvent() {
    centerNextBtn.addEventListener('mouseover', () => {
        disableAutoHideControls();
    });
}

// 【個別イベント】センターコントロールの前へボタンマウスリーブイベント
function registerCenterPrevBtnMouseleaveEvent() {
    centerPrevBtn.addEventListener('mouseleave', () => {
        enableAutoHideControls();
    });
}

// 【個別イベント】センターコントロールの再生/一時停止ボタンマウスリーブイベント
function registerCenterPlayPauseBtnMouseleaveEvent() {
    centerPlayPauseBtn.addEventListener('mouseleave', () => {
        enableAutoHideControls();
    });
}

// 【個別イベント】センターコントロールの次へボタンマウスリーブイベント
function registerCenterNextBtnMouseleaveEvent() {
    centerNextBtn.addEventListener('mouseleave', () => {
        enableAutoHideControls();
    });
}

// 🔲documentイベントリスナー登録🔲
// 【documentイベント】ショートカットキー（イベントリスナー）
function registerDocumentKeydownEvents() {
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
}

// 【documentイベント】グローバル mouseup でドラッグ終了を確実に検知
function registerDocumentMouseupEvents() {
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
}

// 【documentイベント】フルスクリーン変更
function registerDocumentFullscreenchangeEvents() {
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
}    

// 🔲windowイベントリスナー登録🔲
// 【windowイベント】ウィンドウリサイズ
function registerWindowResizeEvents() {
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
}

// 【windowイベント】ウィンドウ終了前
function registerWindowBeforeunloadEvents() {
    window.addEventListener('beforeunload', function(e)  {
        cleanupTempFiles();
    });
}

// 【windowイベント】ウィンドウ終了
function registerWindowUnloadEvents() {
    window.addEventListener('unload', () => {
        cleanupTempFiles();
    });
}

// 🔲ipcRendererイベントハンドラ登録🔲
// 【ipcRendererイベント】自動再生指示を受信
function registerIpcRendererAutoPlayFilesEvents() {
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
}

// 【ipcRendererイベント】起動時設定インポート指示を受信
function registerIpcRendererAutoImportSettingsEvents() {
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
}

// 【ipcRendererイベント】変換進捗受信
function registerIpcRendererConvertProgressEvents() {
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
}

// 【ipcRendererイベント】字幕ファイル出力開始受信
function registerIpcRendererSubtitleExtractionProgressEvents() {
    ipcRenderer.on('subtitle-extraction-progress', (e, data) => {
        let playlisyCount = playlist.length;
        let playlisyCurrent = currentVideoIndex;
        if (modeChange === 'video') {
            playlisyCount = 1;
            playlisyCurrent = 0;
        }

        updateMessageOverlay(`🔄️ 字幕作成中…（${playlisyCurrent + 1}/${playlisyCount}） 100%（${data.subtitleIndex}/${data.subtitleCount}）`, 0);
    });
}

// 【ipcRendererイベント】変換エラー受信
function registerIpcRendererConvertErrorEvents() {
    ipcRenderer.on('convert-error', (event, msg) => {
        console.error("変換失敗:", err);
        isConverting = false;
        updateMessageOverlay(`🔄️ 変換失敗`, 6000);
        playlistPathArea.value = appNameAndCopyrightValueLine;
        updateIconOverlay();
    });
}

// 【ipcRendererイベント】カット進捗受信（ 詳細ペイロード対応）
function registerIpcRendererCutProgressEvents() {
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
}

// 【ipcRendererイベント】結合進捗受信（詳細ペイロード対応）
function registerIpcRendererJoinProgressEvents() {
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
}
