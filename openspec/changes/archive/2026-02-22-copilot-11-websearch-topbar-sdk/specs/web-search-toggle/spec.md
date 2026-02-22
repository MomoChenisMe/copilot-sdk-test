## ADDED Requirements

### Requirement: Web Search 強制搜尋 Toggle 元件
系統 SHALL 提供 `WebSearchToggle` 元件，允許使用者在聊天工具列中切換強制網路搜尋模式。

#### Scenario: Toggle 元件渲染（桌面版）
- **WHEN** Brave API Key 已設定（`webSearchAvailable === true`）且 tab 已建立
- **THEN** 桌面版底部工具列 SHALL 在 Clock 按鈕後方顯示 `WebSearchToggle` 按鈕（`Search` icon）

#### Scenario: Toggle 元件隱藏
- **WHEN** Brave API Key 未設定（`webSearchAvailable === false`）
- **THEN** 工具列 SHALL 不渲染 `WebSearchToggle` 元件

#### Scenario: Toggle 啟用狀態樣式
- **WHEN** `webSearchForced === true`
- **THEN** 按鈕 SHALL 顯示 `border-accent bg-accent-soft text-accent` 高亮樣式

#### Scenario: Toggle 未啟用狀態樣式
- **WHEN** `webSearchForced === false`
- **THEN** 按鈕 SHALL 顯示 `border-border text-text-muted` 預設樣式

#### Scenario: Streaming 時停用
- **WHEN** 對話正在 streaming（`isStreaming === true`）
- **THEN** Toggle 按鈕 SHALL 設為 `disabled`，顯示半透明樣式

### Requirement: Web Search Toggle 手機版整合
MobileToolbarPopup SHALL 包含 Web Search 的 Auto/Always segmented 切換。

#### Scenario: 手機版 Toggle 渲染
- **WHEN** MobileToolbarPopup 開啟且 `webSearchAvailable === true`
- **THEN** SHALL 在 Plan/Act toggle 後方顯示 Web Search 區塊，含「自動」和「始終」兩個選項

#### Scenario: 手機版切換為「始終」
- **WHEN** 使用者點擊「始終」按鈕
- **THEN** 系統 SHALL 設定 `tab.webSearchForced = true`，「始終」按鈕高亮

#### Scenario: 手機版切換為「自動」
- **WHEN** 使用者點擊「自動」按鈕
- **THEN** 系統 SHALL 設定 `tab.webSearchForced = false`，「自動」按鈕高亮

### Requirement: Web Search Forced 狀態管理
Zustand store SHALL 管理 per-tab 的 `webSearchForced` 狀態。

#### Scenario: Tab 初始化
- **WHEN** 新 tab 開啟（`openTab`、`switchTabConversation`、`restoreOpenTabs`）
- **THEN** `webSearchForced` SHALL 初始化為 `false`

#### Scenario: 切換 Tab 保持狀態
- **WHEN** 使用者在多個 tab 間切換
- **THEN** 每個 tab 的 `webSearchForced` 狀態 SHALL 獨立維護

#### Scenario: webSearchAvailable 初始化
- **WHEN** AppShell mount 時
- **THEN** 系統 SHALL 呼叫 `configApi.getBraveApiKey()` 並根據 `hasKey` 設定 `webSearchAvailable` 全域狀態

### Requirement: Web Search Forced Flag 傳遞
前端送出訊息時 SHALL 將 `webSearchForced` flag 透過 WebSocket 傳送至後端。

#### Scenario: 強制模式下送出訊息
- **WHEN** `tab.webSearchForced === true` 且使用者送出訊息
- **THEN** WebSocket `copilot:send` 訊息的 data payload SHALL 包含 `webSearchForced: true`

#### Scenario: 自動模式下送出訊息
- **WHEN** `tab.webSearchForced === false` 且使用者送出訊息
- **THEN** WebSocket payload SHALL 不包含 `webSearchForced` 欄位

### Requirement: 後端強制搜尋 Prompt 注入
後端收到 `webSearchForced: true` 時 SHALL 在 prompt 前方注入強制搜尋指令。

#### Scenario: 注入搜尋指令
- **WHEN** 後端 `copilot:send` handler 接收到 `payload.webSearchForced === true`
- **THEN** SHALL 在 `finalPrompt` 前方加入 `[IMPORTANT: You MUST use the web_search tool to search the web BEFORE responding to this message. Always perform at least one web search.]\n\n`

#### Scenario: 非強制模式不注入
- **WHEN** `payload.webSearchForced` 為 `undefined` 或 `false`
- **THEN** SHALL 不修改 `finalPrompt`

### Requirement: Web Search Toggle i18n
系統 SHALL 提供 Web Search toggle 的多語系翻譯。

#### Scenario: 英文翻譯
- **WHEN** 語系為 `en`
- **THEN** SHALL 顯示 toggleTitle="Force web search", auto="Auto", forced="Always"

#### Scenario: 繁體中文翻譯
- **WHEN** 語系為 `zh-TW`
- **THEN** SHALL 顯示 toggleTitle="強制網路搜尋", auto="自動", forced="始終"
