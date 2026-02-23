## MODIFIED Requirements

### Requirement: 總覽區塊

面板 SHALL 顯示 OpenSpec 專案的統計概覽，並顯示 config.yaml 的專案設定內容。

#### Scenario: 統計資訊顯示

- **WHEN** 使用者切換到「總覽」分頁
- **THEN** 面板 MUST 顯示：進行中變更數量、主規格數量、已封存數量
- **AND** 統計數值 MUST 從 API 回傳的 `changesCount`、`specsCount`、`archivedCount` 欄位讀取

#### Scenario: config.yaml 專案設定顯示

- **WHEN** 使用者切換到「總覽」分頁且 API 回傳的 `config` 不為 null
- **THEN** 面板 MUST 在統計卡片下方顯示「專案設定 config.yaml」卡片
- **AND** 卡片 MUST 包含兩個 Tab：「專案說明」和「產出規則」
- **AND** 「專案說明」Tab MUST 以 Markdown 渲染 `config.project_description` 內容
- **AND** 「產出規則」Tab MUST 以 Markdown 渲染 `config.output_rules` 內容
- **AND** 預設 MUST 顯示「專案說明」Tab

#### Scenario: config.yaml 為空

- **WHEN** 使用者切換到「總覽」分頁且 API 回傳的 `config` 為 null
- **THEN** 面板 MUST 不顯示「專案設定 config.yaml」卡片
- **AND** 統計卡片仍 MUST 正常顯示

#### Scenario: config.yaml 欄位缺失

- **WHEN** `config` 存在但缺少 `project_description` 或 `output_rules` 欄位
- **THEN** 缺失的 Tab 內容 MUST 顯示空白或提示文字
- **AND** 另一個有內容的 Tab MUST 正常渲染

#### Scenario: 搜尋功能

- **WHEN** 使用者在搜尋框輸入關鍵字
- **THEN** 系統 MUST 篩選顯示名稱包含關鍵字的變更和規格

## ADDED Requirements

### Requirement: OverviewData 前後端欄位對齊

前端 `OverviewData` interface SHALL 與後端 `OpenSpecOverview` interface 欄位名完全一致。

#### Scenario: OverviewData 包含正確欄位名

- **WHEN** 前端定義 `OverviewData` type
- **THEN** 欄位名 MUST 為 `changesCount`、`specsCount`、`archivedCount`（非 `activeChanges`、`specs`、`archived`）
- **AND** MUST 包含 `config: Record<string, unknown> | null` 欄位

#### Scenario: OpenSpecOverview 元件正確引用欄位

- **WHEN** `OpenSpecOverview` 元件渲染統計數字
- **THEN** MUST 使用 `overview.changesCount`、`overview.specsCount`、`overview.archivedCount`
