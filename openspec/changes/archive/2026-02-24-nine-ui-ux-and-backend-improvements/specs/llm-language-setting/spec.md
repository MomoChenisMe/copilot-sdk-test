## MODIFIED Requirements

### Requirement: LLM 語言設定 UI

設定頁面的 General tab MUST 新增「LLM 回應語言」section，包含下拉選單和可選的自訂輸入欄。

下拉選單預設選項 MUST 為：
1. 「與介面語言相同」（value: `''`，預設選項）
2. 「繁體中文（台灣）」（value: `'zh-TW'`）
3. 「English」（value: `'en'`）
4. 「日本語」（value: `'ja'`）
5. 「简体中文」（value: `'zh-CN'`）
6. 「한국어」（value: `'ko'`）
7. 「Español」（value: `'es'`）
8. 「Français」（value: `'fr'`）
9. 「Deutsch」（value: `'de'`）
10. 「Português」（value: `'pt'`）
11. 「自訂...」（value: `'__custom'`）

The custom mode state MUST be tracked independently from the `llmLanguage` store value using a local `customMode` boolean state.

#### Scenario: 選擇預設語言

- **WHEN** 使用者在下拉選單選擇「繁體中文（台灣）」
- **THEN** `llmLanguage` MUST 被設為 `'zh-TW'`
- **AND** `customMode` MUST be set to `false`
- **AND** 設定 MUST 立即 patch 到後端

#### Scenario: 選擇「與介面語言相同」

- **WHEN** 使用者選擇「與介面語言相同」
- **THEN** `llmLanguage` MUST 被設為 `null`
- **AND** `customMode` MUST be set to `false`
- **AND** 實際 locale 值 MUST fallback 到 UI `language` 設定

#### Scenario: 選擇「自訂...」進入自訂模式

- **WHEN** 使用者選擇「自訂...」
- **THEN** `customMode` MUST be set to `true`
- **AND** `llmLanguage` MUST NOT be changed immediately
- **AND** a text input field MUST appear below the dropdown
- **AND** the dropdown MUST display "自訂..." as the selected value (using `customMode` state, not derived from `llmLanguage`)

#### Scenario: 自訂語言輸入

- **WHEN** 使用者在自訂模式的輸入欄中輸入「Bahasa Indonesia」
- **THEN** `llmLanguage` MUST 被設為 `'Bahasa Indonesia'`
- **AND** 系統提示詞 MUST 使用「Bahasa Indonesia」作為語言名稱

#### Scenario: 已有自訂值時顯示正確

- **WHEN** 設定中 `llmLanguage` 為 `'Français'`（不在預設選項中）
- **THEN** `customMode` MUST be initialized to `true` on component mount
- **AND** 下拉選單 MUST 顯示「自訂...」為選中狀態
- **AND** 文字輸入欄 MUST 顯示「Français」

#### Scenario: 已有預定義值時 customMode 為 false

- **WHEN** 設定中 `llmLanguage` 為 `'en'`（在預設選項中）
- **THEN** `customMode` MUST be `false`
- **AND** 下拉選單 MUST 顯示「English」為選中狀態
- **AND** 文字輸入欄 MUST NOT be displayed

#### Scenario: 從自訂模式切回預設語言

- **WHEN** 使用者在自訂模式下從下拉選單選擇一個預設語言（如「English」）
- **THEN** `customMode` MUST be set to `false`
- **AND** `llmLanguage` MUST be set to the selected value (`'en'`)
- **AND** the custom input field MUST disappear
