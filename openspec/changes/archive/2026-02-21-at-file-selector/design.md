## Context

CodeForge 的聊天輸入框已有成熟的 `/` slash command 機制（偵測觸發字元 → 彈出選單 → 鍵盤導航 → 選取替換文字 → highlight overlay 渲染）和檔案附件上傳機制。後端也已有 `/api/directories` 端點用於目錄瀏覽，以及 WebSocket `copilot:send` 的檔案傳遞管道。

本設計在這些既有基礎上新增 `@` 檔案引用功能，最大化複用既有模式。

## Goals / Non-Goals

**Goals:**
- 在聊天輸入框中透過 `@` 觸發檔案選擇選單
- 選取的檔案以 chip 樣式內嵌於輸入文字中
- 後端讀取選取檔案的內容並注入為 AI 上下文
- 向下相容：不破壞現有 slash commands、檔案附件、目錄瀏覽功能

**Non-Goals:**
- 不引入 contentEditable 或富文字編輯器（保持 textarea 架構）
- 不做檔案內容的前端快取或預載
- 不做全文搜尋（僅檔案名稱過濾）

## Decisions

### 決策 1: @ 偵測複用 slash command 模式

**選擇**: 在 `Input.tsx` 中以 `findLastAtTrigger()` 函式偵測 `@` 字元，邏輯完全平行於現有的 `findLastSlashCommand()`。

**理由**: 現有的 slash command 偵測已處理了所有邊界情況（IME composition guard、cursor position tracking、whitespace boundary detection），複用同一模式可大幅降低 bug 風險。

**替代方案**: 合併為通用 trigger detection 框架（支援任意觸發字元）。取捨：過度抽象，目前只有 `/` 和 `@` 兩個觸發字元，不值得增加複雜度。

### 決策 2: Chip 渲染使用 textarea highlight overlay

**選擇**: 延用現有的 highlight overlay 機制（`<div>` overlay + `text-transparent` textarea），將 `@filename` 片段以帶背景色的 `<span>` 渲染出 chip 視覺效果。

**理由**: 保持 textarea 架構不變，避免引入 contentEditable 的複雜度（selection API、IME handling、paste 行為等）。現有的 slash command highlight overlay 已驗證這個模式可行。

**替代方案 A**: 改用 contentEditable div。取捨：可以實現真正的 inline chip（含 × 按鈕），但會破壞現有大量的 textarea 互動邏輯（paste、IME、cursor positioning），改動範圍過大且 regression 風險高。

**替代方案 B**: 將 chip 顯示在 textarea 外部的獨立區域。取捨：使用者明確要求 chip 要在輸入文字之間顯示，此方案不符需求。

### 決策 3: contextFiles 與 files (attachments) 分離

**選擇**: 在 WebSocket `copilot:send` payload 中新增獨立的 `contextFiles: string[]` 欄位（檔案路徑陣列），與既有的 `files`（已上傳附件）完全分離。

**理由**: 兩者的語意和處理方式不同。`files` 是前端上傳的二進位檔案（圖片、PDF 等），後端直接轉給 SDK。`contextFiles` 是後端檔案系統上的路徑，後端需要讀取內容並注入 prompt。混用同一欄位會增加後端處理的複雜度。

**替代方案**: 統一使用 `files` 欄位，加上 `type: 'upload' | 'context'` 區分。取捨：需要修改現有的 files 處理邏輯，破壞向下相容。

### 決策 4: 擴展現有 /api/directories 而非新建端點

**選擇**: 在現有 `GET /api/directories` 端點上新增 `includeFiles` query parameter，回應中增加 `files` 陣列。

**理由**: 複用現有的認證中間件、路徑安全檢查（null byte rejection、path validation）。新增 query param 預設為 `false`，既有的 DirectoryPicker 呼叫不受影響。

**替代方案**: 建立獨立的 `GET /api/files/browse` 端點。取捨：重複路徑安全檢查邏輯，多一個端點要維護，但隔離性較好。最終選擇擴展因為邏輯天然重疊。

### 決策 5: 後端同步讀取 contextFiles

**選擇**: 在 `copilot:send` handler 中以 `readFileSync` 同步讀取 contextFiles 內容，限制單檔最大 500KB。

**理由**: WebSocket handler 已經在處理訊息的同步邏輯中。Context files 通常是程式碼檔案（幾 KB 到幾十 KB），同步讀取的延遲可忽略。500KB 上限防止意外讀入大檔案。

**替代方案**: 非同步讀取 + 串流。取捨：增加複雜度，對於 500KB 以內的檔案無明顯效能優勢。

## Risks / Trade-offs

**[Risk] Overlay chip 與 textarea 文字對齊問題**
→ Mitigation: chip `<span>` 使用 `display: inline` + `background` + `border-radius`，不改變文字 flow。字體大小、行高、padding 與 textarea 完全一致。手動測試多行及長文字情境。

**[Risk] contextFiles 路徑可能包含惡意路徑**
→ Mitigation: 後端使用 `path.resolve()` 正規化路徑，拒絕 null bytes，驗證 `stat.isFile()`。不做 path traversal 限制（個人工具，使用者即為管理者，且已限定 cwd 為根）。

**[Risk] 大量 @file 引用導致 prompt 過長**
→ Mitigation: 後端單檔限制 500KB，超過則跳過並在 context 中標記 `(File too large)`。前端不限制引用數量，交由 AI model 的 token limit 自然約束。

**[Risk] 使用者編輯 textarea 刪除部分 @filename 文字後 contextFiles state 不同步**
→ Mitigation: 在 `handleChange()` 中重新驗證 `contextFiles` 陣列——檢查每個 `@displayName` 是否仍存在於文字中，不存在則移除。

**[Risk] AtFileMenu 目錄瀏覽的 API 延遲（特別在行動網路下）**
→ Mitigation: 顯示 loading indicator；entry 列表到達後立即渲染；前端不做 debounce（每次瀏覽只在使用者主動操作時觸發一次 API call）。
