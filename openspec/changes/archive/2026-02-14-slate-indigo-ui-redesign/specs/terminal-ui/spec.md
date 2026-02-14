## MODIFIED Requirements

### Requirement: xterm.js 容器

Terminal 介面 SHALL 使用 xterm.js 渲染完整的終端畫面，主題色彩 MUST 同步 Slate Indigo 配色。

#### Scenario: Terminal 初始化

- **WHEN** 使用者切換到 Terminal tab
- **THEN** 介面 MUST 初始化 xterm.js 實例，使用 Slate Indigo 主題配色（background: `#0B0F1A`, foreground: `#E2E8F0`, cursor: `#818CF8`），並透過 WebSocket 發送 `terminal:spawn` 請求

#### Scenario: 顯示 Terminal 輸出

- **WHEN** 接收到 `terminal:output` WebSocket 訊息
- **THEN** xterm.js MUST 即時寫入資料，正確渲染 ANSI 色彩和游標控制序列

#### Scenario: xterm 主題配色

- **WHEN** xterm.js 初始化
- **THEN** theme MUST 使用以下值：background `#0B0F1A`、foreground `#E2E8F0`、cursor `#818CF8`（indigo-400）、blue `#6366F1`（indigo-500）、magenta `#818CF8`（indigo-400）、brightBlue `#A5B4FC`（indigo-300）、brightMagenta `#C7D2FE`（indigo-200），其餘 ANSI 色彩使用對應的 Tailwind 色彩值
