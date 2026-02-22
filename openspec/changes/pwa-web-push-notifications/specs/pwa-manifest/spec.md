## ADDED Requirements

### Requirement: PWA Manifest 檔案

系統 SHALL 在 `frontend/public/manifest.json` 提供符合 Web App Manifest 規範的 JSON 檔案。Manifest MUST 包含以下欄位：
- `name`: "CodeForge"
- `short_name`: "CodeForge"
- `start_url`: "/"
- `display`: "standalone"
- `theme_color`: "#1a1a2e"
- `background_color`: "#1a1a2e"
- `icons`: 至少包含 192x192 和 512x512 尺寸的 PNG icon，以及對應的 maskable 版本

#### Scenario: 瀏覽器讀取 manifest
- **WHEN** 瀏覽器載入 CodeForge 首頁
- **THEN** 瀏覽器可透過 `<link rel="manifest">` 取得 manifest.json 並解析

#### Scenario: manifest 包含必要欄位
- **WHEN** 解析 manifest.json
- **THEN** 包含 name、short_name、start_url、display、theme_color、background_color、icons 所有必要欄位

### Requirement: HTML Meta Tags

`frontend/index.html` MUST 包含以下 PWA 相關 meta tags：
- `<link rel="manifest" href="/manifest.json" />`
- `<link rel="apple-touch-icon" href="/icons/icon-192.png" />`
- `<meta name="apple-mobile-web-app-capable" content="yes" />`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`

頁面 `<title>` MUST 為 "CodeForge"。

#### Scenario: iOS Safari 安裝提示
- **WHEN** 使用者在 iOS Safari 開啟 CodeForge
- **THEN** 瀏覽器辨識為 PWA 並提供「加入主畫面」選項

#### Scenario: Android Chrome 安裝提示
- **WHEN** 使用者在 Android Chrome 開啟 CodeForge
- **THEN** 瀏覽器顯示 PWA 安裝橫幅或選單選項

### Requirement: App Icons

系統 MUST 在 `frontend/public/icons/` 提供以下 icon 檔案：
- `icon-192.png`（192x192）
- `icon-512.png`（512x512）
- `icon-maskable-192.png`（192x192, purpose: maskable）
- `icon-maskable-512.png`（512x512, purpose: maskable）

#### Scenario: Icon 正確載入
- **WHEN** PWA 安裝到主畫面
- **THEN** 顯示正確的 app icon（根據裝置選擇適當尺寸）
