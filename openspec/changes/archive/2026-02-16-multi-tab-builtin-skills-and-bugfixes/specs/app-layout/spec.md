## MODIFIED Requirements

### Requirement: TabBar

系統 SHALL 將 TabBar 從 Copilot/Terminal 模式切換重寫為對話 Tab 頁籤欄。Terminal 功能暫時移除。

#### Scenario: TabBar 顯示

- **WHEN** 應用程式載入完成
- **THEN** TabBar MUST 顯示在 TopBar 下方，高度 h-10，包含對話 Tab 頁籤和「+」新增按鈕

#### Scenario: Active tab 樣式

- **WHEN** tab 為 active 狀態
- **THEN** tab 按鈕 MUST 使用 `text-accent bg-accent-soft rounded-lg` 樣式

#### Scenario: Inactive tab 樣式

- **WHEN** tab 為 inactive 狀態
- **THEN** tab 按鈕 MUST 使用 `text-text-muted hover:text-text-secondary hover:bg-bg-tertiary` 樣式

#### Scenario: Tab 切換

- **WHEN** 使用者點擊 tab 按鈕
- **THEN** 主內容區 MUST 切換到對應 Tab 的 ChatView，顯示該對話的訊息和串流狀態

## ADDED Requirements

### Requirement: 模型選擇記憶

系統 SHALL 記住使用者最後一次選擇的模型，新對話自動使用該模型。

#### Scenario: 儲存模型選擇

- **WHEN** 使用者在 ModelSelector 中切換模型
- **THEN** 系統 MUST 將模型 ID 寫入 `localStorage('ai-terminal:lastSelectedModel')`，同時更新 Zustand store 的 `lastSelectedModel` 狀態

#### Scenario: 新對話使用記憶模型

- **WHEN** 建立新對話且 `lastSelectedModel` 有值
- **THEN** 系統 MUST 使用 `lastSelectedModel` 作為新對話的預設模型，而非 models 列表的第一個

#### Scenario: 無記憶模型時降級

- **WHEN** 建立新對話且 `lastSelectedModel` 為 null（首次使用或 localStorage 被清除）
- **THEN** 系統 MUST 降級使用 `models[0].id`，若 models 為空則使用 `'gpt-4o'`

#### Scenario: 頁面重載後恢復

- **WHEN** 頁面重載
- **THEN** 系統 MUST 從 `localStorage('ai-terminal:lastSelectedModel')` 讀取並還原到 Zustand store
