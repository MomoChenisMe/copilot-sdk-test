## MODIFIED Requirements

### Requirement: Send with Attachments
檔案附件在發送訊息時 SHALL 先上傳至 `/api/upload`，然後將 file references 隨 WebSocket `copilot:send` 訊息一同傳送。後端 SessionManager SHALL 將 files 以 Copilot SDK 預期的格式傳送至 SDK session。

#### Scenario: 含附件的訊息發送完整流程
- **WHEN** 使用者送出包含圖片附件的訊息
- **THEN** 前端 SHALL 先呼叫 `POST /api/upload` 上傳檔案
- **AND** 取得 `UploadedFileRef[]` 後，透過 WebSocket 發送 `copilot:send { conversationId, prompt, files }`
- **AND** 後端 SessionManager MUST 將 files 映射為 SDK 預期格式並傳入 `session.send()`

#### Scenario: SDK file 格式驗證
- **WHEN** 後端 SessionManager 準備傳送 files 給 SDK
- **THEN** files MUST 以 SDK 文件定義的正確格式傳送（驗證 `{ path, mimeType }` 或其他 SDK 預期的格式）
- **AND** 不得使用 `as any` 強制型別轉換（或確認型別安全）

#### Scenario: 上傳失敗 graceful handling
- **WHEN** `POST /api/upload` 回傳錯誤
- **THEN** 訊息 SHALL 以無附件方式發送（僅文字）
- **AND** 附件列表保留於輸入區域供重試
