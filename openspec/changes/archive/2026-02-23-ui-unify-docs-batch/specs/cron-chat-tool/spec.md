## MODIFIED Requirements

### Requirement: CronConfigPanel overlay positioning
CronConfigPanel SHALL 以浮動覆蓋面板形式呈現在輸入框上方，使用 absolute 定位。MUST NOT 以 inline 卡片形式顯示在輸入框 sibling 位置。

#### Scenario: 面板浮動於輸入框上方
- **WHEN** 使用者開啟 CronConfigPanel
- **THEN** 面板 MUST 以 absolute 定位浮動在輸入框正上方
- **THEN** 面板 MUST NOT 以 inline 元素佔據文件流空間
- **THEN** 輸入框位置 MUST 保持不變

#### Scenario: 面板關閉後輸入框不受影響
- **WHEN** 使用者關閉 CronConfigPanel
- **THEN** 輸入框 MUST 維持原位不移動

### Requirement: CronConfigPanel visual styling
CronConfigPanel SHALL 使用 `bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] p-6` 容器樣式，與 UserInputDialog 的卡片風格一致。

#### Scenario: 面板外觀風格
- **WHEN** CronConfigPanel 開啟
- **THEN** 容器 MUST 使用 `bg-bg-elevated` 背景
- **THEN** 容器 MUST 有 `border-border` 邊框
- **THEN** 容器 MUST 有 `rounded-xl` 圓角
- **THEN** 容器 MUST 有 `shadow-[var(--shadow-lg)]` 陰影

### Requirement: CronConfigPanel header icon styling
CronConfigPanel 的 header 中 Clock icon SHALL 放在 `p-2 rounded-lg bg-accent/10` 的背景容器中，類似 UserInputDialog 的 question icon 風格。

#### Scenario: Header icon 風格對齊 AskUser
- **WHEN** 使用者查看 CronConfigPanel header
- **THEN** Clock icon MUST 被包裹在圓角背景容器中
- **THEN** 背景容器 MUST 使用 `bg-accent/10` 色彩

### Requirement: ChatView container wrapping
ChatView 中 CronConfigPanel 和 Input 元件 SHALL 包裹在一個 `relative` 定位的容器中，CronConfigPanel 使用 `absolute bottom-full left-0 right-0` 定位。

#### Scenario: 容器結構正確
- **WHEN** CronConfigPanel 與 Input 同時渲染
- **THEN** 兩者 MUST 在同一個 `relative` 父容器中
- **THEN** CronConfigPanel MUST 使用 `absolute` 定位在 Input 上方
