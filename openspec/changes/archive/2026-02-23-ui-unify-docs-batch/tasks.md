## 1. T1 — 全域 CSS 動畫 keyframes（design-system）

- [x] 1.1 撰寫 fadeScaleIn 動畫測試：驗證 `.animate-fade-scale-in` class 存在且定義 opacity + scale 動畫
- [x] 1.2 撰寫 slideInRight 動畫測試：驗證 `.animate-slide-in-right` class 存在且定義 translateX 動畫
- [x] 1.3 在 `frontend/src/styles/globals.css` 新增 `@keyframes fadeScaleIn` + `.animate-fade-scale-in`（200ms ease-out，opacity 0→1 + scale 0.95→1）
- [x] 1.4 在 `frontend/src/styles/globals.css` 新增 `@keyframes slideInRight` + `.animate-slide-in-right`（0.2s ease-out，translateX 100%→0）
- [x] 1.5 驗證編譯通過：`npm run build`

## 2. T2 — 設定頁面開啟動畫（settings-full-page）

- [x] 2.1 撰寫 SettingsPanel 動畫測試：驗證容器包含 `animate-fade-scale-in` class
- [x] 2.2 修改 `frontend/src/components/settings/SettingsPanel.tsx`：容器 className 新增 `animate-fade-scale-in`
- [x] 2.3 驗證編譯通過 + 手動測試：開啟設定 → 確認有 fade + scale 動畫

## 3. T3 — OpenSpec 面板視覺對齊 Artifacts（openspec-ui-panel）

- [x] 3.1 撰寫 OpenSpecPanel 容器樣式測試：驗證 `bg-bg-primary` + `border-border`
- [x] 3.2 修改 `frontend/src/components/openspec/OpenSpecPanel.tsx`：容器 `bg-bg-secondary` → `bg-bg-primary`，`border-border-subtle` → `border-border`，移除 inline `<style>` 標籤，改用全域 `animate-slide-in-right` class
- [x] 3.3 撰寫 OpenSpecHeader 樣式測試：驗證 `py-3 gap-2 border-border`，close 按鈕 `text-text-tertiary`
- [x] 3.4 修改 `frontend/src/components/openspec/OpenSpecHeader.tsx`：移除 `h-12`，`gap-3` → `gap-2`，`border-border-subtle` → `border-border`，close 按鈕 `text-text-tertiary hover:text-text-primary hover:bg-bg-secondary`，icon 14→16px，refresh 按鈕同步色彩
- [x] 3.5 撰寫 OpenSpecNavTabs 樣式測試：驗證 active tab 使用 `border-accent text-accent bg-accent/5`
- [x] 3.6 修改 `frontend/src/components/openspec/OpenSpecNavTabs.tsx`：active tab 從 `bg-accent text-white rounded-md` 改為 `border-accent text-accent bg-accent/5 rounded-lg border`，inactive 加 `border-transparent hover:bg-bg-secondary rounded-lg border`，`border-border-subtle` → `border-border`
- [x] 3.7 撰寫 OpenSpecChangeDetail 子 tab 樣式測試：驗證描邊風格
- [x] 3.8 修改 `frontend/src/components/openspec/OpenSpecChangeDetail.tsx`：子 tab 樣式對齊主 nav tab 描邊風格，所有 `border-border-subtle` → `border-border`
- [x] 3.9 全域搜尋 OpenSpec 目錄下所有 `border-border-subtle` 並替換為 `border-border`
- [x] 3.10 驗證編譯通過 + 手動測試：開啟 OpenSpec 面板 → 比對 Artifacts 側邊欄風格一致

## 4. T4 — CronConfigPanel 覆蓋輸入框（cron-chat-tool）

- [x] 4.1 撰寫 CronConfigPanel 定位測試：驗證容器使用 absolute 定位 + shadow-lg 樣式
- [x] 4.2 修改 `frontend/src/components/copilot/CronConfigPanel.tsx`：外層容器改為 `bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] p-6`，header icon 加 `p-2 rounded-lg bg-accent/10` 背景
- [x] 4.3 撰寫 ChatView 容器結構測試：驗證 CronConfigPanel 和 Input 在 relative 容器中、CronConfigPanel 用 absolute 定位
- [x] 4.4 修改 `frontend/src/components/copilot/ChatView.tsx`：將 CronConfigPanel + Input 包裹在 `relative` 容器中，CronConfigPanel 渲染在 `absolute bottom-full left-0 right-0 mb-2 z-10` 的 wrapper 中（兩處：desktop + mobile layout）
- [x] 4.5 驗證編譯通過 + 手動測試：開啟排程設定 → 確認面板浮動在輸入框上方，關閉後輸入框不移動

## 5. T5 — 更新 README.md（雙語）

- [x] 5.1 重寫 `README.md`：英文版，涵蓋 Overview、Features 全覽（Copilot Agent、Terminal、Conversation management、Artifacts、OpenSpec SDD、Cron scheduling、Auto Memory、Skills、Push notifications、i18n、Dark/Light theme）、Tech Stack 表格、Architecture 圖、Getting Started、Deployment、License，頂部加 `[English](README.md) | [繁體中文](README.zh-TW.md)` 連結
- [x] 5.2 新增 `README.zh-TW.md`：繁體中文版，內容結構與英文版一致
- [x] 5.3 驗證 Markdown 渲染正常：連結互相指向正確

## 6. T6 — 完整 Guide 使用指南（雙語）

- [x] 6.1 建立 `docs/` 目錄
- [x] 6.2 撰寫 `docs/GUIDE.md`：英文版，涵蓋 Getting Started、Interface Overview（Top Bar / Chat Area / Input Area / Sidebar panels）、Copilot Agent（messages / model switching / tool calling / streaming / reasoning / Plan & Act / web search）、Terminal（PTY / working directory）、Conversation Management（tabs / history / search / pin / delete / tab types）、Scheduled Tasks（enable / schedule types / model / prompt）、Artifacts（types / copy / download）、OpenSpec SDD（enable / overview / changes / tasks / specs / archived）、Settings（General / System Prompt / Profile / OpenSpec / Memory / Skills / API Keys / MCP）、Keyboard Shortcuts、Push Notifications
- [x] 6.3 撰寫 `docs/GUIDE.zh-TW.md`：繁體中文版，內容結構與英文版一致
- [x] 6.4 驗證 Markdown 渲染正常 + 中英文內容一致
