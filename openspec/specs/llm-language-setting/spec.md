## ADDED Requirements

### Requirement: LLM 語言設定 UI

設定頁面的 General tab MUST 新增「LLM 回應語言」section，包含下拉選單和可選的自訂輸入欄。

下拉選單預設選項 MUST 為：
1. 「與介面語言相同」（value: `''`，預設選項）
2. 「繁體中文（台灣）」（value: `'zh-TW'`）
3. 「English」（value: `'en'`）
4. 「日本語」（value: `'ja'`）
5. 「简体中文」（value: `'zh-CN'`）
6. 「한국어」（value: `'ko'`）
7. 「自訂...」（value: `'custom'`）

選擇「自訂」時 MUST 顯示文字輸入欄位，讓使用者輸入任意語言名稱。

#### Scenario: 選擇預設語言

- **WHEN** 使用者在下拉選單選擇「繁體中文（台灣）」
- **THEN** `llmLanguage` MUST 被設為 `'zh-TW'`
- **AND** 設定 MUST 立即 patch 到後端

#### Scenario: 選擇「與介面語言相同」

- **WHEN** 使用者選擇「與介面語言相同」
- **THEN** `llmLanguage` MUST 被設為 `null`
- **AND** 實際 locale 值 MUST fallback 到 UI `language` 設定

#### Scenario: 自訂語言輸入

- **WHEN** 使用者選擇「自訂」並輸入「Español」
- **THEN** `llmLanguage` MUST 被設為 `'Español'`
- **AND** 系統提示詞 MUST 使用「Español」作為語言名稱

#### Scenario: 已有自訂值時顯示正確

- **WHEN** 設定中 `llmLanguage` 為 `'Français'`（非預設選項）
- **THEN** 下拉選單 MUST 顯示「自訂...」為選中狀態
- **AND** 文字輸入欄 MUST 顯示「Français」

### Requirement: LLM 語言 Store State

Zustand store MUST 新增 `llmLanguage: string | null` state 和 `setLlmLanguage` setter。

- 預設值 MUST 為 `null`（跟隨 UI 語言）
- `setLlmLanguage` MUST 同時更新 store 和 fire-and-forget PATCH 到 `settingsApi`

#### Scenario: 初始化時載入設定

- **WHEN** 前端啟動並從後端載入 settings
- **AND** settings 包含 `llmLanguage: 'zh-TW'`
- **THEN** store 的 `llmLanguage` MUST 被設為 `'zh-TW'`

#### Scenario: 設定為 null 時 fallback

- **WHEN** `llmLanguage` 為 `null`
- **AND** UI `language` 為 `'en'`
- **THEN** 傳送到後端的 locale MUST 為 `'en'`

### Requirement: Copilot 訊息使用 LLM 語言

`useTabCopilot` hook 在發送 `copilot:send` 訊息時，locale 欄位 MUST 優先使用 `llmLanguage`，若為 `null` 則 fallback 到 UI `language`。

#### Scenario: 優先使用 llmLanguage

- **WHEN** `llmLanguage` 為 `'ja'`
- **AND** UI `language` 為 `'en'`
- **THEN** `copilot:send` 的 locale MUST 為 `'ja'`

#### Scenario: llmLanguage 為 null 時 fallback

- **WHEN** `llmLanguage` 為 `null`
- **AND** UI `language` 為 `'zh-TW'`
- **THEN** `copilot:send` 的 locale MUST 為 `'zh-TW'`

### Requirement: PromptComposer 擴充語言支援

PromptComposer 的 `LOCALE_NAMES` map MUST 擴充支援更多語言代碼。對於不在 map 中的 locale 值，MUST 直接使用該字串作為語言名稱（fallback）。

擴充語言 MUST 至少包含：`es`（Español）、`fr`（Français）、`de`（Deutsch）、`pt`（Português）。

#### Scenario: 已知 locale code

- **WHEN** locale 為 `'ja'`
- **THEN** 語言指令 MUST 使用「日本語」作為語言名稱

#### Scenario: 自訂語言名稱

- **WHEN** locale 為 `'Tiếng Việt'`（不在 LOCALE_NAMES 中）
- **THEN** 語言指令 MUST 直接使用「Tiếng Việt」作為語言名稱
