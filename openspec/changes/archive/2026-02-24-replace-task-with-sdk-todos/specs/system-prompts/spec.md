## MODIFIED Requirements

### Requirement: System Prompt 工具描述

System prompt 的 "Available Tools" 段落 MUST 準確描述系統中可用的工具。Task Management 的描述 MUST 反映實際的 SQL todos 機制，而非已移除的自訂 task 工具。

#### Scenario: Task Management 工具描述

- **WHEN** system prompt 組成 "Available Tools" 段落
- **THEN** Task Management 項目 MUST 描述為 LLM 使用內建 `sql` tool 的 `todos` 表來追蹤工作進度，且前端會自動即時顯示 todos 狀態
- **AND** MUST NOT 提及 `task_create`、`task_list`、`task_get`、`task_update` 工具名稱

### Requirement: Task Management 指引

System prompt MUST 包含使用 SQL todos 進行任務追蹤的指引，取代舊的 task 工具指引。

#### Scenario: SQL todos 使用指引

- **WHEN** system prompt 組成任務管理指引段落
- **THEN** MUST 指導 LLM 使用 `sql` tool 操作 `todos` 表（`INSERT INTO todos`、`UPDATE todos SET status = ...`、`SELECT * FROM todos`）
- **AND** MUST 說明 `todos` 表已由 SDK 自動建立，包含 `id`、`title`、`description`、`status`、`created_at`、`updated_at` 欄位
- **AND** MUST 說明 status 可用值：`'pending'`、`'in_progress'`、`'done'`、`'blocked'`
- **AND** MUST 說明何時建立 todos（多步驟實作、複雜重構、需要進度追蹤的工作）
- **AND** MUST 說明前端會自動顯示 todos 狀態，無需額外操作

#### Scenario: 移除自訂 task 工具指引

- **WHEN** system prompt 組成完成
- **THEN** MUST NOT 包含 `task_create`、`task_list`、`task_get`、`task_update` 的使用指引或範例
- **AND** MUST NOT 提及 `activeForm`、`addBlocks`、`addBlockedBy` 等已移除功能
