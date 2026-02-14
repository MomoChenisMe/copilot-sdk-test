## MODIFIED Requirements

### Requirement: Slate Indigo 色彩系統

系統 SHALL 使用 "Slate Indigo" 色彩系統，透過 Tailwind CSS v4 的 `@theme` directive 定義 CSS custom properties，支援 light 和 dark 雙主題。所有自訂 base styles（包含 CSS reset）MUST 包裹於 `@layer base {}` 中，確保 Tailwind utilities（位於 `@layer utilities`）可正確覆蓋。

#### Scenario: Light 主題色彩定義

- **WHEN** 應用程式以 light 主題載入
- **THEN** CSS custom properties MUST 定義以下色彩值：accent 為 `#4F46E5`（indigo-600）、bg-primary 為 `#FFFFFF`、bg-secondary 為 `#F8FAFC`、bg-tertiary 為 `#F1F5F9`、text-primary 為 `#0F172A`、border 為 `#E2E8F0`、code-bg 為 `#1E293B`

#### Scenario: Dark 主題色彩定義

- **WHEN** 應用程式以 dark 主題載入（`html[data-theme="dark"]`）
- **THEN** CSS custom properties MUST 覆寫為：accent 為 `#818CF8`（indigo-400）、bg-primary 為 `#0B0F1A`、bg-secondary 為 `#111827`、bg-tertiary 為 `#1F2937`、text-primary 為 `#F1F5F9`、border 為 `#1F2937`、code-bg 為 `#0B0F1A`

#### Scenario: 語義色彩完整性

- **WHEN** 色彩系統初始化
- **THEN** 系統 MUST 定義以下完整的色彩 token：bg-primary, bg-secondary, bg-tertiary, bg-input, bg-elevated, text-primary, text-secondary, text-muted, text-inverse, accent, accent-hover, accent-soft, accent-muted, success, success-soft, warning, warning-soft, error, error-soft, border, border-subtle, border-focus, user-msg-bg, user-msg-border, code-bg, code-header-bg, code-text, card-bg, card-border

#### Scenario: CSS reset 與 Tailwind cascade layer 相容性

- **WHEN** `globals.css` 定義 CSS reset（`box-sizing`、`margin`、`padding`）
- **THEN** reset 規則 MUST 包裹於 `@layer base {}` 中，確保 un-layered CSS 不會覆蓋 Tailwind v4 的 `@layer utilities` 中的 padding/margin utilities

#### Scenario: Base styles 層級正確性

- **WHEN** `globals.css` 定義 `html, body, #root` 和 `body` 的 base styles
- **THEN** 這些規則 MUST 同樣包裹於 `@layer base {}` 中，與 CSS reset 使用相同的 cascade layer
