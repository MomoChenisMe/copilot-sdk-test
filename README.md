# AI Terminal

> 手機瀏覽器操控 VPS 上的 AI 開發工具。

跑在 Linux VPS 上的 Web 應用，透過手機瀏覽器使用。兩個核心能力：**Copilot Agent 寫程式**和 **Terminal 操作 Shell**。個人工具，單人使用，GitHub Copilot 訂閱制認證。

## 核心功能

- **Copilot Agent** — 透過 GitHub Copilot SDK 驅動的 AI 對話，支援串流回應、工具呼叫（讀寫檔案、執行指令、搜尋程式碼、Git 操作）、模型切換、無限對話
- **Terminal** — 真實 PTY 終端（node-pty + xterm.js），支援互動式程式（vim、htop 等）
- **對話管理** — 多對話、歷史保存（SQLite）、搜尋、釘選

## 技術架構

```
手機瀏覽器 (HTTPS/WSS)
  → Nginx (SSL + 反向代理)
    → Node.js + Express + WebSocket
      ├── Copilot SDK → GitHub API
      ├── node-pty (Terminal)
      └── SQLite (對話記錄)
```

## Tech Stack

| 層 | 技術 |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS 4, Zustand 5, xterm.js 6 |
| Backend | Node.js, Express 5, ws, node-pty, better-sqlite3 |
| AI | @github/copilot-sdk |
| Deploy | systemd, Nginx, Let's Encrypt |

## 開發

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 測試
npm test

# 建置
npm run build
```

## License

Private use only.
