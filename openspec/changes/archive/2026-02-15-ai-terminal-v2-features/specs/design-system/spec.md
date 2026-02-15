## MODIFIED Requirements

### Requirement: 系統字體設定

系統 SHALL 使用 Noto Sans TC 作為主要字體，取代原有的系統預設字體。Noto Sans TC MUST 透過 Google Fonts CDN 載入，確保繁體中文字元的渲染品質一致。Monospace 字體（用於程式碼區塊）MUST 維持不變。

#### Scenario: 字體載入宣告

- **WHEN** 應用程式的 `index.html` 載入
- **THEN** `<head>` 區域 MUST 包含 Google Fonts preconnect 和字體 link 標籤，載入 Noto Sans TC 的 400（regular）、500（medium）、700（bold）三種字重，並設定 `font-display: swap` 避免 FOIT

#### Scenario: Tailwind CSS 字體變數設定

- **WHEN** Tailwind CSS v4 的 `@theme` directive 初始化
- **THEN** `--font-sans` CSS custom property MUST 設定為 `'Noto Sans TC', 'Noto Sans', system-ui, -apple-system, 'Segoe UI', sans-serif` 字體堆疊

#### Scenario: body 字體套用

- **WHEN** 應用程式渲染
- **THEN** `body` 元素 MUST 使用 `font-family: var(--font-sans)` 套用 Noto Sans TC 字體堆疊，確保所有 UI 文字使用統一字體

#### Scenario: 程式碼區塊字體不受影響

- **WHEN** Markdown 渲染的程式碼區塊（code block）或 inline code 顯示
- **THEN** 程式碼文字 MUST 繼續使用 monospace 字體堆疊（`'JetBrains Mono', 'Fira Code', ui-monospace, monospace`），MUST NOT 被 Noto Sans TC 覆蓋

#### Scenario: Google Fonts CDN 不可用（fallback）

- **WHEN** Google Fonts CDN 無法連線或載入失敗
- **THEN** 系統 MUST 自動 fallback 到字體堆疊中的後續字體（Noto Sans → system-ui → -apple-system → Segoe UI → sans-serif），UI MUST 正常運作，僅視覺品質稍有降級

## ADDED Requirements

### Requirement: Google Fonts 預連線與載入

系統 SHALL 在 `index.html` 中配置 Google Fonts 的預連線（preconnect）和字體樣式表載入，以最佳化字體載入效能。

#### Scenario: preconnect 標籤設定

- **WHEN** `index.html` 的 `<head>` 渲染
- **THEN** MUST 包含兩個 preconnect link 標籤：`<link rel="preconnect" href="https://fonts.googleapis.com">` 和 `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`

#### Scenario: 字體樣式表 link 標籤

- **WHEN** `index.html` 的 `<head>` 渲染
- **THEN** MUST 包含 Google Fonts stylesheet link 標籤，URL 指向 Noto Sans TC 的 400、500、700 字重，格式為 `<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">`

#### Scenario: 字體載入不阻塞渲染

- **WHEN** 頁面首次載入且字體尚未下載完成
- **THEN** 瀏覽器 MUST 使用 fallback 字體先行渲染（`font-display: swap`），Noto Sans TC 載入完成後再替換，MUST NOT 出現空白文字（FOIT）

### Requirement: Tailwind --font-sans CSS 變數

系統 SHALL 在 Tailwind CSS v4 的 `@theme` 配置中設定 `--font-sans` 變數為 Noto Sans TC 字體堆疊，確保所有使用 `font-sans` utility 的元素套用正確字體。

#### Scenario: @theme 中定義 --font-sans

- **WHEN** `globals.css` 的 `@theme` directive 生效
- **THEN** `--font-sans` MUST 被定義為 `'Noto Sans TC', 'Noto Sans', system-ui, -apple-system, 'Segoe UI', sans-serif`

#### Scenario: Tailwind font-sans utility 生效

- **WHEN** 元件使用 `font-sans` Tailwind class
- **THEN** 該元素的 `font-family` MUST 解析為 Noto Sans TC 字體堆疊

#### Scenario: --font-mono 不受影響

- **WHEN** `globals.css` 的 `@theme` directive 生效
- **THEN** `--font-mono` MUST 維持原有的 monospace 字體堆疊定義，MUST NOT 被修改
