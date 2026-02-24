## Context

目前系統存在三個問題需一併處理：

1. **Plan 模式品質問題**：`StreamManager` 的 `copilot:idle` handler（stream-manager.ts:950-973）將 `contentSegments.join('')` 的完整結果作為 plan artifact 內容。由於 LLM 傾向在回應開頭加入對話性文字（如 "好的！讓我分析..."），這些文字會被原封不動地寫入 plan 檔案和 artifact，使計劃文件品質低落。`plan-writer.ts` 只負責寫檔和提取 topic，沒有內容過濾邏輯。

2. **SDK 更新功能無效**：`SdkUpdateChecker.performUpdate()` 執行 `exec('npm update @github/copilot-sdk')`，但 Node.js 的模組快取機制意味著更新後的 SDK 不會在當前進程中生效。`ClientManager` 的 singleton client 也不會被重建。前端沒有提示使用者需要重啟。加上 SDK 可能有 breaking change，自動更新本身就有風險。

3. **缺乏 SDK 更新影響分析**：移除自動更新後，需要替代方案讓使用者在手動更新前評估影響。Claude skill 是最輕量的選擇。

### 現有架構參考

- Plan 流程：`stream-manager.ts` → `plan-writer.ts`（writePlanFile + extractTopicFromContent）→ WS idle event 含 `planArtifact` → 前端 `useTabCopilot.ts` 建立 artifact
- SDK 版本：`sdk-update.ts`（SdkUpdateChecker class）→ `sdk-update-route.ts`（Express router）→ 前端 `SdkUpdateBanner.tsx` + `SettingsPanel.tsx`
- Skill 系統：`.claude/skills/<name>/SKILL.md`，自動被 skill file store 發現

## Goals / Non-Goals

**Goals:**

- Plan artifact 只包含結構化的 markdown 計劃，不含 LLM 的對話性前言
- 完全移除 SDK 自動更新相關程式碼（前後端）
- 保留唯一讀功能：顯示當前已安裝的 SDK 版本
- 提供 Claude skill 讓使用者在手動更新 SDK 前後進行影響分析

**Non-Goals:**

- 不實作 Node.js 進程自動重啟機制
- 不保留任何形式的「有新版本可用」提醒
- 不修改 plan 模式的 5-Phase 互動流程
- 不在 skill 中嵌入可執行腳本（純文字指引即可）

## Decisions

### Decision 1：Plan 內容過濾策略 — Prompt + Parser 雙重保險

**選項 A（僅 Prompt）**：修改 `DEFAULT_PLAN_PROMPT` 要求 LLM 直接以 heading 開始回應。
- 優點：零程式碼變更
- 缺點：LLM 不一定遵守，不同模型行為不同，無法保證

**選項 B（僅 Parser）**：在 `stream-manager.ts` 加入解析邏輯，找到第一個 markdown heading 並截取。
- 優點：確定性高
- 缺點：如果 LLM 整個回應都是對話文字（沒有 heading），parser 無法拯救

**選項 C（Prompt + Parser）**：兩者並用。✅ 選擇此方案。
- Prompt 修正讓大多數情況下 LLM 直接輸出結構化內容
- Parser 作為安全網，處理 LLM 偶爾仍加入對話前言的情況
- `extractPlanContent()` 加在 `plan-writer.ts`（與 `extractTopicFromContent` 同模組），在 `stream-manager.ts` 的 idle handler 中呼叫

### Decision 2：Plan content 提取演算法

**演算法**：找到原始文字中第一個 markdown heading（`^#{1,3}\s+`，multiline match）的位置。如果 heading 不在位置 0（代表前面有非 heading 文字），截取 heading 開始到結尾的部分。如果沒有 heading 或 heading 就在開頭，回傳 trimmed 原始文字。

**替代方案考慮**：用 artifact marker（如 ` ```artifact type="plan"` ）來標記計劃內容。
- 否決原因：需要同時修改 prompt（要求用 artifact marker）和 parser（解析 marker），且 plan-writer 的 `writePlanFile` 不應寫入 code fence 包裹的內容。Heading-based 提取更簡單且與現有 markdown plan 格式一致。

### Decision 3：SdkUpdateChecker 保留策略

**選項 A**：完全刪除 `sdk-update.ts`，將 `getInstalledVersion()` 搬到 `sdk-update-route.ts` inline。
- 優點：最少程式碼
- 缺點：`context-route.ts` 也呼叫 `sdkChecker.getInstalledVersion()`，需要改兩處

**選項 B**：保留 `sdk-update.ts` 和 `SdkUpdateChecker` class，只刪除不需要的方法。✅ 選擇此方案。
- Class 只剩 `getInstalledVersion()`，但保持現有 import 關係不變
- `context-route.ts` 不需要修改（它只用 `getInstalledVersion()`）
- 避免不必要的重構風險

### Decision 4：SDK 版本 API 回應格式簡化

現有 `GET /api/copilot/sdk-version` 回傳 `{ currentVersion, latestVersion, updateAvailable }`。

簡化為 `{ currentVersion: string | null }`。不需要 latestVersion 和 updateAvailable，因為不再做版本比較。

### Decision 5：Skill 結構 — SKILL.md + 參考文件

不使用可執行腳本（Python/Bash），因為：
- SDK 分析本質上是 Claude 的推理任務（讀 changelog → 比對程式碼 → 產出報告）
- 可執行腳本需要維護且可能因 SDK repo 結構變化而失效
- SKILL.md 的文字指引 + `references/project-integration-points.md` 已足夠引導 Claude 完成分析

## Risks / Trade-offs

**[Risk] LLM 仍可能產出全對話文字無 heading** → Mitigation: `extractPlanContent()` 對無 heading 的內容回傳 trimmed 原文，不會遺失內容。Prompt 修正讓此情況發生率極低。

**[Risk] 移除 SDK 更新後使用者不知道有新版本** → Mitigation: 這是 deliberate decision。使用者可透過 `sdk-update-analyzer` skill 手動查詢，或直接在 npm 查看。個人工具不需要自動通知。

**[Risk] `extractPlanContent()` 可能誤切有效 plan 開頭** → Mitigation: 只有在第一個 heading 前有非 heading 文字時才截取。如果 plan 本身就以 heading 開始（預期的正常情況），不做任何截取。

**[Risk] Skill 中的整合點文件可能隨專案演進而過時** → Mitigation: `references/project-integration-points.md` 列出的是架構層面的整合點（client-manager、stream-manager 等），這些不會頻繁變動。Skill 也指引 Claude 在分析時直接探索程式碼，不完全依賴靜態文件。

**[Trade-off] 不重新命名 SdkUpdateChecker class** → 雖然移除 update 功能後名稱有誤導性，但保持原名避免 git blame 噪音和不必要的 import 路徑變更。程式碼內容已清楚表達其唯一功能。
