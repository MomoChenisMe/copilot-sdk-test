## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: 目錄 API 支援回傳檔案清單

`GET /api/directories` 端點 SHALL 支援 `includeFiles` query parameter，啟用時在回應中額外回傳目錄下的檔案清單。

#### Scenario: includeFiles=true 回傳檔案

- **WHEN** 呼叫 `GET /api/directories?path=/some/dir&includeFiles=true`
- **THEN** 回應 MUST 包含 `files` 陣列
- **AND** 每個 file entry MUST 包含 `name`（檔名）、`path`（絕對路徑）、`size`（bytes）
- **AND** 原有的 `directories` 陣列行為 MUST 不變

#### Scenario: 預設不回傳檔案（向下相容）

- **WHEN** 呼叫 `GET /api/directories?path=/some/dir`（不帶 `includeFiles`）
- **THEN** 回應 MUST NOT 包含 `files` 欄位
- **AND** 行為 MUST 與修改前完全一致

#### Scenario: 過濾二進位檔案

- **WHEN** `includeFiles=true` 且目錄下存在二進位副檔名的檔案（如 `.png`, `.jpg`, `.gif`, `.mp4`, `.zip`, `.tar`, `.gz`, `.exe`, `.bin`, `.woff`, `.ttf`, `.ico`, `.so`, `.dylib`）
- **THEN** 回應的 `files` 陣列 MUST NOT 包含這些二進位檔案

#### Scenario: 過濾超大檔案

- **WHEN** `includeFiles=true` 且目錄下存在大小超過 1MB 的檔案
- **THEN** 回應的 `files` 陣列 MUST NOT 包含這些超大檔案

#### Scenario: showHidden 影響檔案

- **WHEN** `includeFiles=true` 且 `showHidden=false`
- **THEN** 以 `.` 開頭的隱藏檔案 MUST NOT 出現在 `files` 陣列中

#### Scenario: 檔案按名稱排序

- **WHEN** `includeFiles=true` 回傳檔案清單
- **THEN** `files` 陣列 MUST 按 `name` 字母升序排列
