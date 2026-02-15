## ADDED Requirements

### Requirement: 記憶系統檔案結構

系統 SHALL 在 `data/prompts/memory/` 目錄下管理跨對話記憶，分為使用者偏好、專案筆記和解決方案三個類別。

#### Scenario: 記憶目錄結構

- **WHEN** 後端服務啟動且 `ensureDirectories()` 執行
- **THEN** 系統 MUST 確保以下目錄結構存在：
  - `data/prompts/memory/preferences.md`（使用者偏好，若不存在則建立空檔）
  - `data/prompts/memory/projects/`（專案筆記目錄）
  - `data/prompts/memory/solutions/`（解決方案目錄）

#### Scenario: preferences.md 用途

- **WHEN** 使用者或 AI 寫入 preferences.md
- **THEN** 該檔案 MUST 儲存使用者的跨對話偏好（如常用技術棧、偏好的程式碼風格、溝通語言等），此內容 SHALL 自動注入每次對話的 system prompt

#### Scenario: projects 目錄用途

- **WHEN** 使用者建立專案筆記檔案
- **THEN** 該檔案 MUST 儲存於 `memory/projects/{name}.md`，記錄特定專案的上下文資訊（如架構決策、技術債、待辦事項），AI 在需要時可主動讀取

#### Scenario: solutions 目錄用途

- **WHEN** 使用者建立解決方案檔案
- **THEN** 該檔案 MUST 儲存於 `memory/solutions/{name}.md`，記錄已解決問題的步驟和方法，AI 在遇到類似問題時可主動參考

### Requirement: Preferences 自動注入

系統 SHALL 將 `preferences.md` 的內容自動注入每次對話的 system prompt，透過 PromptComposer 整合。

#### Scenario: PromptComposer 整合 preferences

- **WHEN** PromptComposer 組裝 system prompt
- **THEN** 系統 MUST 讀取 `data/prompts/memory/preferences.md` 內容，按照 PromptComposer 定義的順序（在 presets 之後、project prompt 之前）插入

#### Scenario: Preferences 檔案為空

- **WHEN** `preferences.md` 內容為空字串或僅含空白
- **THEN** PromptComposer MUST 跳過 preferences 區段，不產生額外分隔線

#### Scenario: Preferences 檔案讀取失敗

- **WHEN** `preferences.md` 檔案因 I/O 錯誤無法讀取
- **THEN** 系統 MUST 以 `console.warn` 記錄警告，繼續組裝其餘 prompt 部分，MUST NOT 中斷對話流程

### Requirement: Projects 和 Solutions 記憶不自動注入

Projects 和 solutions 目錄下的檔案 SHALL NOT 自動注入 system prompt，僅在 AI 需要時按需讀取。

#### Scenario: Projects 不注入 system prompt

- **WHEN** PromptComposer 組裝 system prompt
- **THEN** 系統 MUST NOT 自動讀取 `memory/projects/` 目錄下的任何檔案內容注入 prompt

#### Scenario: Solutions 不注入 system prompt

- **WHEN** PromptComposer 組裝 system prompt
- **THEN** 系統 MUST NOT 自動讀取 `memory/solutions/` 目錄下的任何檔案內容注入 prompt

#### Scenario: AI 按需讀取專案筆記

- **WHEN** AI 在對話中判斷需要特定專案的上下文資訊
- **THEN** AI SHALL 可透過內建工具呼叫 `GET /api/memory/projects/:name` 讀取對應的專案筆記

#### Scenario: AI 按需讀取解決方案

- **WHEN** AI 在對話中遇到與歷史記錄相似的問題
- **THEN** AI SHALL 可透過內建工具呼叫 `GET /api/memory/solutions/:name` 讀取相關的解決方案

### Requirement: 記憶系統 REST API

系統 SHALL 提供 REST API 端點管理跨對話記憶檔案。

#### Scenario: 讀取 preferences

- **WHEN** 前端發送 `GET /api/memory/preferences`
- **THEN** 後端 MUST 回傳 `{ content: string }` 包含 preferences.md 的檔案內容，HTTP status 200

#### Scenario: 更新 preferences

- **WHEN** 前端發送 `PUT /api/memory/preferences` 帶有 `{ content: string }` body
- **THEN** 後端 MUST 將內容寫入 `data/prompts/memory/preferences.md`，回傳 HTTP status 200

#### Scenario: 列出所有 projects

- **WHEN** 前端發送 `GET /api/memory/projects`
- **THEN** 後端 MUST 回傳 `{ items: Array<{ name: string; content: string }> }`，列出 `memory/projects/` 目錄下所有 `.md` 檔案，HTTP status 200

#### Scenario: 讀取單一 project

- **WHEN** 前端發送 `GET /api/memory/projects/:name`
- **THEN** 後端 MUST 回傳 `{ name: string; content: string }` 包含指定 project 筆記的內容，HTTP status 200

#### Scenario: 建立或更新 project

