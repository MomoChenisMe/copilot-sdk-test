## MODIFIED Requirements

### Requirement: OpenSpec 總覽頁專案設定區塊佈局

OpenSpec 總覽頁（Overview tab）的「專案設定」卡片 MUST 使用 flex 佈局填滿面板剩餘的垂直空間，取代原有的 `max-h-64`（256px）固定高度。卡片內部的 header 和 tab 按鈕 MUST 為固定高度（`shrink-0`），內容區 MUST 為 `flex-1` 可捲動。OpenSpecPanel 的 content wrapper 在 overview tab MUST 使用 `overflow-hidden` 讓內部元件自行管理滾動。

「未找到 OpenSpec」狀態 MUST 新增「初始化 OpenSpec」按鈕（詳見 `openspec-init` spec）。

#### Scenario: 專案設定卡片填滿剩餘空間

- **WHEN** 使用者開啟 OpenSpec 面板的總覽 tab
- **THEN** 專案設定卡片向下延伸填滿面板剩餘空間，內容可獨立捲動

#### Scenario: 無 config 時不顯示設定卡片

- **WHEN** 專案沒有 config.yaml
- **THEN** 總覽頁僅顯示統計數字區塊，不出現空白的設定卡片

#### Scenario: 設定內容可捲動

- **WHEN** 專案說明文字超過可見區域高度
- **THEN** 設定卡片的內容區域可獨立捲動，header 和 tab 按鈕固定不動

#### Scenario: 未找到 OpenSpec 時顯示初始化按鈕

- **WHEN** 指定 CWD 下未找到 openspec/ 目錄
- **THEN** 面板 MUST 顯示「初始化 OpenSpec」按鈕於空狀態提示下方

## ADDED Requirements

### Requirement: Task Checkbox 雙向 Toggle

OpenSpec 變更詳情的任務清單中，單個 checkbox MUST 支援雙向 toggle（勾選和取消勾選）。前端 MUST 傳送 `line.text`（純任務文字，如 `"5.1 撰寫測試"`）給後端 `PATCH /api/openspec/changes/:name/task` 端點，而非 `line.raw`（完整 markdown 行）。

批次操作（「全部標記完成」和「重置任務」）MUST 同樣使用 `t.text` 作為 `taskLine` 參數。

#### Scenario: 取消勾選單個任務

- **WHEN** 使用者點擊已勾選的 checkbox（如 `"- [x] 5.1 撰寫測試"`）
- **THEN** 前端 MUST 傳送 `{ taskLine: "5.1 撰寫測試", checked: false }`
- **AND** 後端 MUST 將 `[x]` 替換為 `[ ]`
- **AND** UI MUST 更新 checkbox 為未勾選狀態

#### Scenario: 勾選單個任務

- **WHEN** 使用者點擊未勾選的 checkbox（如 `"- [ ] 5.1 撰寫測試"`）
- **THEN** 前端 MUST 傳送 `{ taskLine: "5.1 撰寫測試", checked: true }`
- **AND** 後端 MUST 將 `[ ]` 替換為 `[x]`

#### Scenario: 批次全部標記完成

- **WHEN** 使用者點擊「全部標記完成」按鈕
- **THEN** 前端 MUST 對每個未完成任務傳送 `{ taskLine: t.text, checked: true }`

#### Scenario: 批次重置任務

- **WHEN** 使用者點擊「重置任務」按鈕
- **THEN** 前端 MUST 對每個已完成任務傳送 `{ taskLine: t.text, checked: false }`

### Requirement: 差異規格 Accordion 展開顯示

變更詳情的「差異規格」tab MUST 將靜態名稱列表改為 accordion 展開式 UI。每個 delta spec 項目 MUST：
1. 預設顯示 spec 名稱和 layers icon（與目前相同）
2. 點擊時展開/摺疊顯示完整 spec.md 內容
3. 首次展開時 MUST 呼叫 `GET /api/openspec/changes/:name/specs/:specName` 載入內容
4. 已載入的內容 MUST 被快取，避免重複請求
5. 內容 MUST 使用 Markdown 元件渲染
6. 載入中 MUST 顯示 loading indicator

