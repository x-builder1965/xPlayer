!include "MUI2.nsh"

; =========================================================
; 1. インストール先の初期値設定
; =========================================================
!macro customHeader
  ; デフォルトのインストール先を指定（ユーザーが変更すれば $INSTDIR にその変更値が入ります）
  InstallDir "$PROGRAMFILES64\xPlayer"
!macroend


; =========================================================
; 2. インストール時のカスタム処理（レジストリ登録・設定追加）
; =========================================================
!macro customInstall
  SetRegView 64

  ; 1. App Paths（コマンド実行・アプリ起動パス）
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_NAME}.exe" "" "$INSTDIR\${PRODUCT_NAME}.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_NAME}.exe" "Path" "$INSTDIR"

  ; 2. RegisteredApplications（Windows の「既定のアプリ」一覧に登録）
  WriteRegStr HKLM "Software\RegisteredApplications" "${PRODUCT_NAME}" "Software\${PRODUCT_NAME}\Capabilities"

  ; 3. Capabilities（Windows 11 対応情報）
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities" "ApplicationDescription" "xPlayer - Media Player"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities" "ApplicationName" "${PRODUCT_NAME}"
  ; --- 修正ポイント: EXE本体のアイコンリソースを参照 ---
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities" "ApplicationIcon" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities" "ApplicationUserModelId" "${APP_ID}"

  ; --- 拡張子の紐付け定義 (Capabilities) ---
  ;  動画ファイル (VIDEO_EXTENSIONS)
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".mp4" "${APP_ID}.mp4"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".webm" "${APP_ID}.webm"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".ogg" "${APP_ID}.ogg"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".mov" "${APP_ID}.mov"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".m4v" "${APP_ID}.m4v"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".mkv" "${APP_ID}.mkv"

  ; 音声ファイル (AUDIO_EXTENSIONS)
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".mp3" "${APP_ID}.mp3"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".wav" "${APP_ID}.wav"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".flac" "${APP_ID}.flac"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".oga" "${APP_ID}.oga"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".m4a" "${APP_ID}.m4a"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".aac" "${APP_ID}.aac"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".opus" "${APP_ID}.opus"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".wma" "${APP_ID}.wma"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".aiff" "${APP_ID}.aiff"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".aif" "${APP_ID}.aif"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".alac" "${APP_ID}.alac"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".ape" "${APP_ID}.ape"

  ; 設定ファイル & プレイリスト
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".xpj" "${APP_ID}.xpj"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".amppl" "${APP_ID}.amppl"


  ; --- 4. HKCR への登録（直接起動用 ProgID 定義） ---

  ; --- 動画 ---
  WriteRegStr HKCR ".mp4" "" "${APP_ID}.mp4"
  WriteRegStr HKCR "${APP_ID}.mp4" "" "MP4 動画ファイル"
  WriteRegStr HKCR "${APP_ID}.mp4\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.mp4\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".webm" "" "${APP_ID}.webm"
  WriteRegStr HKCR "${APP_ID}.webm" "" "WebM 動画ファイル"
  WriteRegStr HKCR "${APP_ID}.webm\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.webm\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".ogg" "" "${APP_ID}.ogg"
  WriteRegStr HKCR "${APP_ID}.ogg" "" "OGG メディアファイル"
  WriteRegStr HKCR "${APP_ID}.ogg\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.ogg\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".mov" "" "${APP_ID}.mov"
  WriteRegStr HKCR "${APP_ID}.mov" "" "QuickTime 動画ファイル"
  WriteRegStr HKCR "${APP_ID}.mov\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.mov\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".m4v" "" "${APP_ID}.m4v"
  WriteRegStr HKCR "${APP_ID}.m4v" "" "M4V 動画ファイル"
  WriteRegStr HKCR "${APP_ID}.m4v\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.m4v\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".mkv" "" "${APP_ID}.mkv"
  WriteRegStr HKCR "${APP_ID}.mkv" "" "Matroska 動画ファイル"
  WriteRegStr HKCR "${APP_ID}.mkv\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.mkv\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  ; --- 音声 ---
  WriteRegStr HKCR ".mp3" "" "${APP_ID}.mp3"
  WriteRegStr HKCR "${APP_ID}.mp3" "" "MP3 音声ファイル"
  WriteRegStr HKCR "${APP_ID}.mp3\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.mp3\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".wav" "" "${APP_ID}.wav"
  WriteRegStr HKCR "${APP_ID}.wav" "" "WAV 音声ファイル"
  WriteRegStr HKCR "${APP_ID}.wav\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.wav\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".flac" "" "${APP_ID}.flac"
  WriteRegStr HKCR "${APP_ID}.flac" "" "FLAC 音声ファイル"
  WriteRegStr HKCR "${APP_ID}.flac\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.flac\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".oga" "" "${APP_ID}.oga"
  WriteRegStr HKCR "${APP_ID}.oga" "" "OGG 音声ファイル"
  WriteRegStr HKCR "${APP_ID}.oga\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.oga\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".m4a" "" "${APP_ID}.m4a"
  WriteRegStr HKCR "${APP_ID}.m4a" "" "M4A 音声ファイル"
  WriteRegStr HKCR "${APP_ID}.m4a\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.m4a\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".aac" "" "${APP_ID}.aac"
  WriteRegStr HKCR "${APP_ID}.aac" "" "AAC 音声ファイル"
  WriteRegStr HKCR "${APP_ID}.aac\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.aac\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".opus" "" "${APP_ID}.opus"
  WriteRegStr HKCR "${APP_ID}.opus" "" "Opus 音声ファイル"
  WriteRegStr HKCR "${APP_ID}.opus\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.opus\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".wma" "" "${APP_ID}.wma"
  WriteRegStr HKCR "${APP_ID}.wma" "" "WMA 音声ファイル"
  WriteRegStr HKCR "${APP_ID}.wma\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.wma\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".aiff" "" "${APP_ID}.aiff"
  WriteRegStr HKCR "${APP_ID}.aiff" "" "AIFF 音声ファイル"
  WriteRegStr HKCR "${APP_ID}.aiff\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.aiff\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".aif" "" "${APP_ID}.aif"
  WriteRegStr HKCR "${APP_ID}.aif" "" "AIFF 音声ファイル"
  WriteRegStr HKCR "${APP_ID}.aif\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.aif\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".alac" "" "${APP_ID}.alac"
  WriteRegStr HKCR "${APP_ID}.alac" "" "ALAC 音声ファイル"
  WriteRegStr HKCR "${APP_ID}.alac\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.alac\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".ape" "" "${APP_ID}.ape"
  WriteRegStr HKCR "${APP_ID}.ape" "" "Monkey's 音声ファイル"
  WriteRegStr HKCR "${APP_ID}.ape\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.ape\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  ; --- 設定ファイル・プレイリスト ---
  WriteRegStr HKCR ".xpj" "" "${APP_ID}.xpj"
  WriteRegStr HKCR "${APP_ID}.xpj" "" "xPlayer 設定ファイル"
  WriteRegStr HKCR "${APP_ID}.xpj\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.xpj\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".amppl" "" "${APP_ID}.amppl"
  WriteRegStr HKCR "${APP_ID}.amppl" "" "xPlayer プレイリスト"
  WriteRegStr HKCR "${APP_ID}.amppl\DefaultIcon" "" '"$INSTDIR\${PRODUCT_NAME}.exe",0'
  WriteRegStr HKCR "${APP_ID}.amppl\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'
