## ADDED Requirements

### Requirement: OpenSpec SDD 開關狀態管理

系統 SHALL 在 `CONFIG.json` 中管理 `openspecSddEnabled` 布林欄位，透過 REST API 讀寫開關狀態，預設為 `false`。

#### Scenario: 讀取開關狀態 — 未設定時回傳 false

- **WHEN** 前端呼叫 `GET /api/config/openspec-sdd`
- **AND** `CONFIG.json` 中不存在 `openspecSddEnabled` 欄位
- **THEN** API MUST 回傳 `{ enabled: false }`

#### Scenario: 讀取開關狀態 — 已啟用

- **WHEN** 前端呼叫 `GET /api/config/openspec-sdd`
- **AND** `CONFIG.json` 中 `openspecSddEnabled` 為 `true`
- **THEN** API MUST 回傳 `{ enabled: true }`

#### Scenario: 啟用開關

- **WHEN** 前端呼叫 `PUT /api/config/openspec-sdd` 並帶上 `{ enabled: true }`
- **THEN** 系統 MUST 將 `CONFIG.json` 中 `openspecSddEnabled` 設為 `true`
- **AND** API MUST 回傳 `{ ok: true }`

#### Scenario: 停用開關

- **WHEN** 前端呼叫 `PUT /api/config/openspec-sdd` 並帶上 `{ enabled: false }`
- **THEN** 系統 MUST 將 `CONFIG.json` 中 `openspecSddEnabled` 設為 `false`
- **AND** API MUST 回傳 `{ ok: true }`

#### Scenario: 不影響其他 config 欄位

- **WHEN** 前端呼叫 `PUT /api/config/openspec-sdd`
- **THEN** 系統 MUST 保留 `CONFIG.json` 中其他欄位（如 `braveApiKey`）不受影響

#### Scenario: CONFIG.json 不存在時正常運作

- **WHEN** `CONFIG.json` 檔案不存在
- **AND** 前端呼叫 `GET /api/config/openspec-sdd`
- **THEN** API MUST 回傳 `{ enabled: false }`，MUST NOT 拋出錯誤

---

### Requirement: OPENSPEC_SDD.md 預設模板

系統 SHALL 提供 `DEFAULT_OPENSPEC_SDD` 常數作為 `OPENSPEC_SDD.md` 的預設模板內容，內容來源為 OpenSpec SDD 工作流程的完整規則。

#### Scenario: 預設模板包含完整 OpenSpec 工作流程

- **WHEN** `DEFAULT_OPENSPEC_SDD` 常數被引用
- **THEN** 內容 MUST 包含以下 OpenSpec SDD 工作流程區段：
  - Core Philosophy（核心理念）
  - Project Structure（專案結構）
  - Workflow Selection（工作流程選擇）
  - Artifact Generation Strategy（Artifact 產生策略）
  - Change Lifecycle（變更生命週期）
  - Verification Dimensions（驗證維度）
  - Guidance Rules（指引規則）

#### Scenario: 預設模板包含 slash command 參考

- **WHEN** `DEFAULT_OPENSPEC_SDD` 常數被引用
- **THEN** 內容 MUST 提及可用的 OpenSpec 相關 slash commands（如 `/opsx:new`、`/opsx:apply`、`/opsx:verify` 等）

---

### Requirement: OPENSPEC_SDD.md 自動建立

首次啟用開關時，系統 SHALL 自動從預設模板建立 `OPENSPEC_SDD.md` 檔案。

#### Scenario: 首次啟用時自動建立

- **WHEN** 前端呼叫 `PUT /api/config/openspec-sdd` 帶上 `{ enabled: true }`
- **AND** `data/prompts/OPENSPEC_SDD.md` 不存在或內容為空
- **THEN** 系統 MUST 以 `DEFAULT_OPENSPEC_SDD` 常數內容建立 `OPENSPEC_SDD.md`

#### Scenario: 不覆蓋已存在的自訂內容

- **WHEN** 前端呼叫 `PUT /api/config/openspec-sdd` 帶上 `{ enabled: true }`
- **AND** `data/prompts/OPENSPEC_SDD.md` 已存在且內容非空
- **THEN** 系統 MUST NOT 覆蓋現有的 `OPENSPEC_SDD.md` 內容

