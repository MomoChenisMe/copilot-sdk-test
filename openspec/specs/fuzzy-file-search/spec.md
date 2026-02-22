## ADDED Requirements

### Requirement: 全專案模糊檔案搜尋 API

後端 SHALL 提供 `GET /api/directories/search` endpoint，接受搜尋字串並回傳整個專案中模糊匹配的檔案與目錄列表。

#### Scenario: 基本模糊搜尋

- **WHEN** 前端呼叫 `GET /api/directories/search?root=/home/user/project&q=pack`
- **THEN** 後端 MUST 遞迴搜尋 `/home/user/project` 下所有檔案與目錄
- **AND** 回傳名稱或路徑包含 `pack` 的項目（case-insensitive）
- **AND** 回傳格式 MUST 為 `{ results: Array<{ name, path, relativePath, isDirectory, score }> }`

#### Scenario: 搜尋結果排序

- **WHEN** 搜尋字串為 `index`
- **THEN** 檔名完全匹配 `index` 的項目 MUST 排在最前（score 100）
- **AND** 檔名包含 `index` 的項目 MUST 排在其次（score 80）
- **AND** 僅路徑包含 `index` 的項目 MUST 排在最後（score 60）

#### Scenario: 搜尋結果數量限制

- **WHEN** 呼叫時指定 `limit=20`
- **THEN** 回傳結果 MUST 不超過 20 筆
- **WHEN** 未指定 `limit`
- **THEN** 預設 MUST 為 30 筆

#### Scenario: 忽略特定目錄

- **WHEN** 搜尋執行時
- **THEN** 後端 MUST 忽略以下目錄：`.git`, `node_modules`, `dist`, `build`, `.next`, `__pycache__`, `.cache`, `.DS_Store`
- **AND** MUST 忽略 binary 格式檔案（`.png`, `.jpg`, `.mp4`, `.zip`, `.exe`, `.pdf` 等既有 BINARY_EXTENSIONS 清單）

#### Scenario: 搜尋深度與檔案數量限制

- **WHEN** 專案目錄結構深度超過 8 層
- **THEN** 後端 MUST 在深度 8 層時停止遞迴
- **WHEN** 掃描的檔案數量超過 10000
- **THEN** 後端 MUST 停止掃描並回傳已收集的結果

#### Scenario: root 參數驗證

- **WHEN** `root` 參數指向不存在的目錄
- **THEN** 後端 MUST 回傳 400 錯誤
- **WHEN** `q` 參數為空字串
- **THEN** 後端 MUST 回傳空結果陣列

#### Scenario: 搜尋字串包含目錄分隔符

- **WHEN** 搜尋字串包含 `/`（如 `src/comp`）
- **THEN** 後端 MUST 以完整路徑進行匹配（而非只匹配檔名）

### Requirement: 前端模糊搜尋 API 客戶端

前端 `directoryApi` SHALL 提供 `search()` 方法呼叫模糊搜尋 API。

#### Scenario: 呼叫搜尋 API

- **WHEN** 前端呼叫 `directoryApi.search(root, query, limit)`
- **THEN** MUST 發送 `GET /api/directories/search?root={root}&q={query}&limit={limit}`
- **AND** 回傳 `{ results: SearchResult[] }` 型別資料
