## Context

本次變更涵蓋 9 項改進，橫跨前端 UI（TabBar、OpenSpec Panel、ArtifactsPanel、SettingsPanel、ConfirmDialog）和後端（SQLite metadata 表）。專案是個人使用的 AI Terminal Web 應用，使用 React 19 + Zustand 前端、Express 5 + better-sqlite3 後端。

目前狀態：
- **TabBar** 使用 pointer events 實作拖曳，但缺少被交換 tab 的滑動動畫，且放開後回位有延遲
- **ConfirmDialog** 使用 `t('common.confirm')` 但該 key 不在翻譯檔中
- **LLM 語言設定**的「自訂...」選項因 state 管理邏輯錯誤而無法使用
- **OpenSpec 危險區**放在 Overview，位置不直覺
- **Artifacts Panel** 在空陣列時完全不顯示
- **OpenSpec 元資料**純檔案管理，無結構化記錄

## Goals / Non-Goals

**Goals:**
- 修復 5 個已知 bug（i18n、LLM 語言、封存日期、拖曳延遲、交換動畫）
- 新增 Tab 自定義功能（命名 + 顏色）
- 將 OpenSpec 危險操作移至獨立設定頁籤
- 提供 Artifacts 空狀態 UI
- 建立 OpenSpec 規格元資料的資料庫記錄機制

**Non-Goals:**
- 不重新設計 TabBar 的整體樣式或佈局
- 不實作使用者帳號系統（`created_by` 暫記固定值）
- 不支援 Tab 自訂色碼輸入（僅預設色盤）
- 不重構 CustomSelect 元件本身

## Decisions

### Decision 1: Tab 拖曳動畫修復策略

**選擇**: 在 `flushSync` 前後記錄被交換 tab 的 `offsetLeft`，用 FLIP（First, Last, Invert, Play）技巧實現平滑滑動。

**替代方案**: 使用 CSS `order` 屬性 + `transition` 來處理位置變化。
**取捨**: CSS order 方案需要重構整個 tabOrder 渲染邏輯，FLIP 只需在交換點加入少量程式碼，改動範圍最小。

回位延遲修復：移除 `handlePointerUp` 中的 `requestAnimationFrame` wrapper，直接在同步流程中設定 transition 和 transform，保留 `setTimeout` 作為 fallback guard。

**替代方案**: 完全改用 CSS animation（`@keyframes`）取代 imperative style 操作。
**取捨**: keyframes 需要動態產生動畫名稱並管理生命週期，對這個簡單的回位場景來說過於複雜。

### Decision 2: Tab 自定義的 State 設計

**選擇**: 在 Zustand `TabState` 中新增 `customTitle?: string` 和 `color?: string`，通過現有的 `persistTabState()` 機制同步到 localStorage 和後端。

**替代方案**: 獨立的 `tabPreferences` store。
**取捨**: 新增 store 增加複雜度且需額外的持久化邏輯，直接擴展 TabState 最自然，與現有的 persist 流程完全相容。

顏色方案使用 8 個預設色（red、orange、yellow、green、teal、blue、purple、pink），以 `bg-{color}-500/10` 作為 active 背景、`bg-{color}-500/5` 作為 hover 背景。

**替代方案**: 使用 CSS custom property（`--tab-color`）搭配 `rgba()` 動態計算。
**取捨**: Tailwind 的 opacity modifier 已經能達到需求，不需要額外的 CSS variable 機制。但需要用 inline style 因為顏色是動態值。

### Decision 3: LLM 自訂語言 Bug 修復

**選擇**: 新增 `customMode` local state，將「自訂模式」的追蹤從 `llmLanguage` 值中解耦。

**替代方案 A**: 使用特殊 prefix（如 `custom:`）標記自訂值。
**取捨**: 需要在所有消費端（store、backend、useTabCopilot）strip prefix，侵入性太大。

**替代方案 B**: 修改 `isCustom` 的判斷邏輯。
**取捨**: 根本問題是選擇 `__custom` 時立即設定了一個恰好在預設列表中的值（`'en'`），修改判斷邏輯治標不治本。

### Decision 4: OpenSpec 設定頁籤

**選擇**: 在 OpenSpecPanel 的 tab 導航中新增第五個 tab `'settings'`，渲染 `OpenSpecSettings` 元件（包含危險區），從 `OpenSpecOverview` 中移除危險區 JSX。

**替代方案**: 使用底部固定的 floating action button。
**取捨**: FAB 佔用面板空間且不符合現有的 tab-based 導航模式。

### Decision 5: OpenSpec 元資料資料庫

**選擇**: 在現有的 SQLite `conversations.db` 中新增 `openspec_metadata` 表，由 `openspec-service.ts` 在建立/封存/刪除操作時同步寫入。

**替代方案**: 使用獨立的 JSON metadata 檔案存放在各規格目錄中。
**取捨**: 檔案方式缺乏查詢能力、無法原子性更新，且與現有的 SQLite 架構不一致。使用 DB 統一管理更符合專案慣例。

Schema 使用 `UNIQUE(name, type, cwd)` 作為複合唯一鍵，因為同一個 CWD 下的同名規格在不同類型（change、spec、archived）間不會衝突。

### Decision 6: Artifacts 空狀態

**選擇**: 移除 `AppShell.tsx` 中 `artifacts.length > 0` 的開啟條件，在 `ArtifactsPanel` 內部加入空狀態 UI（Package icon + 文字）。

**替代方案**: 保持面板不可開啟但在 TopBar 按鈕上顯示 tooltip 說明原因。
**取捨**: 使用者已經點了按鈕表示有意開啟，顯示空狀態比靜默忽略更友好。

## Risks / Trade-offs

**[Risk] FLIP 動畫在快速拖曳時可能閃爍** → 在 `requestAnimationFrame` 中啟動 transition，確保瀏覽器已完成 layout 計算再開始動畫。

**[Risk] Tab 顏色使用 inline style 可能與 Tailwind 的 class-based 方式不一致** → 僅用於動態顏色值，靜態樣式仍使用 Tailwind class。將顏色映射為具名常數（`TAB_COLORS`），避免任意值。

**[Risk] openspec_metadata 表與檔案系統狀態可能不同步** → Service 層在每次檔案操作後同步更新 DB，並在 overview API 中提供 metadata merge 邏輯。DB 視為輔助記錄，檔案系統仍為真實來源。

**[Risk] 雙擊重新命名可能與點擊選取 tab 衝突** → 使用 250ms 延遲區分單擊和雙擊，或在 `onDoubleClick` handler 中呼叫 `e.preventDefault()` 並用 `wasDraggingRef` 防止拖曳中的誤觸。

**[Trade-off] 9 項改進作為單一 change** → 範圍較大但項目之間有交叉依賴（如 i18n 涉及多個元件），拆分反而增加合併衝突風險。
