## Context

CodeForge 目前的 system prompt 組裝由 `PromptComposer` 負責，按固定順序串接 7 層內容。CONFIG.json 已用於儲存 `braveApiKey` 等全域設定，透過 `PromptFileStore` 讀寫。前端 Settings 的 Agent tab 目前僅有單一的 AGENT.md textarea。

現有可複用的模式：
- `readConfig(store)` / `writeConfig(store, config)` 讀寫 CONFIG.json
- `PromptFileStore.readFile()` / `writeFile()` 讀寫 prompt 檔案
- `ToggleSwitch` 共用元件已存在於前端
- `promptsApi` / `configApi` 已有完整的 CRUD 樣板

## Goals / Non-Goals

**Goals:**

- 在 CONFIG.json 新增 `openspecSddEnabled` 布林欄位，透過 REST API 管理
- 在 `data/prompts/` 新增可編輯的 `OPENSPEC_SDD.md` 檔案
- 修改 `PromptComposer.compose()` 根據 toggle 狀態條件注入 OPENSPEC_SDD.md
- 在 Agent tab 新增 toggle + 條件展開的 textarea 編輯器

**Non-Goals:**

- 不新增 hot-reload 機制（`compose()` 每次呼叫時重新讀取 CONFIG.json，天生即時生效）
- 不修改 `PromptComposer` constructor 或 `compose()` 方法簽名
- 不新增獨立的 Settings tab
- 不整合 OpenSpec CLI 或狀態監控

## Decisions

### Decision 1: PromptComposer 內聯讀取 CONFIG.json

在 `compose()` 方法中直接呼叫 `this.store.readFile('CONFIG.json')` + `JSON.parse()`，以 try/catch 包裹，失敗時靜默跳過。

**替代方案：** 將 toggle 狀態作為 `compose()` 的參數傳入。
**取捨：** 參數方案需修改 `compose()` 簽名及所有呼叫端（`StreamManager.startStream()`、測試），增加侵入性。內聯讀取方案零侵入，且 `PromptFileStore.readFile()` 本身已是同步 I/O、失敗回空字串，與 `compose()` 內其他 `readFile()` 呼叫一致。

**選擇理由：** 內聯方案更簡單，遵循現有 `compose()` 內部「自行讀取檔案」的一致模式。

### Decision 2: Config 與 Content 分離為兩組 API

- Config toggle: `GET/PUT /api/config/openspec-sdd` — 管理 `openspecSddEnabled` 布林值
- Content: `GET/PUT /api/prompts/openspec-sdd` — 管理 `OPENSPEC_SDD.md` 檔案內容

**替代方案：** 合併為單一 API（如 `PUT /api/config/openspec-sdd { enabled, content }`）。
**取捨：** 合併方案在每次 toggle 切換時都需傳送完整的 markdown 內容，浪費頻寬。分離方案讓 toggle 操作輕量（只傳布林值），內容編輯獨立操作，與現有 `brave-api-key` / `agent` 的分離模式一致。

**選擇理由：** 遵循現有的 config/prompts 分離架構。

### Decision 3: 自動建立觸發點在 PUT config 端點

首次啟用時的 `OPENSPEC_SDD.md` 自動建立邏輯放在 `PUT /api/config/openspec-sdd` 的處理器中，而非 `PromptFileStore.ensureDirectories()`。

**替代方案：** 在 `ensureDirectories()` 中無條件建立 `OPENSPEC_SDD.md`。
**取捨：** `ensureDirectories()` 在啟動時執行，無條件建立會違背「預設關閉」的需求 — 使用者可能永遠不想使用 OpenSpec SDD。在 PUT 端點觸發可確保只有使用者主動啟用時才建立檔案。

**選擇理由：** 尊重「預設關閉」原則，延遲建立到使用者明確啟用的時刻。

### Decision 4: 注入層位置 — AGENT.md 之後、presets 之前

OPENSPEC_SDD.md 作為 PromptComposer 的新層，位於 AGENT.md（第 3 層）之後、Active presets（第 4 層）之前。

**替代方案：** 放在 presets 之後或 system prompt 之前。
**取捨：** OpenSpec SDD 規則本質上是 agent 的行為指令（類似 AGENT.md 的擴充），應緊接在 AGENT.md 之後。放在 presets 之後可能被使用者的 preset 覆蓋。放在最前面則會改變現有的優先級結構。

**選擇理由：** 語義上最合理 — 它是 agent 規則的延伸。

### Decision 5: 前端 API 分佈

- `configApi`（在 `api.ts`）新增 `getOpenspecSdd` / `putOpenspecSdd` — 管理 toggle 狀態
- `promptsApi`（在 `prompts-api.ts`）新增 `getOpenspecSdd` / `putOpenspecSdd` — 管理內容

**替代方案：** 全部放在同一個 API 物件中。
**取捨：** 遵循現有的分離慣例 — config 類的設定放 `configApi`、prompt 類的內容放 `promptsApi`。

## Risks / Trade-offs

### Risk 1: System prompt token 增加

[風險] 啟用後 system prompt 增加約 2000-3000 字元，消耗更多 token。
→ [緩解] 使用者可自行編輯 `OPENSPEC_SDD.md` 精簡內容；預設關閉確保不影響不需要的使用者。

### Risk 2: CONFIG.json 每次 compose() 都讀取

[風險] 每次 AI 對話開始都額外讀取一次 CONFIG.json 磁碟 I/O。
→ [緩解] `PromptFileStore.readFile()` 是同步讀取，且 compose() 本身已讀取 5+ 個檔案，一次額外讀取影響微乎其微。單人使用工具，無併發壓力。

### Risk 3: CONFIG.json 格式損壞

[風險] 使用者手動編輯 CONFIG.json 導致 JSON 格式錯誤。
→ [緩解] `compose()` 中的 try/catch 會靜默跳過，等同 toggle 關閉。`readConfig()` helper 也有相同的容錯處理。
