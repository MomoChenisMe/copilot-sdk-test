## MODIFIED Requirements

### Requirement: 頁籤拖曳排序
TabBar SHALL 支援使用者透過 drag-and-drop 重新排列頁籤順序。

#### Scenario: 拖曳開始
- **WHEN** 使用者按住 tab 並開始拖曳
- **THEN** 被拖曳的 tab MUST 顯示半透明效果（opacity 降低）
- **AND** 其他 tab MUST 成為合法的 drop target

#### Scenario: 拖曳過程視覺指示
- **WHEN** 被拖曳的 tab hover 在另一個 tab 上方
- **THEN** 目標 tab 的左側或右側（取決於游標位置相對中點）MUST 顯示 2px accent 色指示線

#### Scenario: 放下完成排序
- **WHEN** 使用者在目標 tab 上方放下被拖曳的 tab
- **THEN** `tabOrder` 陣列 MUST 更新為新順序
- **AND** 排序結果 MUST 透過 `reorderTabs()` 持久化到 localStorage 和 server

#### Scenario: 拖曳到自身為 no-op
- **WHEN** 使用者將 tab 拖放到自己原本的位置
- **THEN** 系統 MUST 不觸發任何排序更新

#### Scenario: 拖曳結束清理（即時回位）
- **WHEN** 拖曳操作結束（pointer up）
- **THEN** 被拖曳的 tab MUST 立即開始 120ms ease-out 過渡回到原位
- **AND** 過渡動畫 MUST 無明顯延遲地開始（不使用 requestAnimationFrame 包裝）
- **AND** transition 和 transform 樣式 MUST 在 transitionend 回調中一次性清除
- **AND** setTimeout fallback（150ms）MUST 僅作為 guard 確保清理，不影響動畫啟動時序

#### Scenario: 被交換 tab 的 FLIP 滑動動畫
- **WHEN** 拖曳中 tab A 越過 tab B 的中點觸發交換
- **THEN** tab B MUST 使用 FLIP 動畫平滑滑動到新位置
- **AND** 動畫步驟 MUST 為：
  1. 記錄 tab B 交換前的 `offsetLeft`
  2. `flushSync` 執行 DOM 順序交換
  3. 計算 tab B 新 `offsetLeft` 與舊位置的差異 `diff`
  4. 立即設定 tab B 的 `transform: translateX(diff)` （視覺上留在原位）
  5. 在 `requestAnimationFrame` 中加上 `transition: transform 150ms ease-out` 並設 `transform: translateX(0)`
  6. `transitionend` 後清除 transition 和 transform 樣式
- **AND** 快速連續交換時，前一個動畫 MUST 被跳過（直接清除樣式後啟動新動畫）
