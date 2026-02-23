## ADDED Requirements

### Requirement: CodeForge 品牌 Logo 元件
系統 SHALL 提供 `CodeForgeLogo` React 元件，渲染 CodeForge 品牌 SVG 圖示，用於登入頁和歡迎畫面。

#### Scenario: 元件 API 相容 lucide-react
- **WHEN** `CodeForgeLogo` 被渲染
- **THEN** 元件 MUST 接受 `size: number` 和 `className: string` props
- **AND** 預設 `size` MUST 為 24

#### Scenario: SVG 使用 currentColor
- **WHEN** 元件帶有 `className="text-accent"`
- **THEN** SVG 的 `stroke` 屬性 MUST 為 `currentColor`，繼承 Tailwind 文字色彩

#### Scenario: Dark/Light 主題適應
- **WHEN** 系統切換 dark/light theme
- **THEN** Logo 顏色 MUST 隨 `text-accent` CSS variable 自動變化

#### Scenario: SVG 視覺設計
- **WHEN** Logo 被渲染
- **THEN** SVG MUST 使用 24x24 viewBox、stroke-width 2、round linecap/linejoin
- **AND** 圖案 MUST 包含代碼角括號（`< >`）和鍛造意象（鐵砧/火花）

### Requirement: 登入頁 Logo 替換
登入頁 SHALL 使用 `CodeForgeLogo` 取代 lucide 的 `Terminal` icon。

#### Scenario: 登入頁顯示品牌 Logo
- **WHEN** 使用者開啟登入頁
- **THEN** 頁面頂部 MUST 顯示 `CodeForgeLogo` 元件（size=28, className="text-accent"）
- **AND** MUST 不再顯示 `Terminal` icon

### Requirement: 歡迎畫面 Logo 替換
ChatView 歡迎畫面 SHALL 使用 `CodeForgeLogo` 取代 `Sparkles` icon。

#### Scenario: 歡迎畫面品牌 Logo
- **WHEN** 使用者進入空對話的歡迎畫面
- **THEN** 中央 badge MUST 顯示 `CodeForgeLogo`（size=28, className="text-accent"）
- **AND** 其他位置的 `Sparkles` icon（如 streaming block）MUST 保持不變
