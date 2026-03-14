# xPlayer Ver3.67 ロジック分析レポート

**対象リポジトリ**: https://github.com/x-builder1965/xPlayer  
**分析日時**: 2026年3月時点の最新コードベース（script.js / main.js / preload.js）  
**分析方針**:  
- 大量コメント・大量グローバル変数は容認（無視）  
- 誤り・不要コード・矛盾・潜在的リスクを中心に重要度別に分類

## 高重要度（Critical：クラッシュ・データ損失・重大不具合のリスク大）

1. **カット編集（✂️）時のFFmpegプロセス/一時ファイル管理が不完全**  
   - 影響箇所: `cut-progress` IPC、`cutCancelBtn`、`cleanupTempFiles()`、`isCutEditing`、`cut-video-multiple`  
   - 問題: キャンセル時のプロセスkillが不完全 → メモリ/ディスクリーク、アプリクラッシュの恐れ  
   - 過去Verでも「対応限界」と記載されている根本課題

2. **Blob URL / 変換後一時ファイルの解放漏れ**  
   - 影響箇所: `setVideoSrc()`、`currentBlobUrl`、`tempConvertFile`  
   - 問題: `URL.revokeObjectURL()` や `fs.unlink` の呼び出しパスが一部欠落 → 長時間使用でメモリ爆増

3. **FFmpegパス設定のasrパッケージ化依存が脆い**  
   - 影響箇所: `ffmpegPath`、`ffmpeg.setFfmpegPath()`（main.js 全処理）  
   - 問題: Electronビルドで `asar.unpacked` が崩れると全動画処理（変換・カット・結合）が即死

4. **【対応済】**  clearPlaylistBtn のイベントリスナー重複登録  
   - 影響箇所: `clearPlaylistBtn.addEventListener`（script.js）  
   - 問題: 同一処理が2回登録 → shuffleOrder/reset が2重実行され状態破壊の可能性

## 中重要度（Medium：動作するが不整合・UX低下・潜在リスク）

1. **再生速度保存/復元の競合**  
   - 影響箇所: `playVideo()`、`savedPlaybackSpeed`、`currentPlaybackRate`  
   - 問題: localStorage復元値が `playVideo()` で上書きされやすい

2. **ズームモード（🔍）と編集モードのシークキー競合**  
   - 影響箇所: `keydown` ハンドラ（ArrowLeft/Right）  
   - 問題: isZoomMode時でもフレームシークと5秒ジャンプが混在

3. **プレイリスト並び替え/シャッフル時の shuffleOrder 不整合**  
   - 影響箇所: `applySort()`、`sortRandomPlaylist()`、`removePlaylistBtn`  
   - 問題: 削除時のインデックス再マッピング不足 → ランダム再生位置が狂う

4. **join-videos の FPS自動検出が不安定**  
   - 影響箇所: `getFps`、`join-videos`（main.js）  
   - 問題: ffprobe結果が空/NaNの場合に結合動画が破損

5. **editControls / editSeekBar の nullチェック不足**  
   - 影響箇所: seekBar系イベントハンドラ複数  
   - 問題: 編集モード移行時にDOM未存在でエラー発生の恐れ

## 低重要度（Low：動作影響小、保守性向上のための提案）

1. `updateIconOverlay()` の過剰呼び出し（ほぼ全イベントで実行）
2. `convert-error` IPCハンドラ内の変数誤参照（`err` → `msg`）
3. trashモジュール失敗時のフォールバック不完全
4. preload.js の console.warn ラップと try-catch の複雑さ
5. バージョン表記のファイル間不整合（3.67 / 3.66 / 3.65）

## 全体所感・推奨対応優先順

- **最優先修正対象**: FFmpeg連携（特に kill & cleanup の強化）、Blob/一時ファイル解放の完全化
- **矛盾点**: ほぼなし（グローバル変数使用は容認）
- **不要コード**: `currentBlobUrl