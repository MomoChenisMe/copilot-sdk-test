## ADDED Requirements

### Requirement: 規格清單項目 SHALL 顯示 Summary 摘要

OpenSpec 規格清單中每個規格項目 MUST 在名稱下方顯示 summary 摘要文字。摘要 MUST 由後端從 spec.md 內容中提取，規則為：跳過空行、`#` 標題行和 `---` 分隔行，取第一段非空文字的前 150 字元。前端 MUST 使用 `line-clamp-2` 限制最多顯示兩行。若 summary 為空字串，MUST 不顯示摘要區塊。

#### Scenario: 規格有摘要內容
- **WHEN** spec.md 的第一段非標題文字為「系統須支援使用者透過 Web UI 進行登入認證...」
- **THEN** 規格清單項目名稱下方顯示該摘要文字，最多兩行，超出部分截斷

#### Scenario: 規格無摘要內容
- **WHEN** spec.md 只有標題行和空行，無正文段落
- **THEN** 規格清單項目僅顯示名稱和檔案大小，不顯示摘要

### Requirement: 規格清單 SHALL 顯示正確的檔案大小

後端 `GET /api/openspec/specs` 回應的每個規格項目 MUST 包含 `size` 欄位（number 型別，單位 bytes），透過 `fs.statSync` 取得實際檔案大小。前端 MUST 正確格式化顯示（B/KB/MB）。

#### Scenario: 正確顯示檔案大小
- **WHEN** spec.md 檔案大小為 2048 bytes
- **THEN** 規格清單項目顯示 `2.0 KB`

#### Scenario: API 回應包含 size 欄位
- **WHEN** 呼叫 `GET /api/openspec/specs`
- **THEN** 每個項目包含 `name`（string）、`size`（number）、`summary`（string）欄位

### Requirement: 規格名稱旁 SHALL 有複製按鈕

規格清單中每個項目 MUST 在名稱區塊和檔案大小之間顯示一個複製按鈕（`Copy` icon）。點擊按鈕 MUST 將規格名稱複製到系統剪貼簿。複製成功後按鈕 MUST 變為綠色 `Check` icon，2 秒後恢復。複製按鈕 MUST NOT 觸發規格詳情頁導航（需要 `stopPropagation`）。

#### Scenario: 點擊複製按鈕成功複製
- **WHEN** 使用者點擊規格項目「web-auth」旁的複製按鈕
- **THEN** 系統剪貼簿內容為 `web-auth`，按鈕 icon 變為綠色 Check

#### Scenario: 複製按鈕 2 秒後恢復
- **WHEN** 複製成功後經過 2 秒
- **THEN** 按鈕 icon 從 Check 恢復為 Copy

#### Scenario: 複製按鈕不觸發導航
- **WHEN** 使用者點擊複製按鈕
- **THEN** 不導航到規格詳情頁（事件不冒泡到父元素的 `onSelect`）

## MODIFIED Requirements

### Requirement: OpenSpec 總覽頁專案設定區塊佈局

OpenSpec 總覽頁（Overview tab）的「專案設定」卡片 MUST 使用 flex 佈局填滿面板剩餘的垂直空間，取代原有的 `max-h-64`（256px）固定高度。卡片內部的 header 和 tab 按鈕 MUST 為固定高度（`shrink-0`），內容區 MUST 為 `flex-1` 可捲動。OpenSpecPanel 的 content wrapper 在 overview tab MUST 使用 `overflow-hidden` 讓內部元件自行管理滾動。

#### Scenario: 專案設定卡片填滿剩餘空間
- **WHEN** 使用者開啟 OpenSpec 面板的總覽 tab
- **THEN** 專案設定卡片向下延伸填滿面板剩餘空間，內容可獨立捲動

#### Scenario: 無 config 時不顯示設定卡片
- **WHEN** 專案沒有 config.yaml
- **THEN** 總覽頁僅顯示統計數字區塊，不出現空白的設定卡片

#### Scenario: 設定內容可捲動
- **WHEN** 專案說明文字超過可見區域高度
- **THEN** 設定卡片的內容區域可獨立捲動，header 和 tab 按鈕固定不動
