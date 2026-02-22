## ADDED Requirements

### Requirement: TopBar 標題文字溢出防護
TopBar 的標題區域 MUST 正確處理長文字，避免溢出覆蓋右側功能按鈕。

#### Scenario: 長標題在手機版截斷
- **WHEN** 對話標題超過 40 個字元且螢幕寬度為 375px
- **THEN** 標題文字 SHALL 以 ellipsis (`...`) 截斷，不得超出標題 button 的邊界

#### Scenario: 右側按鈕保持可見
- **WHEN** 標題文字極長（例如 100+ 字元）
- **THEN** 右側按鈕容器（設定、主題切換、連線狀態）SHALL 保持完整可見且不被壓縮

#### Scenario: 標題按鈕 overflow-hidden
- **WHEN** 標題 button 使用 `flex-1 min-w-0` 佈局
- **THEN** SHALL 同時加入 `overflow-hidden` class，確保 flex item 可收縮至內容尺寸以下

#### Scenario: 標題 span 使用 block 顯示
- **WHEN** 標題 span 使用 `truncate` class
- **THEN** SHALL 同時加入 `block` class，因為 `truncate` 需要 block-level 元素才能生效

#### Scenario: 右側容器 shrink-0
- **WHEN** TopBar flex 佈局中標題占據 `flex-1`
- **THEN** 右側按鈕容器 SHALL 使用 `shrink-0` 防止被 flex 壓縮
