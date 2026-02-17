## ADDED Requirements

### Requirement: Mid-text Slash Command
Slash command 選單 SHALL 可在文字後的任意位置透過 `/` 觸發。

#### Scenario: 文字後觸發
- **WHEN** 使用者輸入 "hello /cl"
- **THEN** slash command 選單 SHALL 出現並過濾顯示匹配 "cl" 的命令

#### Scenario: URL 不觸發
- **WHEN** 使用者輸入 "https://example.com"
- **THEN** slash command 選單 SHALL 不出現（`/` 前面不是空格或行首）

#### Scenario: 選擇命令後插入
- **WHEN** 使用者在 "hello /cl" 狀態選擇 /clear
- **THEN** builtin command SHALL 被觸發，"hello " 保留在輸入框

### Requirement: IME Composition 防護
輸入法組字期間 SHALL 不觸發任何鍵盤快捷行為。

#### Scenario: 組字中按 Enter
- **WHEN** 使用者在 IME 組字中按 Enter
- **THEN** 系統 SHALL 不發送訊息，Enter 僅用於確認 IME 輸入

#### Scenario: 組字中按 Arrow 鍵
- **WHEN** 使用者在 IME 組字中按 ArrowDown/ArrowUp
- **THEN** 系統 SHALL 不操作 slash command menu navigation

#### Scenario: 組字結束後正常操作
- **WHEN** IME 組字完成（isComposing === false）
- **THEN** 後續 Enter SHALL 正常發送訊息
