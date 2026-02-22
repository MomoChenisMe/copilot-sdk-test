## ADDED Requirements

### Requirement: Web Search Forced Mode 後端支援
WebSocket `copilot:send` handler SHALL 支援 `webSearchForced` payload 欄位，在強制模式下修改 prompt。

#### Scenario: 強制搜尋 prompt 注入
- **WHEN** `copilot:send` handler 收到 `payload.webSearchForced === true`
- **THEN** handler SHALL 在 `finalPrompt` 最前方加入強制搜尋指令：`[IMPORTANT: You MUST use the web_search tool to search the web BEFORE responding to this message. Always perform at least one web search.]\n\n`

#### Scenario: 注入位置在其他 context 之後
- **WHEN** prompt 同時有 bash context 或 contextFiles 的前置內容
- **THEN** 強制搜尋指令 SHALL 在所有 context prepend 完成後、`finalPrompt` 的最前方注入

#### Scenario: 非強制模式不修改
- **WHEN** `payload.webSearchForced` 為 `undefined` 或 `false`
- **THEN** handler SHALL 不修改 `finalPrompt`
