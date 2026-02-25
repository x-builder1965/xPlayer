// ============================================================
// GPU対応 FFmpeg エンコーダ自動選択システム
// xPlayer への実装例
// ============================================================

const { execSync } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');

// ============================================================
// ステップ1: 初期化時にコーデック検出（アプリ起動時に実行）
// ============================================================

/**
 * 利用可能なFFmpeg エンコーダを検出
 * @param {string} ffmpegPath - FFmpeg実行ファイルパス
 * @returns {Object} 利用可能なコーデック情報
 */
function detectAvailableCodecs(ffmpegPath) {
    console.log('[GPU検出] FFmpegコーデック情報を取得中...');
    
    try {
        // FFmpeg -codecs コマンドで利用可能なエンコーダを取得
        const output = execSync(`"${ffmpegPath}" -codecs -hide_banner 2>&1`).toString();
        
        const available = {
            nvidiaNvenc: output.includes('h264_nvenc'),  // NVIDIA
            intelQsv: output.includes('h264_qsv'),       // Intel
            amdAmf: output.includes('h264_amf'),         // AMD  
            libx264: output.includes('libx264')          // CPU
        };
        
        // ログ出力
        console.log('[GPU検出] 利用可能なコーデック一覧:');
        if (available.nvidiaNvenc) console.log('  ✅ NVIDIA GPU (h264_nvenc)');
        if (available.intelQsv) console.log('  ✅ Intel GPU (h264_qsv)');
        if (available.amdAmf) console.log('  ✅ AMD GPU (h264_amf)');
        if (available.libx264) console.log('  ✅ CPU (libx264)');
        
        return available;
    } catch (e) {
        console.error('[GPU検出] 失敗:', e.message);
        // フォールバック：CPUのみ利用可能と判定
        return { 
            nvidiaNvenc: false, 
            intelQsv: false, 
            amdAmf: false, 
            libx264: true 
        };
    }
}

// ============================================================
// ステップ2: 最適なコーデックを選択
// ============================================================

/**
 * 利用可能なコーデックから最適なものを選択
 * 優先度: NVIDIA > Intel > AMD > CPU
 * 
 * @param {Object} availableCodecs - 利用可能なコーデック情報
 * @returns {Object} 選択されたコーデック設定
 */
function selectOptimalCodec(availableCodecs) {
    const priority = [
        {
            check: 'nvidiaNvenc',
            name: 'NVIDIA NVENC (h264)',
            codec: 'h264_nvenc',
            getOptions: () => ({
                codec: 'h264_nvenc',
                preset: 'fast',              // default, fast, medium, slow
                'rc': 'vbr',                 // 可変ビットレート
                'rc-lookahead': '20',        // 先読みフレーム数
                'temporal-aq': '1',          // 時間的適応量子化
                'aq-strength': '8'           // 適応量子化強度
            }),
            expectedSpeedup: '8-10x'
        },
        {
            check: 'intelQsv',
            name: 'Intel Media SDK (h264)',
            codec: 'h264_qsv',
            getOptions: () => ({
                codec: 'h264_qsv',
                preset: 'fast',              // veryfast, faster, fast, medium
                'global_quality': '23',      // ICQ (Intelligent Constant Quality)
                'look_ahead': '1'            // ルックヘッド有効化
            }),
            expectedSpeedup: '5-8x'
        },
        {
            check: 'amdAmf',
            name: 'AMD AMF (h264)',
            codec: 'h264_amf',
            getOptions: () => ({
                codec: 'h264_amf',
                // AMF では -preset パラメータは使用しない代わり -usage:v を使用
                'rc': 'vbr_latency_optimized',  // レート制御
                'usage': '1'                    // 0:default, 1:fast, 2:balanced
            }),
            expectedSpeedup: '3-5x'
        },
        {
            check: 'libx264',
            name: 'CPU x264 (フォールバック)',
            codec: 'libx264',
            getOptions: () => ({
                codec: 'libx264',
                preset: 'veryfast',          // 現在のxPlayer設定
                'crf': '23'
            }),
            expectedSpeedup: '1x'
        }
    ];
    
    for (const option of priority) {
        if (availableCodecs[option.check]) {
            console.log(`[コーデック選択] ✅ ${option.name} を選択 (期待速度: ${option.expectedSpeedup})`);
            return option;
        }
    }
    
    throw new Error('利用可能なコーデックがありません');
}

// ============================================================
// ステップ3: app.js の初期化部分に追加
// ============================================================

// グローバル変数としてコーデック情報を保持
let globalCodecConfig = null;

/**
 * アプリケーション初期化時に実行
 * main.js の起動時に呼び出す
 */
