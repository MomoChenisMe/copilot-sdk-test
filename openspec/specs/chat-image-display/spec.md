## ADDED Requirements

### Requirement: User message 中顯示圖片縮圖
系統 SHALL 在 user message 氣泡中渲染所有圖片類型附件為可視縮圖。縮圖尺寸為 96x96 像素（`w-24 h-24`），使用 `object-cover` 裁切，帶圓角邊框。多張圖片水平排列，自動換行。

#### Scenario: 單張圖片顯示
- **WHEN** user message 的 metadata.attachments 包含一個 mimeType 為 `image/*` 的附件
- **THEN** 該附件以 96x96 圓角縮圖渲染於訊息文字上方

#### Scenario: 多張圖片顯示
- **WHEN** user message 包含 3 張圖片附件
- **THEN** 三張縮圖水平排列於訊息文字上方，間距 8px，超過容器寬度時自動換行

#### Scenario: 混合類型附件
- **WHEN** user message 包含 1 張圖片和 1 個 PDF
- **THEN** 圖片以縮圖顯示，PDF 以檔名 badge 顯示（`📄 filename.pdf`）

### Requirement: 附件 metadata 持久化至資料庫
系統 SHALL 在儲存 user message 時，將附件資訊存入 `metadata.attachments` 欄位。AttachmentMeta 結構為 `{ id: string, originalName: string, mimeType: string, size: number }`。

#### Scenario: 送出含附件的訊息
- **WHEN** 使用者送出包含檔案附件的訊息
- **THEN** 後端 `repo.addMessage()` 的 metadata 參數 MUST 包含 `attachments` 陣列
- **AND** 每個 attachment 包含 `id`, `originalName`, `mimeType`, `size` 欄位

#### Scenario: 前端 user message 同步帶 metadata
- **WHEN** `useTabCopilot.sendMessage()` 被呼叫且含 files 參數
- **THEN** `addTabMessage()` 建立的 user message 的 metadata MUST 包含 `{ attachments: [...] }`

### Requirement: 圖片 serve REST 端點
系統 SHALL 提供 `GET /api/upload/:id` 端點，以附件 ID 搜尋上傳目錄並 serve 對應檔案。

#### Scenario: 正常圖片請求
- **WHEN** 前端請求 `GET /api/upload/abc123`
- **THEN** 伺服器以 ID 前綴 `abc123` 搜尋上傳目錄
- **AND** 找到檔案後以正確的 `Content-Type` header 回傳檔案內容

#### Scenario: 檔案不存在
- **WHEN** 前端請求 `GET /api/upload/nonexistent`
- **THEN** 伺服器回傳 HTTP 404

### Requirement: 歷史訊息圖片重載
系統 SHALL 在切換對話或重新載入頁面時，從 message metadata 中讀取附件資訊並正確渲染圖片。

#### Scenario: 切換對話後重載圖片
- **WHEN** 使用者切換到一個含有圖片附件訊息的對話
- **THEN** 歷史訊息中的圖片 MUST 使用 `/api/upload/:id` 路徑正確渲染為縮圖
