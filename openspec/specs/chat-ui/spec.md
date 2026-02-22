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

### Requirement: 新 Tab 自動聚焦輸入框

建立新 Tab 或切換 Tab 後，聊天輸入框 SHALL 自動獲得焦點（focus）。

#### Scenario: 新建 Tab 聚焦

- **WHEN** 使用者點擊 Tab bar 的 "+" 按鈕建立新 Tab
- **THEN** 新 Tab 的聊天輸入框 textarea MUST 自動獲得焦點
- **AND** 使用者 MUST 可以直接開始打字，無需手動點擊輸入框

#### Scenario: 切換到已有訊息的 Tab 也聚焦

- **WHEN** 使用者切換到一個已有訊息的既有 Tab
- **THEN** 系統 MUST 自動聚焦輸入框
- **AND** 不影響訊息區域的捲動位置

#### Scenario: 進入系統後自動聚焦

- **WHEN** 使用者首次進入系統或重新載入頁面
- **THEN** 活躍 Tab 的輸入框 MUST 自動獲得焦點

#### Scenario: Input 組件暴露 focus 方法

- **WHEN** Input 組件被 ChatView 引用
- **THEN** Input MUST 透過 `forwardRef` + `useImperativeHandle` 暴露 `focus()` 方法
- **AND** ChatView MUST 在偵測到 tabId 變更時透過 `requestAnimationFrame` 呼叫此方法，確保 DOM 已就緒

#### Scenario: Input 組件支援 statusText

- **WHEN** ChatView 傳入 `statusText` prop 至 Input 組件
- **THEN** Input MUST 在附件按鈕左側渲染該文字
- **AND** 樣式 MUST 為 `text-[10px] text-text-muted tabular-nums`

### Requirement: Code Block Padding 正確渲染

Markdown 中的 fenced code block SHALL 正確顯示內距（padding），程式碼文字不可緊貼容器邊緣。

#### Scenario: Code block 有 padding

- **WHEN** assistant 回覆包含 fenced code block
- **THEN** `<pre>` 元素的 `px-4 py-3` Tailwind utilities MUST 正確套用
- **AND** 程式碼文字左側 MUST 有 16px (1rem) 的內距

#### Scenario: CSS layer 優先權

- **WHEN** `.prose pre` 的 CSS reset 規則與 Tailwind utilities 同時存在
- **THEN** `.prose pre` 規則 MUST 在 `@layer base` 內
- **AND** Tailwind utilities（`@layer utilities`）MUST 能覆蓋 base layer 的 padding reset

#### Scenario: Inline code 不受影響

- **WHEN** assistant 回覆包含 inline code（`code`）
- **THEN** inline code 的 `px-1.5 py-0.5` 樣式 MUST 保持不變
