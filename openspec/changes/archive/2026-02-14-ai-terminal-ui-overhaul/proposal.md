## Why

AI Terminal 目前有一個關鍵 bug：助手訊息無法在前端顯示（後端 Copilot SDK 有收到回應，但前端畫面空白）。同時 UI 存在多項問題——間距不一致、模型選擇器被截斷、訊息版面不像聊天視窗，且所有文字為硬編碼無法切換語言。這些問題直接影響作為個人開發工具的日常使用體驗，需要一次性修復。

## Non-Goals（非目標）

- 不新增後端 API endpoint
- 不變更認證機制或資料庫 schema
- 不重構 WebSocket 架構
- 不支援超過兩種語言（僅 zh-TW + en）
- 不新增 Terminal 功能

## What Changes

- **[BUG FIX] EventRelay 事件結構修復**：修復 `backend/src/copilot/event-relay.ts` 中所有 8 個事件處理器，正確存取 SDK 巢狀事件結構 `e.data.*`，使助手訊息、streaming delta、reasoning、tool 事件都能正確轉發到前端
- **[BUG FIX] useCopilot 防禦性處理**：當 `copilot:message` 的 content 為空時，不設定 `receivedMessageRef`，讓 idle fallback 能正確將 streaming text 轉為永久訊息
- **[UI] 聊天視窗版面改造**：使用者訊息靠右（氣泡樣式），助手訊息靠左帶 icon，符合現代聊天介面風格
- **[UI] 模型選擇器改善**：加寬下拉選單、加入捲動支援、文字截斷處理、加入「GitHub Copilot Models」來源標示
- **[UI] 全面間距統一**：統一 TopBar、BottomBar、ChatView、Sidebar、Input 的 padding/margin
- **[FEATURE] i18n 多語系支援**：新增 react-i18next，提供繁體中文（預設）與英文，TopBar 加入語言切換器

## Capabilities

### New Capabilities
- `i18n`: 國際化支援——i18next 初始化、翻譯檔案（zh-TW/en）、語言切換器 UI、所有元件的字串外部化

### Modified Capabilities
- `copilot-agent`: 修復 EventRelay 事件結構解析（巢狀 `e.data.*` vs 扁平 `e.*`），修復 useCopilot 的 empty-content message 處理
- `chat-ui`: 聊天訊息版面改造（使用者氣泡靠右、助手帶 icon 靠左）、間距統一、streaming block 樣式統一
- `app-layout`: TopBar/BottomBar/Sidebar 間距改善、模型選擇器下拉選單修復、語言切換器整合

## Impact

### 後端
- `backend/src/copilot/event-relay.ts` — 所有 8 個事件處理器的資料存取路徑修改
- `backend/tests/copilot/event-relay.test.ts` — 更新測試涵蓋巢狀事件結構

### 前端
- `frontend/src/hooks/useCopilot.ts` — copilot:message handler 防禦性修改
- `frontend/src/components/copilot/` — ChatView、MessageBlock、ModelSelector 樣式修改
- `frontend/src/components/layout/` — TopBar、BottomBar、Sidebar 間距修改 + 語言切換器
- `frontend/src/components/shared/` — Input、Markdown、ConnectionBadge i18n 化
- `frontend/src/store/index.ts` — 新增 language 狀態

### 新增依賴
- `i18next`, `react-i18next`, `i18next-browser-languagedetector`

### 新增檔案
- `frontend/src/lib/i18n.ts`
- `frontend/src/locales/zh-TW.json`
- `frontend/src/locales/en.json`
