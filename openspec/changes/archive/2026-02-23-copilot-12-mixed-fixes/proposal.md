## Why

使用者在日常使用中發現 4 個需要修復/優化的問題：聊天視窗的自動捲動按鈕在內容尚未溢出時就過早顯示、技能管理介面的 UI 佈局不合理（安裝區應整合到使用者技能區）、後端 SDK 版本檢查因 package exports 限制報錯、以及 Plan/Act 雙模式的系統提示詞過於簡略需要對齊 Claude Code CLI 風格。

**目標使用者**：開發者（單人使用），透過手機瀏覽器操控 AI 開發工具。

**使用情境**：日常使用 CodeForge 進行 AI 對話、管理技能、使用 Plan/Act 模式規劃與執行開發任務時遇到的體驗問題與錯誤。

## Non-Goals

- 不重新設計聊天 UI 的整體佈局或樣式
- 不新增任何新的技能安裝方式（維持現有 ZIP / URL / AI 三種）
- 不更改 SDK 更新機制本身（只修復版本檢測）
- 不修改 Plan/Act mode 的前端 UI 或切換邏輯（只更新系統提示詞內容）

## What Changes

- **修復 scroll-to-bottom 按鈕過早出現**：當 DOM 未掛載或內容未溢出時，不應遞增未讀計數或顯示捲動按鈕
- **重構技能管理 UI 佈局**：將安裝區（ZIP 上傳 / URL 安裝 / AI 建立）從頁面頂部移至「使用者技能」區底部，移除「新增技能」手動建立按鈕和表單
- **修復 SDK 版本檢查錯誤**：改用 resolve 主入口再向上查找 package.json 的策略，避免觸發 `ERR_PACKAGE_PATH_NOT_EXPORTED`
- **優化雙模式系統提示詞**：以 Claude Code CLI 風格重寫 Act Mode 和 Plan Mode 的提示詞，提供結構化的行為準則和工作流程指引

## Capabilities

### New Capabilities

（無新增功能）

### Modified Capabilities

- `scroll-to-bottom`: 修復未讀計數和按鈕可見性的判斷邏輯，增加內容溢出檢查
- `skills-management`: 移除手動建立技能表單，將安裝區整合到使用者技能區底部
- `sdk-upgrade-advisor`: 修復 `getInstalledVersion()` 的 package.json 解析策略
- `system-prompts`: 重寫 Modes of Operation 區段，Act Mode 增加行為準則，Plan Mode 增加結構化工作流程

## Impact

- **前端**：`ChatView.tsx`（scroll 邏輯）、`SettingsPanel.tsx`（技能管理 UI）
- **後端**：`sdk-update.ts`（版本檢測）、`defaults.ts`（系統提示詞）
- **無 API 變更**、**無資料庫變更**、**無依賴變更**
