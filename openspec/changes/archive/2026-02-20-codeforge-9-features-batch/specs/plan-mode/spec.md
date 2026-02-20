## MODIFIED Requirements

### Requirement: Plan mode Markdown 檔案輸出

Plan mode 完成時 SHALL 將規劃結果寫入 markdown 檔案，並在 UI 顯示檔案路徑與新的操作按鈕。

#### Scenario: Plan mode idle 時寫入檔案

- **WHEN** SDK session 處於 plan mode 且串流完成（進入 idle 狀態）
- **THEN** 系統 MUST 將累積的 plan 內容寫入 markdown 檔案
- **AND** 檔案路徑 MUST 儲存至 TabState 的 `planFilePath` 欄位
- **AND** 檔案名稱格式 SHALL 為 `plan-{timestamp}.md`，儲存於 cwd 或系統暫存目錄

#### Scenario: Plan 檔案內容格式

- **WHEN** plan 內容被寫入 markdown 檔案
- **THEN** 檔案 MUST 包含完整的 AI 規劃輸出，以 markdown 格式儲存
- **AND** 檔案開頭 MUST 包含 metadata header（日期、model、conversation ID）

#### Scenario: 檔案寫入失敗降級處理

- **WHEN** plan 檔案因磁碟權限或空間不足導致寫入失敗
- **THEN** 系統 MUST 以 `console.warn` 記錄警告
- **AND** `planFilePath` MUST 設為 `null`
- **AND** UI MUST 仍顯示 plan complete prompt，但不顯示檔案路徑資訊

### Requirement: Plan complete prompt 顯示檔案路徑與新按鈕

Plan mode 完成提示 SHALL 顯示已儲存的檔案路徑，並提供 "Execute Plan" 與 "Continue Planning" 兩個操作按鈕（取代舊版 "Switch to Act" 與 "Stay in Plan"）。

#### Scenario: 有檔案路徑時的完成提示

- **WHEN** plan mode 完成且 `planFilePath` 不為 null
- **THEN** plan complete prompt MUST 顯示檔案路徑資訊（如 "Plan saved to /path/to/plan-xxx.md"）
- **AND** MUST 顯示 "Execute Plan" 按鈕（主要操作，accent 色）
- **AND** MUST 顯示 "Continue Planning" 按鈕（次要操作，secondary 色）

#### Scenario: 無檔案路徑時的完成提示

- **WHEN** plan mode 完成但 `planFilePath` 為 null
- **THEN** plan complete prompt MUST 僅顯示完成訊息
- **AND** MUST 顯示 "Execute Plan" 和 "Continue Planning" 按鈕

#### Scenario: "Execute Plan" 按鈕行為

- **WHEN** 使用者點擊 "Execute Plan" 按鈕
- **THEN** 系統 MUST 將 plan mode 切換為 act mode（`planMode = false`）
- **AND** MUST 自動發送一則訊息給 AI，內容為要求執行先前規劃的計畫
- **AND** MUST 清除 `showPlanCompletePrompt` 狀態

#### Scenario: "Continue Planning" 按鈕行為

- **WHEN** 使用者點擊 "Continue Planning" 按鈕
- **THEN** 系統 MUST 維持 plan mode 不變（`planMode` 保持 `true`）
- **AND** MUST 清除 `showPlanCompletePrompt` 狀態
- **AND** 使用者可繼續在 plan mode 下發送訊息

## ADDED Requirements

### Requirement: TabState 新增 planFilePath 欄位

TabState interface SHALL 新增 `planFilePath: string | null` 欄位，用於追蹤當前 plan mode 輸出的 markdown 檔案路徑。

#### Scenario: 新 tab 預設 planFilePath 為 null

- **WHEN** `openTab()` 被呼叫建立新分頁
- **THEN** 新分頁的 `planFilePath` MUST 預設為 `null`

#### Scenario: Plan 完成時設定 planFilePath

- **WHEN** plan mode 串流完成且檔案寫入成功
- **THEN** 系統 MUST 呼叫 `setTabPlanFilePath(tabId, filePath)` 更新 TabState

#### Scenario: 切換為 act mode 時清除 planFilePath

- **WHEN** 使用者從 plan mode 切換至 act mode
- **THEN** 系統 MUST NOT 清除 `planFilePath`（保留參考用途）

#### Scenario: 新對話開啟時重置 planFilePath

- **WHEN** tab 切換到新對話或清除對話
- **THEN** `planFilePath` MUST 重置為 `null`
