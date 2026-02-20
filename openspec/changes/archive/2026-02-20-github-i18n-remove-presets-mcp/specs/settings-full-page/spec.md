## MODIFIED Requirements

### Requirement: 設定分類結構

Settings SHALL 包含 9 個分類：General、System Prompt、Profile、Agent Rules、Memory、Skills、API Keys、MCP、Cron Jobs。

#### Scenario: 全部 9 個分類渲染

- **WHEN** Settings overlay 開啟
- **THEN** navigation SHALL 顯示以下 9 個分類按鈕（依序）：
  1. General
  2. System Prompt
  3. Profile
  4. Agent Rules
  5. Memory
  6. Skills
  7. API Keys
  8. MCP
  9. Cron Jobs
- **AND** SHALL NOT 包含「Presets」分類

#### Scenario: 預設選中第一個分類

- **WHEN** Settings 首次開啟
- **THEN** "General" 分類 SHALL 為預設 active 狀態
- **AND** 右側顯示 General 的設定內容

## REMOVED Requirements

### Requirement: Presets 分頁（預設模板）

**Reason**: 使用者決定不需要預設模板功能，移除以精簡設定頁面。

**Migration**: 無遷移需求。預設模板功能完整移除，localStorage 中殘留的 `activePresets` 資料會被忽略。
