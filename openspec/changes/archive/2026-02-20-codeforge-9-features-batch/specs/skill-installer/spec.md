## ADDED Requirements

### Requirement: ZIP 檔案上傳安裝
系統 SHALL 提供 `POST /api/skills/upload` endpoint，接受 ZIP 檔案並安裝為 user skill。

#### Scenario: 成功上傳安裝
- **WHEN** 前端上傳包含有效 `SKILL.md` 的 ZIP 檔案至 `POST /api/skills/upload`
- **THEN** 系統 SHALL 解壓 ZIP 內容至 skills 目錄，回傳 HTTP 200 `{ skillName, path }`

#### Scenario: SKILL.md 驗證
- **WHEN** 上傳的 ZIP 檔案中不存在 `SKILL.md` 檔案（根目錄或第一層子目錄）
- **THEN** API SHALL 回傳 HTTP 400 `{ error: "SKILL.md not found in archive" }`

#### Scenario: 檔案大小限制
- **WHEN** 上傳的 ZIP 檔案超過 10MB
- **THEN** API SHALL 回傳 HTTP 413 `{ error: "File too large" }`

#### Scenario: 非 ZIP 格式
- **WHEN** 上傳的檔案不是有效的 ZIP 格式
- **THEN** API SHALL 回傳 HTTP 400 `{ error: "Invalid ZIP file" }`

#### Scenario: 同名 Skill 覆蓋
- **WHEN** 安裝的 skill 名稱與現有 user skill 相同
- **THEN** 系統 SHALL 覆蓋現有 skill 目錄內容

#### Scenario: 解壓路徑安全
- **WHEN** ZIP 檔案中包含 path traversal 攻擊路徑（如 `../../etc/passwd`）
- **THEN** 系統 SHALL 拒絕解壓並回傳 HTTP 400 `{ error: "Invalid file path in archive" }`

### Requirement: URL 安裝
系統 SHALL 提供 `POST /api/skills/install-url` endpoint，從 URL 下載並安裝 skill。

#### Scenario: 成功 URL 安裝
- **WHEN** 前端提交 `{ url: "https://example.com/skill.zip" }` 至 `POST /api/skills/install-url`
- **THEN** 系統 SHALL 下載 ZIP 檔案、驗證、解壓至 skills 目錄，回傳 HTTP 200 `{ skillName, path }`

#### Scenario: GitHub Repository URL 處理
- **WHEN** 提交的 URL 為 GitHub repository 格式（如 `https://github.com/user/repo`）
- **THEN** 系統 SHALL 自動轉換為該 repository 的 ZIP 下載 URL（`https://github.com/user/repo/archive/refs/heads/main.zip`），下載並安裝

#### Scenario: GitHub URL 帶分支
- **WHEN** 提交的 URL 包含分支路徑（如 `https://github.com/user/repo/tree/develop`）
- **THEN** 系統 SHALL 使用指定分支的 ZIP 下載 URL

#### Scenario: 下載失敗
- **WHEN** 從 URL 下載檔案時發生網路錯誤或 HTTP 非 200 回應
- **THEN** API SHALL 回傳 HTTP 502 `{ error: "Failed to download from URL" }`

#### Scenario: 下載 Timeout
- **WHEN** 下載超過 30 秒未完成
- **THEN** 系統 SHALL 中斷下載並回傳 HTTP 504 `{ error: "Download timed out" }`

#### Scenario: URL 格式驗證
- **WHEN** 提交的 URL 不是有效的 HTTP/HTTPS URL
- **THEN** API SHALL 回傳 HTTP 400 `{ error: "Invalid URL" }`

### Requirement: AI 輔助建立 Skill
系統 SHALL 提供「Create with AI」功能，透過 builtin skill 引導使用者建立新 skill。

#### Scenario: 觸發 AI 建立
- **WHEN** 使用者點擊 "Create with AI" 按鈕
- **THEN** 前端 SHALL 觸發 `/skill-creator` builtin skill，在聊天中啟動互動式 skill 建立流程

#### Scenario: Builtin Skill 存在
- **WHEN** 系統啟動
- **THEN** 系統 SHALL 註冊 `/skill-creator` builtin skill，具備引導使用者定義 skill 名稱、描述、指令的能力

### Requirement: Skill 安裝 UI
Settings 的 Skills tab SHALL 提供三種安裝方式的 UI 控制項。

#### Scenario: Drag-Drop 上傳區域
- **WHEN** 使用者在 Skills tab 看到安裝區域
- **THEN** 前端 SHALL 顯示 drag-drop 區域，支援拖放 ZIP 檔案或點擊選擇檔案

#### Scenario: Drag-Drop 視覺回饋
- **WHEN** 使用者拖曳檔案進入 drop zone
- **THEN** 前端 SHALL 顯示視覺高亮效果，指示可以放下檔案

#### Scenario: URL 輸入欄位
- **WHEN** 使用者在 Skills tab 看到安裝區域
- **THEN** 前端 SHALL 顯示 URL 輸入欄位和 "Install" 按鈕，支援貼上 URL 安裝

#### Scenario: Create with AI 按鈕
- **WHEN** 使用者在 Skills tab 看到安裝區域
- **THEN** 前端 SHALL 顯示 "Create with AI" 按鈕

#### Scenario: 安裝進度指示
- **WHEN** ZIP 上傳或 URL 安裝進行中
- **THEN** 前端 SHALL 顯示 loading 狀態，禁用安裝按鈕直到完成

#### Scenario: 安裝成功通知
- **WHEN** skill 安裝成功
- **THEN** 前端 SHALL 顯示成功通知，並自動重新載入 skill 列表

#### Scenario: 安裝失敗通知
- **WHEN** skill 安裝失敗（如驗證錯誤、網路錯誤）
- **THEN** 前端 SHALL 顯示錯誤訊息，包含具體的失敗原因
