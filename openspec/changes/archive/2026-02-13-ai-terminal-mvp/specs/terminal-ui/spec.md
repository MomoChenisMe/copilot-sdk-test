## ADDED Requirements

### Requirement: xterm.js 容器

Terminal 介面 SHALL 使用 xterm.js 渲染完整的終端畫面。

#### Scenario: Terminal 初始化

- **WHEN** 使用者切換到 Terminal tab
- **THEN** 介面 MUST 初始化 xterm.js 實例，使用深色主題配色，並透過 WebSocket 發送 `terminal:spawn` 請求

#### Scenario: 顯示 Terminal 輸出

- **WHEN** 接收到 `terminal:output` WebSocket 訊息
- **THEN** xterm.js MUST 即時寫入資料，正確渲染 ANSI 色彩和游標控制序列

### Requirement: Terminal 輸入傳輸

系統 SHALL 將 xterm.js 的按鍵輸入傳送到後端 PTY。

#### Scenario: 一般字元輸入

- **WHEN** 使用者在 terminal 中輸入字元
- **THEN** 系統 MUST 透過 WebSocket 發送 `terminal:input` 訊息到後端

#### Scenario: 特殊按鍵

- **WHEN** 使用者按下特殊按鍵（Ctrl+C、Tab、方向鍵等）
- **THEN** xterm.js MUST 正確編碼為 ANSI 序列並傳送到後端

### Requirement: Auto-resize

Terminal 介面 SHALL 根據可用空間自動調整行列數。

#### Scenario: 初始大小設定

- **WHEN** Terminal 首次顯示
- **THEN** 系統 MUST 使用 @xterm/addon-fit 計算最佳行列數，並發送 `terminal:resize` 到後端

#### Scenario: 視窗大小變動

- **WHEN** 瀏覽器視窗大小變動（包含手機旋轉螢幕）
- **THEN** 系統 MUST 重新計算行列數，發送 `terminal:resize` 更新後端 PTY

### Requirement: Terminal 退出提示

系統 SHALL 在 PTY 退出時顯示提示。

#### Scenario: 收到退出事件

- **WHEN** 接收到 `terminal:exit` WebSocket 訊息
- **THEN** 介面 MUST 在 terminal 中顯示「Shell exited. Reconnecting...」提示，等待新的 PTY spawn 後自動恢復
