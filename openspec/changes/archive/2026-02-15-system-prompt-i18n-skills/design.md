## Context

目前 AI Terminal 的系統提示詞管理架構已具備基本能力：`PromptFileStore` 管理 `data/prompts/` 下的 markdown 檔案，`PromptComposer` 按固定順序組裝多個段落成為最終 system prompt，透過 `systemMessage: { mode: 'append' }` 傳遞給 Copilot SDK。

然而存在三個缺口：
1. 無預設系統提示詞模板——使用者需自行從零撰寫
2. Settings 面板混合硬編碼的中英文字串，未接入 i18n 系統
3. Copilot SDK 原生支援 `skillDirectories` 和 `disabledSkills`，但未被利用

前端已有完整的 i18next 基礎設施（語言偵測、localStorage 持久化、en/zh-TW 翻譯檔），只需擴展翻譯鍵覆蓋 Settings。

## Goals / Non-Goals

**Goals:**
- 提供高品質的英文預設系統提示詞模板，可編輯、可重置
- Settings 面板所有 UI 文字透過 i18n 系統管理
- 完整的 Skills CRUD 功能，與 Copilot SDK 原生整合
- 修復 `activePresets` 未從前端傳送的既有 bug

**Non-Goals:**
- 多語系系統提示詞模板
- Skill marketplace / 匯入匯出
- Settings 以外的 i18n 缺口修補

## Decisions

### Decision 1: 系統提示詞模板存放位置

**選擇**：`data/prompts/SYSTEM_PROMPT.md`，與 PROFILE.md / AGENT.md 同級

**理由**：遵循現有 PromptFileStore 的目錄結構慣例，無需新增儲存模組。預設內容以 TypeScript 常數 `DEFAULT_SYSTEM_PROMPT` 定義在 `backend/src/prompts/defaults.ts`，`ensureDirectories()` 時自動建立。

**替代方案**：嵌入 PromptComposer 中作為硬編碼常數。取捨——無法讓使用者編輯，且違反檔案驅動的設計哲學。

### Decision 2: PromptComposer 組裝順序

**選擇**：SYSTEM_PROMPT → PROFILE → AGENT → Presets → Memory → .ai-terminal.md

**理由**：系統提示詞模板定義最基礎的 AI 行為指引，應在最前面建立基調。使用者的個人設定（Profile）和 agent 規則（Agent）在其後覆蓋或補充，最後是專案層級的上下文。

**替代方案**：將 SYSTEM_PROMPT 放在 AGENT 之後。取捨——使用者設定會被後方的系統模板稀釋，不符合「基礎在前、客製在後」的直覺順序。

### Decision 3: Skills 儲存結構

**選擇**：`data/skills/{skill-name}/SKILL.md`，獨立於 `data/prompts/`

**理由**：Skills 是目錄結構（每個 skill 可能包含多個檔案），與 prompts 的單檔結構本質不同。遵循 GitHub Copilot Skills 規範（`SKILL.md` 為核心檔案），且 SDK 的 `skillDirectories` 期望接收目錄路徑而非檔案路徑。

**替代方案 A**：`data/prompts/skills/`，作為 prompts 的子目錄。取捨——混淆 prompts（單檔 markdown）和 skills（目錄結構）的語義。
**替代方案 B**：專案根目錄 `.skills/`。取捨——與 `data/` 的集中管理策略不一致。

### Decision 4: Skills 與 SDK 的整合方式

**選擇**：每次 `startStream()` 時動態讀取 `SkillFileStore.getSkillDirectories()` 並傳入 `SessionConfig.skillDirectories`；前端透過 WebSocket 訊息傳送 `disabledSkills` 陣列。

**理由**：SDK 原生處理 skill 載入邏輯，我們只需提供目錄路徑和停用列表。動態讀取確保新增/刪除的 skill 立即生效，無需重啟。

**替代方案**：將 SKILL.md 內容讀取後注入 system prompt。取捨——繞過 SDK 的原生 skill 處理，失去 SDK 可能的優化和標準行為。

### Decision 5: Settings Tab 溢位處理

**選擇**：Tab 容器加入 `overflow-x-auto`，Tab 按鈕從 `flex-1` 改為 `shrink-0 px-3`

**理由**：Tab 數量從 4 增到 6（+System Prompt, +Skills），在 320px 寬的手機螢幕上 `flex-1` 會讓每個 tab 過窄（約 53px）。改用固定寬度 + 水平捲動保持可讀性。

**替代方案**：使用下拉選單切換 tab。取捨——增加操作步驟，降低直覺性。

### Decision 6: disabledSkills 持久化策略

**選擇**：localStorage（key: `ai-terminal:disabledSkills`），與 `activePresets` 相同模式

**理由**：單人使用場景，無需跨裝置同步。遵循現有的 `activePresets` 持久化模式（Zustand store + localStorage），降低認知成本。

**替代方案**：後端 SQLite 儲存。取捨——過度工程化，且需要新的 API 端點和資料庫 schema。

## Risks / Trade-offs

**[Risk] SYSTEM_PROMPT.md 內容過長導致 token 浪費**
→ 緩解：預設模板控制在 500 字以內；`PromptComposer` 已有 `maxPromptLength`（50,000 字元）截斷保護。

**[Risk] Skills 目錄掃描效能**
→ 緩解：`getSkillDirectories()` 為同步 `readdirSync`，在 skill 數量 < 100 的場景下延遲可忽略。若未來成長，可加入簡單的記憶體快取。

**[Risk] `disabledSkills` 引用已刪除的 skill name**
→ 緩解：SDK 忽略不存在的 skill name，不會報錯。前端 Skills tab 渲染時以 API 列表為準，localStorage 中的殘留名稱無害。

**[Risk] 前端 `sendMessage` 修改可能影響既有 WebSocket 協議**
→ 緩解：後端 handler 使用 `??` fallback（`payload.activePresets ?? []`、`payload.disabledSkills ?? []`），新舊前端版本相容。

**[Risk] Settings 面板元件大小增長**
→ 緩解：`SettingsPanel.tsx` 目前已超過 500 行。此次新增 2 個 tab 元件後考量未來可拆分為獨立檔案，但本次維持單檔以保持與現有模式一致。
