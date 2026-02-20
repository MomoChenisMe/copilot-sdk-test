## Why

本專案自命名為 "AI Terminal" 以來已發展成一個功能完整的 AI 開發環境，遠超初始「終端 + AI 對話」的定位。隨著 plan mode、技能系統、記憶系統、MCP、排程任務等功能陸續上線，品牌和系統架構需要全面升級以匹配其實際能力。同時，使用者在日常使用中發現了幾個關鍵問題：bash 歷史紀錄在重啟後消失、技能管理流程過於繁瑣、plan mode 缺乏檔案持久化和執行流程等。

**目標使用者**：本工具的開發者（個人使用），透過手機瀏覽器遠端操控 VPS 上的 AI 開發環境。

**使用情境**：需要一個品牌清晰、功能完善、UX 一致的 AI 開發助手，能夠可靠地保存所有操作歷史、提供充足的模型資訊、並支援完整的 plan-then-execute 工作流。

## What Changes

### Phase 1 — 基礎

- **品牌重塑**：將所有 "AI Terminal" 引用更名為 "CodeForge"，包含 package.json、i18n、系統提示詞、localStorage key（含遷移邏輯）、`.ai-terminal.md` → `.codeforge.md`
- **Bash 歷史持久化修復**：修改後端 bash 完成回調，由存一筆 user 訊息改為存兩筆（user 指令 + assistant 輸出帶完整 metadata），修復重啟後 bash 歷史消失和雙重 `$` 符號問題
- **模型選擇器倍率顯示**：在模型下拉選單中顯示 premium request 倍率（如 0.33x、1x、3x、9x），類似 VS Code Copilot 插件

### Phase 2 — 核心功能

- **系統提示詞重新設計**：重寫 `DEFAULT_SYSTEM_PROMPT`，全面涵蓋 CodeForge 所有功能（multi-tab、plan mode、skill system、memory、MCP、artifacts、tasks）
- **`/context` 指令**：新增 slash command，顯示目前系統提示詞組成、技能啟用狀態、MCP 伺服器、模型資訊等上下文
- **技能管理改善**：支援 ZIP 技能包上傳安裝、URL 下載安裝、AI 輔助建立技能（透過 skill-creator 內建技能）
- **SDK 升級優化建議**：SDK 更新後自動取得 changelog，讓 Copilot 分析並建議程式碼優化方向

### Phase 3 — Plan Mode 強化

- **Plan Mode 輸出為 Markdown 檔案**：plan mode 完成時自動將計畫寫入 `{CWD}/.codeforge/plans/{date}-{topic}.md`
- **Plan Mode 執行流程**：規劃完成後提供「繼續規劃」或「開始執行」選項。執行時清除 SDK session 並以 plan 檔案內容作為全新對話的引導 prompt

## Non-Goals（非目標）

- 不做多人協作或權限管理（維持單人使用定位）
- 不做模型倍率的即時 API 查詢（使用靜態映射表，定期手動更新）
- 不做技能市場或線上技能庫瀏覽功能
- 不做 SDK changelog 的自動 PR 或自動程式碼修改（僅提供建議）
- 不做 plan mode 的 diff/merge 功能（plan 檔案為獨立快照）

## Capabilities

### New Capabilities

- `context-command`: 新增 `/context` slash command，提供系統上下文完整檢視（system prompt layers、skills、MCP servers、model info）
- `model-multiplier`: 在模型選擇器中顯示 premium request 倍率 badge
- `skill-installer`: 技能包上傳（ZIP）、URL 下載安裝、AI 輔助建立三種安裝方式
- `sdk-upgrade-advisor`: SDK 更新後自動取得 changelog 並提供優化建議
- `plan-file-output`: Plan mode 完成時自動輸出 markdown 檔案到專案目錄
- `plan-execution-flow`: Plan 完成後的「繼續規劃」/「開始執行」雙選項流程

### Modified Capabilities

- `bash-exec-mode`: 修改 bash 完成回調的訊息持久化邏輯（存兩筆訊息取代一筆），修復重啟後歷史消失和雙重 `$` bug
- `system-prompts`: 全面重寫 DEFAULT_SYSTEM_PROMPT 以反映 CodeForge 品牌和完整功能集
- `i18n`: 所有 "AI Terminal" 字串更名為 "CodeForge"，新增 9 個功能相關的翻譯 key
- `plan-mode`: 擴展為支援 markdown 檔案輸出和執行流程
- `skills-management`: 擴展技能管理 API 和 UI，支援上傳、URL 安裝、AI 建立
- `usage-tracking`: 模型選擇器 UI 整合 premium multiplier 顯示

## Impact

### Backend
- `backend/src/index.ts` — 品牌更名、bash 回調簽名變更、新 route 註冊
- `backend/src/ws/handlers/bash-exec.ts` — onBashComplete 回調擴展
- `backend/src/ws/handlers/copilot.ts` — 新增 `copilot:execute_plan` 訊息處理
- `backend/src/copilot/stream-manager.ts` — Plan mode idle 時寫入 markdown
- `backend/src/copilot/models-route.ts` — 模型資料加入 multiplier
- `backend/src/copilot/sdk-update.ts` — 新增 changelog 取得方法
- `backend/src/prompts/defaults.ts` — 系統提示詞完整重寫
- `backend/src/prompts/composer.ts` — `.codeforge.md` 支援
- `backend/src/skills/routes.ts` — 新增 upload/install-url 端點
- `backend/src/conversation/db.ts` — conversations 表新增 `plan_file_path` 欄位

### Frontend
- `frontend/src/store/index.ts` — ModelInfo 擴展、TabState 新增 planFilePath、localStorage 遷移
- `frontend/src/components/copilot/ChatView.tsx` — /context 指令、plan 執行 UI
- `frontend/src/components/copilot/MessageBlock.tsx` — Bash 訊息渲染修復
- `frontend/src/components/copilot/ModelSelector.tsx` — 倍率 badge
- `frontend/src/components/settings/SettingsPanel.tsx` — 技能上傳 UI、SDK 升級建議
- `frontend/src/locales/{en,zh-TW}.json` — 所有新翻譯

### New Files
- `backend/src/copilot/model-multipliers.ts`
- `backend/src/copilot/context-route.ts`
- `backend/src/copilot/plan-writer.ts`
- `backend/src/skills/skill-installer.ts`

### New Dependencies
- `adm-zip` — ZIP 解壓用於技能上傳
