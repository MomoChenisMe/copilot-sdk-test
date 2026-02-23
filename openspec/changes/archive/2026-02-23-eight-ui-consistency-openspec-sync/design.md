## Context

目前前端有三個 UI 一致性與狀態同步問題：

1. **ConfirmDialog 未統一使用**：`ConfirmDialog` 共用元件已存在於 `frontend/src/components/shared/ConfirmDialog.tsx`，功能完善（支持 destructive 模式、requiredInput 安全確認、loading 狀態），但只有 `OpenSpecPanel` 採用。`TabBar`（刪除對話）和 `SettingsPanel`（重設系統提示詞）仍使用 `window.confirm()`。

2. **Settings toggle 不同步全域 store**：`SettingsPanel.OpenSpecTab.handleToggleOpenspec` 只更新 backend API 和本地 React state，未呼叫 `useAppStore.getState().setSettings({ openspecEnabled })`。加上 `AppShell.tsx` 的 `onOpenSpecClick` 使用非響應式的 `useAppStore.getState()` 直接讀取，導致 TopBar 的 OpenSpec 按鈕在 toggle 後不會即時出現/消失。

3. **刪除 OpenSpec 後 TopBar 不更新**：AppShell 的 `openSpecActive` state 只在 `[activeTabId, cwd]` 變更時觸發 API 檢查。`openspec:changed` WebSocket CustomEvent 只被 `OpenSpecPanel` 監聽，AppShell 沒有監聽，導致刪除 OpenSpec 資料夾後藍色指示器不會即時消失。

4. **DirectoryPicker 路徑截斷不可讀**：DirectoryPicker overlay 頂部的路徑顯示（`browsePath`）只用 CSS `truncate` class 截斷，未套用 `shortenPath()` 智慧縮短函數。`shortenPath()` 已存在於 `CwdSelector.tsx` 中（將 `/Users/xxx` 替換為 `~`，長路徑縮短為 `~/…/parent/last` 格式），但 DirectoryPicker 未引用。

## Goals / Non-Goals

**Goals:**

- 所有確認對話框統一使用 `ConfirmDialog` 元件，提供一致的視覺體驗
- Settings 的 OpenSpec toggle 即時反映到 TopBar 按鈕的顯示/隱藏
- OpenSpec 資料夾刪除/新增後，TopBar 藍色指示器即時更新
- DirectoryPicker 路徑顯示可讀性改善，與 CwdSelector 一致使用 `shortenPath()`

**Non-Goals:**

- 不修改 `ConfirmDialog` 元件的 API 或樣式
- 不修改 WebSocket 事件的後端廣播機制
- 不修改 `UserInputDialog`、`MobileToolbarPopup` 等其他 dialog 元件
- 不新增 alert/prompt 類型的 dialog 元件

## Decisions

### Decision 1: TabBar 使用 callback + portal 模式處理 ConfirmDialog

**選擇方案**：在 `TabBar` 元件內新增 `deleteDialogOpen` 和 `pendingDeleteTabId` state，context menu 觸發時設置 state 開啟 dialog，確認後執行 `onDeleteConversation()`，dialog 渲染在 `TabBar` 元件底部。

**替代方案**：將 ConfirmDialog 提升到 AppShell 層級統一管理。
**取捨**：統一管理雖可減少 dialog 實例，但需要在 store 中新增全域 dialog state，增加耦合度。鑑於只有 2 處需要替換，分散式管理更簡潔。

### Decision 2: AppShell 改用 Zustand selector 訂閱 openspecEnabled

**選擇方案**：在 AppShell 中新增 `const openspecEnabled = useAppStore((s) => s.settings?.openspecEnabled ?? false)`，將 `onOpenSpecClick` 的條件判斷改用此 reactive 值。

**替代方案**：透過 event 或 callback 從 SettingsPanel 通知 AppShell 重新渲染。
**取捨**：event-based 方案增加額外的事件管道，而 Zustand selector 是框架內建的響應式機制，更自然也更可靠。

### Decision 3: AppShell 監聽 openspec:changed CustomEvent

**選擇方案**：在 AppShell 新增一個 `useEffect`，監聯 `window` 上的 `openspec:changed` CustomEvent，事件觸發時重新呼叫 `openspecApi.getOverview(tabCwd)` 更新 `openSpecActive`。加入 300ms debounce 避免連續事件造成過度 API 請求。

**替代方案 A**：將 `openSpecActive` 移入 Zustand store，由 OpenSpecPanel 負責更新。
**取捨**：將 panel-specific 的檢測邏輯分散到 store 層增加複雜度，且 panel 關閉時不會更新。直接在 AppShell 監聽事件更直接，與現有 OpenSpecPanel 的監聽模式一致。

**替代方案 B**：在現有 `useEffect` 的 dependency array 加入 timer-based polling。
**取捨**：polling 浪費資源，事件驅動更精確高效。

### Decision 4: DirectoryPicker 直接引用現有 shortenPath 函數

**選擇方案**：在 `DirectoryPicker.tsx` 中 import `shortenPath` from `./CwdSelector`，將 header 的 `{browsePath}` 改為 `{shortenPath(browsePath)}`，保留 `truncate` CSS class 作為 fallback。

**替代方案**：將 `shortenPath` 抽取到獨立的 utility 檔案（如 `utils/path.ts`）再從兩處引用。
**取捨**：抽取 utility 更符合 SRP，但 `shortenPath` 目前只有兩處使用，從 `CwdSelector` 直接 import 更簡潔。若未來有第三處使用再考慮抽取。

## Risks / Trade-offs

- **[TabBar dialog 非同步行為]** → `ConfirmDialog` 是非同步的（使用者可能先關閉 context menu 再操作 dialog）。緩解：context menu 的 `onClose` 在 dialog 開啟前即執行，dialog 的 `onConfirm` 直接呼叫 `onDeleteConversation()`，流程不受影響。

- **[AppShell event listener 生命週期]** → `openspec:changed` listener 在 AppShell 整個生命週期都存在，即使 OpenSpec 功能關閉。緩解：listener 只觸發一個輕量 API 呼叫（getOverview），且有 debounce 保護，overhead 可忽略。

- **[Zustand selector 參照穩定性]** → `s.settings?.openspecEnabled ?? false` 每次都回傳 primitive boolean，Zustand 會正確做 shallow equality 比較，不會造成不必要的重新渲染。風險極低。
