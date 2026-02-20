## ADDED Requirements

### Requirement: Skills ZIP 上傳 API

系統 SHALL 提供 `POST /api/skills/upload` 端點，接受 ZIP 檔案上傳以安裝新技能。

#### Scenario: 正常 ZIP 檔案上傳

- **WHEN** 前端發送 `POST /api/skills/upload` 帶有 multipart/form-data 格式的 ZIP 檔案
- **THEN** 後端 MUST 驗證檔案為合法 ZIP 格式
- **AND** 解壓縮至 `data/skills/{skill-name}/` 目錄
- **AND** 解壓後 MUST 驗證目錄中存在 `SKILL.md` 檔案
- **AND** 回傳 HTTP status 201 和 `{ name: string, description: string }`

#### Scenario: 非 ZIP 格式檔案

- **WHEN** 上傳的檔案非 ZIP 格式（magic bytes 不符）
- **THEN** 後端 MUST 回傳 HTTP status 400 和 `{ error: "Invalid file format. Only ZIP files are accepted." }`

#### Scenario: ZIP 不含 SKILL.md

- **WHEN** ZIP 檔案解壓後目錄中不存在 `SKILL.md` 檔案
- **THEN** 後端 MUST 清除已解壓的檔案
- **AND** 回傳 HTTP status 400 和 `{ error: "ZIP must contain a SKILL.md file." }`

#### Scenario: 檔案大小限制

- **WHEN** 上傳的 ZIP 檔案超過 10 MB
- **THEN** 後端 MUST 回傳 HTTP status 413 和 `{ error: "File too large. Maximum size is 10MB." }`

#### Scenario: Path traversal 防護

- **WHEN** ZIP 檔案中包含 `../` 或絕對路徑的檔名條目
- **THEN** 後端 MUST 拒絕該檔案，回傳 HTTP status 400 和 `{ error: "Invalid file paths in ZIP." }`
- **AND** MUST NOT 解壓任何檔案至預期目錄外

### Requirement: Skills URL 安裝 API

系統 SHALL 提供 `POST /api/skills/install-url` 端點，接受 URL 字串以從遠端安裝技能。

#### Scenario: 正常 URL 安裝

- **WHEN** 前端發送 `POST /api/skills/install-url` 帶有 `{ url: string }` body
- **THEN** 後端 MUST 從指定 URL 下載 ZIP 檔案
- **AND** 按照 `POST /api/skills/upload` 相同的驗證與解壓邏輯處理
- **AND** 回傳 HTTP status 201 和 `{ name: string, description: string }`

#### Scenario: URL 格式無效

- **WHEN** 提供的 URL 格式不合法
- **THEN** 後端 MUST 回傳 HTTP status 400 和 `{ error: "Invalid URL format." }`

#### Scenario: 下載逾時

- **WHEN** 從 URL 下載超過 30 秒未完成
- **THEN** 後端 MUST 中斷下載
- **AND** 回傳 HTTP status 408 和 `{ error: "Download timed out." }`

#### Scenario: 下載的內容非 ZIP

- **WHEN** 從 URL 下載的內容非 ZIP 格式
- **THEN** 後端 MUST 回傳 HTTP status 400 和 `{ error: "Downloaded content is not a valid ZIP file." }`

### Requirement: "Create with AI" 技能建立按鈕

Settings 面板的 Skills 分頁 SHALL 提供 "Create with AI" 按鈕，觸發時自動在聊天中執行 `/skill-creator` slash command。

#### Scenario: 按鈕顯示

- **WHEN** Settings 面板的 Skills 分頁顯示
- **THEN** 介面 MUST 在技能列表上方顯示 "Create with AI" 按鈕，使用 Sparkles icon

#### Scenario: 按鈕觸發流程

- **WHEN** 使用者點擊 "Create with AI" 按鈕
- **THEN** 系統 MUST 關閉 Settings 面板
- **AND** 在當前 tab 的聊天輸入框中自動填入 `/skill-creator ` 文字
- **AND** 游標定位在文字末尾，等待使用者輸入技能描述後送出

### Requirement: Drag-drop ZIP 上傳區域

Settings 面板的 Skills 分頁 SHALL 提供 drag-drop 上傳區域，支援拖放 ZIP 檔案安裝技能。

#### Scenario: Drop zone 顯示

- **WHEN** Settings 面板的 Skills 分頁顯示
- **THEN** 介面 MUST 在技能列表下方顯示 drag-drop zone，帶有虛線邊框和提示文字（"Drag and drop ZIP file here"）

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
- **THEN** 介面 MUST 在 drag-drop zone 旁邊（或下方）顯示 URL 輸入欄位，帶有 placeholder 文字（"Paste skill ZIP URL..."）和 "Install" 按鈕

#### Scenario: 提交 URL 安裝

- **WHEN** 使用者在 URL 輸入欄位輸入 URL 並點擊 "Install" 按鈕（或按 Enter）
- **THEN** 系統 MUST 將 URL 發送至 `POST /api/skills/install-url`
- **AND** 安裝期間 "Install" 按鈕 MUST 顯示載入狀態
- **AND** 成功後 MUST 清空輸入欄位、重新載入技能列表、顯示成功 toast

#### Scenario: URL 安裝失敗

- **WHEN** `POST /api/skills/install-url` 回傳錯誤
- **THEN** 系統 MUST 顯示錯誤 toast（包含後端回傳的 error message）
- **AND** URL 輸入欄位 MUST 保留使用者輸入的 URL 不清空
