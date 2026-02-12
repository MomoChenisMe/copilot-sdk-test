# 核心設計原則

Apple HIG + Glassmorphism 風格的核心設計原則。

---

## 目錄

1. [磨砂玻璃材質](#1-磨砂玻璃材質)
2. [內描邊](#2-內描邊)
3. [彌散陰影](#3-彌散陰影)
4. [幾何與色彩](#4-幾何與色彩)
5. [字體排印](#5-字體排印)
6. [圖標系統](#6-圖標系統)
7. [動態與過渡](#7-動態與過渡)
8. [全域背景](#8-全域背景)

---

## 1. 磨砂玻璃材質

背景對後方進行「高斯模糊」，保留背景的色彩氛圍。

**CSS 參數：**

```css
.glass-base {
  /* 性能優化：blur 從 25px 降至 8px */
  backdrop-filter: blur(8px) saturate(180%);
  -webkit-backdrop-filter: blur(8px) saturate(180%);
  background-color: rgba(255, 255, 255, 0.72);
}
```

**Tailwind 寫法：**

```html
<!-- ✅ 正確 -->
<div class="bg-white/70 backdrop-blur-[8px] backdrop-saturate-180">
  毛玻璃容器
</div>

<!-- ❌ 錯誤：純色無模糊 -->
<div class="bg-white">純白背景</div>
```

---

## 2. 內描邊

模擬玻璃切面反光，使用極細半透明白色邊框。

```css
border: 1px solid rgba(255, 255, 255, 0.4);
```

**Tailwind 寫法：**

```html
<!-- ✅ 正確 -->
<div class="border border-white/40"></div>

<!-- ❌ 錯誤：實心深色邊框 -->
<div class="border border-gray-300"></div>
```

---

## 3. 彌散陰影

陰影應柔和彌散，使用低透明度 (6%-15%)。

### 陰影層級系統

| 層級 | 用途 | box-shadow | Tailwind |
|------|------|------------|----------|
| L0 | 平面元素 | `none` | - |
| L1 | 卡片、輸入框 | `0 2px 8px rgba(0,0,0,0.06)` | `shadow-[0_2px_8px_rgba(0,0,0,0.06)]` |
| L2 | 選單、下拉框 | `0 4px 12px rgba(0,0,0,0.08)` | `shadow-[0_4px_12px_rgba(0,0,0,0.08)]` |
| L3 | 對話框 | `0 8px 24px rgba(0,0,0,0.10)` | `shadow-[0_8px_24px_rgba(0,0,0,0.10)]` |
| L4 | 模態視窗 | `0 16px 48px rgba(0,0,0,0.12)` | `shadow-[0_16px_48px_rgba(0,0,0,0.12)]` |

### 方向性陰影

用於凍結欄位、固定導航列等。

```css
/* 左側元素 - 右邊陰影 */
box-shadow: 6px 0 12px -4px rgba(0, 0, 0, 0.12);

/* 頂部元素 - 下方陰影 */
box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.1);
```

**範例：**

```html
<!-- ✅ 正確：低透明度彌散陰影 -->
<div class="shadow-[0_2px_8px_rgba(0,0,0,0.06)]"></div>

<!-- ❌ 錯誤：厚重陰影 -->
<div class="shadow-2xl"></div>
```

---

## 4. 幾何與色彩

### 圓角規範

| 元素 | 圓角 | Tailwind |
|------|------|----------|
| 按鈕 | 全圓角 (Pill) | `rounded-full` |
| 卡片 | 16-24px | `rounded-2xl` |
| Dialog | 28px | `rounded-[28px]` |
| 輸入框 (單行) | 全圓角 | `rounded-full` |
| 輸入框 (多行) | 12px | `rounded-xl` |

### Apple System Colors

| 名稱 | 色碼 | 用途 |
|------|------|------|
| System Blue | `#007AFF` | 主色、連結、聚焦 |
| System Green | `#34C759` | 成功狀態 |
| System Orange | `#FF9500` | 警告狀態 |
| System Red | `#FF3B30` | 錯誤、危險操作 |
| Primary Text | `#1D1D1F` | 主要文字 |
| Secondary Text | `#86868B` | 次要文字 |
| Background | `#F5F5F7` | 頁面背景 |

**範例：**

```html
<!-- ✅ 正確 -->
<div class="rounded-2xl text-[#1D1D1F]"></div>

<!-- ❌ 錯誤：小圓角 + 純黑文字 -->
<div class="rounded-md text-black"></div>
```

---

## 5. 字體排印

### 字體家族

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro TC", "SF Pro Text",
  "Helvetica Neue", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
```

### 字級規範

| 類型 | 尺寸 | 字重 | Tailwind |
|------|------|------|----------|
| 大標題 | 32-40px | 700 Bold | `text-3xl font-bold` |
| 頁面標題 | 24-28px | 600 SemiBold | `text-2xl font-semibold` |
| 區塊標題 | 20px | 600 SemiBold | `text-xl font-semibold` |
| 內文 | 16px | 400 Regular | `text-base` |
| 輔助說明 | 12-14px | 400 Regular | `text-sm text-[#86868B]` |

**範例：**

```html
<!-- ✅ 正確 -->
<h1 class="text-2xl font-semibold text-[#1D1D1F]">標題</h1>
<p class="text-base text-[#1D1D1F]">內文</p>
<span class="text-sm text-[#86868B]">輔助說明</span>

<!-- ❌ 錯誤 -->
<p class="text-xs font-bold text-black">內文</p>
```

---

## 6. 圖標系統

使用 **Material Symbols Rounded**，模擬 Apple SF Symbols 質感。

**設定原則：**

- 必須使用 **Rounded** 版本
- 粗細 (Weight)：**300 (Light)**
- 填色 (Fill)：預設 **0 (Outline)**，Active 狀態轉為 **1 (Solid)**

```css
.apple-icon {
  font-family: "Material Symbols Rounded";
  font-variation-settings: "FILL" 0, "wght" 300, "GRAD" 0, "opsz" 24;
  color: rgba(0, 0, 0, 0.75);
}

.apple-icon.active {
  font-variation-settings: "FILL" 1, "wght" 300, "GRAD" 0, "opsz" 24;
  color: #007aff;
}
```

**範例：**

```html
<!-- ✅ 正確：Rounded + Light Weight -->
<span class="material-symbols-rounded" style="font-variation-settings: 'wght' 300">
  settings
</span>

<!-- ❌ 錯誤：Sharp + 預設粗細 -->
<span class="material-symbols-sharp">settings</span>
```

---

## 7. 動態與過渡

### Apple Ease Out 曲線

```css
transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
```

### 動畫時長

| 元素 | 時長 |
|------|------|
| 按鈕、小元件 | 300ms |
| 側邊欄、大型區塊 | 500ms |

**範例：**

```html
<!-- ✅ 正確：Apple Ease Out -->
<div class="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"></div>

<!-- ❌ 錯誤：線性動畫 -->
<div class="transition-all duration-300 ease-linear"></div>
```

---

## 8. 全域背景

Glassmorphism 依賴底層背景透出，純白背景無法顯現玻璃效果。

**建議色碼：** `#F5F5F7` (Apple System Gray)

```css
body {
  background-color: #f5f5f7;
}
```

**響應式設計：**

| 裝置 | 調整 |
|------|------|
| Mobile | 減少 blur (10-15px)、滿版設計 |
| Desktop | 充分利用玻璃層次感 |
