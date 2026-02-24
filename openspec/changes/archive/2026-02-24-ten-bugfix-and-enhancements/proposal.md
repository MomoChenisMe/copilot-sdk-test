## Why

目前專案存在多項影響使用體驗的 bug 與功能缺口：

1. **AskUser 機制嚴重故障**：使用者選擇選項後 AI 完全停止回應（卡住）；頁面重整後出現 "Stream already exists" 錯誤；關閉瀏覽器重開後 AskUser 選項消失導致對話卡死。
2. **Tool 執行頻繁崩潰**：SDK 內部的 `view` 工具查看目錄時拋出 `.map()` undefined 錯誤，頻繁發生且嚴重影響使用。
3. **SDK 升級 Banner 未 i18n**：更新提示使用硬編碼英文，不隨語言設定切換。
4. **Plan/Act Mode 提示詞不可自訂**：使用者無法在設定頁面編輯 Plan Mode 提示詞，且現有提示詞內容過於簡略。
5. **Plan 計劃書無法直接預覽**：Plan Mode 產生的 markdown 計劃書只寫入檔案，未以 Artifact 形式呈現給使用者。

## What Changes

### Bug 修復
- **AskUser 卡住修復**：重構 `copilot:send` handler，讓 WebSocket 訂閱在 stream 建立時同步發生（`initialSubscriber` 模式），消除競爭條件
- **Stream 衝突修復**：啟動新 stream 前自動偵測並清理舊 stream，新增 `hasStream()` / `removeSubscriber()` API
- **AskUser 狀態恢復**：在 `copilot:state_response` handler 加入 deferred retry，確保 tabs 從 localStorage 恢復後能正確匹配 pending inputs
- **Tool 錯誤防禦**：EventRelay 所有 event handler 加上 `safeHandler` 包裝；stream-manager 加入 session 健康監控（120 秒無事件警告）
- **SDK Banner i18n**：替換 `SdkUpdateBanner.tsx` 中硬編碼文字為 `t()` 呼叫

### 功能增強
- **Plan Prompt 設定**：後端新增 `PLAN_PROMPT.md` 檔案管理 + API endpoints；前端在 System Prompt 分頁中新增 Plan Mode Prompt 編輯區域
- **強化 Plan Mode 提示詞**：導入 5 階段結構化工作流（理解→探索→設計→計劃→確認）+ ask_user 釐清機制
- **強化 Act Mode 提示詞**：參考 Claude Code 最佳實踐，全面擴充工具使用規範、Git 安全協議、破壞性操作防護、程式碼品質守則、回應風格
- **Plan Artifact**：Plan Mode 完成時自動建立 `plan` 類型 artifact 並開啟 Artifacts Panel
- **Artifact 類別區分**：新增 `plan` artifact type，使用 `ClipboardList` 圖示，與一般 `markdown` 區分

## Capabilities

### New Capabilities

- `plan-artifact-rendering`: Plan Mode 產生的計劃書以獨立 artifact 類型呈現，自動在 Artifacts Panel 開啟，有專屬圖示與下載格式

### Modified Capabilities

- `ask-user-question`: 修復 AskUser 選擇後卡住的 bug、Stream already exists 錯誤、瀏覽器關閉後狀態恢復失敗
- `system-prompts`: 新增 Plan Mode Prompt 編輯功能（後端 API + 前端 UI）；全面強化 Act Mode 和 Plan Mode 的預設提示詞內容
- `tool-result-ui`: 強化 EventRelay 錯誤防禦，包裝所有 SDK event handler 防止 unhandled error 導致 stream 中斷
- `artifacts-panel`: 新增 `plan` artifact type 支援（icon、渲染、下載）
- `i18n`: SDK 升級 Banner 補齊 i18n
- `plan-mode`: 強化 Plan Mode 提示詞為 5 階段結構化工作流 + ask_user 釐清機制

## Impact

### 後端模組
- `src/copilot/stream-manager.ts` — 核心重構：initialSubscriber、hasStream、removeSubscriber、session 健康監控、plan artifact 發送
- `src/ws/handlers/copilot.ts` — copilot:send / copilot:execute_plan handler 重寫
- `src/copilot/event-relay.ts` — safeHandler 包裝所有 SDK event handlers
- `src/prompts/defaults.ts` — DEFAULT_SYSTEM_PROMPT 重寫（Act + Plan）+ 新增 DEFAULT_PLAN_PROMPT
- `src/prompts/composer.ts` — compose() 新增 mode 參數
- `src/prompts/file-store.ts` — 初始化 PLAN_PROMPT.md
- `src/prompts/routes.ts` — 新增 plan-prompt CRUD endpoints

### 新增 REST API
- `GET /api/prompts/plan-prompt`
- `PUT /api/prompts/plan-prompt`
- `POST /api/prompts/plan-prompt/reset`

### 前端元件
- `components/copilot/SdkUpdateBanner.tsx` — i18n 替換
- `components/copilot/ArtifactsPanel.tsx` — 新增 plan type 支援
- `components/settings/SettingsPanel.tsx` — SystemPromptTab 新增 Plan Mode Prompt 區域
- `hooks/useTabCopilot.ts` — state_response retry + plan artifact 建立
- `lib/artifact-parser.ts` — ParsedArtifact type 擴充
- `locales/en.json` + `zh-TW.json` — 多項新增 i18n keys

### Zustand Store
- `store/index.ts` — ParsedArtifact type 新增 `plan`（型別層面）

### 無 SQLite Schema 變更
