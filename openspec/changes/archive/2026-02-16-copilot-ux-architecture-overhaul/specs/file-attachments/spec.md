## ADDED Requirements

### Requirement: 附檔按鈕

聊天輸入框 SHALL 提供一個附檔按鈕（Paperclip icon），點擊後開啟檔案選擇對話框。

#### Scenario: 附檔按鈕顯示
- **WHEN** 聊天輸入框渲染
- **THEN** 輸入框 MUST 在 Send 按鈕旁顯示 Paperclip icon 按鈕

#### Scenario: 點擊附檔按鈕
- **WHEN** 使用者點擊附檔按鈕
- **THEN** 系統 MUST 開啟原生檔案選擇對話框，`accept` 屬性限制為支援的檔案類型

#### Scenario: 選擇檔案
- **WHEN** 使用者在檔案選擇對話框中選取一個或多個檔案
- **THEN** 系統 MUST 將檔案加入 `attachments` 列表，並在輸入框下方顯示預覽

#### Scenario: 串流中停用
- **WHEN** 對話正在 streaming
- **THEN** 附檔按鈕 MUST 被停用（disabled），MUST NOT 允許新增附件

### Requirement: 剪貼簿貼上圖片

輸入框 SHALL 支援從剪貼簿直接貼上圖片。

#### Scenario: 貼上剪貼簿圖片
- **WHEN** 使用者在輸入框中按 Ctrl+V / Cmd+V 且剪貼簿包含圖片資料
- **THEN** 系統 MUST 將圖片加入 `attachments` 列表，檔名為 `paste-{timestamp}.png`

#### Scenario: 貼上純文字
- **WHEN** 使用者按 Ctrl+V / Cmd+V 且剪貼簿只包含純文字
- **THEN** 系統 MUST 按正常行為將文字貼入 textarea，MUST NOT 建立附件

### Requirement: 拖放上傳

輸入框 SHALL 支援檔案拖放上傳。

#### Scenario: 拖曳檔案到輸入區域
- **WHEN** 使用者將檔案拖曳到輸入框區域上方
- **THEN** 輸入框 MUST 顯示拖放提示視覺效果（例如虛線邊框 + 提示文字）

#### Scenario: 放下檔案
- **WHEN** 使用者在輸入框區域內放下檔案
- **THEN** 系統 MUST 將檔案加入 `attachments` 列表

#### Scenario: 拖曳離開
- **WHEN** 使用者將檔案拖曳離開輸入框區域
- **THEN** 拖放提示視覺效果 MUST 消失

### Requirement: 附件預覽

系統 SHALL 在輸入框下方顯示已選附件的預覽列表。

#### Scenario: 圖片附件預覽
- **WHEN** 附件為圖片類型（image/png, image/jpeg, image/gif, image/webp）
- **THEN** 系統 MUST 顯示 48x48 縮圖，使用 `URL.createObjectURL(file)` 產生預覽

#### Scenario: 文件附件預覽
- **WHEN** 附件為文件類型（PDF, TXT, MD, CSV, JSON）
- **THEN** 系統 MUST 顯示檔案圖示（FileText icon）、檔名和檔案大小

#### Scenario: 移除附件
- **WHEN** 使用者點擊附件預覽上的 X 按鈕
- **THEN** 系統 MUST 將該附件從 `attachments` 列表移除，圖片預覽 MUST 呼叫 `URL.revokeObjectURL()` 釋放記憶體

#### Scenario: 無附件時不佔空間
- **WHEN** `attachments` 列表為空
- **THEN** 預覽區域 MUST NOT 渲染，不佔用任何空間

### Requirement: 檔案類型與大小驗證

系統 SHALL 驗證上傳檔案的類型和大小。

#### Scenario: 支援的檔案類型
- **WHEN** 使用者選取 PNG, JPG, GIF, WebP, PDF, TXT, MD, CSV, JSON 檔案
- **THEN** 系統 MUST 接受並加入 `attachments` 列表

#### Scenario: 不支援的檔案類型
- **WHEN** 使用者選取不支援的檔案類型（例如 .exe, .zip）
- **THEN** 系統 MUST 拒絕該檔案並顯示 toast 錯誤訊息「不支援的檔案類型」

#### Scenario: 檔案大小超限
- **WHEN** 使用者選取超過 10MB 的檔案
- **THEN** 系統 MUST 拒絕該檔案並顯示 toast 錯誤訊息「檔案太大（最大 10MB）」

### Requirement: 後端檔案上傳 API

後端 SHALL 提供 `POST /api/upload` REST API 端點處理 multipart 檔案上傳。

#### Scenario: 成功上傳
- **WHEN** 前端發送 `POST /api/upload` 包含 multipart form-data 的檔案
- **THEN** 後端 MUST 儲存檔案到 upload 目錄，回傳 `200 { files: [{ id, name, type, size, path }] }`

#### Scenario: 未認證上傳
- **WHEN** 未認證的使用者發送 `POST /api/upload`
- **THEN** 後端 MUST 回傳 `401 Unauthorized`

#### Scenario: 無檔案上傳
- **WHEN** 請求中不包含任何檔案
- **THEN** 後端 MUST 回傳 `400 { error: "No files provided" }`

#### Scenario: 超過大小限制
- **WHEN** 上傳的檔案超過 10MB
- **THEN** 後端 MUST 回傳 `413 { error: "File too large" }`

### Requirement: 附檔隨訊息傳送

附件 SHALL 在使用者發送訊息時一併傳送給 Copilot SDK。

#### Scenario: 發送訊息含附件
- **WHEN** 使用者按下 Send 且 `attachments` 列表不為空
- **THEN** 前端 MUST 先呼叫 `POST /api/upload` 上傳檔案取得 file references，再透過 WebSocket `copilot:send` 發送 `{ conversationId, prompt, files: fileRefs, activePresets, disabledSkills }`

#### Scenario: 上傳失敗
- **WHEN** `POST /api/upload` 回傳錯誤
- **THEN** 前端 MUST 顯示 toast 錯誤訊息，MUST NOT 發送 WS 訊息，附件保留在列表中

#### Scenario: 發送後清除附件
- **WHEN** 訊息成功發送（WS 訊息已送出）
- **THEN** 前端 MUST 清空 `attachments` 列表和預覽區域

#### Scenario: 純文字訊息
- **WHEN** 使用者按下 Send 且 `attachments` 列表為空
- **THEN** 前端 MUST 直接透過 WS 發送訊息，MUST NOT 呼叫 upload API

### Requirement: 附檔功能 i18n

附檔相關的所有使用者可見文字 SHALL 支援 i18n。

#### Scenario: 英文介面
- **WHEN** 語言設為英文
- **THEN** 系統 MUST 使用英文：「Attach file」、「File type not supported」、「File too large (max 10MB)」、「Uploading...」

#### Scenario: 繁體中文介面
- **WHEN** 語言設為繁體中文
- **THEN** 系統 MUST 使用繁體中文：「附加檔案」、「不支援的檔案類型」、「檔案太大（最大 10MB）」、「上傳中...」