function initializeCodecConfig(ffmpegPath) {
    try {
        const available = detectAvailableCodecs(ffmpegPath);
        const selected = selectOptimalCodec(available);
        globalCodecConfig = selected;
        
        // 設定を各ウィンドウに通知
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('codec-initialized', {
                selected: selected.name,
                codec: selected.codec,
                speedup: selected.expectedSpeedup
            });
        }
        
        return globalCodecConfig;
    } catch (e) {
        console.error('[初期化] コーデック設定失敗:', e);
        // フォールバック
        globalCodecConfig = {
            name: 'CPU x264 (フォールバック)',
            codec: 'libx264',
            getOptions: () => ({
                codec: 'libx264',
                preset: 'veryfast',
                'crf': '23'
            })
        };
        return globalCodecConfig;
    }
}

// ============================================================
// ステップ4: convert-video ハンドラを修正
// ============================================================

// 修正前: main.js L343-348
//   .outputOptions('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23')

// 修正後:
ipcMain.handle('convert-video', async (event, filePath) => {
    return new Promise((resolve, reject) => {
        const fileName = path.basename(filePath);
        const outName = `${path.parse(fileName).name}.mp4`;
        const outPath = path.join(path.dirname(filePath), outName);
        currentOutputPath = outPath;

        mainWindow.webContents.send('convert-progress', { percent: 0 });

        // ffprobe でメタデータ取得
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                mainWindow.webContents.send('convert-error', 'メタデータ取得失敗: ' + err.message);
                reject(err);
                return;
            }

            // === 音声処理：日本語音声があれば優先、なければ最初の音声 ===
            const audioStreams = metadata.streams.filter(s => s.codec_type === 'audio');
            let audioMap = '-map 0:a';
            let selectedAudioBitrate = '192k';

            if (audioStreams.length > 0) {
                const japaneseAudio = audioStreams.find(s => 
                    s.tags && (s.tags.language === 'jpn' || s.tags.language === 'ja' || s.tags.language === 'japanese')
                );

                let selectedStream;
                if (japaneseAudio) {
                    const index = audioStreams.indexOf(japaneseAudio);
                    audioMap = `-map 0:a:${index}`;
                    selectedStream = japaneseAudio;
                } else {
                    selectedStream = audioStreams[0];
                }

                if (selectedStream.bit_rate) {
                    const bitrate = parseInt(selectedStream.bit_rate, 10);
                    if (!isNaN(bitrate) && bitrate > 0) {
                        selectedAudioBitrate = `${Math.round(bitrate / 1000)}k`;
                    }
                }
            }

            // === 字幕処理：日本語字幕があれば優先、なければ無視 ===
            const subtitleStreams = metadata.streams.filter(s => s.codec_type === 'subtitle');
            let subtitleOptions = [];

            const japaneseSub = subtitleStreams.find(s => 
                s.tags && (s.tags.language === 'jpn' || s.tags.language === 'ja' || s.tags.language === 'japanese')
            );

            if (japaneseSub) {
                const idx = subtitleStreams.indexOf(japaneseSub);
                subtitleOptions = [
                    `-map 0:s:${idx}`,
                    '-c:s', 'mov_text'
                ];
            }

            // ============================================================
            // 🔴 ここから修正：GPU対応コーデック選択を追加
            // ============================================================
            
            const codecConfig = globalCodecConfig || {
                codec: 'libx264',
                getOptions: () => ({
                    codec: 'libx264',
                    preset: 'veryfast',
                    'crf': '23'
                })
            };

            // コーデック別の出力オプション構築
            let videoOptions;
            switch (codecConfig.codec) {
                case 'h264_nvenc':
                    // NVIDIA NVENC 設定
                    videoOptions = [
                        '-c:v', 'h264_nvenc',
                        '-preset', 'fast',           // fast推奨
                        '-rc', 'vbr',
                        '-rc-lookahead', '20',
                        '-temporal-aq', '1'
                    ];
                    console.log('[変換] NVIDIA NVENC で処理します');
                    break;

                case 'h264_qsv':
                    // Intel Media SDK 設定
                    videoOptions = [
                        '-c:v', 'h264_qsv',
                        '-preset', 'fast',
                        '-global_quality', '23',
                        '-look_ahead', '1'
                    ];
                    console.log('[変換] Intel Media SDK で処理します');
                    break;

                case 'h264_amf':
                    // AMD AMF 設定
                    videoOptions = [
                        '-c:v', 'h264_amf',
                        '-rc', 'vbr_latency_optimized',
                        '-usage', '1'
                    ];
                    console.log('[変換] AMD AMF で処理します');
                    break;

                default:
                    // CPU フォールバック
                    videoOptions = [
                        '-c:v', 'libx264',
                        '-preset', 'veryfast',
                        '-crf', '23'
                    ];
                    console.log('[変換] CPU (libx264) で処理します');
            }

            // === FFmpeg コマンド構築 ===
            const ff = ffmpeg(filePath)
                .outputOptions('-map 0:v')
                .outputOptions(audioMap)
                .outputOptions(subtitleOptions)
                .outputOptions(...videoOptions)  // 🔴 GPU対応オプション
                .outputOptions('-c:a', 'aac', `-b:a`, selectedAudioBitrate)
                .outputOptions('-movflags', '+faststart')
                .on('progress', (progress) => {
                    if (progress.percent !== undefined) {
                        mainWindow.webContents.send('convert-progress', { percent: progress.percent });
                    }
                })
                .on('end', () => {
                    currentFFmpeg = null;
                    currentOutputPath = null;
                    resolve(outPath);
                })
                .on('error', (err, stdout, stderr) => {
                    if (err.message.includes('ffmpeg was killed')) {
                        console.log('変換がユーザーにより中断されました:', filePath);
                        return;
                    }
                    currentFFmpeg = null;
                    currentOutputPath = null;
                    mainWindow.webContents.send('convert-error', err.message);
                    reject(err);
                })
                .save(outPath);

            currentFFmpeg = ff;
        });
    });
});

