## ADDED Requirements

### Requirement: 記憶壓縮
系統 SHALL 提供 `MemoryCompactor` 類別，使用 LLM 定期壓縮和整理 MEMORY.md。

#### Scenario: 成功壓縮
- **WHEN** `MemoryCompactor.compact()` 被呼叫且 LLM 可用
- **THEN** 系統 SHALL 讀取全部事實、呼叫 LLM 整理、原子寫入 MEMORY.md、重建 FTS5 索引

#### Scenario: 壓縮操作
- **WHEN** LLM 整理記憶
- **THEN** LLM SHALL 合併重複/相似事實、移除過時事實（新事實矛盾舊事實時保留新的）、按分類組織

#### Scenario: 壓縮結果格式
- **WHEN** LLM 回傳壓縮後的內容
- **THEN** 內容 SHALL 為 markdown 格式，使用 `##` headers 分類，`-` bullets 列出事實

#### Scenario: 壓縮結果驗證
- **WHEN** LLM 回傳的壓縮結果不包含任何 bullet point
- **THEN** 系統 SHALL 拒絕該結果，MEMORY.md 保持不變

#### Scenario: 壓縮統計
- **WHEN** 壓縮成功完成
- **THEN** 系統 SHALL 回傳 `CompactionResult`，包含 `originalCount` 和 `compactedCount`

### Requirement: 壓縮觸發條件
系統 SHALL 根據事實數量和冷卻時間判斷是否執行壓縮。

#### Scenario: 事實數量門檻
- **WHEN** `shouldCompact()` 被呼叫且總事實數少於設定門檻（預設 30）
- **THEN** SHALL 回傳 `false`

#### Scenario: 達到門檻
- **WHEN** `shouldCompact()` 被呼叫且總事實數 >= 設定門檻
- **THEN** SHALL 回傳 `true`（若無其他阻擋條件）

#### Scenario: 冷卻時間
- **WHEN** `shouldCompact()` 被呼叫且距離上次壓縮不足 5 分鐘
- **THEN** SHALL 回傳 `false`

#### Scenario: 並發保護
- **WHEN** `shouldCompact()` 被呼叫且已有壓縮正在執行
- **THEN** SHALL 回傳 `false`

### Requirement: 壓縮 Graceful Degradation
壓縮 SHALL 在失敗時保持 MEMORY.md 不變。

#### Scenario: LLM 呼叫失敗
- **WHEN** `MemoryLlmCaller.call()` 回傳 `null`
- **THEN** `compact()` SHALL 回傳 `null`，MEMORY.md 保持不變

#### Scenario: 壓縮中 isRunning 互斥
- **WHEN** 壓縮正在執行時再次呼叫 `compact()`
- **THEN** 第二次呼叫 SHALL 立即回傳 `null`

#### Scenario: 錯誤後解鎖
- **WHEN** 壓縮過程中發生錯誤
- **THEN** `isRunning` 鎖 SHALL 在 `finally` block 中被釋放

### Requirement: 壓縮觸發整合
壓縮 SHALL 在 `stream:idle` 事件後以非同步方式觸發。

#### Scenario: 非同步觸發
- **WHEN** `stream:idle` handler 完成記憶提取後且 `shouldCompact()` 回傳 `true`
- **THEN** 系統 SHALL 以 fire-and-forget 方式觸發壓縮，不阻塞 idle handler

#### Scenario: 壓縮完成記錄
- **WHEN** 壓縮成功完成
- **THEN** 系統 SHALL 記錄 log（包含 originalCount 和 compactedCount）

#### Scenario: 壓縮失敗記錄
- **WHEN** 壓縮失敗
- **THEN** 系統 SHALL 記錄 error log，不影響系統運作

### Requirement: 手動壓縮 API
系統 SHALL 提供 REST API endpoint 供手動觸發壓縮。

#### Scenario: 手動觸發成功
- **WHEN** 前端呼叫 `POST /api/auto-memory/compact` 且壓縮功能已啟用
- **THEN** 系統 SHALL 執行壓縮並回傳 `CompactionResult`

#### Scenario: 功能未啟用
- **WHEN** 前端呼叫 `POST /api/auto-memory/compact` 且壓縮功能未啟用
- **THEN** 系統 SHALL 回傳 HTTP 400 `{ error: 'LLM compaction not enabled' }`

#### Scenario: 壓縮跳過或失敗
- **WHEN** `compact()` 回傳 `null`（跳過或失敗）
- **THEN** API SHALL 回傳 `{ message: 'Compaction skipped or failed' }`
