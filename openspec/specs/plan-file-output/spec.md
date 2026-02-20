## ADDED Requirements

### Requirement: Plan 自動儲存至 Markdown 檔案
系統 SHALL 在 plan mode streaming idle 時自動將 plan 內容儲存為 markdown 檔案。

#### Scenario: Idle 時觸發儲存
- **WHEN** `copilot:idle` 事件觸發且 `stream.mode === 'plan'`
- **THEN** stream-manager SHALL 將當前 plan 內容寫入 markdown 檔案

#### Scenario: 非 Plan Mode 不觸發
- **WHEN** `copilot:idle` 事件觸發且 `stream.mode !== 'plan'`（如 `'act'`）
- **THEN** 系統 SHALL 不執行 plan 檔案儲存

#### Scenario: 檔案路徑格式
- **WHEN** plan 檔案需要儲存
- **THEN** 檔案路徑 SHALL 為 `{CWD}/.codeforge/plans/{date}-{topic-slug}.md`，其中 `date` 為 `YYYY-MM-DD` 格式，`topic-slug` 為對話主題的 kebab-case 縮寫

#### Scenario: Topic Slug 生成
- **WHEN** 系統需要產生 topic slug
- **THEN** 系統 SHALL 從對話的第一條使用者訊息中提取關鍵字，轉換為 lowercase kebab-case，最長 50 個字元

#### Scenario: 目錄自動建立
- **WHEN** `{CWD}/.codeforge/plans/` 目錄不存在
- **THEN** 系統 SHALL 自動建立完整的目錄路徑（recursive mkdir）

#### Scenario: 檔案內容格式
- **WHEN** plan 檔案被寫入
- **THEN** 檔案內容 SHALL 包含完整的 plan markdown 文字，由 Copilot 串流中的所有 assistant 回應文字組成

#### Scenario: 重複 Idle 時覆蓋
- **WHEN** 同一對話中多次觸發 `copilot:idle`（如使用者繼續規劃）
- **THEN** 系統 SHALL 覆蓋同一個 plan 檔案，使用最新的完整 plan 內容

### Requirement: Plan 路徑儲存至對話 Metadata
系統 SHALL 將 plan 檔案路徑記錄在 conversation 的 metadata 中。

#### Scenario: 寫入後儲存路徑
- **WHEN** plan 檔案成功寫入磁碟
- **THEN** 系統 SHALL 將檔案絕對路徑儲存至 conversation metadata 的 `planFilePath` 欄位

#### Scenario: 路徑可查詢
- **WHEN** 前端查詢對話詳細資訊
- **THEN** 回應 SHALL 包含 `planFilePath`（若該對話有 plan 檔案）

### Requirement: 資料庫 Schema 更新
conversations table SHALL 新增欄位儲存 plan 檔案路徑。

#### Scenario: 新欄位
- **WHEN** 資料庫 migration 執行
- **THEN** conversations table SHALL 新增 `plan_file_path TEXT` 欄位，允許 NULL

#### Scenario: 向下相容
- **WHEN** 現有對話沒有 plan 檔案
- **THEN** `plan_file_path` 欄位 SHALL 為 `NULL`，不影響現有功能

### Requirement: 前端 Plan 路徑顯示
前端 SHALL 在 plan 完成時顯示 plan 檔案路徑。

#### Scenario: Plan 完成後提示
- **WHEN** plan mode streaming idle 且 plan 檔案路徑可用
- **THEN** 前端 SHALL 在 plan-complete prompt 區域顯示檔案路徑，如 "Plan saved to: {path}"

#### Scenario: 路徑可點擊
- **WHEN** plan 檔案路徑顯示在 UI 上
- **THEN** 路徑文字 MUST 為可選取的文字，方便使用者複製

#### Scenario: 無路徑時不顯示
- **WHEN** plan 完成但 `planFilePath` 為空
- **THEN** 前端 SHALL 不顯示檔案路徑區塊

#### Scenario: 寫入失敗處理
- **WHEN** plan 檔案寫入磁碟失敗（如權限不足、磁碟空間不足）
- **THEN** 系統 SHALL 記錄 error log，不影響對話流程，前端不顯示路徑
