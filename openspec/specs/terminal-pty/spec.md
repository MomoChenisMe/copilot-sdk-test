## ADDED Requirements

### Requirement: PTY Spawn

系統 SHALL 使用 node-pty 建立一個真實的 PTY session，使用系統預設的 shell（bash 或 zsh）。

#### Scenario: 首次建立 PTY

- **WHEN** 使用者切換到 Terminal tab 且無 PTY 在運行
- **THEN** 系統 MUST spawn 新的 PTY process，使用當前工作目錄作為 cwd

#### Scenario: PTY 環境設定

- **WHEN** PTY 被建立
- **THEN** PTY MUST 設定 `TERM=xterm-256color` 環境變數，支援 256 色彩輸出

### Requirement: 雙向資料傳輸

系統 SHALL 在 PTY 和 WebSocket 之間雙向傳輸資料。

#### Scenario: 使用者輸入傳到 PTY

- **WHEN** 前端發送 `terminal:input` WebSocket 訊息
- **THEN** 系統 MUST 將 data 寫入 PTY 的 stdin

#### Scenario: PTY 輸出傳到前端

- **WHEN** PTY 產生輸出（stdout/stderr）
- **THEN** 系統 MUST 即時發送 `terminal:output` WebSocket 訊息到前端

### Requirement: Terminal Resize

系統 SHALL 支援動態調整 PTY 的行列大小。

#### Scenario: 前端視窗大小變動

- **WHEN** 前端發送 `terminal:resize` 訊息包含 `{ cols, rows }`
- **THEN** 系統 MUST 呼叫 PTY 的 resize 方法更新尺寸

### Requirement: PTY 退出與重生

系統 SHALL 在 PTY process 退出後自動重新建立。

#### Scenario: Shell 正常退出

- **WHEN** 使用者在 terminal 中輸入 `exit` 導致 PTY 退出
- **THEN** 系統 MUST 發送 `terminal:exit` 事件到前端，並自動 respawn 新的 PTY

#### Scenario: PTY 異常終止

- **WHEN** PTY process 因錯誤被終止
- **THEN** 系統 MUST 記錄錯誤日誌，發送 `terminal:exit` 事件，並嘗試 respawn

### Requirement: 互動式程式支援

PTY MUST 支援互動式程式（如 vim、htop、top），包含完整的 ANSI escape sequence 處理。

#### Scenario: 執行 vim

- **WHEN** 使用者在 terminal 輸入 `vim test.txt`
- **THEN** vim 的完整 TUI 介面 MUST 正確透過 WebSocket 傳輸到前端 xterm.js 渲染
