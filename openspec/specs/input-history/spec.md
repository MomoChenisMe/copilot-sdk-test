## ADDED Requirements

### Requirement: 聊天輸入歷史 ArrowUp 導航

Input 元件 SHALL 支援 ArrowUp 鍵向上翻閱歷史訊息。
歷史來源為當前對話中使用者已送出的訊息，按時間倒序排列（最新在前）。
MUST 僅在游標位於第一行（或文字為單行）時觸發，避免干擾多行文字編輯。

#### Scenario: 按 ArrowUp 進入歷史

- **WHEN** 使用者在空的輸入框中按 ArrowUp
- **THEN** 顯示最近一則已送出的使用者訊息

#### Scenario: 連續按 ArrowUp 翻閱歷史

- **WHEN** 使用者已在歷史第 1 則，再按 ArrowUp
- **THEN** 顯示第 2 則（更早的）歷史訊息

#### Scenario: 到達最早歷史不再往上

- **WHEN** 使用者已在最早的歷史訊息，再按 ArrowUp
- **THEN** 保持顯示最早的歷史訊息，不做任何變更

#### Scenario: 多行文字時不觸發

- **WHEN** 輸入框有多行文字且游標不在第一行
- **THEN** ArrowUp 執行正常的游標移動，不觸發歷史導航

### Requirement: 聊天輸入歷史 ArrowDown 導航

Input 元件 SHALL 支援 ArrowDown 鍵向下返回較近的歷史或回到當前草稿。

#### Scenario: 從歷史返回草稿

- **WHEN** 使用者在歷史第 1 則按 ArrowDown
- **THEN** 回到先前未完成的草稿文字（進入歷史前的輸入內容）

#### Scenario: 在當前輸入時按 ArrowDown

- **WHEN** 使用者不在歷史模式中按 ArrowDown
- **THEN** 不做任何動作（正常游標行為）

### Requirement: 草稿文字保留

Input 元件 MUST 在使用者進入歷史導航前保存當前未完成的輸入文字（draft）。
當使用者透過 ArrowDown 回到最新位置時，MUST 恢復該草稿。

#### Scenario: 保存並恢復草稿

- **WHEN** 使用者正在輸入 "Hello" 然後按 ArrowUp 進入歷史
- **THEN** "Hello" 被暫存；按 ArrowDown 回到最新時，輸入框恢復為 "Hello"

### Requirement: 送出後重置歷史索引

使用者送出訊息後，歷史索引 MUST 重置為 -1（回到當前位置），草稿 MUST 清空。

#### Scenario: 送出歷史訊息後重置

- **WHEN** 使用者在歷史中選取一則訊息後按 Enter 送出
- **THEN** 歷史索引重置為 -1，輸入框清空

### Requirement: Bash 模式獨立歷史

在 Bash/Terminal 模式下，輸入歷史 MUST 只包含 bash 類型的訊息（metadata.bash === true），與 AI 聊天歷史分開。

#### Scenario: Bash 模式顯示 bash 歷史

- **WHEN** 使用者在 Bash 模式按 ArrowUp
- **THEN** 只顯示先前執行過的 bash 命令，不顯示 AI 聊天訊息
