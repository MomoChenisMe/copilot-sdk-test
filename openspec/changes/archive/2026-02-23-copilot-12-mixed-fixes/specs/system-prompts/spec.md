## MODIFIED Requirements

### Requirement: Prompt Composer 組合順序

PromptComposer MUST 按以下順序組合系統提示詞（從原本 7 段縮減為 5 段）：
1. SYSTEM_PROMPT.md — 系統指令
2. PROFILE.md — 統一個人檔案（含身份、Agent 規則、偏好設定）
3. OPENSPEC_SDD.md — 條件注入（依 CONFIG.json 開關）
4. MEMORY.md — 自動記憶
5. .codeforge.md — 專案提示詞（從 cwd 讀取，fallback .ai-terminal.md）
6. Language directive — 語言指令（locale !== 'en' 時注入）

Composer MUST 不再讀取 AGENT.md 和 memory/preferences.md。

#### Scenario: 正常組合

- **WHEN** SYSTEM_PROMPT.md 和 PROFILE.md 皆有內容
- **THEN** 輸出只包含上述 5 段（加 locale 為 6 段），不含 AGENT.md 和 preferences.md 段落

#### Scenario: PROFILE.md 包含合併內容

- **WHEN** PROFILE.md 內容為 "# 個人檔案\n## 基本資訊\n...\n## Agent 規則\n...\n## 偏好設定\n..."
- **THEN** 整段作為 section 2 注入，與 SYSTEM_PROMPT 以 `---` 分隔

## ADDED Requirements

### Requirement: Act Mode 結構化行為準則

DEFAULT_SYSTEM_PROMPT 的 `## Modes of Operation` 區段中，Act Mode SHALL 包含以下結構化子區段：

1. **Doing Tasks** — 程式碼修改原則（先讀後改、不過度工程化、不加多餘功能、安全意識）
2. **Executing Actions with Care** — 操作的可逆性和影響範圍考量（破壞性操作需確認、區分高低風險行為）
3. **Tool Usage** — 工具使用原則（偏好工具而非猜測、先讀後改、匹配專案風格）
4. **Response Guidelines** — 回應風格指引（簡潔直接、markdown 格式、步驟化、先確認模糊需求）

#### Scenario: Act Mode 提示詞包含四個子區段

- **WHEN** 系統讀取 DEFAULT_SYSTEM_PROMPT 中的 Act Mode 區段
- **THEN** 內容 MUST 包含 "Doing Tasks"、"Executing Actions with Care"、"Tool Usage"、"Response Guidelines" 四個子區段
- **AND** 每個子區段 MUST 包含具體的行為準則條目

#### Scenario: Act Mode 包含破壞性操作確認指引

- **WHEN** AI 在 Act Mode 下收到系統提示詞
- **THEN** 提示詞 MUST 明確指示對破壞性操作（刪除檔案/分支、rm -rf、force-push）需先確認
- **AND** MUST 列舉具體的高風險操作範例

#### Scenario: Act Mode 包含程式碼修改原則

- **WHEN** AI 在 Act Mode 下收到系統提示詞
- **THEN** 提示詞 MUST 明確指示「先讀後改」、「不過度工程化」、「不加不必要的功能」

### Requirement: Plan Mode 結構化工作流程

DEFAULT_SYSTEM_PROMPT 的 `## Modes of Operation` 區段中，Plan Mode SHALL 包含 4 步驟結構化工作流程和明確規則。

#### Scenario: Plan Mode 提示詞包含四步驟工作流程

- **WHEN** 系統讀取 DEFAULT_SYSTEM_PROMPT 中的 Plan Mode 區段
- **THEN** 內容 MUST 包含 "Understand"、"Explore"、"Design"、"Plan" 四個步驟
- **AND** 每個步驟 MUST 包含具體描述

#### Scenario: Plan Mode 包含規則清單

- **WHEN** AI 在 Plan Mode 下收到系統提示詞
- **THEN** 提示詞 MUST 包含「Never call tools」「Be specific: reference actual file paths」「Keep plans concise but actionable」等規則
- **AND** MUST 指示在規劃完成後告知使用者切換到 Act mode

#### Scenario: Plan Mode 的 Design 步驟包含多方案建議

- **WHEN** AI 在 Plan Mode 下進行 Design 步驟
- **THEN** 提示詞 MUST 指示「If multiple approaches exist, present 2-3 options with trade-offs and recommend one」

### Requirement: 移除重複的獨立區段

DEFAULT_SYSTEM_PROMPT 中原有的獨立 `## Tool Usage` 和 `## Response Guidelines` 區段 SHALL 被移除或精簡，因為其內容已整合到 Act Mode 的子區段中。

#### Scenario: 無重複的 Tool Usage 區段

- **WHEN** 系統讀取完整的 DEFAULT_SYSTEM_PROMPT
- **THEN** 不應存在獨立的 `## Tool Usage` 頂層區段（其內容已合併到 `### Act Mode` 的 Tool Usage 子區段）

#### Scenario: 無重複的 Response Guidelines 區段

- **WHEN** 系統讀取完整的 DEFAULT_SYSTEM_PROMPT
- **THEN** 不應存在獨立的 `## Response Guidelines` 頂層區段（其內容已合併到 `### Act Mode` 的 Response Guidelines 子區段）