#### Scenario: 停用時不刪除檔案

- **WHEN** 前端呼叫 `PUT /api/config/openspec-sdd` 帶上 `{ enabled: false }`
- **THEN** 系統 MUST NOT 刪除 `OPENSPEC_SDD.md` 檔案
- **AND** 檔案內容 MUST 保留原樣

---

### Requirement: OPENSPEC_SDD.md 內容讀寫 API

系統 SHALL 提供 REST API 端點讓使用者讀取和編輯 `OPENSPEC_SDD.md` 的內容。

#### Scenario: 讀取內容

- **WHEN** 前端呼叫 `GET /api/prompts/openspec-sdd`
- **THEN** API MUST 回傳 `{ content: string }`，包含 `OPENSPEC_SDD.md` 的完整內容

#### Scenario: 讀取不存在的檔案

- **WHEN** 前端呼叫 `GET /api/prompts/openspec-sdd`
- **AND** `OPENSPEC_SDD.md` 不存在
- **THEN** API MUST 回傳 `{ content: "" }`

#### Scenario: 寫入內容

- **WHEN** 前端呼叫 `PUT /api/prompts/openspec-sdd` 帶上 `{ content: "..." }`
- **THEN** 系統 MUST 將內容寫入 `data/prompts/OPENSPEC_SDD.md`
- **AND** API MUST 回傳 `{ ok: true }`

#### Scenario: 允許寫入空內容

- **WHEN** 前端呼叫 `PUT /api/prompts/openspec-sdd` 帶上 `{ content: "" }`
- **THEN** 系統 MUST 將空字串寫入 `OPENSPEC_SDD.md`
- **AND** API MUST 回傳 `{ ok: true }`

---

### Requirement: Agent Tab OpenSpec SDD UI

Settings 的 Agent tab SHALL 在 AGENT.md 編輯區塊下方顯示 OpenSpec SDD 工作流程的開關與內容編輯器。

#### Scenario: 顯示 OpenSpec SDD toggle

- **WHEN** 使用者進入 Settings > Agent tab
- **THEN** 頁面 MUST 在 AGENT.md textarea 下方顯示 OpenSpec SDD 區塊
- **AND** 區塊 MUST 包含標題、說明文字、以及 ToggleSwitch 元件

#### Scenario: Toggle 預設為 OFF

- **WHEN** Agent tab 首次載入
- **AND** 後端 CONFIG.json 無 `openspecSddEnabled` 欄位或值為 `false`
- **THEN** ToggleSwitch MUST 顯示為關閉狀態

#### Scenario: Toggle 為 OFF 時隱藏編輯區

- **WHEN** OpenSpec SDD toggle 處於 OFF 狀態
- **THEN** 頁面 MUST NOT 顯示 OPENSPEC_SDD.md 的 textarea 與 Save 按鈕

#### Scenario: Toggle 切換為 ON

- **WHEN** 使用者將 toggle 從 OFF 切換為 ON
- **THEN** 前端 MUST 呼叫 `PUT /api/config/openspec-sdd { enabled: true }`
- **AND** 前端 MUST 呼叫 `GET /api/prompts/openspec-sdd` 取得內容
- **AND** 頁面 MUST 展開顯示 OPENSPEC_SDD.md 的 textarea 和 Save 按鈕

#### Scenario: Toggle 切換為 OFF

- **WHEN** 使用者將 toggle 從 ON 切換為 OFF
- **THEN** 前端 MUST 呼叫 `PUT /api/config/openspec-sdd { enabled: false }`
- **AND** 頁面 MUST 隱藏 textarea 和 Save 按鈕

#### Scenario: 編輯並儲存 OpenSpec SDD 內容

- **WHEN** 使用者修改 textarea 中的 OpenSpec SDD 內容
- **AND** 使用者點擊 Save 按鈕
- **THEN** 前端 MUST 呼叫 `PUT /api/prompts/openspec-sdd { content: "..." }`
- **AND** 頁面 MUST 顯示儲存成功的 toast 訊息

#### Scenario: 儲存失敗時顯示錯誤

- **WHEN** `PUT /api/prompts/openspec-sdd` 呼叫失敗
- **THEN** 頁面 MUST 顯示儲存失敗的 toast 訊息