// ============================================================
// ステップ5: 同様に cut-video, cut-video-multiple も修正
// ============================================================

// cut-video の修正例（L710行付近）
const videoOptionsForCut = buildVideoOptions(globalCodecConfig, 'veryfast');

const ff = ffmpeg(inputPath)
    .setStartTime(inTimeStr)
    .setDuration(durationStr)
    .outputOptions(...videoOptionsForCut)  // GPU対応
    .outputOptions('-c:a', 'aac', '-b:a', '192k')
    .outputOptions('-c:s', 'mov_text')
    .outputOptions('-movflags', '+faststart')
    // ... 以降は同じ

// ============================================================
// ステップ6: ヘルパー関数
// ============================================================

/**
 * コーデック別に出力オプションを構築
 * @param {Object} codecConfig - コーデック設定
 * @param {string} preset - プリセット（libx264用）
 * @returns {Array} FFmpeg 出力オプション配列
 */
function buildVideoOptions(codecConfig, preset = 'veryfast') {
    if (!codecConfig) {
        return ['-c:v', 'libx264', '-preset', preset, '-crf', '23'];
    }

    switch (codecConfig.codec) {
        case 'h264_nvenc':
            return [
                '-c:v', 'h264_nvenc',
                '-preset', 'fast',
                '-rc', 'vbr',
                '-rc-lookahead', '20',
                '-temporal-aq', '1'
            ];
        case 'h264_qsv':
            return [
                '-c:v', 'h264_qsv',
                '-preset', 'fast',
                '-global_quality', '23',
                '-look_ahead', '1'
            ];
        case 'h264_amf':
            return [
                '-c:v', 'h264_amf',
                '-rc', 'vbr_latency_optimized',
                '-usage', '1'
            ];
        default:
            return ['-c:v', 'libx264', '-preset', preset, '-crf', '23'];
    }
}

// ============================================================
// ステップ7: UI通知用ハンドラ（script.js側で表示）
// ============================================================

// main.js で ipcMain.handle を追加
ipcMain.handle('get-codec-info', async () => {
    return {
        codec: globalCodecConfig?.codec || 'libx264',
        name: globalCodecConfig?.name || 'CPU x264',
        expectedSpeedup: globalCodecConfig?.expectedSpeedup || '1x'
    };
});

// script.js 側で使用
ipcRenderer.invoke('get-codec-info').then(info => {
    console.log(`使用中のコーデック: ${info.name} (${info.expectedSpeedup} 高速化)`);
    // UI に表示
    document.getElementById('codecInfo').textContent = info.name;
});

// ============================================================
// 実装チェックリスト
// ============================================================
/*
実装順序:

1. [ ] detectAvailableCodecs() 関数を main.js に追加
2. [ ] selectOptimalCodec() 関数を main.js に追加
3. [ ] initializeCodecConfig() 関数を main.js に追加
4. [ ] app.ready イベント時に initializeCodecConfig() を呼び出し
5. [ ] convert-video ハンドラを修正（GPU対応）
6. [ ] cut-video ハンドラを修正（GPU対応）
7. [ ] cut-video-multiple ハンドラを修正（GPU対応）
8. [ ] buildVideoOptions() ヘルパー関数を追加
9. [ ] script.js でコーデック情報を表示するUI追加
10. [ ] テスト環境で動作確認（NVIDIA/Intel GPU)
11. [ ] フォールバック動作テスト（GPU非搭載環境）
12. [ ] ドキュメント更新
*/

module.exports = {
    detectAvailableCodecs,
    selectOptimalCodec,
    initializeCodecConfig,
    buildVideoOptions
};