!macroend


; =========================================================
; 3. アンインストール時のカスタムクリーンアップ処理
; =========================================================
!macro customUnInstall
  SetRegView 64

  ; 独自で書き込んだレジストリの削除
  DeleteRegValue HKLM "Software\RegisteredApplications" "${PRODUCT_NAME}"
  DeleteRegKey HKLM "Software\${PRODUCT_NAME}\Capabilities"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_NAME}.exe"

  ; 動画 ProgID 削除
  DeleteRegKey HKCR "${APP_ID}.mp4"
  DeleteRegKey HKCR "${APP_ID}.webm"
  DeleteRegKey HKCR "${APP_ID}.ogg"
  DeleteRegKey HKCR "${APP_ID}.mov"
  DeleteRegKey HKCR "${APP_ID}.m4v"
  DeleteRegKey HKCR "${APP_ID}.mkv"

  ; 音声 ProgID 削除
  DeleteRegKey HKCR "${APP_ID}.mp3"
  DeleteRegKey HKCR "${APP_ID}.wav"
  DeleteRegKey HKCR "${APP_ID}.flac"
  DeleteRegKey HKCR "${APP_ID}.oga"
  DeleteRegKey HKCR "${APP_ID}.m4a"
  DeleteRegKey HKCR "${APP_ID}.aac"
  DeleteRegKey HKCR "${APP_ID}.opus"
  DeleteRegKey HKCR "${APP_ID}.wma"
  DeleteRegKey HKCR "${APP_ID}.aiff"
  DeleteRegKey HKCR "${APP_ID}.aif"
  DeleteRegKey HKCR "${APP_ID}.alac"
  DeleteRegKey HKCR "${APP_ID}.ape"

  ; 設定ファイル & プレイリスト ProgID 削除
  DeleteRegKey HKCR "${APP_ID}.xpj"
  DeleteRegKey HKCR "${APP_ID}.amppl"
!macroend
