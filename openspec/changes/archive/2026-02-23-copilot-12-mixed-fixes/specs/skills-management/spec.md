## MODIFIED Requirements

### Requirement: Drag-drop ZIP 上傳區域

Settings 面板的 Skills 分頁 SHALL 提供 drag-drop 上傳區域，支援拖放 ZIP 檔案安裝技能。

#### Scenario: Drop zone 顯示

- **WHEN** Settings 面板的 Skills 分頁顯示
- **THEN** 介面 MUST 在「使用者技能」區段底部顯示 drag-drop zone，帶有虛線邊框和提示文字
- **AND** drop zone MUST 位於使用者技能列表和 URL 安裝欄位的上方

#### Scenario: 拖放 ZIP 檔案

- **WHEN** 使用者拖放一個 ZIP 檔案至 drop zone
- **THEN** 系統 MUST 將檔案上傳至 `POST /api/skills/upload`
- **AND** 上傳期間 drop zone MUST 顯示載入指示器
- **AND** 成功後 MUST 重新載入技能列表並顯示成功 toast

#### Scenario: 拖放非 ZIP 檔案

- **WHEN** 使用者拖放非 ZIP 檔案至 drop zone
- **THEN** 系統 MUST 顯示錯誤 toast（"Only ZIP files are accepted"）
- **AND** MUST NOT 發送上傳請求

#### Scenario: Drag hover 視覺回饋

- **WHEN** 使用者拖曳檔案懸停在 drop zone 上方
- **THEN** drop zone MUST 顯示 active 狀態（邊框高亮、背景色變化）

### Requirement: URL 輸入安裝欄位

Settings 面板的 Skills 分頁 SHALL 提供 URL 輸入欄位，支援從 URL 安裝技能。

#### Scenario: URL 輸入欄位顯示

- **WHEN** Settings 面板的 Skills 分頁顯示
- **THEN** 介面 MUST 在「使用者技能」區段底部的 drag-drop zone 下方顯示 URL 輸入欄位，帶有 placeholder 文字和 "Install from URL" 按鈕

#### Scenario: 提交 URL 安裝

- **WHEN** 使用者在 URL 輸入欄位輸入 URL 並點擊 "Install" 按鈕（或按 Enter）
- **THEN** 系統 MUST 將 URL 發送至 `POST /api/skills/install-url`
- **AND** 安裝期間 "Install" 按鈕 MUST 顯示載入狀態
- **AND** 成功後 MUST 清空輸入欄位、重新載入技能列表、顯示成功 toast

#### Scenario: URL 安裝失敗

- **WHEN** `POST /api/skills/install-url` 回傳錯誤
- **THEN** 系統 MUST 顯示錯誤 toast（包含後端回傳的 error message）
- **AND** URL 輸入欄位 MUST 保留使用者輸入的 URL 不清空

### Requirement: "Create with AI" 技能建立按鈕

Settings 面板的 Skills 分頁 SHALL 提供 "Create with AI" 按鈕，觸發時自動在聊天中執行 `/skill-creator` slash command。

#### Scenario: 按鈕顯示

- **WHEN** Settings 面板的 Skills 分頁顯示
- **THEN** 介面 MUST 在「使用者技能」區段底部的 URL 安裝欄位下方顯示 "Create with AI" 按鈕，使用 Sparkles icon

#### Scenario: 按鈕觸發流程

- **WHEN** 使用者點擊 "Create with AI" 按鈕
- **THEN** 系統 MUST 關閉 Settings 面板
- **AND** dispatch `skills:ai-create` custom event

## REMOVED Requirements

### Requirement: 手動建立技能表單

**Reason**: 手動填寫 name/description/content 表單的功能與 "Create with AI" 和 ZIP/URL 安裝重疊，使用率低，移除以簡化 UI。

**Migration**: 使用者可透過 "Create with AI" 按鈕由 AI 協助建立技能，或透過 ZIP 上傳 / URL 安裝來新增技能。

### Requirement: 「新增技能」按鈕

**Reason**: 「新增技能」按鈕用於展開/收合手動建立表單，隨表單移除而不再需要。安裝區（ZIP / URL / AI）已直接顯示在使用者技能區底部。

**Migration**: 安裝功能已整合到使用者技能區段底部，無需額外操作。

### Requirement: 空狀態下的「新增技能」按鈕

**Reason**: 空狀態（無技能時）原本顯示「新增技能」按鈕引導使用者，現改為直接顯示安裝區。

**Migration**: 空狀態時直接顯示 install section（ZIP / URL / AI），使用者可立即開始安裝。
