## MODIFIED Requirements

### Requirement: Code Block 淺色主題色票

Design System 的淺色主題 CSS variables MUST 為 code block 定義淺色背景值：
- `--color-code-bg`: MUST 為淺色值（如 `#F1F5F9`，slate-100），NOT 深色值
- `--color-code-header-bg`: MUST 為淺色值（如 `#E2E8F0`，slate-200），NOT 深色值

深色主題的值保持不變：
- `--color-code-bg`: `#0B0F1A`
- `--color-code-header-bg`: `#111827`

#### Scenario: 淺色主題 code 背景

- **WHEN** html[data-theme] 不為 "dark"（或無 data-theme）
- **THEN** `--color-code-bg` 為 `#F1F5F9`，`--color-code-header-bg` 為 `#E2E8F0`

#### Scenario: 深色主題 code 背景

- **WHEN** html[data-theme="dark"]
- **THEN** `--color-code-bg` 為 `#0B0F1A`，`--color-code-header-bg` 為 `#111827`

### Requirement: Code Block 文字可讀性

在淺色主題下，使用 `bg-code-bg` 的元件中的文字 MUST 確保足夠的對比度。
MUST 確保 `text-text-secondary` (#475569) 在 `bg-code-bg` (#F1F5F9) 上可讀。
錯誤文字 `text-error` (#DC2626) MUST 在兩種主題的 code 背景上都可讀。

#### Scenario: 淺色主題文字對比度

- **WHEN** 淺色主題下 ToolRecord 顯示 bash 參數
- **THEN** 文字 (#475569) 在背景 (#F1F5F9) 上的對比度 >= 4.5:1

#### Scenario: 錯誤文字在淺色背景

- **WHEN** 淺色主題下 ToolResultBlock 顯示錯誤
- **THEN** 紅色錯誤文字 (#DC2626) 在淺色背景 (#F1F5F9) 上清晰可讀
