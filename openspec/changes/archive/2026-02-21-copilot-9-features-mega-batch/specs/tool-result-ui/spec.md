## MODIFIED Requirements

### Requirement: toolRecords Null Safety

ChatView 的 fallback 渲染路徑中，所有 `toolRecords` 的存取 MUST 使用 null safety。
包含 `toolRecords.map()` 和 `toolRecords.length` 的呼叫 MUST 使用 `(toolRecords ?? [])` 或 optional chaining。
Zustand store 中的 `updateToolRecord` 和 `updateTabToolRecord` 亦 MUST 防護 undefined。

#### Scenario: toolRecords 為 undefined 時不崩潰

- **WHEN** streaming 區塊啟動但 toolRecords 為 undefined（tab 初始化異常）
- **THEN** ChatView 正常渲染，不拋出 "Cannot read properties of undefined (reading 'map')" 錯誤

#### Scenario: toolRecords 為空陣列時正常顯示

- **WHEN** toolRecords 為 `[]` 且 isStreaming 為 true
- **THEN** 顯示 ThinkingIndicator

### Requirement: Tool 結果區塊主題跟隨系統

ToolRecord、ToolResultBlock、Markdown code block 的背景色 MUST 跟隨系統主題。
淺色主題下 MUST 使用淺色背景，深色主題下 MUST 使用深色背景。

#### Scenario: 淺色主題下的 tool 結果

- **WHEN** 系統主題為 light
- **THEN** tool 結果區塊背景為淺色（如 #F1F5F9），文字為深色，可清楚閱讀

#### Scenario: 深色主題下的 tool 結果

- **WHEN** 系統主題為 dark
- **THEN** tool 結果區塊背景為深色（如 #0B0F1A），文字為淺色

### Requirement: Syntax Highlighting 主題切換

Markdown 中的 code block syntax highlighting MUST 跟隨系統主題。
淺色主題使用 highlight.js 的 github.css 樣式。
深色主題使用 highlight.js 的 github-dark.css 樣式。

#### Scenario: 淺色主題的 code block

- **WHEN** 系統主題為 light 且顯示包含程式碼的 Markdown
- **THEN** 程式碼使用 github.css 的淺色語法高亮

#### Scenario: 切換主題後 code block 更新

- **WHEN** 使用者從深色切換到淺色主題
- **THEN** 所有已顯示的 code block 立即更新為淺色語法高亮
