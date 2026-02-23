## Context

CodeForge 在 copilot-11 批次功能上線後，使用者發現 4 個體驗問題：

1. **Scroll-to-bottom 按鈕誤顯**：`ChatView.tsx` 的 auto-scroll useEffect 在 DOM 未掛載或內容未溢出容器時仍遞增 `unreadCount`，導致按鈕過早出現。
2. **技能管理 UI 佈局不合理**：安裝區（ZIP / URL / AI）位於 SkillsTab 頂部，與「新增技能」手動建立按鈕重疊功能，佈局混亂。
3. **SDK 版本檢測報錯**：`@github/copilot-sdk` 的 `exports` 欄位未導出 `./package.json`，導致 `require.resolve('@github/copilot-sdk/package.json')` 觸發 `ERR_PACKAGE_PATH_NOT_EXPORTED`。
4. **Plan/Act 系統提示詞過於簡略**：現有 Modes of Operation 僅 3 行描述，缺乏結構化的行為準則和工作流程指引。

## Goals / Non-Goals

**Goals:**
- 修復 scroll-to-bottom 按鈕在內容未溢出時不應顯示的邏輯錯誤
- 簡化技能管理 UI，將安裝區移到使用者技能區底部並移除手動建立表單
- 消除 SDK 版本檢測的 `ERR_PACKAGE_PATH_NOT_EXPORTED` 警告
- 以 Claude Code CLI 風格重寫雙模式系統提示詞

**Non-Goals:**
- 不重新設計 scroll-to-bottom 按鈕的外觀或動畫
- 不新增技能安裝方式（維持 ZIP / URL / AI 三種）
- 不變更 SDK 更新機制或 UI
- 不修改 Plan/Act mode 的前端 UI 切換邏輯

## Decisions

### Decision 1: Scroll useEffect 增加 DOM 和溢出雙重守衛

**選擇**：在 auto-scroll useEffect 中加入 `if (!el) return` 早期退出，並在 auto-scroll 後檢查 `scrollHeight <= clientHeight + threshold` 來重置按鈕狀態。

**替代方案**：使用 ResizeObserver 監聽容器高度變化來動態判斷按鈕可見性。
- 取捨：ResizeObserver 方案更精確但引入新的訂閱/清理邏輯，增加複雜度。現有 scroll event + guard check 足以解決問題，且風險最低。

### Decision 2: 技能安裝區移至 User Skills 底部，移除手動建立

**選擇**：將 install section（ZIP / URL / AI）從 SkillsTab 頂部移到 User Skills section 底部；刪除「新增技能」按鈕、`showCreate` state 和 `handleCreate` 回調及整個手動建立表單。

**替代方案**：保留手動建立表單作為折疊區域。
- 取捨：手動建立表單與 AI 建立功能重疊，且實際使用率低。直接移除簡化 UI 和程式碼。ZIP/URL/AI 安裝已覆蓋所有使用場景。

### Decision 3: SDK 版本檢測改用主入口向上查找

**選擇**：修改 Strategy 1，先 `require.resolve('@github/copilot-sdk')`（resolve 主入口），再從 `dirname(mainPath)` 向上遍歷找到 `package.json`（驗證 `pkg.name === '@github/copilot-sdk'`）。

**替代方案 A**：直接移除 Strategy 1，只保留 Strategy 2（候選路徑硬編碼）。
- 取捨：Strategy 2 依賴相對路徑硬編碼，在非標準安裝結構下可能失敗。resolve 主入口 → 向上查找更通用。

**替代方案 B**：使用 `fs.readFileSync` 直接讀取 `require.resolve('@github/copilot-sdk').replace(/dist\/.*/, 'package.json')`。
- 取捨：假設了特定的 dist 結構，不夠穩健。向上遍歷 + name 驗證更安全。

### Decision 4: 系統提示詞對齊 Claude Code CLI 風格

**選擇**：重寫 `defaults.ts` 的 `## Modes of Operation` 區段，Act Mode 增加「Doing Tasks」「Executing Actions with Care」「Tool Usage」「Response Guidelines」四個子區段；Plan Mode 增加結構化 4 步驟工作流程（Understand → Explore → Design → Plan）和規則清單。同時刪除原本獨立的 `## Tool Usage` 和 `## Response Guidelines` 區段（內容已合併到 Act Mode 中）。

**替代方案**：僅更新 Plan Mode 部分，保留原有 Act Mode 和獨立區段。
- 取捨：造成指引分散在多個區段，且 Act Mode 缺乏明確的行為準則。統一到 Modes of Operation 下更清晰。

## Risks / Trade-offs

| 風險 | 緩解策略 |
|------|---------|
| Scroll 修復可能在邊界情況下遺漏（如動態 resize） | 增加 `scrollHeight <= clientHeight + threshold` 雙重守衛覆蓋靜態和動態場景 |
| 移除手動建立表單後使用者可能需要臨時建立技能 | AI 建立 + ZIP/URL 安裝已完整覆蓋，且 AI 建立比手動填表更友善 |
| SDK 主入口 resolve 路徑在不同套件管理器下結構不同 | 向上遍歷 + `pkg.name` 驗證確保正確性；Strategy 2 仍作為 fallback |
| 系統提示詞加長可能增加 token 消耗 | 增量有限（約增加 300 tokens），且結構化指引能提升 AI 回應品質，投資回報正向 |
