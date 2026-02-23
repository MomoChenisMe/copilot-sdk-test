## Why

專案中多個面板（OpenSpec、Artifacts、CronConfig）的視覺風格不一致，影響整體 UI 品質。排程任務面板以 inline 卡片顯示，與 AskUser dialog 風格脫節。設定頁面開啟無動畫，體驗生硬。此外，專案功能已趨完整但缺少完整的使用指南和雙語 README，對未來回顧和維護構成障礙。一次性批次處理以統一風格並補齊文件。

**目標使用者：** 單人使用的開發者（本人），透過手機瀏覽器或桌面瀏覽器操作 AI Terminal。

**使用情境：**
- 同時開啟 OpenSpec 面板與 Artifacts 側邊欄時，期望兩者的 header、tab、色彩語言一致
- 開啟排程任務設定時，期望與 AskUser dialog 相同的覆蓋輸入框互動模式
- 開啟設定頁面時，期望有流暢的進入動畫
- 查閱完整的功能使用指南（中英文）
- 透過 README 快速了解專案定位和功能全貌

## What Changes

- **[UI] OpenSpec 面板視覺對齊 Artifacts 側邊欄**：以 Artifacts 側邊欄為基準，統一 OpenSpec 面板的背景色（bg-bg-primary）、邊框（border-border）、header 間距、tab 描邊樣式（border-accent 取代填滿色）、close 按鈕色彩，並將 slide-in 動畫移至全域 CSS
- **[UI] CronConfigPanel 改為局部覆蓋輸入框**：排程任務面板從 inline 卡片改為浮動在輸入框上方的覆蓋面板，使用 absolute 定位 + shadow-lg + 圓角卡片，類似 AskUser dialog（截圖 3 風格）
- **[UX] 設定頁面 Fade + Scale 開啟動畫**：新增 fadeScaleIn keyframe（opacity 0→1 + scale 0.95→1，200ms ease-out），設定頁面開啟時自動播放
- **[Docs] 完整 Guide 使用指南**：撰寫涵蓋所有功能的使用指南，分 `docs/GUIDE.md`（English）和 `docs/GUIDE.zh-TW.md`（繁體中文）
- **[Docs] 更新 README.md**：重寫 `README.md`（English）並新增 `README.zh-TW.md`（繁體中文），涵蓋功能全覽、架構、技術棧、開發與部署

## Non-Goals（非目標）

- 不重構 OpenSpec 面板的元件架構（僅調整樣式 class）
- 不改變 CronConfigPanel 的表單邏輯或 API（僅調整外觀和定位方式）
- 不新增設定頁面的關閉動畫（僅加開啟動畫）
- 不將 Guide 或 README 整合到應用程式內（僅為獨立 Markdown 檔案）
- 不新增自動化文件生成機制

## Capabilities

### New Capabilities

_無新增 capability，文件為獨立 Markdown 不涉及 spec。_

### Modified Capabilities

- `openspec-ui-panel`: OpenSpec 面板視覺樣式全面對齊 Artifacts 側邊欄（header、tab、背景色、邊框色、close 按鈕）
- `artifacts-panel`: 將 slide-in 動畫移至全域 CSS 以便共用（minor）
- `cron-chat-tool`: CronConfigPanel 從 inline 卡片改為覆蓋輸入框上方的浮動面板
- `settings-full-page`: 設定頁面新增 fade + scale 開啟動畫
- `design-system`: 全域 CSS 新增 fadeScaleIn 和 slideInRight 動畫 keyframes

## Impact

**前端修改（~10 個檔案）：**
- `frontend/src/components/openspec/OpenSpecPanel.tsx` — 容器背景色、邊框、移除 inline style
- `frontend/src/components/openspec/OpenSpecHeader.tsx` — header 間距、close 按鈕樣式
- `frontend/src/components/openspec/OpenSpecNavTabs.tsx` — tab active/inactive 樣式
- `frontend/src/components/openspec/OpenSpecChangeDetail.tsx` — 子 tab 樣式對齊
- `frontend/src/components/copilot/CronConfigPanel.tsx` — 外層容器定位與樣式
- `frontend/src/components/copilot/ChatView.tsx` — CronConfigPanel 渲染位置調整
- `frontend/src/components/settings/SettingsPanel.tsx` — 新增動畫 class
- `frontend/src/styles/globals.css` — 新增 fadeScaleIn + slideInRight keyframes

**新增檔案（4 個）：**
- `docs/GUIDE.md` — 英文使用指南
- `docs/GUIDE.zh-TW.md` — 繁體中文使用指南
- `README.zh-TW.md` — 繁體中文 README（README.md 為改寫現有）

**後端：** 無修改

**依賴：** 無新增依賴
