## ADDED Requirements

### Requirement: Plan 完成後操作選項
前端 SHALL 在 plan 完成後提供「Continue Planning」和「Execute Plan」兩個操作按鈕。

#### Scenario: 按鈕顯示
- **WHEN** plan mode streaming idle 且 plan 內容已生成
- **THEN** 前端 SHALL 顯示 "Continue Planning" 和 "Execute Plan" 兩個按鈕，取代現有的 "Switch to Act" / "Stay in Plan" 按鈕

#### Scenario: Continue Planning 行為
- **WHEN** 使用者點擊 "Continue Planning"
- **THEN** 前端 SHALL 保持 plan mode 不變，聚焦聊天輸入框，允許使用者繼續提供指示

#### Scenario: Execute Plan 觸發
- **WHEN** 使用者點擊 "Execute Plan"
- **THEN** 前端 SHALL 發送 `copilot:execute_plan` WebSocket 訊息至 backend，帶有 `{ conversationId }`

#### Scenario: 按鈕停用狀態
- **WHEN** Execute Plan 已被觸發且流程尚未完成
- **THEN** 兩個按鈕 SHALL 進入 disabled 狀態，防止重複操作

### Requirement: Execute Plan WebSocket Handler
Backend SHALL 處理 `copilot:execute_plan` WebSocket 訊息，執行 plan-to-act 轉換流程。

#### Scenario: 清除 SDK Session
- **WHEN** backend 收到 `copilot:execute_plan` 訊息
- **THEN** 系統 SHALL 將該對話的 `sdkSessionId` 設為 `null`，強制建立新的 SDK session

#### Scenario: 切換至 Act Mode
- **WHEN** SDK session 清除完成
- **THEN** 系統 SHALL 將對話模式切換為 `act`

#### Scenario: 讀取 Plan 檔案
- **WHEN** 模式切換完成
- **THEN** 系統 SHALL 從 conversation metadata 中取得 `planFilePath`，讀取該 markdown 檔案的完整內容

#### Scenario: Plan 檔案不存在
- **WHEN** `planFilePath` 為空或檔案不存在
- **THEN** 系統 SHALL 回傳 WebSocket 錯誤訊息 `{ error: "Plan file not found" }`，不啟動新串流

#### Scenario: 啟動新串流
- **WHEN** plan 檔案內容成功讀取
- **THEN** 系統 SHALL 使用 plan 內容作為使用者 prompt，啟動新的 Copilot SDK 串流，以 act mode 執行

#### Scenario: Prompt 格式
- **WHEN** 使用 plan 內容建立新串流
- **THEN** prompt SHALL 包含前綴指示（如 "Execute the following plan:"）加上完整的 plan markdown 內容

### Requirement: Execute Plan 流程的 Session 管理
系統 SHALL 確保 execute plan 流程中的 session 隔離和正確管理。

#### Scenario: 新 Session 建立
- **WHEN** `sdkSessionId` 被設為 `null` 後啟動新串流
- **THEN** stream-manager SHALL 建立全新的 SDK session，不復用 plan mode 時的 session

#### Scenario: 對話連續性
- **WHEN** execute plan 串流完成
- **THEN** 新串流的訊息 SHALL 屬於同一個 conversationId，保持對話歷史的連續性

#### Scenario: Session 清除失敗
- **WHEN** `sdkSessionId` 清除過程中發生資料庫錯誤
- **THEN** 系統 SHALL 記錄 error log 並回傳 WebSocket 錯誤訊息，不啟動新串流

### Requirement: Execute Plan 前端狀態管理
前端 SHALL 正確管理 execute plan 流程中的 UI 狀態轉換。

#### Scenario: 模式切換反映
- **WHEN** backend 成功切換至 act mode
- **THEN** 前端 SHALL 更新 plan/act toggle 顯示為 act mode

#### Scenario: 串流開始
- **WHEN** execute plan 的新串流開始
- **THEN** 前端 SHALL 顯示正常的串流中 UI（如 streaming indicator、stop 按鈕）

#### Scenario: 執行完成
- **WHEN** execute plan 串流結束（idle）
- **THEN** 前端 SHALL 顯示 act mode 的正常 idle UI，不再顯示 plan 操作按鈕

#### Scenario: 錯誤恢復
- **WHEN** execute plan 流程失敗（如 plan 檔案遺失、session 建立失敗）
- **THEN** 前端 SHALL 顯示錯誤訊息，恢復至 plan mode idle 狀態，重新顯示操作按鈕
