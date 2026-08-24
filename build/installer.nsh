!include "MUI2.nsh"

; =========================================================
; 1. インストール先の変更（デフォルトパスのオーバーライド）
; =========================================================
!macro customHeader
  !define MUI_DIRECTORYPAGE_VARIABLE $INSTDIR
  ; 64bit OS時は C:\Program Files\Multimedia\xPlayer に設定
  InstallDir "$PROGRAMFILES64\Multimedia\xPlayer"
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
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities" "ApplicationDescription" "xPlayer - Video Player"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities" "ApplicationName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities" "ApplicationIcon" "$INSTDIR\xPlayer.ico,0"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities" "ApplicationUserModelId" "${APP_ID}"

  ; 拡張子の紐付け定義
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".mp4" "${APP_ID}.mp4"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".mkv" "${APP_ID}.mkv"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".webm" "${APP_ID}.webm"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".amppl" "${APP_ID}.amppl"

  ; 4. HKCR への登録（直接起動用）
  WriteRegStr HKCR ".mp4" "" "${APP_ID}.mp4"
  WriteRegStr HKCR "${APP_ID}.mp4" "" "MP4 Video File"
  WriteRegStr HKCR "${APP_ID}.mp4\DefaultIcon" "" "$INSTDIR\xPlayer.ico,0"
  WriteRegStr HKCR "${APP_ID}.mp4\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".mkv" "" "${APP_ID}.mkv"
  WriteRegStr HKCR "${APP_ID}.mkv" "" "Matroska Video File"
  WriteRegStr HKCR "${APP_ID}.mkv\DefaultIcon" "" "$INSTDIR\xPlayer.ico,0"
  WriteRegStr HKCR "${APP_ID}.mkv\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".webm" "" "${APP_ID}.webm"
  WriteRegStr HKCR "${APP_ID}.webm" "" "WebM Video"
  WriteRegStr HKCR "${APP_ID}.webm\DefaultIcon" "" "$INSTDIR\xPlayer.ico,0"
  WriteRegStr HKCR "${APP_ID}.webm\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'

  WriteRegStr HKCR ".amppl" "" "${APP_ID}.amppl"
  WriteRegStr HKCR "${APP_ID}.amppl" "" "xPlayer Play List"
  WriteRegStr HKCR "${APP_ID}.amppl\DefaultIcon" "" "$INSTDIR\xPlayer.ico,0"
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

  DeleteRegKey HKCR "${APP_ID}.mp4"
  DeleteRegKey HKCR "${APP_ID}.mkv"
  DeleteRegKey HKCR "${APP_ID}.webm"
  DeleteRegKey HKCR "${APP_ID}.amppl"
!macroend