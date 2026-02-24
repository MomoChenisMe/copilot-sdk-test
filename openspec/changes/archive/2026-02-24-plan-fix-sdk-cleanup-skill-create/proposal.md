## Why

目前存在三個互相關聯的問題需要一併解決：

1. **Plan 模式輸出品質低落** — 模型在 plan 模式下的回應會包含對話性文字（如 "Perfect! 我已經了解了..."），這些文字被原封不動地寫入 plan artifact，導致計劃文件不像結構化的計劃書而是聊天記錄。根因是 `stream-manager.ts` 將完整 assistant message 作為 plan content，沒有任何過濾機制。
2. **SDK 自動更新功能無效且有風險** — 目前的 `performUpdate()` 只執行 `npm update`，更新磁碟上的套件但不會重啟 Node.js 進程。由於模組快取機制，更新後的 SDK 實際上不會生效。更危險的是，SDK 更新可能帶來 breaking change 導致後端崩潰。使用者完全不知道需要重啟服務。應移除所有更新相關功能，只保留版本顯示。
3. **缺乏 SDK 更新影響分析工具** — 當手動更新 SDK 後，缺少系統性的方式來評估更新對專案的影響、識別 breaking change、產生遷移建議。需要一個 Claude skill 來填補這個空缺。

## What Changes

- **Plan 模式 prompt 強化**：在 `DEFAULT_PLAN_PROMPT` 新增 Output Format Rules，要求模型直接以 markdown heading 開始回應，禁止對話性前言
- **Plan 內容解析器**：在 `plan-writer.ts` 新增 `extractPlanContent()` 函式，從累積的回應中提取結構化計劃內容（去除對話前言），作為 prompt 指令的安全網
- **stream-manager 整合**：修改 `copilot:idle` handler 使用 `extractPlanContent()` 處理 plan content
- **移除 SdkUpdateBanner 元件**：刪除全域更新提醒 banner
- **移除 SDK 更新 API**：**BREAKING** — 移除 `POST /api/copilot/sdk-update` 和 `GET /api/copilot/sdk-changelog` 端點
- **簡化 SDK 版本 API**：`GET /api/copilot/sdk-version` 回應從 `{ currentVersion, latestVersion, updateAvailable }` 簡化為 `{ currentVersion }`
- **簡化 Settings SDK 區段**：移除 Check for Updates、Update SDK、Analyze Changes 按鈕，只保留版本號顯示
- **簡化 sdk-update.ts**：只保留 `getInstalledVersion()` 方法，移除所有 npm registry 查詢和更新相關邏輯
- **建立 sdk-update-analyzer 技能**：新增 Claude skill 提供 6 步驟的 SDK 更新影響分析工作流

## Capabilities

### New Capabilities

- `plan-content-extraction`: 從 plan 模式的 AI 回應中提取結構化計劃內容，去除對話性前言，確保 plan artifact 品質
- `sdk-update-analysis-skill`: Claude skill 用於分析 @github/copilot-sdk 更新對專案的影響，包含 changelog 取得、整合點對照、風險評估、遷移建議

### Modified Capabilities

- `plan-mode`: Plan 模式 prompt 新增 Output Format Rules 約束，要求模型以 heading 開頭
- `sdk-upgrade-advisor`: 移除版本比較、更新按鈕、changelog 分析等所有功能，只保留當前版本顯示

## Non-Goals

- **不實作自動重啟機制** — 不透過 process restart 讓 SDK 更新即時生效，因為已決定移除自動更新功能
- **不保留任何更新提醒** — 不以 toast、badge 或任何方式提示使用者有新版本可用
- **不修改 plan 模式的互動流程** — 5-Phase workflow 維持不變，只加強輸出格式約束
- **不在 plan artifact 中使用 code fence 或 artifact marker** — plan content 直接是 markdown 文件

## Impact

### Backend

- `src/prompts/defaults.ts` — `DEFAULT_PLAN_PROMPT` 新增格式規則
- `src/copilot/plan-writer.ts` — 新增 `extractPlanContent()` 函式
- `src/copilot/stream-manager.ts` — 修改 plan idle handler
- `src/copilot/sdk-update.ts` — 大幅簡化，移除 4 個方法
- `src/copilot/sdk-update-route.ts` — 移除 2 個端點

### Frontend

- `components/copilot/SdkUpdateBanner.tsx` — 刪除
- `components/layout/AppShell.tsx` — 移除 banner 和 analyzeChanges listener
- `components/settings/SettingsPanel.tsx` — 簡化 SDK 區段
- `locales/en.json` + `locales/zh-TW.json` — 清理 sdk.* 翻譯鍵

### API（BREAKING）

- 移除 `POST /api/copilot/sdk-update`
- 移除 `GET /api/copilot/sdk-changelog`
- 簡化 `GET /api/copilot/sdk-version` 回應格式

### Skill 系統

- 新增 `.claude/skills/sdk-update-analyzer/` 技能目錄
