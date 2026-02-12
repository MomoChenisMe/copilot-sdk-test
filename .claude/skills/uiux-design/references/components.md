# 元件設計規範

PrimeNG 元件的 Apple Glassmorphism 風格規範與程式碼範例。

---

## 目錄

1. [Dialog / Modal](#1-dialog--modal)
2. [Button](#2-button)
3. [Selection Card](#3-selection-card)
4. [Table](#4-table)
5. [Input Fields](#5-input-fields)
6. [Toast / Notification](#6-toast--notification)
7. [ConfirmDialog](#7-confirmdialog)
8. [Card](#8-card)
9. [Chip & Tag](#9-chip--tag)
10. [其他元件](#10-其他元件)

---

## 1. Dialog / Modal

> **性能優化**：Dialog 本體不使用 `backdrop-filter`，僅在 Mask 上保留輕量 blur。

### 樣式規範

| 屬性 | 值 | 說明 |
|------|-----|------|
| 背景 | `#f5f5f7` | 不透明，模擬玻璃視覺 |
| 圓角 | `28px` | `rounded-[28px]` |
| 邊框 | `1px solid rgba(0,0,0,0.1)` | 極淡邊框 |
| 陰影 | `0 20px 40px rgba(0,0,0,0.2)` | 深度陰影 |
| Mask | `backdrop-filter: blur(4px)` | 僅遮罩模糊 |

### 內距規範

| 區域 | Padding |
|------|---------|
| Header | `0.75rem 1.5rem` |
| Content | `1rem` |
| Footer | `0.75rem 1.5rem` |

### 範例

```css
/* Dialog 本體 */
.p-dialog {
  background: #f5f5f7;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 28px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

/* Mask 遮罩 */
.p-dialog-mask {
  backdrop-filter: blur(4px);
}
```

### Section 區塊

Dialog 內的表單區塊：

```html
<section class="rounded-2xl p-4 bg-white">
  <!-- Section Header -->
  <div class="text-base font-semibold text-[#1D1D1F] mb-4 flex items-center gap-2">
    <app-mbitek-icon icon="apartment" class="text-[#007AFF] !text-xl"></app-mbitek-icon>
    基本資訊
  </div>
  <!-- 表單網格 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4">
    <!-- 欄位 -->
  </div>
</section>
```

---

## 2. Button

### 通用屬性

| 屬性 | 值 |
|------|-----|
| 形狀 | 全圓角 `rounded-full` |
| 字體 | `16px` (1rem), `font-semibold` |
| 高度 | `36px` - `40px` |
| 內距 | `px-4 py-2` |

### 樣式變體

**Primary（主要）**
```html
<button class="rounded-full bg-[#007AFF] text-white text-base font-semibold px-4 py-2
  border border-[#007AFF]/20 hover:bg-[#0066CC] hover:shadow-md hover:-translate-y-0.5
  transition-all duration-300">
  儲存
</button>
```

**Secondary（次要）**
```html
<button class="rounded-full bg-white/50 border border-black/10 text-[#1D1D1F] px-4 py-2
  hover:bg-white hover:shadow-sm transition-all duration-300">
  取消
</button>
```

**Destructive（危險）**
```html
<button class="rounded-full bg-red-50 text-[#FF3B30] border border-red-100 px-4 py-2
  hover:bg-red-100 transition-colors">
  刪除
</button>
```

**Icon Button（圖標）**
```html
<button class="w-10 h-10 rounded-full bg-white/50 border border-white/60 shadow-sm
  flex items-center justify-center hover:bg-white hover:shadow-md transition-all">
  <span class="material-symbols-rounded">edit</span>
</button>
```

### 常見錯誤

```html
<!-- ❌ 錯誤：方角 + 小字體 -->
<button class="rounded-lg bg-blue-500 text-white text-sm">儲存</button>

<!-- ✅ 正確：全圓角 + 標準字體 -->
<button class="rounded-full bg-[#007AFF] text-white text-base font-semibold">儲存</button>
```

---

## 3. Selection Card

> **核心概念**：使用「光暈點亮」而非「實心填充」。

### 狀態樣式

**預設狀態**
```css
background: rgba(0, 0, 0, 0.02);
border: 1px solid rgba(0, 0, 0, 0.08);
border-radius: 16px;
```

**選中狀態**
```css
background: rgba(0, 122, 255, 0.06);
border: 2px solid #007aff;
box-shadow: 0 8px 20px rgba(0, 122, 255, 0.15);
```

### 範例

```html
<!-- ✅ 正確：光暈效果 -->
<div class="rounded-2xl border-2 border-[#007AFF] bg-[#007AFF]/[0.06]
  shadow-[0_8px_20px_rgba(0,122,255,0.15)]">
  <span class="text-[#007AFF] font-semibold">選項名稱</span>
</div>

<!-- ❌ 錯誤：實心藍色填充 -->
<div class="rounded-2xl bg-[#007AFF] text-white">選項名稱</div>
```

---

## 4. Table

### 行背景（必須不透明）

| 行類型 | 背景色 | 說明 |
|--------|--------|------|
| 奇數行 | `#f9f9fb` | 不透明淺灰 |
| 偶數行 | `#f3f3f5` | 不透明灰 |
| Hover | `#e8f4ff` | 不透明淡藍 |

### 凍結欄位陰影

```css
/* 左凍結 - 右側陰影 */
box-shadow: 6px 0 12px -4px rgba(0, 0, 0, 0.12);

/* 右凍結 - 左側陰影 */
box-shadow: -6px 0 12px -4px rgba(0, 0, 0, 0.12);
```

### 範例

```css
/* ✅ 正確：不透明背景 */
tr:nth-child(odd) { background-color: #f9f9fb; }
tr:nth-child(even) { background-color: #f3f3f5; }

/* ❌ 錯誤：半透明導致穿透 */
tr { background-color: rgba(255, 255, 255, 0.8); }
```

---

## 5. Input Fields

### 形狀規範

| 類型 | 圓角 |
|------|------|
| 單行輸入 | `rounded-full` |
| 多行 Textarea | `rounded-xl` |

### 狀態樣式

| 狀態 | 邊框 | 其他 |
|------|------|------|
| 預設 | `rgba(0,0,0,0.1)` | - |
| 懸停 | `rgba(0,0,0,0.2)` | - |
| 聚焦 | `#007AFF` | 藍色光暈 |
| 錯誤 | `#FF3B30` | - |

### 範例

```html
<!-- ✅ 單行：全圓角 -->
<input type="text" class="rounded-full border border-black/10 px-4 py-2
  focus:border-[#007AFF] focus:shadow-[0_8px_20px_rgba(0,122,255,0.15)]" />

<!-- ✅ 多行：標準圓角 -->
<textarea class="rounded-xl border border-black/10 px-4 py-3"></textarea>

<!-- ❌ 錯誤：Textarea 全圓角 -->
<textarea class="rounded-full"></textarea>
```

---

## 6. Toast / Notification

> 使用毛玻璃背景，僅圖示著色，不使用實心背景。

### 樣式規範

| 屬性 | 值 |
|------|-----|
| 背景 | `bg-white/70 backdrop-blur-[8px]` |
| 圓角 | `18px` |
| 陰影 | `0 10px 40px rgba(0,0,0,0.3)` |
| 位置 | 頂部居中或右上角 |

### 狀態色（僅圖示）

| 狀態 | 圖示顏色 |
|------|----------|
| Success | `#34C759` |
| Error | `#FF3B30` |
| Info | `#007AFF` |
| Warning | `#FF9500` |

### 範例

```html
<!-- ✅ 正確：毛玻璃 + 彩色圖示 -->
<div class="bg-white/70 backdrop-blur-[8px] backdrop-saturate-180 rounded-[18px]
  shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
  <span class="text-[#34C759]">✓</span>
  <span class="text-[#1D1D1F]">操作成功</span>
</div>

<!-- ❌ 錯誤：實心背景 -->
<div class="bg-green-500 text-white rounded-lg">操作成功</div>
```

### PrimeNG 配置

```html
<p-toast
  position="top-center"
  [showTransformOptions]="'translateY(-100%)'"
  [hideTransformOptions]="'translateY(-100%)'"
  [showTransitionOptions]="'300ms cubic-bezier(0.32, 0.72, 0, 1)'"
  [hideTransitionOptions]="'200ms cubic-bezier(0.32, 0.72, 0, 1)'"
/>
```

---

## 7. ConfirmDialog

### 容器樣式

| 屬性 | Tailwind |
|------|----------|
| 背景 | `bg-white/80 backdrop-blur-xl` |
| 圓角 | `rounded-[28px]` |
| 邊框 | `border border-white/40` |
| 陰影 | `shadow-[0_20px_40px_rgba(0,0,0,0.2)]` |
| 內距 | `p-8` |

### 圖示區域

| 類型 | 背景色 | 圖示 |
|------|--------|------|
| Warning | `bg-orange-50` | `warning` |
| Error | `bg-red-50` | `dangerous` |
| Success | `bg-green-50` | `check_circle` |
| Info | `bg-blue-50` | `help` |

### 按鈕佈局

- **高度**: `44px` (2.75rem)
- **雙按鈕**: 水平排列 `grid-cols-2`
- **順序**: 左側取消，右側確認

### 尺寸規範

| 尺寸 | 寬度 | 用途 |
|------|------|------|
| S | `w-[400px]` | 警示、確認 |
| M | `w-[600px]` | 標準表單 |
| L | `w-[900px]` | 複雜內容 |
| XL | `w-[1200px]` | 大型資料 |

---

## 8. Card

> **極簡設計**：實心白底，無邊框、無陰影、無玻璃效果。

### 基礎樣式

| 屬性 | 值 |
|------|-----|
| 背景 | `#FFFFFF` (不透明) |
| 圓角 | `16px` (`rounded-2xl`) |
| 邊框 | 無 |
| 陰影 | 無 |

### 範例

```html
<!-- ✅ 正確：極簡白底 -->
<div class="bg-white rounded-2xl p-4">
  內容
</div>

<!-- ❌ 錯誤：使用邊框或陰影 -->
<div class="bg-white rounded-2xl border shadow-lg">內容</div>
```

### 可點擊卡片

```html
<div class="bg-white rounded-2xl p-4 cursor-pointer
  hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:-translate-y-0.5
  active:scale-[0.98] transition-all duration-300">
  可點擊內容
</div>
```

---

## 9. Chip & Tag

### 基礎樣式

| 屬性 | 值 |
|------|-----|
| 形狀 | 全圓角 `rounded-full` |
| 內距 | `px-2.5 py-1` |
| 字體 | `text-xs` (12px) |

### 狀態色

| 狀態 | 背景 | 文字 |
|------|------|------|
| Default | `bg-gray-100` | `#1D1D1F` |
| Info | `bg-blue-50` | `#007AFF` |
| Success | `bg-green-50` | `#34C759` |
| Warning | `bg-orange-50` | `#FF9500` |
| Error | `bg-red-50` | `#FF3B30` |

### 範例

```html
<!-- ✅ 正確 -->
<span class="rounded-full px-2.5 py-1 text-xs bg-blue-50 text-[#007AFF]">
  標籤
</span>

<!-- ❌ 錯誤：方角 -->
<span class="rounded-md px-2 py-1 bg-blue-500 text-white">標籤</span>
```

---

## 10. 其他元件

### Tooltip

| 屬性 | 值 |
|------|-----|
| 背景 | 白色或深灰 |
| 圓角 | `8px` - `10px` |
| 陰影 | `0 4px 12px rgba(0,0,0,0.15)` |
| 箭頭 | 必須有 |

### Tabs / Segmented Control

- 外觀：淺灰色膠囊背景
- 選取項：白色實體膠囊，帶陰影
- 圓角：全圓角

### Drawer / Sidebar

- Desktop：全高度，半透明模糊背景
- Mobile Bottom Sheet：頂部圓角 `16px`，需有 Grabber 手柄

### ProgressBar

| 屬性 | 值 |
|------|-----|
| 顏色 | 純色 `#007AFF` |
| 高度 | `12px` |
| 圓角 | 全圓角 |

```html
<!-- ❌ 錯誤：漸層進度條 -->
<div class="bg-gradient-to-r from-blue-400 to-blue-600"></div>

<!-- ✅ 正確：純色 -->
<div class="bg-[#007AFF] h-3 rounded-full"></div>
```
