## ADDED Requirements

### Requirement: GitHub CLI 狀態檢查 API

Backend SHALL 提供 `GET /api/github/status` endpoint，檢查 `gh` CLI 是否已安裝且已認證。

#### Scenario: gh CLI 已安裝且已認證

- **WHEN** frontend 發送 `GET /api/github/status`
- **AND** 系統已安裝 `gh` CLI 且已通過 `gh auth status` 認證
- **THEN** backend MUST 回傳 `{ available: true, username: "<github-username>" }`，HTTP status 200

#### Scenario: gh CLI 未安裝

- **WHEN** frontend 發送 `GET /api/github/status`
- **AND** 系統未安裝 `gh` CLI（`which gh` 失敗）
- **THEN** backend MUST 回傳 `{ available: false, reason: "gh_not_installed" }`，HTTP status 200

#### Scenario: gh CLI 未認證

- **WHEN** frontend 發送 `GET /api/github/status`
- **AND** `gh` CLI 已安裝但未認證
- **THEN** backend MUST 回傳 `{ available: false, reason: "gh_not_authenticated" }`，HTTP status 200

### Requirement: GitHub 倉庫列表 API

Backend SHALL 提供 `GET /api/github/repos` endpoint，透過 `gh` CLI 列出使用者的 GitHub 倉庫。

#### Scenario: 成功列出倉庫

- **WHEN** frontend 發送 `GET /api/github/repos`
- **AND** `gh` CLI 可用且已認證
- **THEN** backend MUST 執行 `gh repo list --json name,nameWithOwner,description,isPrivate,url --limit 50`
- **AND** 回傳 `{ repos: Array<{ name: string, nameWithOwner: string, description: string, isPrivate: boolean, url: string }> }`，HTTP status 200

#### Scenario: 支援搜尋過濾

- **WHEN** frontend 發送 `GET /api/github/repos?search=<keyword>`
- **THEN** backend MUST 將 search 參數傳遞給 `gh repo list` 的篩選邏輯
- **AND** 僅回傳名稱匹配的倉庫

#### Scenario: gh CLI 不可用時回傳錯誤

- **WHEN** frontend 發送 `GET /api/github/repos`
- **AND** `gh` CLI 不可用
- **THEN** backend MUST 回傳 `{ error: "gh_not_available" }`，HTTP status 503

### Requirement: GitHub 倉庫 Clone API

Backend SHALL 提供 `POST /api/github/clone` endpoint，clone 指定的 GitHub 倉庫到本地目錄。

#### Scenario: Clone 新倉庫

- **WHEN** frontend 發送 `POST /api/github/clone` 帶有 `{ nameWithOwner: "owner/repo" }`
- **AND** 本地不存在對應目錄
- **THEN** backend MUST 執行 `gh repo clone <nameWithOwner> ~/Projects/<owner>/<repo> -- --depth 1`
- **AND** 回傳 `{ path: "/home/user/Projects/owner/repo", alreadyExists: false }`，HTTP status 200

#### Scenario: 倉庫已存在於本地

- **WHEN** frontend 發送 `POST /api/github/clone` 帶有 `{ nameWithOwner: "owner/repo" }`
- **AND** `~/Projects/<owner>/<repo>` 目錄已存在
- **THEN** backend MUST 跳過 clone 操作
- **AND** 回傳 `{ path: "/home/user/Projects/owner/repo", alreadyExists: true }`，HTTP status 200

#### Scenario: Clone 失敗

- **WHEN** clone 操作因網路或權限問題失敗
- **THEN** backend MUST 回傳 `{ error: string }`，HTTP status 500
- **AND** 清理可能部分建立的目錄

#### Scenario: Clone 超時

- **WHEN** clone 操作超過 60 秒未完成
- **THEN** backend MUST 終止 child process
- **AND** 回傳 `{ error: "clone_timeout" }`，HTTP status 504

#### Scenario: nameWithOwner 格式驗證

- **WHEN** frontend 發送的 `nameWithOwner` 不符合 `owner/repo` 格式
- **THEN** backend MUST 回傳 `{ error: "invalid_repo_name" }`，HTTP status 400

### Requirement: GitHub 路由安全

GitHub API 路由 SHALL 要求已認證的 session。

#### Scenario: 未認證請求被拒

