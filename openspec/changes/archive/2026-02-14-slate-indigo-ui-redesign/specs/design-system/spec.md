## ADDED Requirements

### Requirement: Slate Indigo 色彩系統

系統 SHALL 使用 "Slate Indigo" 色彩系統，透過 Tailwind CSS v4 的 `@theme` directive 定義 CSS custom properties，支援 light 和 dark 雙主題。

#### Scenario: Light 主題色彩定義

- **WHEN** 應用程式以 light 主題載入
- **THEN** CSS custom properties MUST 定義以下色彩值：accent 為 `#4F46E5`（indigo-600）、bg-primary 為 `#FFFFFF`、bg-secondary 為 `#F8FAFC`、bg-tertiary 為 `#F1F5F9`、text-primary 為 `#0F172A`、border 為 `#E2E8F0`、code-bg 為 `#1E293B`

#### Scenario: Dark 主題色彩定義

- **WHEN** 應用程式以 dark 主題載入（`html[data-theme="dark"]`）
- **THEN** CSS custom properties MUST 覆寫為：accent 為 `#818CF8`（indigo-400）、bg-primary 為 `#0B0F1A`、bg-secondary 為 `#111827`、bg-tertiary 為 `#1F2937`、text-primary 為 `#F1F5F9`、border 為 `#1F2937`、code-bg 為 `#0B0F1A`

#### Scenario: 語義色彩完整性

- **WHEN** 色彩系統初始化
- **THEN** 系統 MUST 定義以下完整的色彩 token：bg-primary, bg-secondary, bg-tertiary, bg-input, bg-elevated, text-primary, text-secondary, text-muted, text-inverse, accent, accent-hover, accent-soft, accent-muted, success, success-soft, warning, warning-soft, error, error-soft, border, border-subtle, border-focus, user-msg-bg, user-msg-border, code-bg, code-header-bg, code-text, card-bg, card-border

### Requirement: Shadow 變數系統

系統 SHALL 定義統一的 shadow CSS custom properties，light 和 dark 主題使用不同的陰影強度。

#### Scenario: Light 主題陰影

- **WHEN** light 主題生效
- **THEN** 系統 MUST 定義 `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-input` 四個 shadow 變數，使用淺色陰影值

#### Scenario: Dark 主題陰影

- **WHEN** dark 主題生效
- **THEN** 系統 MUST 定義相同四個 shadow 變數，使用更重的暗色陰影值以在深色背景上保持可見度

### Requirement: 語法高亮樣式

系統 SHALL 導入 highlight.js CSS 主題，為程式碼區塊提供語法高亮樣式。

#### Scenario: highlight.js CSS 載入

- **WHEN** 應用程式的 CSS 載入
- **THEN** `globals.css` MUST 導入 `highlight.js/styles/github-dark.css`，確保所有 `.hljs` token class 有對應的色彩定義

#### Scenario: 程式碼區塊高亮顯示

- **WHEN** Markdown 內容包含 fenced code block
- **THEN** 程式碼中的 keyword、string、comment、function 等 token MUST 以不同色彩顯示

### Requirement: 自訂動畫定義

系統 SHALL 在 CSS 中定義自訂動畫 keyframes 供元件使用。

#### Scenario: cursor-blink 動畫

- **WHEN** streaming cursor 需要閃爍效果
- **THEN** 系統 MUST 提供 `cursor-blink` keyframe 動畫，使用 `step-end` timing function，每 1 秒在 opacity 0 和 1 之間切換

### Requirement: 主題切換

系統 SHALL 支援 light/dark 主題即時切換，並持久化使用者偏好。

#### Scenario: 切換主題

- **WHEN** 使用者點擊主題切換按鈕
- **THEN** `html` 元素的 `data-theme` 屬性 MUST 立即更新，所有使用 CSS custom properties 的元件 MUST 即時反映新色彩

#### Scenario: 主題持久化

- **WHEN** 使用者切換主題後重新開啟應用
- **THEN** 系統 MUST 從 localStorage 讀取已儲存的主題偏好並自動套用
