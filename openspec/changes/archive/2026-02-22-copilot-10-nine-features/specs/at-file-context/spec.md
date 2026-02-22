## ADDED Requirements

### Requirement: AtFileMenu 模糊搜尋模式

AtFileMenu SHALL 支援模糊搜尋模式，當使用者輸入非路徑格式的 filter 時，自動切換為全專案模糊搜尋。

#### Scenario: 模糊搜尋模式啟動

- **WHEN** 使用者輸入 `@pack`（filter 不含 `/`）
- **THEN** AtFileMenu MUST 切換為模糊搜尋模式
- **AND** MUST 呼叫 `directoryApi.search(cwd, "pack")` 取得全專案結果
- **AND** MUST 顯示扁平結果列表（非目錄結構）

#### Scenario: 模糊搜尋 debounce

- **WHEN** 使用者快速連續輸入 `@p`, `@pa`, `@pac`, `@pack`
- **THEN** 系統 MUST debounce 200ms 後才發送搜尋請求
- **AND** 只有最後一次輸入的搜尋結果會被顯示

#### Scenario: 搜尋結果顯示格式

- **WHEN** 模糊搜尋回傳結果
- **THEN** 每個結果 MUST 顯示：
  - 檔案/目錄 icon（FileText / Folder）
  - 檔名（匹配部分高亮）
  - 相對路徑（muted 色顯示在檔名下方）

#### Scenario: 模糊搜尋選取項目

- **WHEN** 使用者在模糊搜尋結果中選取一個檔案
- **THEN** 行為 MUST 與原有目錄瀏覽的選取完全相同（替換 @filter 為 @displayName + 空格）

#### Scenario: 空 filter 顯示目錄瀏覽

- **WHEN** 使用者只輸入 `@`（filter 為空）
- **THEN** 系統 MUST 顯示目錄瀏覽模式（cwd 根目錄內容）

#### Scenario: filter 含 `/` 切換目錄瀏覽

- **WHEN** 使用者輸入 `@src/`（filter 含 `/`）
- **THEN** 系統 MUST 切換為目錄瀏覽模式
- **AND** MUST 導航到 `src/` 目錄

#### Scenario: 搜尋無結果

- **WHEN** 模糊搜尋回傳空結果
- **THEN** 選單 MUST 顯示「無匹配結果」的空狀態訊息

## MODIFIED Requirements

### Requirement: @ 觸發檔案選擇選單

當使用者在聊天輸入框中輸入 `@` 字元時，系統 SHALL 彈出檔案選擇下拉選單（AtFileMenu），顯示當前對話 cwd 下的檔案與目錄。AtFileMenu 支援兩種模式：模糊搜尋（預設）和目錄瀏覽。

#### Scenario: 輸入 @ 觸發選單

- **WHEN** 使用者在輸入框中輸入 `@`（前方為字串開頭、空白或換行）
- **THEN** 系統 MUST 在輸入框上方顯示 AtFileMenu 下拉選單
- **AND** 選單 MUST 顯示對話 cwd 目錄下的目錄和檔案列表（目錄瀏覽模式）

#### Scenario: @ 後輸入文字觸發模糊搜尋

- **WHEN** 使用者在 `@` 後輸入文字且不含 `/`（如 `@src`）
- **THEN** 選單 MUST 切換為模糊搜尋模式，呼叫搜尋 API 並顯示全專案結果

#### Scenario: @ 後輸入含 / 的路徑保持目錄瀏覽

- **WHEN** 使用者在 `@` 後輸入含 `/` 的文字（如 `@src/comp`）
- **THEN** 選單 MUST 以目錄瀏覽模式顯示，導航到對應目錄並以末段過濾

#### Scenario: @ 觸發條件不成立

- **WHEN** `@` 前方緊接非空白字元（如 `email@`）
- **THEN** 系統 MUST NOT 觸發選單

#### Scenario: Escape 關閉選單

- **WHEN** AtFileMenu 處於開啟狀態
- **AND** 使用者按下 Escape
- **THEN** 選單 MUST 關閉
- **AND** 輸入框中的文字 MUST 保持不變