#### Scenario: 點擊展開 delta spec

- **WHEN** 使用者在差異規格 tab 點擊 spec 名稱「auth-security」
- **THEN** 該項目 MUST 展開顯示完整的 spec.md markdown 內容
- **AND** 其他已展開的項目 MUST 保持展開狀態（非手風琴式）

#### Scenario: 點擊摺疊已展開的 spec

- **WHEN** 使用者點擊已展開的 spec 名稱
- **THEN** 該項目 MUST 摺疊隱藏內容

#### Scenario: 內容快取

- **WHEN** 使用者摺疊後再次展開同一個 spec
- **THEN** MUST NOT 重新呼叫 API，直接顯示快取內容

#### Scenario: 載入失敗

- **WHEN** API 呼叫失敗
- **THEN** MUST 顯示錯誤提示文字（如「載入規格失敗」）

### Requirement: Delta Spec 內容 API

後端 MUST 提供 `GET /api/openspec/changes/:name/specs/:specName?cwd=` 端點，回傳 delta spec 的完整 spec.md 內容。

#### Scenario: 成功取得 delta spec

- **WHEN** 呼叫 `GET /api/openspec/changes/my-change/specs/auth-security`
- **AND** `openspec/changes/my-change/specs/auth-security/spec.md` 存在
- **THEN** 回傳 200 `{ name: 'auth-security', content: '<spec.md 內容>' }`

#### Scenario: Delta spec 不存在

- **WHEN** 呼叫 `GET /api/openspec/changes/my-change/specs/nonexistent`
- **THEN** 回傳 404 `{ error: 'Delta spec not found' }`

#### Scenario: Change 不存在

- **WHEN** 呼叫 `GET /api/openspec/changes/nonexistent/specs/any`
- **THEN** 回傳 404

### Requirement: 即時檔案變更自動刷新

OpenSpec 面板在開啟狀態下 MUST 監聽 `openspec:changed` CustomEvent 事件，收到事件後 debounce 300ms 後自動呼叫 `refreshAll()` 刷新所有資料。

#### Scenario: 外部修改後自動刷新

- **WHEN** 面板開啟
- **AND** 使用者透過 CLI 修改了 openspec/changes/my-change/tasks.md
- **THEN** 面板 MUST 在約 800ms 內自動刷新（500ms watcher debounce + 300ms frontend debounce）

#### Scenario: 面板關閉時不監聽

- **WHEN** 面板關閉
- **THEN** MUST 移除 event listener，不觸發任何 API 呼叫

### Requirement: TopBar OpenSpec 按鈕狀態指示器

TopBar 的 OpenSpec 按鈕（BookOpen icon）MUST 在當前 tab 的 CWD 下偵測到 openspec 內容時顯示視覺指示器。指示器 MUST 為小圓點 badge，參照現有 Artifacts 按鈕的 badge 模式（`absolute -top-0.5 -right-0.5 rounded-full`）。

TopBar MUST 新增 `openSpecActive?: boolean` prop。當 `openSpecActive` 為 `true` 時，顯示 accent 色小圓點（無文字）。當為 `false` 或 `undefined` 時不顯示。

AppShell MUST 根據 OpenSpec overview API 的 `resolvedPath` 是否為非 null 來判斷 `openSpecActive` 值。

#### Scenario: CWD 下有 OpenSpec 時顯示指示器

- **WHEN** 當前 tab 的 CWD 下存在 openspec/ 目錄（overview API 回傳 `resolvedPath` 非 null）
- **THEN** TopBar 的 OpenSpec 按鈕 MUST 顯示 accent 色小圓點 badge

#### Scenario: CWD 下無 OpenSpec 時不顯示

- **WHEN** 當前 tab 的 CWD 下不存在 openspec/（overview API 回傳 `resolvedPath` 為 null）
- **THEN** TopBar 的 OpenSpec 按鈕 MUST NOT 顯示圓點 badge

#### Scenario: 指示器樣式

- **WHEN** `openSpecActive` 為 `true`
- **THEN** 圓點 MUST 為純色小圓（約 `w-2 h-2`），使用 `bg-accent` 色彩，位於按鈕右上角
