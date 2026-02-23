## MODIFIED Requirements

### Requirement: CWD 路徑智慧縮短顯示

CwdSelector 按鈕 MUST 使用智慧路徑縮短邏輯取代原有的 CSS 截斷方式。路徑縮短規則如下：

1. `/Users/<username>` 或 `/home/<username>` 前綴 MUST 替換為 `~`
2. 路徑段數 ≤ 3 時 MUST 完整顯示（如 `~/GitHub/project`）
3. 路徑段數 > 3 時 MUST 顯示為 `~/…/<倒數第二段>/<最後一段>` 格式
4. 按鈕的 `title` attribute MUST 保持完整路徑，作為 hover 提示

#### Scenario: 短路徑完整顯示
- **WHEN** CWD 為 `/Users/john/project`
- **THEN** 顯示 `~/project`

#### Scenario: 長路徑智慧縮短
- **WHEN** CWD 為 `/Users/john/Documents/GitHub/copilot-sdk-test`
- **THEN** 顯示 `~/…/GitHub/copilot-sdk-test`

#### Scenario: 根路徑顯示
- **WHEN** CWD 為 `/`
- **THEN** 顯示 `/`

#### Scenario: hover 顯示完整路徑
- **WHEN** 使用者將游標懸停在 CWD 按鈕上
- **THEN** 瀏覽器 title tooltip 顯示完整路徑 `/Users/john/Documents/GitHub/copilot-sdk-test`
