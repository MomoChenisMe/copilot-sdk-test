## Context

本專案前端使用 React 19 + Tailwind CSS 4，有多個側邊面板（OpenSpec、Artifacts）和 dialog 元件（UserInputDialog、CronConfigPanel）。目前各面板的視覺風格不一致：OpenSpec 使用填滿色 tab、bg-bg-secondary 背景、border-border-subtle 邊框；Artifacts 使用描邊 tab、bg-bg-primary 背景、border-border 邊框。CronConfigPanel 以 inline 卡片呈現在輸入框上方，與 UserInputDialog 的覆蓋式互動模式不一致。設定頁面開啟無任何過渡動畫。此外專案已有數十項功能但缺少完整的中英文使用指南和 README。

**現狀：**
- OpenSpec 面板：`bg-bg-secondary`、`border-border-subtle`、tab 用 `bg-accent text-white`、close 用 `hover:bg-bg-tertiary text-text-secondary`
- Artifacts 面板：`bg-bg-primary`、`border-border`、tab 用 `border-accent text-accent bg-accent/5`、close 用 `text-text-tertiary hover:text-text-primary hover:bg-bg-secondary`
- CronConfigPanel：inline 卡片 `border rounded-xl bg-bg-elevated p-4 mb-3`，作為 Input 元件的 sibling
- SettingsPanel：`fixed inset-0 z-50`，無進入動畫
- 動畫：OpenSpec 有 inline `<style>` slideInRight，其他面板無動畫

## Goals / Non-Goals

**Goals:**
- OpenSpec 面板的 header、tab、背景色、邊框、close 按鈕完全對齊 Artifacts 側邊欄風格
- CronConfigPanel 改為覆蓋在輸入框上方的浮動面板（absolute 定位），類似 AskUser dialog 風格
- 設定頁面開啟時有 fade + scale 動畫（200ms ease-out）
- 撰寫完整的中英文 Guide 使用指南和 README

**Non-Goals:**
- 不改變 OpenSpec 元件架構
- 不改變 CronConfigPanel 表單邏輯或 API
- 不新增關閉動畫
- 不將文件整合到應用程式內

## Decisions

### D1: OpenSpec 面板以 Artifacts 為基準統一樣式

**決策：** 修改 OpenSpec 面板的 CSS class 全面對齊 Artifacts 側邊欄，涉及 4 個 OpenSpec 元件檔案。

**替代方案：** 建立共用的 Panel/SidePanel 元件，OpenSpec 和 Artifacts 都從中繼承。
**取捨：** 共用元件需要重構兩邊的程式碼，複雜度遠高於簡單的 class 替換。目前兩個面板的內部邏輯差異大（OpenSpec 有多層嵌套視圖、task toggle 等，Artifacts 是簡單的 tab+content），抽象共用元件會過度設計。直接替換 class 最簡單且零風險。

**具體對照：**
| 屬性 | 原 OpenSpec | 改為（對齊 Artifacts） |
|------|------------|---------------------|
| 容器背景 | `bg-bg-secondary` | `bg-bg-primary` |
| 邊框色 | `border-border-subtle` | `border-border` |
| Header 高度 | `h-12` 固定 | 移除 h-12，改用 `py-3` auto |
| Header gap | `gap-3` | `gap-2` |
| Tab active | `bg-accent text-white rounded-md` | `border-accent text-accent bg-accent/5 rounded-lg border` |
| Tab inactive | `text-text-secondary hover:text-text-primary hover:bg-bg-tertiary` | `border-transparent text-text-secondary hover:bg-bg-secondary` |
| Close 按鈕 | `hover:bg-bg-tertiary text-text-secondary` | `text-text-tertiary hover:text-text-primary hover:bg-bg-secondary` |
| Close icon | 14px | 16px |
| Slide-in CSS | inline `<style>` | 移至全域 globals.css |

### D2: CronConfigPanel 使用 relative/absolute 定位覆蓋輸入框

