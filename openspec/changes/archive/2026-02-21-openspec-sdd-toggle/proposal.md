## Why

目前 CodeForge 沒有內建的結構化開發流程引導。使用者若想讓 AI 遵循 OpenSpec SDD（Spec-Driven Development）工作流程，需要手動將規則文字貼進 system prompt，且每次對話都要重複設定。需要一個簡單的開關機制，讓使用者一鍵啟用 OpenSpec SDD 流程，使 AI 在所有對話中自動遵循規格驅動開發的規範。

目標使用者：CodeForge 的單人開發者（即本專案擁有者），在使用 Copilot Agent 進行功能開發時，希望 AI 主動遵循 OpenSpec 的 proposal → specs → design → tasks → implement → verify → archive 流程。

## Non-Goals

- 不實作 OpenSpec CLI 的整合或自動執行（使用者自行在 terminal 操作 `openspec` 命令）
- 不新增獨立的 Settings tab（放在現有的 Agent tab 中）
- 不實作 OpenSpec 狀態的即時監控 UI（如 changes 列表、artifact 進度）
- 不修改現有 skills 系統的啟用/停用機制

## What Changes

- 在 `backend/src/prompts/defaults.ts` 新增 `DEFAULT_OPENSPEC_SDD` 常數，內容為完整的 OpenSpec SDD 工作流程規則
- 在 `CONFIG.json` 新增 `openspecSddEnabled` 欄位，預設 `false`
- 新增 `GET/PUT /api/config/openspec-sdd` API 端點管理開關狀態
- 新增 `GET/PUT /api/prompts/openspec-sdd` API 端點管理 `OPENSPEC_SDD.md` 內容
- 修改 `PromptComposer.compose()` 在 AGENT.md 與 Active presets 之間，根據 toggle 狀態條件注入 `OPENSPEC_SDD.md`
- 首次啟用時自動從 `DEFAULT_OPENSPEC_SDD` 建立 `OPENSPEC_SDD.md`，使用者可自行編輯
- 在 Settings > Agent tab 新增 toggle 開關與內容編輯 textarea

## Capabilities

### New Capabilities

- `openspec-sdd-toggle`: OpenSpec SDD 工作流程開關功能 — 包含後端 config 管理、prompt 檔案管理、PromptComposer 條件注入、前端 Agent tab 中的 toggle UI 與內容編輯器

### Modified Capabilities

- `system-prompts`: PromptComposer 的 compose() 方法新增一個條件注入層（OPENSPEC_SDD.md），位於 AGENT.md 之後、Active presets 之前
- `settings-full-page`: Agent tab 從單純的 textarea 擴充為包含 AGENT.md 編輯器 + OpenSpec SDD toggle 開關 + 條件展開的 OPENSPEC_SDD.md 編輯器

## Impact

- **後端 API**: 新增 4 個 REST 端點（2 個 config、2 個 prompts）
- **System Prompt 組合**: PromptComposer 新增一個條件層，啟用時會增加 system prompt 的 token 消耗（約 2000-3000 字元）
- **前端 UI**: Agent tab 的 UI 結構改變，從單一 textarea 變為複合區塊
- **資料檔案**: `data/prompts/` 目錄新增 `OPENSPEC_SDD.md` 檔案、`CONFIG.json` 新增欄位
- **i18n**: en.json 和 zh-TW.json 新增 `settings.agent.*` 翻譯鍵