- **WHEN** 未認證的使用者發送 GitHub API 請求
- **THEN** backend MUST 回傳 HTTP status 401

#### Scenario: Command injection 防護

- **WHEN** `nameWithOwner` 參數包含 shell 特殊字元（如 `; rm -rf /`）
- **THEN** backend MUST 使用 `execFile`（非 `exec`）防止 command injection
- **AND** 驗證 `nameWithOwner` 僅包含 `[a-zA-Z0-9._-/]` 字元

### Requirement: DirectoryPicker GitHub 頁籤

DirectoryPicker SHALL 在本地目錄瀏覽上方新增頁籤切換，支援「Local」和「GitHub」兩個頁籤。

#### Scenario: 頁籤切換顯示

- **WHEN** DirectoryPicker 開啟
- **THEN** 搜尋欄上方 MUST 顯示「Local」和「GitHub」兩個頁籤
- **AND** 預設選中「Local」頁籤，顯示現有的本地目錄瀏覽

#### Scenario: 切換到 GitHub 頁籤

- **WHEN** 使用者點擊「GitHub」頁籤
- **THEN** 目錄列表 MUST 替換為 GitHub 倉庫列表
- **AND** 搜尋欄 placeholder MUST 變為搜尋倉庫的提示文字

#### Scenario: GitHub 頁籤載入倉庫列表

- **WHEN** 使用者切換到 GitHub 頁籤
- **THEN** 系統 MUST 呼叫 `GET /api/github/repos` 載入倉庫列表
- **AND** 載入期間 MUST 顯示 loading 狀態

#### Scenario: GitHub 倉庫搜尋過濾

- **WHEN** 使用者在 GitHub 頁籤的搜尋欄輸入文字
- **THEN** 倉庫列表 MUST 即時過濾，僅顯示名稱包含搜尋文字的倉庫（case-insensitive）

#### Scenario: 選擇倉庫觸發 Clone

- **WHEN** 使用者在 GitHub 頁籤中點擊一個倉庫
- **THEN** 系統 MUST 呼叫 `POST /api/github/clone` 帶有該倉庫的 `nameWithOwner`
- **AND** 顯示 cloning 進度提示
- **AND** clone 完成後 MUST 將回傳的 `path` 設為新的 CWD
- **AND** DirectoryPicker MUST 自動關閉

#### Scenario: 已 clone 的倉庫直接使用

- **WHEN** 使用者點擊一個已存在於本地的倉庫
- **THEN** clone API 回傳 `{ alreadyExists: true, path }`
- **AND** 系統 MUST 直接將 path 設為 CWD，無需等待 clone

#### Scenario: gh CLI 不可用時顯示提示

- **WHEN** 使用者切換到 GitHub 頁籤
- **AND** `GET /api/github/status` 回傳 `{ available: false }`
- **THEN** GitHub 頁籤 MUST 顯示提示訊息，告知使用者需安裝並認證 `gh` CLI
- **AND** MUST NOT 顯示倉庫列表

#### Scenario: 私有倉庫標記

- **WHEN** 倉庫列表包含私有倉庫
- **THEN** 私有倉庫 MUST 顯示 "Private" 標記以區分公開倉庫

#### Scenario: Clone 失敗回饋

- **WHEN** clone 操作失敗
- **THEN** 系統 MUST 顯示錯誤訊息
- **AND** 使用者 MUST 能夠重試或選擇其他倉庫

### Requirement: GitHub 功能 i18n

所有 GitHub 相關 UI 文字 SHALL 使用 `t()` 函式從翻譯檔案取得。

#### Scenario: GitHub 翻譯 key 完整性

- **WHEN** GitHub 頁籤被渲染
- **THEN** 翻譯檔案 MUST 包含 `github.*` 命名空間的所有 key：
  - `github.tab` — GitHub 頁籤標籤
  - `github.localTab` — Local 頁籤標籤
  - `github.loading` — 載入倉庫提示
  - `github.cloning` — Clone 進度提示
  - `github.cloned` — Clone 成功提示
  - `github.alreadyCloned` — 已 clone 提示
  - `github.noRepos` — 無倉庫提示
  - `github.ghNotAvailable` — gh CLI 不可用提示
  - `github.private` — 私有倉庫標記
  - `github.searchRepos` — 搜尋倉庫 placeholder
  - `github.cloneFailed` — Clone 失敗提示
