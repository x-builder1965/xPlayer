; build/installer.nsh
!include "MUI2.nsh"

; =========================================================
; メインセクション（無名！）← これが必須
; =========================================================

Section ""

    ; --- スタートメニューショートカット ---
    CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
    CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" \
                   "$INSTDIR\${PRODUCT_NAME}.exe" "" "$INSTDIR\xPlayer.ico"

    ; --- デスクトップショートカット ---
    CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" \
                   "$INSTDIR\${PRODUCT_NAME}.exe" "" "$INSTDIR\xPlayer.ico"

    ; --- アンインストーラーショートカット ---
    CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall ${PRODUCT_NAME}.lnk" \
                   "$INSTDIR\unins000.exe" "" "$INSTDIR\unins000.exe"

    ; --- アンインストーラー生成（必須！）---
    WriteUninstaller "$INSTDIR\unins000.exe"

SectionEnd


; =========================================================
; ファイル関連付け + 規定アプリ登録（Windows 11 完全対応）
; =========================================================

Section "File Associations and Capabilities"

    SetRegView 64

    ; 1. App Paths（アプリ起動パス）
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_NAME}.exe" "" "$INSTDIR\${PRODUCT_NAME}.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_NAME}.exe" "Path" "$INSTDIR"

    ; 2. RegisteredApplications（設定 > アプリ に表示）
    WriteRegStr HKLM "Software\RegisteredApplications" "${PRODUCT_NAME}" "Software\${PRODUCT_NAME}\Capabilities"

    ; 3. Capabilities（拡張子 + アプリ情報）
    WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities" "ApplicationDescription" "xPlayer - Video Player"
    WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities" "ApplicationName" "${PRODUCT_NAME}"
    WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities" "ApplicationIcon" "$INSTDIR\xPlayer.ico,0"

    ; 【Windows 11 必須】ApplicationUserModelId
    WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities" "ApplicationUserModelId" "${APP_ID}"

    ; 拡張子リスト
    WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".mp4" "${APP_ID}.mp4"
    WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".mkv" "${APP_ID}.mkv"
    WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".webm" "${APP_ID}.webm"
    WriteRegStr HKLM "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".amppl" "${APP_ID}.amppl"

    ; 4. HKCR（ダブルクリックで開く用）
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

SectionEnd


; =========================================================
; アンインストール処理（64bit対応）
; =========================================================

Section "Uninstall"

    SetRegView 64

    ; --- ショートカット削除 ---
    Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
    Delete "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall ${PRODUCT_NAME}.lnk"
    Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
    RMDir "$SMPROGRAMS\${PRODUCT_NAME}"

    ; --- レジストリ削除 ---
    DeleteRegValue HKLM "Software\RegisteredApplications" "${PRODUCT_NAME}"
    DeleteRegKey HKLM "Software\${PRODUCT_NAME}\Capabilities"
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_NAME}.exe"

    DeleteRegKey HKCR ".mp4"
    DeleteRegKey HKCR ".mkv"
    DeleteRegKey HKCR ".webm"
    DeleteRegKey HKCR ".amppl"
    DeleteRegKey HKCR "${APP_ID}.mp4"
    DeleteRegKey HKCR "${APP_ID}.mkv"
    DeleteRegKey HKCR "${APP_ID}.webm"
    DeleteRegKey HKCR "${APP_ID}.amppl"

SectionEnd