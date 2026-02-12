## ADDED Requirements

### Requirement: 訊息處理生命週期
系統 SHALL 按以下順序處理每個文字訊息：檢查 pending 問題 → 發送佔位訊息 → 取得 Session → 呼叫 AI → 格式化回應 → 編輯佔位訊息。

#### Scenario: 正常訊息處理
- **WHEN** 授權用戶發送文字訊息且無 pending 問題
- **THEN** 系統 SHALL：1) 發送「思考中...」佔位訊息 2) 取得或建立 CopilotSession 3) 呼叫 `session.sendAndWait({ prompt: messageText }, 300000)` 4) 格式化 AI 回應 5) 編輯佔位訊息為最終結果

#### Scenario: 有 pending 問題時收到訊息
- **WHEN** 授權用戶發送文字訊息且有 pending 的 user-input 問題
- **THEN** 系統 SHALL 將該訊息作為 pending 問題的答案傳遞，不觸發新的 AI 呼叫

#### Scenario: AI 回應逾時
- **WHEN** `session.sendAndWait()` 在 5 分鐘後仍未完成
- **THEN** 系統 SHALL 編輯佔位訊息為逾時錯誤提示

#### Scenario: AI 回應錯誤
- **WHEN** `session.sendAndWait()` 拋出錯誤
- **THEN** 系統 SHALL 記錄錯誤、編輯佔位訊息為錯誤提示訊息

### Requirement: Markdown 到 Telegram HTML 轉換
系統 SHALL 將 Copilot 的 Markdown 回應轉換為 Telegram 支援的 HTML 子集。

#### Scenario: 粗體文字轉換
- **WHEN** AI 回應包含 `**bold**`
- **THEN** 系統 SHALL 轉換為 `<b>bold</b>`

#### Scenario: 行內程式碼轉換
- **WHEN** AI 回應包含 `` `code` ``
- **THEN** 系統 SHALL 轉換為 `<code>code</code>`

#### Scenario: 程式碼區塊轉換
- **WHEN** AI 回應包含 ` ```lang ... ``` ` 程式碼區塊
- **THEN** 系統 SHALL 轉換為 `<pre><code class="language-lang">...</code></pre>`

#### Scenario: 連結轉換
- **WHEN** AI 回應包含 `[text](url)`
- **THEN** 系統 SHALL 轉換為 `<a href="url">text</a>`

#### Scenario: 特殊字元跳脫
- **WHEN** AI 回應包含 `<`、`>`、`&` 字元
- **THEN** 系統 SHALL 在非 HTML 標籤的位置將這些字元轉換為 `&lt;`、`&gt;`、`&amp;`

### Requirement: 訊息分段發送
系統 SHALL 處理超過 Telegram 4096 字元限制的回應，將其分段發送。

#### Scenario: 回應在限制內
- **WHEN** 格式化後的回應小於等於 4096 字元
- **THEN** 系統 SHALL 編輯佔位訊息為該回應

#### Scenario: 回應超過限制
- **WHEN** 格式化後的回應超過 4096 字元
- **THEN** 系統 SHALL：1) 在段落邊界（`\n\n`）或行邊界（`\n`）處分割 2) 編輯佔位訊息為第一段 3) 以新訊息發送後續各段

#### Scenario: HTML 感知分割
- **WHEN** 需要分割包含 HTML 標籤的回應
- **THEN** 系統 SHALL 確保不在 HTML 標籤中間分割，並在分割點正確關閉和重新開啟標籤

### Requirement: 空回應處理
系統 SHALL 處理 AI 未回傳內容的情況。

#### Scenario: AI 回傳空內容
- **WHEN** `session.sendAndWait()` 回傳的 content 為空或 undefined
- **THEN** 系統 SHALL 編輯佔位訊息為「未收到回應」提示
