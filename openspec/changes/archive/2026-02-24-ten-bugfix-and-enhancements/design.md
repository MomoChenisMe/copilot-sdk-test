## Context

CodeForge 的 Copilot Agent 系統存在多項穩定性問題，其中 AskUser 機制和 Tool 執行錯誤是最嚴重的，直接導致使用者對話中斷且無法恢復。同時 Plan/Act Mode 的提示詞系統需要從「嵌入式單一 prompt」演進為「可分離可自訂的雙 prompt 架構」。

### 現有架構關鍵路徑

```
copilot:send handler → streamManager.startStream() → session.send()
                         ↓ (async, may block until turn completes)
                       subscribe() ← 在 startStream resolve 之後才執行
                         ↓
                       stream.subscribers ← 此時事件可能已在 eventBuffer 中
```

### 現有 Prompt 架構

```
composer.compose(cwd, locale) →
  SYSTEM_PROMPT.md + PROFILE.md + [OPENSPEC_SDD.md] + Memory + .codeforge.md + Locale
```

Plan/Act mode 的提示詞目前混在同一份 `SYSTEM_PROMPT.md` 中，無法獨立編輯。

## Goals / Non-Goals

**Goals:**

- 修復 AskUser 卡住問題，確保選擇後 AI 穩定繼續回應
- 消除 "Stream already exists" 錯誤，實現舊 stream 自動清理
- 確保瀏覽器關閉重開後 AskUser 狀態可恢復
- 防止 SDK tool execution error 導致 stream 中斷
- 實現 Plan Mode Prompt 可獨立編輯
- 全面強化 Act Mode 和 Plan Mode 的預設提示詞
- Plan 計劃書以 Artifact 形式直接呈現

**Non-Goals:**

- 不修改 `@github/copilot-sdk` 本身的 bug（view tool directory error 在 SDK 內部）
- 不實作 AskUser 的 persistent storage（僅靠 in-memory + retry 機制）
- 不變更 SQLite schema
- 不拆分 System Prompt 為多個獨立檔案（保持 SYSTEM_PROMPT.md 為主體）
- 不修改 `session.send()` 的呼叫方式

## Decisions

### Decision 1: initialSubscriber 模式解決 subscribe 競爭條件

**選擇**: 在 `StartStreamOptions` 新增 `initialSubscriber` 欄位，stream 建立時同步加入 subscriber。

**原因**: `startStream()` 在 `this.streams.set()` 後同步完成 stream 物件建立，但 async 部分（session 建立 + `session.send()`）可能長時間 block。將 subscriber 在同步階段加入，保證所有事件即時轉發。

**替代方案考慮**:
- 方案 B: 不 await `startStream`，立即 `subscribe()` → 存在 stream 尚未在 map 中的短暫視窗
- 方案 C: 在 `startStream` 內部自動廣播所有 buffered events → 無法解決即時轉發問題

### Decision 2: abort-before-start 策略處理 stale streams

**選擇**: 在 `copilot:send` handler 中，`startStream` 前先檢查 `hasStream()`，若存在則 `abortStream()` 清理。

**原因**: 簡單直接，不需要複雜的 stream 生命週期管理。abort 是冪等的，不會影響已結束的 stream。

### Decision 3: Deferred retry 解決 tab 載入時序問題

**選擇**: `copilot:state_response` 中，若 `findTabIdByConversationId()` 回傳 null，延遲 1 秒重試。

**原因**: Zustand store 從 localStorage 恢復是同步的，但 WebSocket 重連和 state query 可能在極端情況下早於 store hydration。1 秒 retry 覆蓋絕大多數場景，成本極低。

### Decision 4: safeHandler 包裝 + session 健康監控的雙層防禦

**選擇**:
- EventRelay 的每個 `session.on()` callback 用 try-catch 包裝
- StreamManager 加入 heartbeat 機制（120 秒無事件 → 警告）

**原因**: SDK 的 unhandled error 可能在任何 event handler 中發生。safeHandler 防止單次錯誤崩潰整個 relay。健康監控作為最後防線，偵測 session 完全失去回應的情況。

### Decision 5: 雙 Prompt 架構（SYSTEM_PROMPT.md + PLAN_PROMPT.md）

**選擇**: 新增獨立的 `PLAN_PROMPT.md`，在 `compose()` 中根據 mode 參數決定是否注入。

**原因**:
- 保持 SYSTEM_PROMPT.md 為兩種模式共用的基礎 prompt
- PLAN_PROMPT.md 只在 plan mode 時追加
- 使用者可以獨立編輯兩者，不需要理解 prompt 的拼裝邏輯

**替代方案考慮**:
- 方案 B: 完全拆分為 ACT_PROMPT.md + PLAN_PROMPT.md → 太大的 breaking change，且兩者有大量共用內容

### Decision 6: Plan Artifact 透過 idle event extraData 傳送

**選擇**: 在 `copilot:idle` handler 中，plan content 寫入檔案後同時作為 `extraData.planArtifact` 傳送至前端。

**原因**: 複用現有的 idle event 通道，不需要新增 WebSocket message type。前端在收到 idle 時檢查 planArtifact 欄位即可建立 artifact。

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| `session.send()` 的 blocking 行為可能在 SDK 版本更新後改變 | initialSubscriber 模式無論 blocking 與否都有效 |
| 1 秒 deferred retry 可能不足以覆蓋極慢的裝置 | 可透過設定調整；實務上 localStorage 恢復是同步的 |
| safeHandler 吞掉錯誤可能掩蓋真正的 bug | 錯誤仍會記錄在 log 中，只是不 crash stream |
| 健康監控 120 秒閾值可能誤報（例如 AI 長時間思考） | 僅發送 warning，不自動 abort；使用者可手動中斷 |
| Plan Prompt 檔案不存在時的 fallback | `readFile` 已有空字串 fallback，compose 跳過空 section |
