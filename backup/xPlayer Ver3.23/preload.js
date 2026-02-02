// ---------------------------------------------------------------------
const copyright = 'Copyright © 2025 @x-builder, Japan';
const email = 'x-builder@gmail.com';
const appName = 'xPlayer -動画プレイヤー- Ver3.20';
// ---------------------------------------------------------------------
const { contextBridge, ipcRenderer, webUtils } = require('electron');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

// 🔧 起動時対応: キャッシュディレクトリを事前に作成し、
// 一部ライブラリが出す "Unable to create cache" ワーニングを抑制します。
// - ユーザーのホームに .cache と AppData\Local\xPlayerCache を作ります（存在しなくても安全）。
// - console.warn をラップして該当メッセージを無視します（副作用を最小化するため限定的に）。
(async () => {
    try {
        const home = os.homedir();
        const possibleCacheDirs = [
            path.join(home, '.cache'),
            path.join(home, 'AppData', 'Local', 'xPlayerCache')
        ];
        for (const d of possibleCacheDirs) {
            try {
                await fs.mkdir(d, { recursive: true });
            } catch (err) {
                // 作成失敗は重大ではないので無視（権限などの問題があれば警告は抑制）
            }
        }
    } catch (e) {
        // ここでのエラーは無視
    }

    // 特定ワーニングの抑制（内容が変わらない限りのみ抑制）
    try {
        const origWarn = console.warn.bind(console);
        console.warn = (...args) => {
            try {
                if (args && args.length > 0 && typeof args[0] === 'string' && args[0].includes('Unable to create cache')) {
                    return; // 抑制
                }
            } catch (e) {
                // エラーが起きたら通常の warn を呼ぶ
            }
            origWarn(...args);
        };
    } catch (e) {
        // 抑制処理に失敗してもアプリは継続
    }
})();

// ============================================================
// 1. 基本API
// ============================================================
contextBridge.exposeInMainWorld('electronAPI', {
    ipcRenderer: {
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
        on: (channel, listener) => ipcRenderer.on(channel, listener),
        removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
        send: (channel, ...args) => ipcRenderer.send(channel, ...args)
    },
    fs,
    os: { homedir: os.homedir },
    path,
    exec: (command) => new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
        });
    }),
    getFilePath: (file) => {
        try {
            return webUtils.getPathForFile(file);
        } catch (err) {
            console.error('getPathForFile error:', err);
            return null;
        }
    },
    classifyPath: (fullPath) => ipcRenderer.invoke('classify-path', fullPath),
    appPath: __dirname
});
