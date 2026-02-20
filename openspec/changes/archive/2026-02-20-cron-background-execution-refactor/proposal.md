## Why

目前 Cron AI executor 每次執行都透過 StreamManager 建立新的 conversation，導致大量無意義對話堆積、佔用互動式 maxConcurrency 限額、且 `cron_history` 只存簡單文字無法追蹤完整執行過程。Cron 管理介面藏在 Settings modal 中不易操作，也沒有任何即時通知機制。

需要將 Cron job 改為完全獨立的背景執行架構，搭配專屬管理頁面和通知系統，讓使用者能有效管理、監控和追溯定時任務的執行。

**目標使用者：** 單人使用的 AI Terminal 操作者，需要設定定時 AI 任務（如定期程式碼審查、日報生成、系統檢查）並追蹤執行結果。

**使用情境：** 使用者在手機瀏覽器上設定 cron job，離開後 job 自動背景執行，回來時透過 toast 通知和 badge 得知執行結果，點擊歷史紀錄可開啟新對話繼續互動。

## Non-Goals

- 不支援多用戶權限隔離（維持單人使用架構）
- 不支援 Cron job 的即時串流顯示（背景執行完畢後才查看結果）
- 不支援 Cron job 的 user input 互動（背景 session 無法等待使用者回應）
- 不實作 Cron job 執行歷史的自動清理/過期策略（未來再做）
- 不修改 Shell 類型 cron job 的行為（只重構 AI 類型）

## What Changes

- **新增 BackgroundSessionRunner**：獨立於 StreamManager，直接使用 SessionManager 建立 SDK session 執行 AI 任務，收集完整 turn segments、tool records、reasoning、usage
- **新增 CronToolAssembler**：根據 per-job 配置組裝 tools 陣列，支援 skills、MCP、memory、web search、task tools 等個別開關
- **擴充 cron_history schema**：新增 prompt、config_snapshot、turn_segments、tool_records、reasoning、usage、content 欄位
- **新增 CronJobConfig 結構化介面**：定義 AI job 的 model、tool 配置等結構化設定
- **新增 WebSocket cron handler**：`cron:subscribe`、`cron:job_completed`、`cron:job_failed` 事件
- **新增 Toast 通知系統**：全域 toast 元件，支援 success/error/info 類型
- **新增 Cron 獨立管理頁面**：從 Settings modal 移出，成為獨立的 tab mode，包含 job CRUD、tool 配置面板、執行歷史、Detail 檢視
- **新增 TabBar cron badge**：永駐圖標 + 未讀數/失敗數 badge
- **新增「開啟為對話」功能**：從歷史紀錄生成摘要並建立新 conversation
- **重寫 AI executor**：不再依賴 `repo.create()` 和 `streamManager.startStream()`
- **移除 Settings 中的 CronTab**：Cron 管理完全由獨立頁面承擔

## Capabilities

### New Capabilities

- `cron-background-session`: 背景 SDK session 執行引擎，獨立於 StreamManager，含 tool 組裝器和 per-job 配置
- `cron-rich-history`: 擴充 cron_history schema，儲存完整 turn segments、tool records、reasoning、usage 和 config 快照
- `cron-notifications`: WebSocket cron 事件推送 + 前端 Toast 通知系統 + TabBar badge 未讀計數
- `cron-management-page`: 獨立的 Cron 管理頁面，含 job CRUD、tool 配置面板、全域執行歷史、Detail 展開檢視
- `cron-history-to-conversation`: 從執行歷史紀錄生成摘要並開啟新對話的完整流程

### Modified Capabilities

（無既有 spec 層級的行為變更）

## Impact

**Backend 修改：**
- `backend/src/conversation/db.ts` — schema migration 新增欄位
- `backend/src/cron/cron-store.ts` — 新 interfaces、methods
- `backend/src/cron/cron-executors.ts` — 完全重寫 AI executor
- `backend/src/cron/cron-scheduler.ts` — triggerJob 邏輯 + broadcast
- `backend/src/cron/cron-routes.ts` — 新增 3 個 API 端點
- `backend/src/index.ts` — 整合新元件

**Backend 新增：**
- `backend/src/cron/background-session-runner.ts`
- `backend/src/cron/cron-tool-assembler.ts`
- `backend/src/ws/handlers/cron.ts`

**Frontend 修改：**
- `frontend/src/store/index.ts` — TabState mode 擴充、toast、badge
- `frontend/src/components/layout/AppShell.tsx` — mode routing
- `frontend/src/components/layout/TabBar.tsx` — cron icon + badge
- `frontend/src/components/settings/SettingsPanel.tsx` — 移除 cron tab
- `frontend/src/lib/api.ts` — 新 API + types

**Frontend 新增：**
- `frontend/src/components/cron/` — 6 個新元件
- `frontend/src/components/shared/ToastContainer.tsx`
- `frontend/src/hooks/useCronNotifications.ts`

**API 新增：**
- `GET /api/cron/history/recent`
- `GET /api/cron/history/unread-count`
- `POST /api/cron/history/:historyId/open-conversation`

**Dependencies：** 無新增套件依賴
