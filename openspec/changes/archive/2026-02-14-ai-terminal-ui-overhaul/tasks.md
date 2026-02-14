## 1. EventRelay Bug 修復（Critical）

- [x] 1.1 撰寫 EventRelay 巢狀事件結構測試：新增測試案例驗證 `{ type, data: { messageId, content } }` 結構的事件能正確提取內容（`backend/tests/copilot/event-relay.test.ts`）
- [x] 1.2 修復 EventRelay 所有 8 個事件處理器：在每個 `session.on()` callback 中加入 `const d = (e as any).data ?? e;`，從 `d` 提取欄位（`backend/src/copilot/event-relay.ts`）
- [x] 1.3 修復 `extractContent()` 函式：改為接收解包後的資料物件（`backend/src/copilot/event-relay.ts`）
- [x] 1.4 執行後端測試驗證：`cd backend && npm test`

## 2. useCopilot empty-content 防禦

- [x] 2.1 撰寫 useCopilot empty-content 測試：新增測試案例驗證 `copilot:message` content 為空時不設定 receivedMessageRef，idle fallback 能正確使用 streamingText（`frontend/tests/hooks/useCopilot.test.ts`）
- [x] 2.2 修改 `copilot:message` handler：當 content 為空時不設定 `receivedMessageRef.current = true`（`frontend/src/hooks/useCopilot.ts`）
- [x] 2.3 執行前端測試驗證：`cd frontend && npm test`

## 3. 聊天視窗版面改造

- [x] 3.1 撰寫 MessageBlock 樣式測試：驗證使用者訊息有 `justify-end` 和 accent 背景，助手訊息有 Sparkles icon 和 `pl-8` 縮排（`frontend/tests/components/copilot/MessageBlock.test.ts`）
- [x] 3.2 更新 MessageBlock 使用者訊息樣式：改用 `bg-accent/10` 背景色（`frontend/src/components/copilot/MessageBlock.tsx`）
- [x] 3.3 更新 MessageBlock 助手訊息樣式：加入 Sparkles icon + 角色標籤 + `pl-8` 縮排（`frontend/src/components/copilot/MessageBlock.tsx`）
- [x] 3.4 更新 `--color-user-message-bg` 變數：light `#ede9fe`、dark `#2e1065`（`frontend/src/styles/globals.css`）
- [x] 3.5 執行前端測試驗證

## 4. 模型選擇器修復

- [x] 4.1 撰寫 ModelSelector 改善測試：驗證 dropdown 有 `max-h-60 overflow-y-auto`、模型來源標題存在、trigger 按鈕有 `truncate`（`frontend/tests/components/copilot/ModelSelector.test.ts`）
- [x] 4.2 修改 ModelSelector dropdown：寬度改為 `min-w-48 max-w-72`，加入 `max-h-60 overflow-y-auto`，定位改為 `right-0`（`frontend/src/components/copilot/ModelSelector.tsx`）
- [x] 4.3 加入模型來源標題：dropdown 頂部加入「GitHub Copilot Models」標題（`frontend/src/components/copilot/ModelSelector.tsx`）
- [x] 4.4 修改 trigger 按鈕和 dropdown item：加入 `truncate`、`max-w-40`、`title` 屬性（`frontend/src/components/copilot/ModelSelector.tsx`）
- [x] 4.5 執行前端測試驗證

## 5. 全面間距統一

- [x] 5.1 更新 TopBar 間距：`px-3 py-2` → `px-4 py-3`（`frontend/src/components/layout/TopBar.tsx`）
- [x] 5.2 更新 BottomBar tab 列間距：`px-3` → `px-4`（`frontend/src/components/layout/BottomBar.tsx`）
- [x] 5.3 更新 Input 輸入區間距：增加底部安全區域 padding（`frontend/src/components/shared/Input.tsx`）
- [x] 5.4 更新 ChatView 訊息區間距：`py-4` → `py-6`；streaming block 統一 `mb-4`（`frontend/src/components/copilot/ChatView.tsx`）
- [x] 5.5 更新 Sidebar 搜尋間距：`py-2` → `py-3`（`frontend/src/components/layout/Sidebar.tsx`）
- [x] 5.6 執行前端測試驗證，確認無 UI 回歸

## 6. i18n 基礎建設

- [x] 6.1 安裝 i18n 依賴：`cd frontend && npm install i18next react-i18next i18next-browser-languagedetector`
- [x] 6.2 建立 i18n 初始化模組：設定 i18next + react-i18next + LanguageDetector，預設 zh-TW，fallback en（`frontend/src/lib/i18n.ts`）
- [x] 6.3 建立繁體中文翻譯檔：包含所有 UI 元件的翻譯 key（`frontend/src/locales/zh-TW.json`）
- [x] 6.4 建立英文翻譯檔：與 zh-TW 結構完全對應（`frontend/src/locales/en.json`）
- [x] 6.5 在 main.tsx 中 import i18n 初始化（`frontend/src/main.tsx`）
- [x] 6.6 設定測試環境 i18n：在 vitest setup 中初始化 i18n 使用 en locale
- [x] 6.7 執行前端測試驗證 i18n 初始化不破壞現有測試

## 7. i18n 字串外部化（元件改造）

- [x] 7.1 撰寫 i18n 元件測試：驗證元件使用 `t()` 函式而非硬編碼字串
- [x] 7.2 改造 App.tsx：`'載入中...'` → `t('app.loading')`
- [x] 7.3 改造 LoginPage.tsx：所有登入頁面字串使用翻譯 key
- [x] 7.4 改造 ConnectionBadge.tsx：連線狀態文字使用翻譯 key
- [x] 7.5 改造 ChatView.tsx：歡迎畫面、空狀態提示使用翻譯 key
- [x] 7.6 改造 MessageBlock.tsx：「Assistant」標籤使用翻譯 key
- [x] 7.7 改造 ModelSelector.tsx：Loading/Error/來源標題使用翻譯 key
- [x] 7.8 改造 ReasoningBlock.tsx：思考中文字使用翻譯 key
- [x] 7.9 改造 ToolRecord.tsx：參數/結果/錯誤使用翻譯 key
- [x] 7.10 改造 Markdown.tsx：複製按鈕 aria-label 使用翻譯 key
- [x] 7.11 改造 Input.tsx：placeholder、按鈕文字使用翻譯 key
- [x] 7.12 改造 BottomBar.tsx：Copilot/Terminal tab 文字使用翻譯 key
- [x] 7.13 改造 TopBar.tsx：預設標題使用翻譯 key
- [x] 7.14 改造 Sidebar.tsx：所有側邊欄文字使用翻譯 key（含時間格式）
- [x] 7.15 執行前端全套測試驗證

## 8. 語言切換器 UI

- [x] 8.1 撰寫語言切換器測試：驗證 TopBar 有 Globe icon 按鈕、點擊切換語言、顯示當前語言代碼
- [x] 8.2 在 Zustand store 加入 language 狀態和 setLanguage action（`frontend/src/store/index.ts`）
- [x] 8.3 在 TopBar 加入語言切換按鈕：Globe icon + 語言代碼，點擊切換 zh-TW ↔ en（`frontend/src/components/layout/TopBar.tsx`）
- [x] 8.4 執行前端全套測試驗證

## 9. 端到端驗證

- [x] 9.1 執行後端全套測試：`cd backend && npm test` — 29 files, 239 tests passed
- [x] 9.2 執行前端全套測試：`cd frontend && npm test` — 15 files, 137 tests passed
- [ ] 9.3 啟動 dev server 手動驗證：發送訊息確認助手回應正確顯示、切換語言、檢查模型選擇器、驗證間距
