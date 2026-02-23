## Why

應用程式中的確認對話框使用不一致：`TabBar` 刪除對話和 `SettingsPanel` 重設系統提示詞仍使用原生 `window.confirm()`，而 `OpenSpecPanel` 已採用自定義的 `ConfirmDialog` 元件。此外，Settings 中關閉 OpenSpec SDD toggle 後，TopBar 的 OpenSpec 按鈕不會即時消失（因全域 store 未同步），且刪除 OpenSpec 資料夾後 TopBar 的藍色指示器也不會即時更新（因 AppShell 未監聽 `openspec:changed` 事件）。另外，DirectoryPicker overlay 頂部的 CWD 路徑顯示使用 CSS `truncate` 直接截斷全路徑，未套用已有的 `shortenPath()` 智慧縮短函數，導致路徑過長時被截成不可辨識的狀態（如 `/Users/momochenisme/Documents/GitHub/c...`）。這些問題共同影響 UI 一致性和使用體驗，需要一次性修復。

## What Changes

- 將 `TabBar.tsx` 中 `window.confirm()` 替換為 `ConfirmDialog`（刪除對話記錄確認）
- 將 `SettingsPanel.tsx` 中 `window.confirm()` 替換為 `ConfirmDialog`（重設系統提示詞確認）
- `SettingsPanel.tsx` 的 `handleToggleOpenspec` 新增 `setSettings({ openspecEnabled })` 同步全域 Zustand store
- `AppShell.tsx` 改用 Zustand selector 訂閱 `settings.openspecEnabled`，使 TopBar 的 OpenSpec 按鈕能響應式顯示/隱藏
- `AppShell.tsx` 新增 `openspec:changed` CustomEvent 監聽，使 TopBar 藍色指示器在 OpenSpec 資料夾刪除/新增後即時更新
- `DirectoryPicker.tsx` 的路徑顯示改用 `shortenPath()` 函數（已存在於 `CwdSelector.tsx`），取代純 CSS truncate 截斷

## Non-Goals

- 不重構 `ConfirmDialog` 元件本身的 API 或樣式
- 不新增其他類型的 dialog 元件（如 prompt dialog、alert dialog）
- 不改變 `UserInputDialog` 或 `MobileToolbarPopup` 的行為
- 不修改 OpenSpec 的刪除/初始化後端邏輯
- 不修改 WebSocket `openspec:changed` 事件的廣播機制

## Capabilities

### New Capabilities

（無新增 capability）

### Modified Capabilities

- `app-layout`: TopBar 的 OpenSpec 按鈕改為響應式綁定 `settings.openspecEnabled`，並監聽 `openspec:changed` 即時更新藍色指示器
- `openspec-sdd-toggle`: Settings toggle handler 須同步全域 store，確保 TopBar 即時反映 toggle 狀態
- `settings-full-page`: 系統提示詞重設確認改用 `ConfirmDialog` 取代 `window.confirm()`
- `directory-picker`: DirectoryPicker overlay 的路徑顯示改用 `shortenPath()` 智慧縮短，取代純 CSS 截斷

## Impact

- **前端元件**：`TabBar.tsx`、`SettingsPanel.tsx`、`AppShell.tsx`、`DirectoryPicker.tsx` 四個檔案修改
- **共用元件**：`ConfirmDialog` 元件被更多地方引用，但元件本身不需修改
- **狀態管理**：`useAppStore.settings.openspecEnabled` 的寫入時機新增（SettingsPanel toggle 時）
- **事件監聽**：AppShell 新增 `openspec:changed` window event listener
- **無 API 變更**：後端完全不受影響
- **無 breaking change**：所有變更均為前端內部行為修正
