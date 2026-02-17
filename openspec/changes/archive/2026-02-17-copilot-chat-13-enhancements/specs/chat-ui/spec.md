## ADDED Requirements

### Requirement: Markdown 標題渲染
Assistant 訊息中的 Markdown 標題 SHALL 正確渲染不同層級的樣式。

#### Scenario: H1 標題
- **WHEN** assistant 回覆包含 `# Title`
- **THEN** 標題 SHALL 以 text-2xl font-bold 樣式渲染

#### Scenario: H2 標題
- **WHEN** assistant 回覆包含 `## Subtitle`
- **THEN** 標題 SHALL 以 text-xl font-semibold 樣式渲染

#### Scenario: H3 標題
- **WHEN** assistant 回覆包含 `### Section`
- **THEN** 標題 SHALL 以 text-lg font-semibold 樣式渲染

#### Scenario: 其他 Markdown 元素
- **WHEN** assistant 回覆包含 tables、blockquotes、lists、links
- **THEN** 這些元素 SHALL 正確渲染對應樣式

### Requirement: Tab 切換訊息載入
切換 tab 時 SHALL 正確顯示該 tab 的訊息，不顯示 stale 內容。

#### Scenario: 訊息尚未載入
- **WHEN** 切換到一個 messagesLoaded === false 的 tab
- **THEN** 系統 SHALL 顯示 loading 指示而非空白歡迎訊息

#### Scenario: Race condition 防護
- **WHEN** 使用者快速連續切換 tabs
- **THEN** 系統 SHALL 確保只有 active tab 的 API 結果被套用

#### Scenario: Draft tab 顯示
- **WHEN** 切換到 draft tab（conversationId === null）
- **THEN** 系統 SHALL 顯示空白歡迎訊息（不觸發 loading）
