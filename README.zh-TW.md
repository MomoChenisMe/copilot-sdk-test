# CodeForge

**跑在 Linux VPS 上的 AI 開發工具，透過手機瀏覽器操控。**

[English](README.md) | [繁體中文](README.zh-TW.md)

---

## 簡介

CodeForge 是一款個人用 AI 輔助開發工具，部署在 Linux VPS 上，透過手機瀏覽器即可進行完整的程式開發工作。兩個核心能力：**Copilot Agent** 負責寫程式，**Terminal** 負責操作 Shell。認證透過 GitHub Copilot 訂閱制完成，設計為單人使用。

---

## 架構

```
手機瀏覽器 (HTTPS/WSS)
  -> Nginx (SSL + 反向代理)
    -> Node.js + Express + WebSocket
      |-- Copilot SDK -> GitHub API
      |-- node-pty (Terminal)
      +-- SQLite (對話記錄)
```

---

## 技術棧

| 層 | 技術 |
|---|---|
| 前端 | React 19, Vite 6, Tailwind CSS 4, Zustand 5, xterm.js 6 |
| 後端 | Node.js, Express 5, ws, node-pty, better-sqlite3 |
| AI | @github/copilot-sdk |
| 部署 | systemd, Nginx, Let's Encrypt |

---

## 功能

### Copilot Agent

與 GitHub Copilot 整合的 AI 程式設計代理。

- **串流回應** -- 即時串流輸出 AI 回覆，降低等待感
- **工具呼叫** -- 檔案讀寫、指令執行、程式碼搜尋、Git 操作
- **模型切換** -- 在對話中切換不同 AI 模型
- **無限對話** -- 無長度限制的持續對話
- **推理區塊** -- 顯示 AI 的思考過程與推理步驟

### Terminal

真實的終端模擬器，非簡易的指令執行器。

- 基於 **node-pty + xterm.js** 的完整 PTY 終端
- 支援 vim、htop、top 等互動式程式
- 完整的 ANSI 色彩與控制序列支援

### 對話管理

- **多頁簽** -- 同時開啟多個對話頁簽，支援 copilot / terminal / cron 三種類型
- **歷史記錄** -- 所有對話以 SQLite 持久化保存
- **搜尋** -- 在歷史對話中搜尋關鍵字
- **釘選** -- 將重要對話釘選至頂部

### Artifacts 面板

AI 生成內容的獨立渲染面板。

- 程式碼高亮顯示
- Markdown 渲染
- HTML 沙盒（安全隔離執行）
- SVG 渲染
- Mermaid 圖表渲染
- 一鍵複製 / 下載

### OpenSpec SDD

規格驅動開發（Specification-Driven Development）流程。

- **總覽儀表板** -- 專案規格的全局視圖
- **變更管理** -- 追蹤規格變更歷程
- **任務追蹤** -- 從規格產生開發任務並追蹤進度

### 排程任務 / Cron

自動化的排程執行功能。

- 支援 **Cron 表達式**定義排程
- 支援**時間間隔**定義排程
- **逐對話排程** -- 每個對話可獨立設定排程

### 自動記憶系統

AI 自動萃取並管理對話中的重要資訊。

- **自動萃取** -- 從對話中自動辨識重要資訊
- **品質閘門** -- LLM 評估記憶品質，過濾低價值內容
- **智慧萃取** -- 精準提取關鍵知識點
- **記憶壓縮** -- 自動壓縮冗餘記憶，維持精簡

### 技能系統

擴充 AI 能力的模組化系統。

- **內建技能** -- 預設提供的常用技能
- **自訂技能** -- 自行撰寫技能擴充功能
- **安裝方式** -- 從 ZIP 檔或 URL 安裝第三方技能
- **AI 輔助建立** -- 透過 AI 對話產生新技能

### 推播通知

基於 PWA 的瀏覽器推播通知。

- **Cron 完成通知** -- 排程任務執行完成時推播
- **AI 回覆完成通知** -- 長時間 AI 回覆完成時推播

### Plan & Act 模式

執行前的策略規劃模式。AI 先產出執行計畫，確認後再實際執行，避免盲目操作。

### 網路搜尋

- 整合 **Brave Search API**
- 逐對話切換搜尋功能開關

### 國際化

- 支援 English 與繁體中文
- 介面語言即時切換

### 深色 / 淺色主題

- 基於 **Slate-Indigo** 設計系統
- 深色與淺色主題切換

### 其他功能

- **檔案附件** -- 上傳檔案作為對話附件
- **圖片燈箱** -- 點擊圖片放大檢視
- **鍵盤快捷鍵** -- 常用操作的鍵盤快捷鍵支援

---

## 開始使用

### 前置需求

- Node.js >= 20
- npm >= 10
- GitHub Copilot 訂閱（Individual / Business / Enterprise）
- Linux VPS（部署用）

### 安裝

```bash
git clone <repository-url>
cd copilot-sdk-test
npm install
```

前端依賴安裝：

```bash
cd frontend
npm install
```

### 環境設定

複製環境變數範本並填入設定：

```bash
cp .env.example .env
```

### 開發

啟動後端開發伺服器：

```bash
npm run dev
```

啟動前端開發伺服器：

```bash
cd frontend
npm run dev
```

### 建置

建置前端生產版本：

```bash
cd frontend
npm run build
```

### 測試

```bash
npm test
```

---

## 部署

### systemd

建立 service 檔案 `/etc/systemd/system/codeforge.service`：

```ini
[Unit]
Description=CodeForge
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/codeforge
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

啟用並啟動服務：

```bash
sudo systemctl enable codeforge
sudo systemctl start codeforge
```

### Nginx 反向代理

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

### Let's Encrypt SSL 憑證

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 授權

Private use only. 僅供個人使用。
