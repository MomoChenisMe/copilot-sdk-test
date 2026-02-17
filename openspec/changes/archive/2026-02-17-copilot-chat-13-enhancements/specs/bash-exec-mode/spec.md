## ADDED Requirements

### Requirement: 環境資訊傳遞
`bash:done` WebSocket 事件 SHALL 包含執行環境資訊。

#### Scenario: 完整環境資訊
- **WHEN** bash command 執行完成
- **THEN** `bash:done` 事件 SHALL 包含 user（os.userInfo().username）、hostname（os.hostname()）、gitBranch（如果在 git repo 內）

#### Scenario: 非 git 目錄
- **WHEN** 執行目錄不在 git repository 內
- **THEN** gitBranch 欄位 SHALL 為 null 或 undefined

#### Scenario: git 偵測失敗
- **WHEN** `git rev-parse --abbrev-ref HEAD` 執行失敗
- **THEN** gitBranch SHALL 為 null，不影響 bash:done 事件發送
