## ADDED Requirements

### Requirement: Plan mode permission denial

在 plan mode 下，所有 tool execution 請求 SHALL 被拒絕。當 SDK session 處於 plan mode 時，`onPermissionRequest` callback SHALL 回傳 `deny`，確保 AI 僅進行規劃而不執行任何實際操作。

#### Scenario: Plan mode 下拒絕 tool execution

- WHEN SDK session 處於 plan mode
- AND AI 觸發一個 tool execution 請求
- THEN `onPermissionRequest` callback SHALL 回傳 `deny`
- AND tool 不會被實際執行
- AND AI 應收到 permission denied 回應

#### Scenario: Plan mode 下拒絕多個連續 tool requests

- WHEN SDK session 處於 plan mode
- AND AI 在同一 stream 中觸發多個 tool execution 請求
- THEN 每一個請求的 `onPermissionRequest` SHALL 皆回傳 `deny`
- AND 沒有任何 tool 被實際執行

---

### Requirement: Act mode permission approval

在 act mode 下，所有 tool execution 請求 SHALL 被自動核准，維持目前的預設行為。

#### Scenario: Act mode 下自動核准 tool execution

- WHEN SDK session 處於 act mode
- AND AI 觸發一個 tool execution 請求
- THEN `onPermissionRequest` callback SHALL 自動核准該請求（維持目前預設行為）
- AND tool 正常執行

#### Scenario: Act mode 為預設行為，無需額外設定

- WHEN 使用者未明確設定 mode
- THEN 系統 SHALL 以 act mode 運行
- AND 所有 tool execution 請求被自動核准

---

### Requirement: Mode toggle via WebSocket

Frontend SHALL 透過 WebSocket 傳送 mode 資訊。`copilot:send` message 中 SHALL 包含目前的 mode 欄位，且 frontend 可透過 `copilot:set_mode` message 在 stream 進行中變更 mode。

#### Scenario: 發送訊息時傳遞目前 mode

- WHEN 使用者送出一則 chat message
- THEN frontend SHALL 在 `copilot:send` WebSocket message 中包含 `mode` 欄位（值為 `"plan"` 或 `"act"`）
- AND backend 根據該 mode 值設定 `onPermissionRequest` 的行為

#### Scenario: Stream 進行中切換 mode

- WHEN SDK session 正在 streaming 回應
- AND 使用者切換 mode toggle
- THEN frontend SHALL 發送 `copilot:set_mode` WebSocket message，包含新的 mode 值
- AND backend SHALL 即時更新 `onPermissionRequest` closure 中的 mode 狀態

---

### Requirement: Mode change broadcast

當 mode 在 stream 進行中被變更時，server SHALL 廣播 `copilot:mode_changed` event 至所有 subscribers。

#### Scenario: Mode 變更時廣播通知

- WHEN backend 收到 `copilot:set_mode` message 並成功更新 mode
- THEN server SHALL 廣播 `copilot:mode_changed` WebSocket event
- AND event payload SHALL 包含 `mode` 欄位（值為 `"plan"` 或 `"act"`）
- AND 所有訂閱該 conversation 的 clients 都 SHALL 收到此 event

#### Scenario: 未訂閱的 clients 不受影響

- WHEN server 廣播 `copilot:mode_changed` event
- THEN 僅訂閱該 conversation 的 WebSocket clients SHALL 收到通知
- AND 其他 clients 不受影響

---

### Requirement: Frontend toggle UI

一個 `PlanActToggle` component SHALL 顯示 Plan/Act segmented buttons，位於 input area 附近。

#### Scenario: 顯示 Plan/Act toggle

- WHEN chat view 載入
- THEN SHALL 在 input area 附近顯示 `PlanActToggle` component
- AND component 包含 "Plan" 與 "Act" 兩個 segmented buttons
- AND 目前選中的 mode SHALL 有視覺上的 active 狀態

#### Scenario: 點擊切換 mode

- WHEN 使用者點擊 "Plan" button（目前為 Act mode）
- THEN toggle SHALL 切換至 Plan mode
- AND "Plan" button SHALL 顯示為 active 狀態
- AND frontend SHALL 發送對應的 WebSocket message 更新 mode

---

### Requirement: Plan mode banner

當 plan mode 啟用時，一個 amber 色的 banner SHALL 顯示在 input area 上方。

#### Scenario: Plan mode 啟用時顯示 banner

- WHEN mode 被設定為 plan
- THEN 一個 amber 色的 banner SHALL 顯示在 input area 上方
- AND banner SHALL 包含提示文字說明目前處於 plan mode（tool 不會被執行）

#### Scenario: 切換回 Act mode 時隱藏 banner

- WHEN mode 從 plan 切換回 act
- THEN amber banner SHALL 被隱藏
- AND input area 恢復正常顯示

---

### Requirement: Default mode

系統的預設 mode SHALL 為 `act`，以保持與目前行為的向後相容性。

#### Scenario: 新 session 預設為 Act mode

- WHEN 一個新的 conversation 或 SDK session 被建立
- THEN mode SHALL 預設為 `"act"`
- AND PlanActToggle 的 "Act" button SHALL 為 active 狀態
- AND amber banner SHALL 不顯示

#### Scenario: 頁面重新載入後維持預設

- WHEN 使用者重新載入頁面
- AND 沒有儲存的 mode 偏好
- THEN mode SHALL 回復為預設的 `"act"`

---

### Requirement: Dynamic mode switching

Mode 可以在不重新建立 SDK session 的情況下切換，透過 closure-based 機制實現。

#### Scenario: 不重建 session 即可切換 mode

- WHEN SDK session 正在進行中
- AND 使用者透過 toggle 切換 mode
- THEN mode 變更 SHALL 立即生效
- AND SDK session 不需要被重新建立或中斷
- AND `onPermissionRequest` closure SHALL 讀取最新的 mode 值

#### Scenario: Stream 進行中切換 mode 立即生效

- WHEN AI 正在 streaming 回應
- AND 使用者從 act 切換至 plan
- THEN 後續的 tool execution 請求 SHALL 立即被 deny
- AND 已經在執行中的 tool 不受影響