**決策：** 在 ChatView 中將 CronConfigPanel 和 Input 包在一個 `relative` 容器中，CronConfigPanel 使用 `absolute bottom-full left-0 right-0 mb-2` 浮在輸入框正上方。

**替代方案 A：** 全屏 overlay（fixed inset-0）+ 居中卡片，如 UserInputDialog。
**取捨：** 截圖 3 的 AskUser 是局部覆蓋輸入框區域（非全屏），CronConfigPanel 也應如此。全屏 overlay 過度遮擋聊天內容，不適合需要看上下文的設定操作。

**替代方案 B：** 保持 inline 但改善視覺。
**取捨：** 使用者明確要求覆蓋輸入框風格，inline 不符合需求。

**容器結構：**
```tsx
<div className="relative">  {/* 新增 relative 包裝 */}
  {cronConfigOpen && (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-10">
      <CronConfigPanel ... />
    </div>
  )}
  <Input ... />
</div>
```

**CronConfigPanel 外觀：**
- 容器：`bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] p-6`
- Header：Clock icon 放在 `p-2 rounded-lg bg-accent/10` 背景圈中，標題右側有 X 關閉
- 表單元素：保持不變
- 底部按鈕：右對齊 Cancel + Save

### D3: 設定頁面使用 CSS keyframe 動畫

**決策：** 在 globals.css 新增 `@keyframes fadeScaleIn` 並在 SettingsPanel 容器加上 `animate-fade-scale-in` class。

**替代方案 A：** 使用 framer-motion 或 react-spring。
**取捨：** 引入新依賴只為一個簡單動畫不值得。CSS keyframe 零依賴、零 bundle size 增長、瀏覽器原生支援。

**替代方案 B：** 使用 Tailwind 的 animate-* 配置。
**取捨：** Tailwind CSS 4 尚不支援自定義 keyframe 的 @theme 配置，直接寫在 globals.css 更直觀。

**動畫規格：**
```css
@keyframes fadeScaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fade-scale-in {
  animation: fadeScaleIn 0.2s ease-out;
}
```

### D4: 文件採用分檔雙語策略

**決策：** Guide 和 README 各有中英文獨立檔案：`docs/GUIDE.md` + `docs/GUIDE.zh-TW.md`、`README.md` + `README.zh-TW.md`。

**替代方案：** 單檔雙語（同一檔案內先英後中）。
**取捨：** 單檔雙語會導致檔案過長，搜尋不便。分檔更清晰，GitHub 上 README 可透過連結互相跳轉。

### D5: slideInRight 動畫移至全域 CSS

**決策：** 將 OpenSpec 面板 inline 的 `<style>` 中的 slideInRight keyframe 移至 `globals.css`，同時提供給 OpenSpec 和 Artifacts 使用。

**替代方案：** 保留 inline style 僅在 OpenSpec 使用。
**取捨：** inline `<style>` 每次 render 都會插入 DOM，移至全域 CSS 更高效且可複用。

## Risks / Trade-offs

**[Risk] OpenSpec 面板子元件（OpenSpecChangeDetail 等）內的 border-subtle 未全部替換** → 可能造成部分區域邊框色不一致。**緩解：** 逐一檢查 OpenSpec 目錄下所有元件，對 `border-border-subtle` 進行全域搜尋替換。

**[Risk] CronConfigPanel absolute 定位可能超出 viewport** → 當輸入框在畫面底部，向上彈出的面板可能被截斷。**緩解：** ChatView 的內容區域有 overflow-auto，且 absolute 面板用 bottom-full 向上展開，在正常佈局中不會超出。

**[Risk] fadeScaleIn 動畫在低性能裝置上可能卡頓** → 200ms + scale + opacity 是 GPU-friendly 的 composite-only 屬性。**緩解：** 使用 ease-out timing 確保快速到達最終狀態，體感流暢。

**[Risk] Guide 文件可能與實際功能不同步** → 功能更新後文件可能落後。**緩解：** 這是靜態文件，個人專案維護成本可接受。後續可考慮在 change 流程中要求同步更新。
