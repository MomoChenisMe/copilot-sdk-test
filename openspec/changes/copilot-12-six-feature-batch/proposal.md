## Why

CodeForge 作為個人 AI 開發工具，在日常使用中累積了多項 UX 與安全性的改善需求。排程和搜尋按鈕在 desktop 版佔用了寶貴的 toolbar 空間，不如手機版的 inline 設計直覺；Plan/Act 模式切換缺少快捷鍵，操作效率低於 Claude Code 的 Shift+Tab 體驗；登入頁的 Terminal icon 無品牌辨識度；認證系統缺乏 rate limiting 和 session 持久化等基本安全防護；頁籤無法拖曳排序；而 OpenSpec 工作流目前只能透過 slash commands 操作，缺少視覺化管理介面。

本次批次一次性解決這 6 項問題，提升操作效率、品牌一致性、安全性和工具可視化管理能力。

**目標使用者**：CodeForge 開發者本人（單人使用），透過手機或桌面瀏覽器操控。

**使用情境**：日常 AI 輔助開發工作，需要快速切換模式、管理多個對話頁籤、安全登入、以及在 OpenSpec 驅動的開發流程中直觀管理變更和任務。

## What Changes

### UI 調整
- 將排程按鈕（Clock icon）和 WebSearch 按鈕從 desktop toolbar 移入輸入框內部左下角，與手機版體驗一致
- 新增 `Shift+Tab` 全域快捷鍵切換 Plan/Act 模式
- 設計全新 CodeForge SVG Logo，替換登入頁和歡迎畫面的 Terminal/Sparkles icon

### 安全強化
- 新增登入 rate limiting（每 IP 每分鐘 5 次）
- 新增帳號鎖定機制（連續失敗 10 次鎖定 15 分鐘）
- 密碼最低 8 字元複雜度要求
- Session 從記憶體改為 SQLite 持久化儲存
- 新增 CSRF double-submit cookie 防護
- 新增密碼重設機制（CLI 產生一次性 token）
- 新增 session 活動日誌
- 新增異常登入 web push 通知

### 頁籤管理
- 新增頁籤拖曳排序功能（HTML5 native drag-and-drop）
- 視覺指示線回饋 + 鍵盤無障礙支援（Ctrl+Shift+Arrow）

### OpenSpec 視覺化管理
- 新增右側滑出面板，提供完整的 OpenSpec 專案管理 UI
- 包含：總覽、變更管理（任務/提案/設計/規格分頁）、主規格瀏覽、已封存歷史
- 支援任務勾選、驗證、封存、刪除操作
- TopBar 新增切換按鈕 + `Alt+O` 快捷鍵

## Non-Goals（非目標）

- 不實作多使用者認證或 OAuth 社交登入
- 不實作 2FA / MFA（雙因素認證）
- 不引入外部 DnD 套件（如 dnd-kit）
- 不實作 OpenSpec 面板內的 inline 編輯功能（僅檢視，編輯透過 AI 對話）
- 不更新 PWA 圖示（後續處理）
- 不實作面板可調整寬度（固定 420px）
- 不實作 email 密碼重設流程（使用 CLI token 方式）

## Capabilities

### New Capabilities

- `brand-logo`: CodeForge 品牌 SVG Logo 元件，取代預設 icon，用於登入頁和歡迎畫面
- `auth-security`: 進階認證安全防護（rate limiting、帳號鎖定、CSRF、密碼複雜度、密碼重設、session 持久化、活動日誌、異常登入通知）
- `tab-drag-reorder`: 頁籤拖曳排序功能，支援 HTML5 native DnD 和鍵盤無障礙
- `openspec-ui-panel`: OpenSpec 視覺化管理右側面板，含總覽/變更/規格/已封存四大區塊和完整 CRUD 操作

### Modified Capabilities

- `keyboard-shortcuts`: 新增 `Shift+Tab` 切換 Plan/Act 模式和 `Alt+O` 切換 OpenSpec 面板
- `chat-ui`: 排程按鈕和 WebSearch 按鈕從 desktop toolbar 移入輸入框 leftActions
- `web-search-toggle`: 按鈕位置從 toolbar 移至輸入框內部，調整為無邊框內嵌樣式

## Impact

### 前端
- `ChatView.tsx` — 移除 toolbar 按鈕、更新 leftActions（F1）、替換歡迎畫面 icon（F3）
- `useGlobalShortcuts.ts` — 新增 Shift+Tab 和 Alt+O handler（F2, F6）
- `AppShell.tsx` — 接線新快捷鍵 + 渲染 OpenSpec 面板（F2, F6）
- `TabBar.tsx` — 新增 drag-and-drop handlers（F5）
- `LoginPage.tsx` — 替換 Logo + 安全性 UI 增強（F3, F4）
- `TopBar.tsx` — 新增 OpenSpec 按鈕（F6）
- `api.ts` — CSRF header 注入（F4）
- `useAuth.ts` — 處理新 HTTP 錯誤碼（F4）
- 新增 ~12 個 OpenSpec 面板元件（F6）
- 新增 `CodeForgeLogo.tsx`（F3）
- 新增 `openspec-api.ts`（F6）
- i18n 翻譯更新（en.json, zh-TW.json）

### 後端
- `auth/session.ts` — 改寫為 SQLite 持久化（F4）
- `auth/routes.ts` — 整合 rate limiting、lockout、CSRF、活動日誌（F4）
- `config.ts` — 密碼最低長度驗證（F4）
- `index.ts` — 注入安全依賴 + 掛載 OpenSpec 路由（F4, F6）
- 新增 `auth/rate-limiter.ts`, `auth/lockout.ts`, `auth/csrf.ts`, `auth/activity-log.ts`, `auth/password-validator.ts`, `auth/reset-cli.ts`（F4）
- 新增 `openspec/openspec-service.ts`, `openspec/openspec-routes.ts`（F6）

### 資料庫（SQLite）
- 新增 `sessions` 表（F4）
- 新增 `login_lockout` 表（F4）
- 新增 `session_activity_log` 表（F4）

### 無外部依賴新增
- 所有功能使用現有套件實現
