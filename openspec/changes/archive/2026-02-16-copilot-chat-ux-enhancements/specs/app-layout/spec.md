## REMOVED Requirements

### Requirement: Sidebar 側邊欄對話列表
**Reason**: Sidebar 功能與 ConversationPopover 高度重疊。移除以節省手機畫面空間，ConversationPopover 成為唯一對話切換入口。
**Migration**: 所有對話瀏覽、搜尋、pin/rename/delete 操作透過 TabBar 的 ConversationPopover 完成。語言切換與登出搬至 SettingsPanel General tab。

## MODIFIED Requirements

### Requirement: TopBar 頂部導航列
TopBar SHALL 顯示為固定高度 h-12 的水平導航列。左側不再顯示漢堡選單按鈕。中央顯示當前對話標題（可點擊回首頁）。右側依序顯示：設定齒輪按鈕、主題切換按鈕（太陽/月亮）、連線狀態 badge。

#### Scenario: TopBar 渲染（無漢堡按鈕）
- **WHEN** 應用程式載入
- **THEN** TopBar 左側 SHALL NOT 顯示漢堡選單按鈕
- **AND** 中央顯示對話標題
- **AND** 右側顯示設定、主題切換、連線狀態

#### Scenario: 首頁導航
- **WHEN** 使用者點擊 TopBar 中央的對話標題
- **THEN** 系統 SHALL 導航至首頁（清除 activeConversationId 與 activeTabId）

## ADDED Requirements

### Requirement: SettingsPanel General Tab
SettingsPanel SHALL 新增 `general` tab 作為第一個分頁，包含語言切換和登出功能。

#### Scenario: General tab 顯示
- **WHEN** 使用者開啟設定面板
- **THEN** tab 列表的第一個項目 SHALL 為 「General」（或翻譯後的「一般」）

#### Scenario: 語言切換
- **WHEN** 使用者在 General tab 中點擊語言切換按鈕
- **THEN** 系統 SHALL 在 en 與 zh-TW 間切換
- **AND** UI 立即更新為新語言
- **AND** 選擇保存至 localStorage

#### Scenario: 登出按鈕
- **WHEN** 使用者在 General tab 中點擊登出按鈕
- **THEN** 系統 SHALL 執行登出流程（呼叫 `onLogout` callback）
