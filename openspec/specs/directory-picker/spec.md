## ADDED Requirements

### Requirement: 頁籤切換模式

DirectoryPicker SHALL 在搜尋欄上方提供「Local」和「GitHub」兩個頁籤，支援在本地目錄瀏覽和 GitHub 倉庫選擇之間切換。

#### Scenario: 預設顯示 Local 頁籤

- **WHEN** DirectoryPicker 開啟
- **THEN** MUST 預設選中「Local」頁籤
- **AND** 顯示現有的本地目錄瀏覽功能（行為不變）

#### Scenario: 切換到 GitHub 頁籤

- **WHEN** 使用者點擊「GitHub」頁籤
- **THEN** 目錄列表區域 MUST 替換為 GitHub 倉庫列表
- **AND** 搜尋欄 placeholder MUST 變為 `t('github.searchRepos')`
- **AND** parent directory button 和 footer 操作按鈕 MUST 隱藏

#### Scenario: 切換回 Local 頁籤

- **WHEN** 使用者從 GitHub 頁籤切換回 Local 頁籤
- **THEN** MUST 恢復顯示本地目錄瀏覽
- **AND** 搜尋欄 MUST 恢復原本的 placeholder
- **AND** 所有原有功能（parent navigation、keyboard nav）MUST 正常運作

### Requirement: GitHub 倉庫列表顯示

GitHub 頁籤 SHALL 顯示使用者的 GitHub 倉庫列表，支援搜尋過濾和選擇。

#### Scenario: 載入倉庫列表

- **WHEN** 使用者切換到 GitHub 頁籤
- **THEN** 系統 MUST 呼叫 `GET /api/github/repos` 載入倉庫列表
- **AND** 載入期間 MUST 顯示 loading indicator

#### Scenario: 倉庫列表項目顯示

- **WHEN** 倉庫列表載入完成
- **THEN** 每個列表項目 MUST 顯示倉庫名稱（`nameWithOwner` 格式）
- **AND** 私有倉庫 MUST 顯示 Private 標記

#### Scenario: 搜尋過濾倉庫

- **WHEN** 使用者在 GitHub 頁籤的搜尋欄輸入文字
- **THEN** 倉庫列表 MUST 即時過濾，僅顯示 `nameWithOwner` 包含搜尋文字的倉庫（case-insensitive）

#### Scenario: 無倉庫結果

- **WHEN** 搜尋結果為空或使用者沒有任何倉庫
- **THEN** MUST 顯示空狀態訊息 `t('github.noRepos')`

### Requirement: 選擇倉庫並 Clone

使用者在 GitHub 頁籤中選擇倉庫後 SHALL 觸發 clone 操作並將結果路徑設為 CWD。

#### Scenario: 點擊倉庫觸發 clone

- **WHEN** 使用者點擊 GitHub 倉庫列表中的一個項目
- **THEN** 系統 MUST 呼叫 `POST /api/github/clone` 帶有 `{ nameWithOwner }`
- **AND** 列表項目 MUST 顯示 cloning 狀態（如 spinner + "Clone 中..."）

#### Scenario: Clone 成功設為 CWD

- **WHEN** clone API 回傳成功結果（`{ path, alreadyExists }`）
- **THEN** 系統 MUST 以 `path` 呼叫 `onSelect(path)` 設為新 CWD
- **AND** DirectoryPicker MUST 自動關閉

#### Scenario: Clone 失敗顯示錯誤

- **WHEN** clone API 回傳錯誤
- **THEN** 系統 MUST 在該列表項目旁顯示錯誤提示
- **AND** DirectoryPicker MUST NOT 關閉，允許使用者重試或選擇其他倉庫

### Requirement: gh CLI 不可用降級處理

當 `gh` CLI 不可用時，GitHub 頁籤 SHALL 顯示友善提示而非空白或錯誤。

#### Scenario: gh 不可用顯示提示

- **WHEN** 使用者切換到 GitHub 頁籤
- **AND** `GET /api/github/status` 回傳 `{ available: false }`
- **THEN** GitHub 頁籤 MUST 顯示 `t('github.ghNotAvailable')` 提示訊息
- **AND** MUST NOT 顯示倉庫列表或搜尋欄
