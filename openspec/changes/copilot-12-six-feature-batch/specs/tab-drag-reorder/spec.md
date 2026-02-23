## ADDED Requirements

### Requirement: 頁籤拖曳排序
TabBar SHALL 支援使用者透過 drag-and-drop 重新排列頁籤順序。

#### Scenario: 拖曳開始
- **WHEN** 使用者按住 tab 並開始拖曳
- **THEN** 被拖曳的 tab MUST 顯示半透明效果（opacity 降低）
- **AND** 其他 tab MUST 成為合法的 drop target

#### Scenario: 拖曳過程視覺指示
- **WHEN** 被拖曳的 tab hover 在另一個 tab 上方
- **THEN** 目標 tab 的左側或右側（取決於游標位置相對中點）MUST 顯示 2px accent 色指示線

#### Scenario: 放下完成排序
- **WHEN** 使用者在目標 tab 上方放下被拖曳的 tab
- **THEN** `tabOrder` 陣列 MUST 更新為新順序
- **AND** 排序結果 MUST 透過 `reorderTabs()` 持久化到 localStorage 和 server

#### Scenario: 拖曳到自身為 no-op
- **WHEN** 使用者將 tab 拖放到自己原本的位置
- **THEN** 系統 MUST 不觸發任何排序更新

#### Scenario: 拖曳結束清理
- **WHEN** 拖曳操作結束（成功 drop 或取消）
- **THEN** 所有視覺指示（透明度、指示線）MUST 立即清除

### Requirement: 拖曳中的互動防護
拖曳進行中 SHALL 禁止可能干擾的其他互動操作。

#### Scenario: 拖曳中禁止點擊選取
- **WHEN** 拖曳正在進行且使用者點擊某個 tab
- **THEN** 系統 MUST 忽略該點擊事件（不切換 active tab）

#### Scenario: 拖曳中禁止關閉 tab
- **WHEN** 拖曳正在進行且使用者點擊 close 按鈕
- **THEN** 系統 MUST 忽略關閉操作

#### Scenario: 拖曳開始時關閉 popover
- **WHEN** ConversationPopover 已開啟且使用者開始拖曳 tab
- **THEN** popover MUST 立即關閉

### Requirement: 頁籤鍵盤排序
系統 SHALL 支援使用鍵盤重新排列 active tab 的位置。

#### Scenario: 向左移動 tab
- **WHEN** 使用者按 Ctrl+Shift+ArrowLeft（或 Cmd+Shift+ArrowLeft）
- **THEN** active tab MUST 與左邊的 tab 交換位置
- **AND** 如果已在最左邊，MUST 不執行任何操作

#### Scenario: 向右移動 tab
- **WHEN** 使用者按 Ctrl+Shift+ArrowRight（或 Cmd+Shift+ArrowRight）
- **THEN** active tab MUST 與右邊的 tab 交換位置
- **AND** 如果已在最右邊，MUST 不執行任何操作
