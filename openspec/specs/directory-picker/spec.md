## ADDED Requirements

### Requirement: Directory listing API

Backend SHALL 提供 `GET /api/directories?path=...` endpoint，回傳 `currentPath`、`parentPath`（root 時為 null）、以及按字母排序的 `{name, path}` entries array。

#### Scenario: 正常查詢目錄列表

- WHEN frontend 發送 `GET /api/directories?path=/Users/example/projects`
- THEN backend SHALL 回傳 JSON response，包含：
  - `currentPath`：目前查詢的路徑（`"/Users/example/projects"`）
  - `parentPath`：上一層目錄路徑（`"/Users/example"`）
  - `entries`：該目錄下所有子目錄的 `{name, path}` array，按字母排序

#### Scenario: 查詢 root 目錄

- WHEN frontend 發送 `GET /api/directories?path=/`
- THEN `parentPath` SHALL 為 `null`
- AND `entries` SHALL 列出 root 目錄下的所有子目錄

#### Scenario: Entries 按字母排序

- WHEN backend 回傳目錄列表
- THEN `entries` array SHALL 按 `name` 字母順序排列（case-insensitive）

---

### Requirement: Security

API SHALL 以 `path.resolve()` 驗證路徑、拒絕 null bytes、並要求 authentication。

#### Scenario: Path traversal 攻擊防護

- WHEN request 包含相對路徑（如 `../../etc/passwd`）
- THEN backend SHALL 使用 `path.resolve()` 正規化路徑
- AND 確保最終路徑在允許的範圍內

#### Scenario: Null byte injection 防護

- WHEN request path 包含 null byte（`\0`）
- THEN backend SHALL 拒絕該請求
- AND 回傳適當的 error response（400 Bad Request）

#### Scenario: 未認證請求被拒絕

- WHEN request 未包含有效的 authentication
- THEN backend SHALL 拒絕該請求
- AND 回傳 401 Unauthorized response

#### Scenario: 不存在的路徑處理

- WHEN request 查詢一個不存在的目錄路徑
- THEN backend SHALL 回傳適當的 error response（404 Not Found）

---

### Requirement: Popover UI

點擊 CWD button SHALL 開啟一個 popover，包含 search input、parent directory entry、以及 directory list。

#### Scenario: 開啟 directory picker popover

- WHEN 使用者點擊 CWD button
- THEN SHALL 開啟一個 popover
- AND popover 頂部 SHALL 包含 search input 欄位
- AND popover SHALL 顯示 parent directory entry（".."）
- AND popover SHALL 顯示目前目錄下的 directory list

#### Scenario: 關閉 popover

- WHEN popover 已開啟
- AND 使用者點擊 popover 外部區域
- THEN popover SHALL 關閉

---

### Requirement: Search filtering

Popover SHALL 在使用者輸入 search 文字時即時過濾 directory 列表。

#### Scenario: 即時搜尋過濾

- WHEN popover 已開啟
- AND 使用者在 search input 中輸入文字
- THEN directory list SHALL 即時過濾，僅顯示名稱包含搜尋文字的目錄
- AND 過濾 SHALL 為 case-insensitive

#### Scenario: 搜尋無結果

- WHEN 使用者輸入的搜尋文字不匹配任何目錄
- THEN directory list SHALL 顯示空狀態
- AND 可顯示 "No matching directories" 提示

#### Scenario: 清除搜尋恢復完整列表

- WHEN 使用者清除 search input 中的文字
- THEN directory list SHALL 恢復顯示所有目錄

---

### Requirement: Keyboard navigation

Popover SHALL 支援 ArrowUp/Down 進行列表導覽、Enter 選取/進入、Escape 關閉、Backspace 在搜尋為空時返回上層。

#### Scenario: Arrow keys 導覽列表

- WHEN popover 已開啟
- AND 使用者按下 ArrowDown
- THEN 焦點 SHALL 移至列表中的下一個 directory entry
- WHEN 使用者按下 ArrowUp
- THEN 焦點 SHALL 移至列表中的上一個 directory entry

#### Scenario: Enter 選取目錄

- WHEN 列表中有一個 directory entry 被 highlight
- AND 使用者按下 Enter
- THEN SHALL 進入該目錄（顯示其子目錄列表）

#### Scenario: Escape 關閉 popover

- WHEN popover 已開啟
- AND 使用者按下 Escape
- THEN popover SHALL 關閉

#### Scenario: Backspace 返回上層目錄

- WHEN search input 為空
- AND 使用者按下 Backspace
- THEN SHALL 導覽至 parent directory
- AND directory list SHALL 更新為 parent directory 的內容

---

### Requirement: CWD update

選取一個目錄 SHALL 更新 conversation 的 CWD 並關閉 popover。

#### Scenario: 選取目錄更新 CWD

- WHEN 使用者在 directory list 中選取一個目錄（點擊或 Enter）
- AND 該目錄被選定為新的 working directory
- THEN conversation 的 CWD SHALL 更新為所選目錄的 path
- AND popover SHALL 關閉
- AND CWD button 上顯示的路徑 SHALL 更新為新路徑

#### Scenario: CWD 更新反映至後續操作

- WHEN CWD 被更新
- THEN 後續的 copilot 操作 SHALL 使用新的 CWD 作為 working directory

---

### Requirement: Parent navigation

".." entry SHALL 導覽至 parent directory。

#### Scenario: 點擊 ".." 返回上層

- WHEN popover 顯示目前目錄列表
- AND 使用者點擊 ".." entry
- THEN popover SHALL 導覽至 parent directory
- AND directory list SHALL 更新為 parent directory 的子目錄

#### Scenario: Root 目錄無 parent navigation

- WHEN 目前目錄為 root（`/`）
- THEN ".." entry SHALL 不顯示或被 disabled
- AND `parentPath` 為 `null`

---

### Requirement: Loading state

Popover SHALL 在 fetching directories 時顯示 loading indicator。

#### Scenario: Fetching 時顯示 loading

- WHEN popover 開啟並開始載入目錄列表
- THEN popover SHALL 顯示 loading indicator（如 spinner 或 skeleton）
- AND directory list 區域暫時不顯示內容

#### Scenario: Loading 完成後顯示列表

- WHEN 目錄列表 fetch 完成
- THEN loading indicator SHALL 消失
- AND directory list SHALL 顯示完整的目錄列表

#### Scenario: Fetch 失敗時顯示 error

- WHEN 目錄列表 fetch 失敗
- THEN loading indicator SHALL 消失
- AND popover SHALL 顯示 error message

---

### Requirement: Hidden directories

API SHALL 在 response 中包含 hidden directories（以 `.` 開頭的目錄）。

#### Scenario: 回傳 hidden directories

- WHEN backend 讀取目錄內容
- THEN response 的 `entries` array SHALL 包含以 `.` 開頭的 hidden directories（如 `.git`、`.config`）
- AND hidden directories 與一般目錄一起按字母排序

#### Scenario: Hidden directories 可被搜尋

- WHEN 使用者在 search input 中輸入 "."
- THEN 過濾結果 SHALL 包含所有以 `.` 開頭的 hidden directories
