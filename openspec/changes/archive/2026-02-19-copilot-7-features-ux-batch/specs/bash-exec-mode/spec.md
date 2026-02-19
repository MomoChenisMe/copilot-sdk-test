## MODIFIED Requirements

### Requirement: 環境資訊傳遞

`bash:done` WebSocket 事件 SHALL 包含執行環境資訊。

#### Scenario: 完整環境資訊

- WHEN bash command 執行完成
- THEN `bash:done` 事件 SHALL 包含 user（os.userInfo().username）、hostname（os.hostname()）、gitBranch（如果在 git repo 內）

#### Scenario: 非 git 目錄

- WHEN 執行目錄不在 git repository 內
- THEN gitBranch 欄位 SHALL 為 null 或 undefined

#### Scenario: git 偵測失敗

- WHEN `git rev-parse --abbrev-ref HEAD` 執行失敗
- THEN gitBranch SHALL 為 null，不影響 bash:done 事件發送

---

### Requirement: bash handler onBashComplete callback

`createBashExecHandler` SHALL 接受 optional `onBashComplete` callback 參數，在 bash command 執行完成時呼叫。

#### Scenario: callback 簽名與接受

- WHEN `createBashExecHandler(initialCwd?, onBashComplete?)` 被呼叫
- THEN 第二個參數 SHALL 為 optional callback
- AND callback 簽名 MUST 為 `(command: string, output: string, exitCode: number, cwd: string) => void`

#### Scenario: 執行完成觸發 callback

- WHEN bash command 的 child process 觸發 `close` 事件
- THEN handler MUST 呼叫 `onBashComplete(command, accumulatedOutput, exitCode, finalCwd)`
- AND `accumulatedOutput` MUST 為執行過程中所有 stdout 和 stderr 的累積內容

#### Scenario: stdout/stderr 累積

- WHEN bash command 執行過程中產生 stdout 和 stderr 輸出
- THEN handler MUST 將所有 stdout data event 和 stderr data event 依序累積到 `accumulatedOutput` 字串

#### Scenario: 未提供 callback 時正常運作

- WHEN `createBashExecHandler` 僅提供 `initialCwd` 參數
- THEN handler MUST 正常運作
- AND bash 執行完成時 MUST NOT 因缺少 callback 而拋出錯誤

#### Scenario: 非零 exit code 仍觸發 callback

- WHEN bash command 以非零 exit code 結束
- THEN handler MUST 仍然呼叫 `onBashComplete`
- AND `exitCode` 參數 MUST 反映實際的非零退出碼
