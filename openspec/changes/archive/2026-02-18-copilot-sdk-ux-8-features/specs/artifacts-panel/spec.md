## ADDED Requirements

### Requirement: Artifact 偵測與解析

系統 SHALL 解析 assistant messages 中的 artifact code blocks，使用格式：` ```artifact type="..." title="..." `。當偵測到此格式時，系統 SHALL 將其識別為可渲染的 artifact。

#### Scenario: 偵測有效的 artifact code block

- WHEN assistant message 包含 ` ```artifact type="markdown" title="報告" ` 格式的 code block
- THEN 系統 SHALL 解析出 artifact 的 `type` 與 `title` 屬性
- AND 該 code block 的內容 SHALL 被視為 artifact body

#### Scenario: 無 artifact 標記的 code block 不受影響

- WHEN assistant message 包含一般的 ` ```javascript ` code block（無 artifact 標記）
- THEN 系統 SHALL 以一般 code block 方式渲染
- AND 不觸發 artifact panel 相關邏輯

#### Scenario: 缺少必要屬性時 fallback

- WHEN artifact code block 缺少 `type` 或 `title` 屬性
- THEN 系統 SHALL fallback 以一般 code block 方式渲染
- AND 在 console 中記錄 warning

---

### Requirement: 支援的 artifact 類型

ArtifactsPanel SHALL 支援渲染以下類型：markdown、code（含 syntax highlighting）、html（sandboxed iframe）、svg、mermaid。

#### Scenario: 渲染 markdown artifact

- WHEN artifact `type` 為 `"markdown"`
- THEN panel SHALL 使用 Markdown renderer 渲染 artifact body
- AND 支援標準 Markdown 語法（headings、lists、tables 等）

#### Scenario: 渲染 code artifact（含 syntax highlighting）

- WHEN artifact `type` 為 `"code"`
- THEN panel SHALL 使用 syntax highlighting 渲染 artifact body
- AND 語言 SHALL 從 artifact 屬性或 code block 語言標記推斷

#### Scenario: 渲染 html artifact（sandboxed）

- WHEN artifact `type` 為 `"html"`
- THEN panel SHALL 在 sandboxed iframe 中渲染 artifact body
- AND iframe MUST 設置 `sandbox="allow-scripts"`
- AND iframe MUST NOT 包含 `allow-same-origin` 或 `allow-top-navigation`

#### Scenario: 渲染 svg artifact

- WHEN artifact `type` 為 `"svg"`
- THEN panel SHALL 直接渲染 SVG 內容
- AND SVG SHALL 在 container 中自適應大小

#### Scenario: 渲染 mermaid artifact

- WHEN artifact `type` 為 `"mermaid"`
- THEN panel SHALL 使用 mermaid library 渲染 diagram
- AND 渲染結果 SHALL 為 SVG 圖形

#### Scenario: 不支援的 artifact type

- WHEN artifact `type` 不在支援列表中
- THEN panel SHALL fallback 以 plain text 方式顯示 artifact body
- AND 顯示提示訊息告知此類型不受支援

---

### Requirement: Side panel 版面配置

ArtifactsPanel SHALL 以右側 split panel 形式呈現，寬度 480px，包含 header（tabs + close button）、content area、以及 footer（copy + download buttons）。

#### Scenario: Panel 基本結構

- WHEN ArtifactsPanel 被開啟
- THEN panel SHALL 渲染於 ChatView 右側
- AND panel 寬度 SHALL 為 480px
- AND panel 左側 SHALL 有 `border-l` 分隔線

#### Scenario: Panel header 渲染

- WHEN ArtifactsPanel 顯示
- THEN header SHALL 包含 artifact tabs（當有多個 artifacts 時）
- AND header 右側 SHALL 包含 close button（X icon）

#### Scenario: Panel content area

- WHEN 一個 artifact 被選中
- THEN content area SHALL 渲染該 artifact 的完整內容
- AND content area SHALL 支援 scrolling

#### Scenario: Panel footer 操作

- WHEN ArtifactsPanel 顯示
- THEN footer SHALL 包含 Copy button 與 Download button
- AND 點擊 Copy SHALL 將 artifact raw content 複製到 clipboard
- AND 點擊 Download SHALL 下載 artifact 為對應格式的檔案

---

### Requirement: Panel 開啟與關閉

點擊 message 中的 artifact card SHALL 開啟 panel；close button SHALL 隱藏 panel。

#### Scenario: 點擊 artifact card 開啟 panel

- WHEN 使用者點擊 chat message 中的 artifact card
- THEN ArtifactsPanel SHALL 開啟並顯示該 artifact 內容
- AND 對應的 artifact tab SHALL 為 active 狀態

#### Scenario: 點擊 close button 關閉 panel

- WHEN 使用者點擊 panel header 中的 close button
- THEN ArtifactsPanel SHALL 隱藏
- AND ChatView SHALL 恢復為全寬佈局

#### Scenario: 再次點擊同一 artifact card

- WHEN ArtifactsPanel 已開啟並顯示某 artifact
- AND 使用者再次點擊同一 artifact card
- THEN panel SHALL 保持開啟（不 toggle 關閉）

---

### Requirement: 多 artifact tab 切換

當對話中存在多個 artifacts 時，panel SHALL 支援 tab 切換。

#### Scenario: 多個 artifacts 顯示 tabs

- WHEN 當前對話中存在多個 artifacts
- THEN panel header SHALL 顯示多個 tabs，每個 tab 對應一個 artifact
- AND tab 標籤 SHALL 顯示 artifact 的 `title`

#### Scenario: 點擊 tab 切換 artifact

- WHEN 使用者點擊另一個 artifact tab
- THEN content area SHALL 切換渲染對應的 artifact
- AND 被點擊的 tab SHALL 變為 active 狀態

#### Scenario: 從 message 點擊不同 artifact

- WHEN panel 已開啟顯示 artifact A
- AND 使用者在 message 中點擊 artifact B 的 card
- THEN panel SHALL 切換至 artifact B
- AND artifact B 的 tab SHALL 變為 active

---

### Requirement: Responsive 行為

當 viewport 寬度低於 768px 時，panel SHALL 切換為全螢幕 overlay 模式。

#### Scenario: 小螢幕 overlay 模式

- WHEN viewport 寬度 < 768px
- AND ArtifactsPanel 被開啟
- THEN panel SHALL 以 full-screen overlay（fixed inset-0）方式渲染
- AND panel SHALL 覆蓋整個畫面
- AND close button SHALL 仍然可用

#### Scenario: 大螢幕 split 模式

- WHEN viewport 寬度 >= 768px
- AND ArtifactsPanel 被開啟
- THEN panel SHALL 以右側 split panel 方式渲染（480px 寬度）
- AND ChatView 與 ArtifactsPanel 並排顯示

#### Scenario: 視窗大小變化時自動切換模式

- WHEN ArtifactsPanel 已開啟
- AND 使用者調整視窗大小跨越 768px 門檻
- THEN panel SHALL 自動在 split mode 與 overlay mode 之間切換

---

### Requirement: HTML sandboxing 安全策略

HTML artifacts SHALL 在具備嚴格 sandbox 限制的 iframe 中渲染，確保安全性。

#### Scenario: Iframe sandbox 屬性設置

- WHEN 渲染 `type="html"` 的 artifact
- THEN iframe MUST 包含 `sandbox="allow-scripts"` 屬性
- AND iframe MUST NOT 包含 `allow-same-origin`
- AND iframe MUST NOT 包含 `allow-top-navigation`

#### Scenario: HTML artifact 無法存取 parent window

- WHEN html artifact 內的 JavaScript 嘗試存取 `window.parent` 或 `window.top`
- THEN 瀏覽器 SHALL 因 sandbox 限制而阻止存取
- AND 不影響主應用程式的運作

---

### Requirement: Mermaid lazy loading

mermaid package SHALL 僅在渲染 mermaid artifact 時才被 dynamically import，避免增加初始 bundle size。

#### Scenario: 初始載入不包含 mermaid

- WHEN 應用程式首次載入
- THEN mermaid library SHALL NOT 被包含在 initial bundle 中

#### Scenario: 首次渲染 mermaid artifact 時動態載入

- WHEN 使用者首次開啟一個 `type="mermaid"` 的 artifact
- THEN 系統 SHALL 使用 `import()` 動態載入 mermaid package
- AND 載入期間 SHALL 顯示 loading 狀態

#### Scenario: 後續 mermaid artifacts 使用已載入的 module

- WHEN mermaid package 已被動態載入過
- AND 使用者開啟另一個 mermaid artifact
- THEN 系統 SHALL 使用已快取的 module，不重複載入

---

### Requirement: AppShell layout 變更

AppShell 主內容區域 SHALL 使用 flex layout 以容納 ChatView 與 ArtifactsPanel 並排顯示。

#### Scenario: 預設佈局（無 artifacts panel）

- WHEN ArtifactsPanel 未開啟
- THEN 主內容區域 SHALL 為 flex layout
- AND ChatView SHALL 佔滿全部可用寬度（`flex: 1`）

#### Scenario: 有 artifacts panel 的佈局

- WHEN ArtifactsPanel 開啟
- THEN 主內容區域 SHALL 為 flex row layout
- AND ChatView SHALL 使用 `flex: 1` 填充剩餘空間
- AND ArtifactsPanel SHALL 以固定 480px 寬度顯示在右側
