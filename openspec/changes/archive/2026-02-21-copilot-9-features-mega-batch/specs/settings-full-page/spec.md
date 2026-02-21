## MODIFIED Requirements

### Requirement: 設定面板 Tab 結構

設定面板 MUST 包含以下 tabs（從 8 個重組為 8 個，移除 Agent 規則、新增 OpenSpec）：
1. **一般** — 語言、SDK 版本、登出
2. **系統提示詞** — 編輯/重設系統提示詞
3. **個人檔案** — 編輯統一個人檔案（含身份、Agent 規則、偏好設定）
4. **記憶** — 自動記憶 + LLM Intelligence（移除偏好/專案/解決方案）
5. **OpenSpec** — OpenSpec SDD 工作流程開關 + OPENSPEC_SDD.md 編輯器
6. **技能** — 技能管理
7. **API 金鑰** — API 金鑰管理
8. **MCP** — MCP 伺服器管理

系統 MUST NOT 顯示 "Agent 規則" tab。
OpenSpec SDD toggle 和編輯器 MUST 從原 Agent 規則 tab 搬移到獨立的 OpenSpec tab。

#### Scenario: 設定面板 Tab 列表

- **WHEN** 使用者開啟設定面板
- **THEN** 顯示 8 個 tabs，包含 "OpenSpec" 但不包含 "Agent 規則"

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

## REMOVED Requirements

### Requirement: Agent 規則 Tab
**Reason**: Agent 規則已合併至個人檔案中
**Migration**: 使用者的 Agent 規則內容自動遷移到 PROFILE.md 的 "## Agent 規則" 區段

### Requirement: 記憶偏好設定子區段
**Reason**: 偏好設定已合併至個人檔案中
**Migration**: 使用者的偏好設定內容自動遷移到 PROFILE.md 的 "## 偏好設定" 區段

### Requirement: 專案記憶管理
**Reason**: 簡化記憶系統，專注於自動記憶
**Migration**: 檔案實體保留在磁碟上（memory/projects/），僅移除 UI 和 API endpoints

### Requirement: 解決方案記憶管理
**Reason**: 簡化記憶系統，專注於自動記憶
**Migration**: 檔案實體保留在磁碟上（memory/solutions/），僅移除 UI 和 API endpoints
