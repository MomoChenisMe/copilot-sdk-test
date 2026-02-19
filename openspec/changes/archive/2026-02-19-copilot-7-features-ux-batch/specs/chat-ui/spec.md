## MODIFIED Requirements

### Requirement: Tab 切換訊息載入

切換 tab 時 SHALL 正確顯示該 tab 的訊息，不顯示 stale 內容。

#### Scenario: 訊息尚未載入

- WHEN 切換到一個 messagesLoaded === false 的 tab
- THEN 系統 SHALL 顯示 loading 指示而非空白歡迎訊息

#### Scenario: Race condition 防護

- WHEN 使用者快速連續切換 tabs
- THEN 系統 SHALL 確保只有 active tab 的 API 結果被套用

#### Scenario: Draft tab 顯示

- WHEN 切換到 draft tab（conversationId === null）
- THEN 系統 SHALL 顯示空白歡迎訊息（不觸發 loading）

#### Scenario: 歡迎頁面顯示最近對話

- WHEN 歡迎頁面渲染（draft tab）
- THEN 系統 SHALL 在「開始新對話」按鈕下方顯示最近對話區段
- AND 區段 MUST 顯示最近 10 筆對話，每筆含標題、model badge、相對時間戳
- AND 點擊項目 MUST 呼叫 `openTab(conversationId, title)` 開啟對話
- AND 若無對話歷史，則 MUST NOT 顯示此區段

---

### Requirement: Markdown 標題渲染

Assistant 訊息中的 Markdown 標題 SHALL 正確渲染不同層級的樣式。

#### Scenario: H1 標題

- WHEN assistant 回覆包含 `# Title`
- THEN 標題 SHALL 以 text-2xl font-bold 樣式渲染

#### Scenario: H2 標題

- WHEN assistant 回覆包含 `## Subtitle`
- THEN 標題 SHALL 以 text-xl font-semibold 樣式渲染

#### Scenario: H3 標題

- WHEN assistant 回覆包含 `### Section`
- THEN 標題 SHALL 以 text-lg font-semibold 樣式渲染

#### Scenario: 其他 Markdown 元素

- WHEN assistant 回覆包含 tables、blockquotes、lists、links
- THEN 這些元素 SHALL 正確渲染對應樣式

---

### Requirement: UserInputDialog Skip 與 Timeout 狀態

UserInputDialog SHALL 支援 Skip 按鈕和 Timeout 超時狀態顯示。

#### Scenario: Skip 按鈕

- WHEN UserInputDialog 開啟且 request 尚未超時
- THEN dialog MUST 顯示 Skip 按鈕
- AND 點擊 Skip MUST 發送 freeform answer 並關閉 dialog

#### Scenario: Timeout 狀態

- WHEN user input request 超時（收到 `copilot:user_input_timeout`）
- THEN dialog MUST 顯示黃色 warning banner
- AND banner MUST 包含超時訊息和 dismiss 按鈕
- AND choice buttons 和輸入欄位 MUST 被隱藏

#### Scenario: Dismiss timeout

- WHEN 使用者點擊超時 banner 的 dismiss 按鈕
- THEN dialog MUST 關閉
- AND frontend MUST 清除對應 tab 的 userInputRequest 狀態
