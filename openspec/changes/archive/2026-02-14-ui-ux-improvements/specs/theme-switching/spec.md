## ADDED Requirements

### Requirement: 淺色主題為預設

應用程式 SHALL 預設使用淺色主題。所有語義化色彩變數（`--color-bg-primary`, `--color-text-primary` 等）MUST 定義為淺色值：白色/淺灰背景、深色文字、紫色 accent。

#### Scenario: 首次載入（無 localStorage 設定）

- **WHEN** 使用者首次開啟應用，`localStorage` 中無主題偏好
- **THEN** 應用 MUST 以淺色主題渲染：白色背景（`#ffffff`）、深色文字（`#1a1a2e`）、淺灰邊框（`#dee2e6`）

#### Scenario: 淺色主題色彩一致性

- **WHEN** 應用以淺色主題渲染
- **THEN** 所有 UI 元素（TopBar、BottomBar、Sidebar、ChatView、Input、ModelSelector）MUST 使用統一的淺色語義化變數，無硬編碼的深色值

### Requirement: 深色主題支援

應用程式 SHALL 支援深色主題，透過 `html[data-theme="dark"]` 啟用。深色主題 MUST 覆寫所有語義化色彩變數為深色值。

#### Scenario: 啟用深色主題

- **WHEN** `html` 元素設定 `data-theme="dark"` 屬性
- **THEN** 所有語義化色彩變數 MUST 切換為深色值：深色背景（`#1a1a2e`）、淺色文字（`#e8e8f0`）、深色邊框（`#2a2a4a`）

#### Scenario: 深色主題視覺完整性

- **WHEN** 使用深色主題
- **THEN** 所有 UI 元素 MUST 正確顯示，無文字與背景對比度不足、邊框不可見等問題

### Requirement: 主題切換按鈕

TopBar SHALL 提供主題切換按鈕，讓使用者在深淺主題之間切換。

#### Scenario: 顯示切換按鈕

- **WHEN** 應用載入
- **THEN** TopBar MUST 顯示主題切換圖示按鈕（淺色模式顯示月亮圖示、深色模式顯示太陽圖示）

#### Scenario: 點擊切換

- **WHEN** 使用者點擊主題切換按鈕
- **THEN** 應用 MUST 立即切換主題（淺 → 深或深 → 淺），無閃爍或延遲

#### Scenario: 切換後所有元件更新

- **WHEN** 主題切換完成
- **THEN** 所有可見的 UI 元件 MUST 即時反映新主題色彩

### Requirement: 主題偏好持久化

系統 SHALL 將使用者的主題偏好儲存到 `localStorage`，並在下次載入時恢復。

#### Scenario: 儲存偏好

- **WHEN** 使用者切換主題
- **THEN** 系統 MUST 將當前主題值（`'light'` 或 `'dark'`）寫入 `localStorage`

#### Scenario: 恢復偏好

- **WHEN** 使用者重新開啟應用，且 `localStorage` 中有主題偏好
- **THEN** 系統 MUST 在首次渲染前套用儲存的主題，避免主題閃爍（FOUC）

#### Scenario: localStorage 不可用

- **WHEN** `localStorage` 不可用（隱私模式或瀏覽器限制）
- **THEN** 系統 MUST fallback 為淺色主題，不拋出錯誤

### Requirement: Zustand 主題狀態

Zustand store SHALL 管理主題狀態，提供 `theme` 值和 `toggleTheme` action。

#### Scenario: 初始化主題狀態

- **WHEN** store 初始化
- **THEN** `theme` 值 MUST 從 `localStorage` 讀取，若無則預設為 `'light'`

#### Scenario: toggleTheme 行為

- **WHEN** 呼叫 `toggleTheme()`
- **THEN** `theme` 值 MUST 在 `'light'` 和 `'dark'` 之間切換，同時更新 `html` 元素的 `data-theme` 屬性和 `localStorage`
