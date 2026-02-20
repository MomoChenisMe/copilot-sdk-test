## MODIFIED Requirements

### Requirement: 設定分類結構

Settings SHALL 包含 10 個分類：General、System Prompt、Profile、Agent、Presets、Memory、Skills、API Keys、MCP、Cron。

#### Scenario: 全部 10 個分類渲染

- **WHEN** Settings overlay 開啟
- **THEN** navigation SHALL 顯示以下 10 個分類按鈕（依序）：
  1. General
  2. System Prompt
  3. Profile
  4. Agent
  5. Presets
  6. Memory
  7. Skills
  8. API Keys
  9. MCP
  10. Cron

#### Scenario: 預設選中第一個分類

- **WHEN** Settings 首次開啟
- **THEN** "General" 分類 SHALL 為預設 active 狀態
- **AND** 右側顯示 General 的設定內容

---

### Requirement: Agent Tab 複合結構

Agent tab SHALL 包含兩個區塊：AGENT.md 編輯器與 OpenSpec SDD 工作流程開關及其內容編輯器。

#### Scenario: Agent tab 上半部 — AGENT.md 編輯器

- **WHEN** 使用者進入 Agent tab
- **THEN** 頁面上方 MUST 顯示 AGENT.md 的 textarea 編輯器
- **AND** textarea MUST 載入 `GET /api/prompts/agent` 的內容
- **AND** 下方 MUST 顯示 Save 按鈕

#### Scenario: Agent tab 下半部 — OpenSpec SDD 區塊

- **WHEN** 使用者進入 Agent tab
- **THEN** 頁面在 AGENT.md 編輯器下方 MUST 顯示 OpenSpec SDD 區塊
- **AND** 區塊 MUST 包含標題文字、說明文字、以及 ToggleSwitch 元件
- **AND** 當 toggle 為 ON 時 MUST 額外顯示 OPENSPEC_SDD.md 的 textarea 和 Save 按鈕
