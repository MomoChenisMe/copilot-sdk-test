## 1. TabBar ConfirmDialog 統一

- [x] 1.1 撰寫 TabBar 刪除對話 ConfirmDialog 測試：驗證點擊刪除後顯示 ConfirmDialog、確認後執行刪除、取消後不刪除、不使用 window.confirm
- [x] 1.2 實作 TabBar ConfirmDialog 替換：新增 deleteDialogOpen/pendingDeleteTabId state，將 window.confirm 替換為 ConfirmDialog（destructive 模式），import ConfirmDialog 元件
- [x] 1.3 驗證 TabBar 測試通過且無 TypeScript 編譯錯誤

## 2. SettingsPanel ConfirmDialog 統一

- [x] 2.1 撰寫 SystemPromptTab 重設確認 ConfirmDialog 測試：驗證點擊重設後顯示 ConfirmDialog、確認後執行重設、取消後保留內容、不使用 window.confirm
- [x] 2.2 實作 SystemPromptTab ConfirmDialog 替換：新增 resetDialogOpen state，將 window.confirm 替換為 ConfirmDialog（destructive 模式），import ConfirmDialog 元件
- [x] 2.3 驗證 SettingsPanel 測試通過且無 TypeScript 編譯錯誤

## 3. OpenSpec SDD Toggle 全域 Store 同步

- [x] 3.1 撰寫 SettingsPanel OpenSpec toggle 全域 store 同步測試：驗證 enable 時 store.settings.openspecEnabled 為 true、disable 時為 false、API 失敗時 store 不變
- [x] 3.2 實作 handleToggleOpenspec 中新增 setSettings 呼叫（已存在於工作區）：在 configApi.putOpenspecSdd 成功後呼叫 useAppStore.getState().setSettings({ openspecEnabled: newEnabled })
- [x] 3.3 驗證 toggle 同步測試通過

## 4. AppShell TopBar 響應式綁定

- [x] 4.1 撰寫 AppShell openspecEnabled selector 測試：驗證 settings.openspecEnabled 為 false 時 onOpenSpecClick 為 undefined、為 true 時為 function
- [x] 4.2 實作 AppShell 改用 Zustand selector：新增 `const openspecEnabled = useAppStore((s) => s.settings?.openspecEnabled ?? false)` 取代 `useAppStore.getState().settings?.openspecEnabled`
- [x] 4.3 驗證 AppShell 響應式綁定測試通過

## 5. AppShell 監聽 openspec:changed 事件

- [x] 5.1 撰寫 AppShell openspec:changed event listener 測試：驗證事件觸發後 openSpecActive 更新、debounce 行為正確（300ms 內多次事件只觸發一次 API 呼叫）
- [x] 5.2 實作 AppShell 新增 useEffect 監聽 openspec:changed CustomEvent，事件觸發時以 300ms debounce 呼叫 openspecApi.getOverview(tabCwd) 更新 openSpecActive
- [x] 5.3 驗證 event listener 測試通過

## 6. DirectoryPicker 路徑顯示改善

- [x] 6.1 撰寫 DirectoryPicker header 路徑顯示測試：驗證長路徑使用 shortenPath 智慧縮短（如 `/Users/momochenisme/Documents/GitHub/copilot-sdk-test` 顯示為 `~/…/GitHub/copilot-sdk-test`）、短路徑原樣顯示、根路徑顯示 `/`
- [x] 6.2 實作 DirectoryPicker import shortenPath 並套用到 header 路徑：`import { shortenPath } from './CwdSelector'`，將 `{browsePath}` 改為 `{shortenPath(browsePath)}`，保留 `truncate` CSS class
- [x] 6.3 驗證 DirectoryPicker 測試通過

## 7. 整合驗證

- [x] 7.1 執行全部前端測試 (`npm test --workspace=frontend`) 確保無 regression
- [x] 7.2 執行 TypeScript 編譯檢查 (`npx tsc --noEmit --workspace=frontend`) 確保無型別錯誤
