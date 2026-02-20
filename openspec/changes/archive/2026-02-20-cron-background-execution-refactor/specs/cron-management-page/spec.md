## ADDED Requirements

### Requirement: Cron 獨立頁面 Tab Mode

系統 MUST 將 `TabState.mode` 擴充為 `'copilot' | 'terminal' | 'cron'`。

AppShell MUST 根據 `activeTab.mode` 條件渲染：
- `'cron'` → 渲染 `<CronPage />`
- 其他 → 渲染 `<ChatView />`（現有行為）

系統 MUST 確保同時只有一個 cron tab 存在。

#### Scenario: 開啟 Cron 頁面
- **WHEN** 用戶點擊 TabBar 的 Cron icon
- **THEN** 系統開啟一個 mode='cron' 的新 tab，渲染 CronPage

#### Scenario: 避免重複開啟
- **WHEN** 用戶點擊 Cron icon 且已存在 mode='cron' 的 tab
- **THEN** 系統切換到該既有 tab，不建立新 tab

#### Scenario: Cron tab 與其他 tab 共存
- **WHEN** 用戶有 copilot tab 和 cron tab
- **THEN** 可自由切換，各 tab 狀態獨立保持

---

### Requirement: CronPage Job 管理

CronPage MUST 提供完整的 Job CRUD 功能：

**Job 列表：**
- 顯示所有 cron jobs（名稱、類型、排程、啟用狀態、最後執行時間）
- 每個 job 可 toggle 啟用/停用
- 每個 job 可手動觸發（Trigger）
- 每個 job 可編輯和刪除

**建立/編輯 Job 表單：**
- name（必填）
- type：ai / shell（必填）
- scheduleType：cron / interval / once（必填）
- scheduleValue（必填）
- AI job：prompt、model、cwd、toolConfig
- Shell job：command、cwd、timeout

#### Scenario: 建立 AI cron job
- **WHEN** 用戶填寫 name、選擇 type=ai、設定 schedule、輸入 prompt、選擇 model
- **THEN** 系統呼叫 POST /api/cron/jobs 建立 job，job 列表更新

#### Scenario: 編輯 job
- **WHEN** 用戶修改既有 job 的 name 或 schedule
- **THEN** 系統呼叫 PUT /api/cron/jobs/:id 更新 job

#### Scenario: 刪除 job（含確認）
- **WHEN** 用戶點擊刪除按鈕
- **THEN** 顯示確認對話，確認後呼叫 DELETE /api/cron/jobs/:id

#### Scenario: 手動觸發 job
- **WHEN** 用戶點擊 Trigger 按鈕
- **THEN** 系統呼叫 POST /api/cron/jobs/:id/trigger，顯示觸發成功的 toast

#### Scenario: Toggle 啟用/停用
- **WHEN** 用戶 toggle job 的 enabled 開關
- **THEN** 系統呼叫 PUT /api/cron/jobs/:id 更新 enabled 狀態

---

### Requirement: CronJobToolConfig 配置面板

AI 類型 job 的表單 MUST 包含 Tool 配置面板（CronJobToolConfig），提供以下控制項：

- **Model 選擇器**：下拉選單，列出可用 model
- **Skills 開關**：toggle（預設 on）
- **Self-control Tools 開關**：toggle（預設 off）
- **Memory Tools 開關**：toggle（預設 off）
- **Web Search 開關**：toggle（預設 off）
- **Task Tools 開關**：toggle（預設 off）
- **MCP Tools 開關**：toggle（預設 off）+ 展開後顯示 per-server sub-toggles
- **Disabled Skills 列表**：多選（僅在 Skills 開啟時顯示）

#### Scenario: 配置 tools 並儲存
- **WHEN** 用戶在 Tool 配置面板中開啟 memoryTools 和 webSearchTool
- **THEN** job config 的 toolConfig 包含 `{ memoryTools: true, webSearchTool: true }`

#### Scenario: Shell job 不顯示 Tool 配置
- **WHEN** job type 為 shell
- **THEN** 不顯示 CronJobToolConfig 面板

#### Scenario: MCP per-server 配置
- **WHEN** 用戶開啟 mcpTools 並展開 server 列表
- **THEN** 顯示所有可用 MCP server 的獨立 toggle

---

### Requirement: CronPage 執行歷史

CronPage MUST 顯示全域的執行歷史列表（CronHistoryList），來源為 `GET /api/cron/history/recent`。

每筆歷史紀錄 MUST 顯示：
- Job 名稱
- 狀態 badge（success=綠色、error=紅色、timeout=橙色、running=藍色動畫）
- 開始和結束時間
- output 預覽（截斷顯示）

每筆紀錄 MUST 可展開顯示詳情（CronHistoryDetail）：
- 完整 output/content
- Turn segments 列表
- Tool records 列表（含 toolName、arguments、result/error）
- Usage 統計（inputTokens、outputTokens）
- 原始 prompt

每筆紀錄 MUST 有「開啟為對話」按鈕。

#### Scenario: 查看執行歷史
- **WHEN** 用戶進入 CronPage
- **THEN** 顯示最近 50 筆跨 job 的執行歷史，按時間倒序排列

#### Scenario: 展開歷史詳情
- **WHEN** 用戶點擊某筆歷史紀錄
- **THEN** 展開顯示完整 content、turn segments、tool records、usage

#### Scenario: 查看 tool call 詳情
- **WHEN** 展開的歷史紀錄包含 tool records
- **THEN** 每個 tool call 顯示 toolName、arguments（可折疊）、status、result/error

---

### Requirement: 從 Settings 移除 CronTab

系統 MUST 從 `SettingsPanel.tsx` 的 TABS 陣列中移除 `{ id: 'cron', ... }` entry。

#### Scenario: Settings 不再顯示 Cron tab
- **WHEN** 用戶開啟 Settings modal
- **THEN** tab 列表不包含 Cron 選項

---

### Requirement: Cron 相關 API 端點

系統 MUST 新增以下 REST API 端點：

**GET /api/cron/history/recent?limit=50**
- 回傳跨 job 的最近歷史紀錄（含 jobName）
- limit 可選，預設 50

**GET /api/cron/history/unread-count?since=ISO_TIMESTAMP**
- 回傳 `{ total: number, failed: number }`
- since 可選，預設過去 24 小時

#### Scenario: 查詢全域歷史
- **WHEN** GET /api/cron/history/recent?limit=20
- **THEN** 回傳 `{ history: [...] }` 最多 20 筆，每筆含 jobName

#### Scenario: 查詢未讀數
- **WHEN** GET /api/cron/history/unread-count?since=2026-02-19T00:00:00Z
- **THEN** 回傳 `{ total: 5, failed: 1 }` 表示該時間後有 5 筆歷史、1 筆失敗
