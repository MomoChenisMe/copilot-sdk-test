## MODIFIED Requirements

### Requirement: Bash 完成 Callback 雙訊息持久化

`onBashComplete` callback SHALL 將 bash 執行結果儲存為兩筆訊息（user command + assistant output），以確保重啟後 BashPrompt 與 BashOutput 元件能正確渲染歷史記錄。

#### Scenario: 正常完成時儲存雙訊息

- **WHEN** bash command 執行完成且 `onBashComplete` callback 被觸發
- **THEN** 系統 MUST 依序儲存兩筆訊息至 conversation repository：
  1. **User 訊息**：`role: 'user'`，`content` 為原始命令文字（不含 `$ ` prefix），`metadata` 包含 `{ bash: true, cwd }`
  2. **Assistant 訊息**：`role: 'assistant'`，`content` 為 accumulated output，`metadata` 包含 `{ exitCode, user, hostname, gitBranch, cwd }`

#### Scenario: 歷史訊息正確還原 BashPrompt

- **WHEN** 前端載入歷史對話且包含 bash assistant 訊息
- **THEN** MessageBlock MUST 偵測 `metadata.exitCode` 為 number 類型
- **AND** 使用 `metadata.user`、`metadata.hostname`、`metadata.gitBranch`、`metadata.cwd` 渲染 BashPrompt 元件
- **AND** 使用 `message.content` 與 `metadata.exitCode` 渲染 BashOutput 元件

#### Scenario: 環境資訊未取得時降級渲染

- **WHEN** assistant bash 訊息的 metadata 中 `user` 或 `hostname` 為空字串
- **THEN** MessageBlock MUST 跳過 BashPrompt 渲染，僅顯示 BashOutput

### Requirement: `onBashComplete` Callback 簽名擴充

`onBashComplete` callback 簽名 SHALL 擴充以包含環境資訊參數 `{ user, hostname, gitBranch }`，供呼叫端將完整環境 metadata 寫入 assistant 訊息。

#### Scenario: Callback 傳遞完整環境資訊

- **WHEN** bash command 正常執行完成（非 timeout/truncation）
- **THEN** `onBashComplete` callback MUST 被呼叫，參數包含 `command`、`output`、`exitCode`、`cwd`
- **AND** `bash:done` 事件 payload MUST 額外包含 `user`（`os.userInfo().username`）、`hostname`（`os.hostname()`）、`gitBranch`（若在 git repo 內）

#### Scenario: Timeout 或 truncation 時 callback 仍觸發

- **WHEN** bash command 因 timeout 或 output 超限被 kill
- **THEN** `onBashComplete` callback MUST 仍被觸發，傳遞已累積的 output 與對應的 exitCode

### Requirement: MessageBlock 使用者 Bash 訊息渲染

MessageBlock 元件 SHALL 偵測 user 訊息的 `metadata.bash` 標記，以終端風格渲染命令文字，不額外添加 `$` prefix（因 content 本身不含 prefix）。

#### Scenario: Bash user 訊息不重複 `$` 符號

- **WHEN** MessageBlock 渲染 `role: 'user'` 且 `metadata.bash === true` 的訊息
- **THEN** 元件 MUST 以 `<pre>` 標籤顯示命令，MUST 僅在前方渲染一個 `$` 符號
- **AND** `message.content` 本身 MUST NOT 以 `$ ` 開頭（因儲存時已移除 prefix）

#### Scenario: 非 bash user 訊息不受影響

- **WHEN** MessageBlock 渲染 `role: 'user'` 且 `metadata.bash` 不存在或為 false
- **THEN** 元件 MUST 以一般使用者氣泡樣式渲染，不顯示 `$` 符號

## ADDED Requirements

### Requirement: 舊格式向後相容

系統 SHALL 向後相容舊版 bash 歷史格式（單一 user 訊息，content 以 `$ ` 開頭），確保升級後歷史記錄不遺失。

#### Scenario: 舊格式 user 訊息偵測

- **WHEN** MessageBlock 渲染 `role: 'user'` 訊息且 `content` 以 `$ ` 開頭、`metadata.bash` 為 true
- **THEN** 元件 MUST 以終端命令風格渲染，移除 content 前方的 `$ ` 再顯示（避免雙重 `$` 符號）

#### Scenario: 舊格式無 assistant 對應訊息

- **WHEN** 歷史對話中存在舊格式的 bash user 訊息（content 包含完整的 `$ command\noutput\n[exit code: N]`）
- **THEN** 系統 MUST 正常渲染該訊息，MUST NOT 因缺少對應的 assistant bash 訊息而拋出錯誤

#### Scenario: 新格式與舊格式混合

- **WHEN** 同一對話中同時存在新格式（雙訊息）與舊格式（單訊息）的 bash 記錄
- **THEN** MessageBlock MUST 兩種格式皆能正確渲染，不產生排版錯誤
