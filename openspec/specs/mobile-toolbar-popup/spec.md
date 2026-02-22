## ADDED Requirements

### Requirement: MobileToolbarPopup 彈出選單

系統 SHALL 在手機寬度（< md breakpoint）時，將底部工具列（ModelSelector、CwdSelector、PlanActToggle）收進彈出選單。

#### Scenario: 手機版顯示觸發按鈕

- **WHEN** 螢幕寬度 < 768px
- **THEN** 底部工具列 MUST 顯示為一個 SlidersHorizontal icon 觸發按鈕
- **AND** 桌面版的 inline 工具列 MUST 隱藏（`hidden md:flex`）

#### Scenario: 桌面版顯示 inline 工具列

- **WHEN** 螢幕寬度 >= 768px
- **THEN** 工具列 MUST 正常 inline 顯示 ModelSelector + CwdSelector + PlanActToggle
- **AND** MobileToolbarPopup 觸發按鈕 MUST 隱藏

#### Scenario: 點擊觸發按鈕開啟選單

- **WHEN** 使用者點擊 SlidersHorizontal 觸發按鈕
- **THEN** 彈出選單 MUST 在輸入框上方顯示（`absolute bottom-full`）
- **AND** MUST 包含以下項目：
  - ModelSelector（目前模型名稱 + 切換功能）
  - CwdSelector（目前路徑 + AI/Bash 模式切換）
  - PlanActToggle（計畫/執行模式切換）

#### Scenario: 選擇選項後關閉

- **WHEN** 使用者在彈出選單中完成一個操作（如切換模型）
- **THEN** 彈出選單 MUST 自動關閉

#### Scenario: 點擊外部關閉

- **WHEN** 彈出選單開啟
- **AND** 使用者點擊選單外部
- **THEN** 彈出選單 MUST 關閉

#### Scenario: 兩處 toolbar 都適用

- **WHEN** 對話為空（empty state）或有訊息（active state）
- **THEN** 兩處 toolbar row 都 MUST 套用相同的手機/桌面響應式邏輯
