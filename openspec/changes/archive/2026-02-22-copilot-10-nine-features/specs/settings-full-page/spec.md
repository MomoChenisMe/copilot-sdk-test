## MODIFIED Requirements

### Requirement: 設定面板 Tab 結構

設定面板 MUST 將 tab 分為 4 個邏輯群組：

| 群組 | 群組標籤 | 子項目 |
|------|----------|--------|
| 一般 | 一般 | general |
| 提示詞 | 提示詞 | system-prompt, profile, openspec |
| 記憶 | 記憶 | memory |
| 工具 | 工具 | skills, WebSearch (原 api-keys), mcp |

原「API 金鑰」tab MUST 重命名為「WebSearch」。

#### Scenario: 設定面板 Tab 分組顯示（桌面版）

- **WHEN** 使用者在桌面版開啟設定面板
- **THEN** 左側 sidebar MUST 顯示 4 個群組
- **AND** 每個群組 MUST 有灰色小標題（`text-xs uppercase text-text-muted tracking-wider`）
- **AND** 群組內子項目 MUST 縮排顯示（`px-6`）
- **AND** 活躍的子項目 MUST 以 accent 色高亮（`text-accent bg-accent-soft`）

#### Scenario: 設定面板 Tab 分組顯示（手機版）

- **WHEN** 使用者在手機版開啟設定面板
- **THEN** 頂部水平 tab 列 MUST 以 `|` 分隔符區分群組
- **AND** 所有子項目 MUST 可水平捲動選取

#### Scenario: WebSearch Tab 取代 API 金鑰

- **WHEN** 使用者在設定面板的工具群組中
- **THEN** MUST 看到「WebSearch」而非「API 金鑰」
- **AND** 功能內容不變（仍為 Brave Search API key 管理）

#### Scenario: OpenSpec Tab 內容

- **WHEN** 使用者點擊「OpenSpec」tab
- **THEN** 顯示 OpenSpec SDD 開關（toggle）；當開啟時，顯示 OPENSPEC_SDD.md 的 textarea 編輯器
- **THEN** 開關切換時自動啟用/停用所有 openspec-* 開頭的 skills

#### Scenario: 個人檔案 Tab 內容

- **WHEN** 使用者點擊「個人檔案」tab
- **THEN** 顯示完整的 PROFILE.md 編輯區域，包含身份、Agent 規則、偏好設定的合併內容

### Requirement: 記憶 Tab 簡化

記憶 Tab MUST 只包含：
- **自動記憶**：textarea 編輯器 + 自動提取開關
- **LLM Intelligence**：品質閘門、智慧提取、記憶壓縮三個功能的開關和模型選擇

記憶 Tab MUST NOT 包含「偏好設定」、「專案」、「解決方案」區段。

#### Scenario: 記憶 Tab 只顯示自動記憶和 LLM

- **WHEN** 使用者點擊「記憶」tab
- **THEN** 只看到自動記憶 textarea 和 LLM Intelligence 設定，不看到偏好/專案/解決方案

#### Scenario: 舊的專案和解決方案不再可見

- **WHEN** 使用者瀏覽記憶 Tab
- **THEN** 無法看到或操作專案 (projects) 和解決方案 (solutions) 的 CRUD 介面
