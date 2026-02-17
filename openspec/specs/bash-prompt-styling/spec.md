## ADDED Requirements

### Requirement: Powerline 風格提示符
Bash 模式的使用者指令 SHALL 顯示彩色分段 Powerline 提示符。

#### Scenario: 完整提示符
- **WHEN** bash command 有 user、hostname、cwd、gitBranch 資訊
- **THEN** 提示符 SHALL 顯示：[user@hostname](indigo) ▶ [cwd](blue) ▶ [git branch](green) ▶

#### Scenario: 無 git branch
- **WHEN** bash command 的 cwd 不在 git repository 內
- **THEN** git branch segment SHALL 不顯示

#### Scenario: 長路徑縮短
- **WHEN** cwd 路徑超過合理長度
- **THEN** 系統 SHALL 縮短顯示（如 ~/D/G/project）

### Requirement: 增強輸出顯示
Bash 輸出 SHALL 提供行號和折疊功能。

#### Scenario: 行號顯示
- **WHEN** bash command 有輸出
- **THEN** 每行輸出 SHALL 顯示行號

#### Scenario: 長輸出折疊
- **WHEN** 輸出超過 20 行
- **THEN** 輸出 SHALL 預設折疊，只顯示前 5 行 + "Show all N lines" 按鈕

#### Scenario: 展開折疊
- **WHEN** 使用者點擊展開按鈕
- **THEN** 所有輸出行 SHALL 顯示

### Requirement: Exit Code Badge 增強
Bash exit code SHALL 以彩色 badge 顯示。

#### Scenario: 成功
- **WHEN** exit code 為 0
- **THEN** badge SHALL 顯示綠色 ✓ success

#### Scenario: 失敗
- **WHEN** exit code 非 0
- **THEN** badge SHALL 顯示紅色 ✗ exit N