- **WHEN** 前端發送 `PUT /api/memory/projects/:name` 帶有 `{ content: string }` body
- **THEN** 後端 MUST 將內容寫入 `data/prompts/memory/projects/{name}.md`，回傳 HTTP status 200

#### Scenario: 刪除 project

- **WHEN** 前端發送 `DELETE /api/memory/projects/:name`
- **THEN** 後端 MUST 刪除 `data/prompts/memory/projects/{name}.md` 檔案，回傳 HTTP status 200

#### Scenario: 列出所有 solutions

- **WHEN** 前端發送 `GET /api/memory/solutions`
- **THEN** 後端 MUST 回傳 `{ items: Array<{ name: string; content: string }> }`，列出 `memory/solutions/` 目錄下所有 `.md` 檔案，HTTP status 200

#### Scenario: 讀取單一 solution

- **WHEN** 前端發送 `GET /api/memory/solutions/:name`
- **THEN** 後端 MUST 回傳 `{ name: string; content: string }` 包含指定 solution 的內容，HTTP status 200

#### Scenario: 建立或更新 solution

- **WHEN** 前端發送 `PUT /api/memory/solutions/:name` 帶有 `{ content: string }` body
- **THEN** 後端 MUST 將內容寫入 `data/prompts/memory/solutions/{name}.md`，回傳 HTTP status 200

#### Scenario: 刪除 solution

- **WHEN** 前端發送 `DELETE /api/memory/solutions/:name`
- **THEN** 後端 MUST 刪除 `data/prompts/memory/solutions/{name}.md` 檔案，回傳 HTTP status 200

#### Scenario: 不存在的記憶項目讀取

- **WHEN** 前端發送 `GET /api/memory/projects/:name` 或 `GET /api/memory/solutions/:name` 但該檔案不存在
- **THEN** 後端 MUST 回傳 HTTP status 404 和 `{ error: "Not found" }`

### Requirement: 記憶檔案名稱安全驗證

系統 SHALL 對所有記憶相關的檔案操作進行名稱安全驗證，與 system-prompts spec 中的檔案名稱安全驗證規則一致。

#### Scenario: Path traversal 防護

- **WHEN** API 接收到 project 或 solution name 包含 `..`、`/`、`\` 或 null byte 字元
- **THEN** 系統 MUST 回傳 HTTP status 400 和 `{ error: "Invalid name" }`，MUST NOT 存取預期目錄外的檔案

#### Scenario: 檔案名稱正規化

- **WHEN** API 接收到包含空格或特殊字元的 name
- **THEN** 系統 MUST 使用與 system-prompts 相同的 sanitize 函式正規化名稱，僅保留 `[a-zA-Z0-9_-]` 字元

#### Scenario: 空名稱防護

- **WHEN** API 接收到空字串或僅含空白的 name
- **THEN** 系統 MUST 回傳 HTTP status 400 和 `{ error: "Invalid name" }`

### Requirement: 前端 Memory 管理介面

系統 SHALL 在 SettingsPanel 中增加「Memory」分頁，提供記憶內容的檢視和編輯功能。

#### Scenario: Memory 分頁入口

- **WHEN** SettingsPanel 開啟
- **THEN** 介面 MUST 在現有分頁（Profile、Agent、Presets）之後新增「Memory」分頁

#### Scenario: Memory 分頁結構

- **WHEN** 使用者選擇「Memory」分頁
- **THEN** 介面 MUST 顯示三個子區段：「Preferences」、「Projects」、「Solutions」，每個區段以可摺疊的 accordion 呈現

#### Scenario: Preferences 子區段

- **WHEN** 使用者展開「Preferences」子區段
- **THEN** 介面 MUST 顯示 textarea 編輯器載入 preferences.md 內容，底部有「儲存」按鈕，儲存時呼叫 `PUT /api/memory/preferences`

#### Scenario: Projects 子區段

- **WHEN** 使用者展開「Projects」子區段
- **THEN** 介面 MUST 顯示所有 project 筆記的列表（名稱 + 預覽），每項可點擊展開編輯，底部有「新增 Project」按鈕

#### Scenario: Solutions 子區段

- **WHEN** 使用者展開「Solutions」子區段
- **THEN** 介面 MUST 顯示所有 solution 的列表（名稱 + 預覽），每項可點擊展開編輯，底部有「新增 Solution」按鈕

#### Scenario: 刪除記憶項目確認

- **WHEN** 使用者在 Projects 或 Solutions 列表中點擊刪除按鈕
- **THEN** 介面 MUST 顯示確認對話框「確定要刪除此項目嗎？」，使用者確認後才呼叫 `DELETE` API

#### Scenario: 刪除成功回饋

- **WHEN** DELETE API 呼叫成功
- **THEN** 介面 MUST 從列表中移除該項目，顯示「已刪除」toast 提示

#### Scenario: 列表載入失敗

- **WHEN** 前端呼叫 `GET /api/memory/projects` 或 `GET /api/memory/solutions` 失敗
- **THEN** 介面 MUST 在對應子區段顯示「載入失敗，請重試」的錯誤提示，提供重新載入按鈕
