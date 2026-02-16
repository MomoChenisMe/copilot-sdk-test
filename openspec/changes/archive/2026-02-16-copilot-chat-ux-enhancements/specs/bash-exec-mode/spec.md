## ADDED Requirements

### Requirement: CwdSelector 模式切換 UI
CwdSelector 元件 SHALL 新增 AI/Bash 模式切換按鈕，與目錄路徑顯示並排。

#### Scenario: 預設為 AI 模式
- **WHEN** 新分頁開啟
- **THEN** CwdSelector 預設為 `copilot` 模式，AI 按鈕顯示為啟用狀態

#### Scenario: 切換到 Bash 模式
- **WHEN** 使用者點擊 Bash 模式按鈕
- **THEN** 模式切換為 `terminal`，Bash 按鈕顯示為啟用狀態
- **AND** 輸入框的 placeholder 變更為終端命令提示（如 `$ enter command...`）

#### Scenario: 模式狀態為 per-tab
- **WHEN** 使用者在 Tab A 切換為 Bash 模式後切換到 Tab B
- **THEN** Tab B 維持其自身的模式設定（不受 Tab A 影響）

### Requirement: Per-tab 模式狀態管理
Zustand store 的 TabState SHALL 包含 `mode: 'copilot' | 'terminal'` 欄位。

#### Scenario: openTab 預設模式
- **WHEN** `openTab()` 被呼叫建立新分頁
- **THEN** 新分頁的 `mode` MUST 預設為 `'copilot'`

#### Scenario: setTabMode 更新模式
- **WHEN** `setTabMode(tabId, 'terminal')` 被呼叫
- **THEN** 對應分頁的 `mode` 更新為 `'terminal'`

### Requirement: 後端 Bash 執行 WebSocket handler
系統 SHALL 提供 `bash:exec` WebSocket 事件 handler，在指定 cwd 下執行 shell 命令並串流輸出。

#### Scenario: 正常命令執行
- **WHEN** 前端發送 `bash:exec { command: "ls -la", cwd: "/home" }`
- **THEN** 後端 SHALL 使用 `child_process.spawn('bash', ['-c', 'ls -la'], { cwd: '/home' })` 執行
- **AND** stdout 輸出透過 `bash:output { output, stream: 'stdout' }` 即時串流回前端
- **AND** 執行完成時發送 `bash:done { exitCode: 0 }`

#### Scenario: 命令執行失敗（非零 exit code）
- **WHEN** 執行的命令回傳非零 exit code
- **THEN** stderr 輸出透過 `bash:output { output, stream: 'stderr' }` 串流
- **AND** `bash:done { exitCode }` 回傳實際 exit code

#### Scenario: 命令逾時
- **WHEN** 命令執行超過 30 秒
- **THEN** 後端 SHALL kill 子程序
- **AND** 發送 `bash:error { message: 'Command timed out' }`

#### Scenario: CWD 不存在
- **WHEN** 指定的 cwd 路徑不存在
- **THEN** 後端 SHALL 發送 `bash:error { message: 'Directory not found: /invalid/path' }`

### Requirement: 前端 Bash 模式 Input 行為
在 `terminal` 模式下，Input 元件 SHALL 改變行為以適應 shell 命令輸入。

#### Scenario: Terminal 模式送出命令
- **WHEN** 模式為 `terminal` 且使用者按 Enter
- **THEN** 系統 SHALL 發送 `bash:exec` WebSocket 事件（非 `copilot:send`）
- **AND** 輸入框文字以 `$ command` 格式添加至 tab messages

#### Scenario: Terminal 模式停用 slash menu
- **WHEN** 模式為 `terminal` 且使用者輸入 `/`
- **THEN** slash command menu SHALL NOT 出現

#### Scenario: Terminal 模式停用附件
- **WHEN** 模式為 `terminal`
- **THEN** 附件按鈕（迴紋針圖示）SHALL NOT 顯示

### Requirement: Terminal 輸出渲染
系統 SHALL 以終端格式渲染 Bash 命令的輸出。

#### Scenario: stdout 輸出渲染
- **WHEN** 收到 `bash:output { stream: 'stdout' }` 事件
- **THEN** 輸出 MUST 以 monospace 字體、pre-formatted 格式顯示

#### Scenario: stderr 輸出渲染
- **WHEN** 收到 `bash:output { stream: 'stderr' }` 事件
- **THEN** 輸出 MUST 以紅色（error 色）monospace 字體顯示

#### Scenario: 非零 exit code 指示
- **WHEN** 收到 `bash:done { exitCode }` 且 exitCode !== 0
- **THEN** 系統 SHALL 顯示 exit code 資訊，使用 error 色標記
