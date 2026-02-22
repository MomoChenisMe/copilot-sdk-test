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

### Requirement: AtFileMenu 目錄瀏覽

AtFileMenu SHALL 支援在對話 cwd 範圍內瀏覽目錄結構，目錄在前、檔案在後，分別以不同圖示區分。

#### Scenario: 初始載入 cwd 目錄

- **WHEN** AtFileMenu 開啟
- **THEN** 系統 MUST 呼叫 `GET /api/directories?path={cwd}&includeFiles=true&showHidden=true`
- **AND** MUST 顯示 loading indicator 直到回應完成
- **AND** 回應後 MUST 依序顯示目錄（Folder 圖示）和檔案（FileText 圖示）

#### Scenario: 點擊目錄進入瀏覽

- **WHEN** 使用者點擊選單中的目錄項目
- **THEN** 選單 MUST 載入該目錄的內容
- **AND** MUST 顯示麵包屑路徑（相對於 cwd）
- **AND** MUST 在頂部顯示 `..` 返回上層選項

#### Scenario: 不可超出 cwd 根目錄

- **WHEN** 目前瀏覽路徑已為對話 cwd
- **THEN** 選單 MUST NOT 顯示 `..` 返回上層選項

#### Scenario: 鍵盤導航

- **WHEN** AtFileMenu 處於開啟狀態
- **THEN** ArrowUp/ArrowDown MUST 在選單項目間移動選取
- **AND** Enter/Tab MUST 選取當前選中項目（無論檔案或目錄），將其作為 `@displayName` 引用加入輸入框
- **AND** ArrowRight 在目錄項目上 MUST 進入該目錄瀏覽，並同步更新輸入框文字為 `@<相對路徑>/`
- **AND** ArrowLeft MUST 返回上層目錄，並同步更新輸入框文字

#### Scenario: 空目錄

- **WHEN** 目前瀏覽的目錄沒有任何檔案或子目錄
- **THEN** 選單 MUST 顯示「無檔案」的空狀態訊息

### Requirement: 選取項目後 chip 顯示

使用者選取檔案或目錄後，系統 SHALL 在輸入框中以 chip/tag 樣式顯示 `@displayName`，與文字內容內嵌呈現。

#### Scenario: 選取項目插入 chip

- **WHEN** 使用者在 AtFileMenu 中點擊檔案，或按 Enter/Tab 選取一個項目（檔案或目錄）
- **THEN** 輸入框中的 `@filter文字` MUST 被替換為 `@<顯示名稱>`（相對於 cwd 的路徑）加上尾隨空格
- **AND** 游標 MUST 移到替換文字之後
- **AND** 選單 MUST 關閉

#### Scenario: chip 視覺渲染

- **WHEN** 輸入框文字包含已選取的 `@filename` 引用
- **THEN** highlight overlay MUST 將該片段渲染為 chip 樣式（帶背景色、圓角的 accent 色調）
- **AND** 非 @file 的普通文字 MUST 維持原本的顯示方式

#### Scenario: 多個 @file 引用

- **WHEN** 使用者在同一訊息中選取多個檔案
- **THEN** 每個 `@filename` MUST 獨立以 chip 樣式渲染
- **AND** 之間的普通文字 MUST 正常顯示

#### Scenario: 刪除 @filename 文字同步移除引用

- **WHEN** 使用者手動編輯輸入框，刪除或修改某個 `@filename` 的文字
- **THEN** 對應的 contextFile 引用 MUST 從內部追蹤清單中移除

### Requirement: contextFiles 資料傳遞

發送訊息時，系統 SHALL 將選取的檔案路徑陣列透過 WebSocket `copilot:send` 傳遞至後端。

#### Scenario: 發送帶有 contextFiles 的訊息

- **WHEN** 使用者發送包含 @file 引用的訊息
- **THEN** WebSocket `copilot:send` payload MUST 包含 `contextFiles` 欄位（字串陣列，每個元素為檔案的絕對路徑）
- **AND** 訊息文字中 MUST 保留 `@filename` 文字
- **AND** 發送後 contextFiles 內部追蹤清單 MUST 清空

#### Scenario: 無 @file 引用時不傳 contextFiles

- **WHEN** 使用者發送不包含 @file 引用的訊息
- **THEN** WebSocket payload MUST NOT 包含 `contextFiles` 欄位（或為空陣列）

#### Scenario: contextFiles 與 file attachments 共存

- **WHEN** 使用者同時附加上傳檔案（迴紋針）和 @file 引用
- **THEN** `files`（附件）和 `contextFiles`（路徑引用）MUST 獨立傳遞，互不干擾

### Requirement: 後端讀取 contextFiles 注入上下文

後端收到 `contextFiles` 後 SHALL 讀取每個檔案的內容並前綴到 AI prompt 作為上下文。

#### Scenario: 正常讀取檔案內容

- **WHEN** 後端收到 `copilot:send` 包含 `contextFiles: ["/path/to/file.ts"]`
- **AND** 該檔案存在且大小 ≤ 500KB
- **THEN** 後端 MUST 讀取檔案的 UTF-8 內容
- **AND** MUST 以 `[File: /path/to/file.ts]\n<content>` 格式前綴到 prompt

#### Scenario: 多個 contextFiles 依序注入

- **WHEN** `contextFiles` 包含多個檔案路徑
- **THEN** 每個檔案的內容 MUST 依序以雙換行分隔前綴到 prompt
- **AND** 所有 contextFiles 內容 MUST 出現在使用者原始文字之前

#### Scenario: 檔案過大跳過

- **WHEN** contextFile 指向的檔案大小 > 500KB
- **THEN** 後端 MUST 跳過該檔案
- **AND** MUST 在 context 中標記 `[File: /path] (File too large)`

#### Scenario: 檔案不存在或無法讀取

- **WHEN** contextFile 指向的路徑不存在或無法讀取（權限不足、非檔案）
- **THEN** 後端 MUST 跳過該檔案
- **AND** MUST NOT 導致整個訊息處理失敗

#### Scenario: contextFiles 存入訊息 metadata

- **WHEN** 後端處理包含 contextFiles 的訊息
- **THEN** MUST 將 contextFiles 路徑陣列存入 user message 的 `metadata.contextFiles` 欄位

### Requirement: 訊息歷史中的 @file 顯示

已發送的使用者訊息 SHALL 在訊息區塊中顯示引用了哪些檔案。

#### Scenario: 顯示 contextFiles chip

- **WHEN** 渲染 user 訊息且 `metadata.contextFiles` 存在
- **THEN** MUST 在訊息文字下方顯示檔案引用 chip 列表
- **AND** 每個 chip MUST 顯示 `@{filename}`（僅檔案名稱，非完整路徑）
- **AND** chip MUST 使用 accent 色調的背景樣式

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
