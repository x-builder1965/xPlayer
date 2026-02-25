# xPlayer - FFmpegエンコード GPU使用状況 分析レポート

**作成日**: 2026年2月17日  
**分析対象**: d:\（試作中）\JavaApp\xPlayer-windows\

---

## 📊 分析結果

### ❌ **GPU エンコーディングは使用されていません**

xPlayerの動画エンコード処理は **CPU のみ** が使用されており、GPU アクセラレーション機能は実装されていません。

---

## 🔍 詳細分析

### 1. エンコード実行箇所と使用コーデック

#### ① **動画変換モード**（convert-video）
- **ファイル**: [main.js](main.js#L343-L348)
- **コーデック**: `libx264` （CPU ソフトウェアエンコーダ）
- **実装コード**:
```javascript
.outputOptions('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23')
```
- **GPU対応**: ❌ なし

#### ② **カット編集（単一範囲）** （cut-video）
- **ファイル**: [main.js](main.js#L710-L720)
- **コーデック**: `libx264` （CPU ソフトウェアエンコーダ）
- **実装コード**:
```javascript
.outputOptions('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23')
```
- **GPU対応**: ❌ なし

#### ③ **複数範囲カット** （cut-video-multiple reencode経路）
- **ファイル**: [main.js](main.js#L810-L815)
- **コーデック**: `libx264` （CPU ソフトウェアエンコーダ）
- **実装コード**:
```javascript
.outputOptions('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28')
```
- **GPU対応**: ❌ なし
- **複数セG対応経路（copy）**: ✅ ストリームコピーでCPU負荷なし

---

## 📈 パフォーマンス影響度

### CPU利用率の高さ

| 処理 | CPU負荷 |推定時間 |
|------|--------|--------|
| 動画変換（libx264 veryfast） | 📊 高 | 動画時間と同等もしくはそれ以上 |
| カット編集（再エンコード） | 📊 高 | 動画時間と同等もしくはそれ以上 |
| カット編集（ストリーム コピー） | 📈 低 | 数秒～数十秒 |

### 改善の期待値（GPU使用時）

利用可能なGPU（NVIDIA/Intel/AMD）がある場合：
- **エンコード時間**: 約 **50～70% 削減** が期待可能
- **CPU使用率**: 大幅低減（CPUを他のタスクに割当可能）
- **電力消費**: 削減（特に組込型GPUの場合）

---

## 🛠️ GPU エンコーディング実装ガイド

GPU対応に変更するには、以下のコーデックを条件付きで使用する必要があります。

### 推奨実装パターン

```javascript
// ◆ 関数: 利用可能なビデオコーデックを自動選択
function selectVideoCodec() {
    // FFmpegの利用可能なエンコーダをチェック（初期化時に一度実行）
    const availableCodecs = {
        nvidia: false,  // h264_nvenc / hevc_nvenc
        intel: false,   // h264_qsv / hevc_qsv
        amd: false,     // h264_amf / hevc_amf
        cpu: true       // libx264（常に利用可能）
    };
    
    // FFmpeg -encoders で利用可能なコーデックをチェック
    // 優先順: NVIDIA > Intel > AMD > CPU
    
    if (availableCodecs.nvidia) {
        return { codec: 'h264_nvenc', preset: 'fast', crf: 23 };
    } else if (availableCodecs.intel) {
        return { codec: 'h264_qsv', preset: 'fast', crf: 23 };
    } else if (availableCodecs.amd) {
        return { codec: 'h264_amf', preset: 'fast', crf: 23 };
    } else {
        return { codec: 'libx264', preset: 'veryfast', crf: 23 };
    }
}

// ◆ 使用例（現在のコード）
const codecConfig = selectVideoCodec();
const ff = ffmpeg(filePath)
    .outputOptions('-c:v', codecConfig.codec, '-preset', codecConfig.preset, '-crf', codecConfig.crf)
    // ... 他のオプション
```

### エンコーダ別設定値

| GPU製造元 | コーデック | -preset値| 備考 |
|----------|-----------|---------|------|
| **NVIDIA** | `h264_nvenc` | default, fast, medium, slow | 推奨: fast |
|  | `hevc_nvenc` | default, fast, medium, slow | H.265未対応なら使用不可 |
| **Intel** | `h264_qsv` | veryfast, faster, fast, medium | 推奨: fast |
|  | `hevc_qsv` | veryfast, faster, fast, medium | H.265未対応なら使用不可 |
| **AMD** | `h264_amf` | (preset不使用: usage パラメータ) | -usage:v = 0(default), 1(fast), 2(balanced) |
| **CPU** | `libx264` | ultrafast, superfast, veryfast, fast, medium | 現在使用中 |

---

## ⚠️ 既知の制限と注意点

### 現在の実装での問題

1. **CPU専用処理**: エンコード品質とエンコード速度のバランスが CPU性能依存
2. **長時間動画**: 処理時間が長める（例: 2時間の動画は数時間かかる場合も）
3. **同時実行困難**: 複数ファイルの同時エンコードは実用的でない

### GPU対応時の考慮事項

1. **ドライバ要件**: GPU対応コーデックはドライバのバージョンに依存
2. **互換性チェック**: 起動時に利用可能なコーデックを検出して自動選択
3. **フォールバック**: GPU エンコーダが失敗時に CPU にフォールバック
4. **H.265(HEVC)対応**: H.265が必要な場合は別のコーデック使用

---

## 💡 改善提案（優先度順）

### 高優先度
- [ ] **GPU エンコード対応**: NVIDIA NVENC（h264_nvenc）の実装
- [ ] **コーデック自動選択**: FFmpeg初期化時に利用可能なコーデックを検出
- [ ] **フォールバック実装**: GPU失敗時のCPU自動切り替え

### 中優先度
- [ ] **エンコード速度オプション**: ユーザーが速度優先/品質優先を選択可能
- [ ] **プリセット変更**: CRF値やプリセットをUIで調整可能に
- [ ] **進捗表示改善**: エンコード時間予測の精度向上

### 低優先度
- [ ] H.265（HEVC）対応
- [ ] VP9/AV1 対応（GPU対応の場合）
- [ ] ハードウェアデコード対応（再生時GPU利用）

---

## 📋 検証項目チェックリスト

GPU対応実装時の検証項目：

- [ ] NVIDIA GPU搭載環境での動作確認
- [ ] フォールバック機能の動作確認
- [ ] エンコード時間削減の実測値確認
- [ ] 出力ファイルの品質確認（CRF値との比較）
- [ ] CPU使用率の低減確認
- [ ] ユーザーガイドの更新

---

## 📁 関連ファイル

- エンコード処理実装: [main.js](main.js)
  - `convert-video` ハンドラ（L273-380）
  - `cut-video` ハンドラ（L687-765）
  - `cut-video-multiple` ハンドラ（L768-964）

- フロントエンド処理: [script.js](script.js)
  - 動画変換UI処理（L793-810）
  - カット編集UI処理（複数区間）

- 依存パッケージ: [package.json](package.json#L15-L18)
  - `fluent-ffmpeg`: ^2.1.3
  - `ffmpeg-static`: ^5.2.0

---

## 🎯 結論

**xPlayerは現在 CPU 専用エンコーディング（libx264）を使用しています。**

GPU による高速化は未実装ですが、実装難易度は **低～中程度** です。以下の理由から GPU対応を推奨します：

✅ **メリット**
- エンコード時間を 50～70% 削減可能
- CPUリソースを他プロセスに解放可能
- 特に4K動画での効果が大きい

⚠️ **デメリット**
- GPU の種類によって対応コーデックが異なる
- フォールバック実装が必須
- ドライババージョンへの依存

**実装優先度**: 🔴 **高い** （大幅なパフォーマンス向上が期待可能）

