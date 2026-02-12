# CSS 性能優化

Glassmorphism 的 `backdrop-filter` 對瀏覽器性能有顯著影響。以下是專案中實施的優化措施。

---

## 目錄

1. [Blur 值優化](#1-blur-值優化)
2. [Dialog 性能優化](#2-dialog-性能優化)
3. [CSS Containment](#3-css-containment)
4. [Content Visibility](#4-content-visibility)
5. [Transition 優化](#5-transition-優化)
6. [Will-Change 提示](#6-will-change-提示)
7. [檢查清單](#檢查清單)

---

## 1. Blur 值優化

將所有 `backdrop-filter: blur()` 從 `25px` 降至 `8px`，保持視覺效果同時減少 GPU 負載。

| 層級 | Blur 值 | 用途 |
|------|---------|------|
| standard | `blur(8px) saturate(180%)` | Toast, Menu |
| light | `blur(6px) saturate(180%)` | Select overlay, Tooltip |
| minimal | `blur(4px) saturate(180%)` | Dialog Mask (第一層) |

---

## 2. Dialog 性能優化

**問題**：多層 Dialog 疊加的 `backdrop-filter` 造成指數級性能下降。

**解決方案**：
- Dialog 本體**不使用** `backdrop-filter`，改用不透明背景 `#f5f5f7`
- Mask 遮罩的 blur 依層級遞減

```css
/* Dialog 本體 - 不使用 blur */
.p-dialog {
  background: #f5f5f7;
  border-radius: 28px;
}

/* Mask blur 遞減 */
.p-dialog-mask {
  backdrop-filter: blur(4px) saturate(180%); /* 第一層 */
}
.p-dialog-mask:has(~ .p-dialog-mask) {
  backdrop-filter: blur(2px) saturate(180%); /* 第二層 */
}
.p-dialog-mask:has(~ .p-dialog-mask ~ .p-dialog-mask) {
  backdrop-filter: none; /* 第三層以後 */
}
```

| 層級 | Mask Blur | 說明 |
|------|-----------|------|
| 第一層 | `blur(4px)` | 基本背景模糊 |
| 第二層 | `blur(2px)` | 減半模糊 |
| 第三層+ | 無 blur | 只保留背景色 |

---

## 3. CSS Containment

使用 `contain` 屬性隔離元件的重繪範圍。

```css
/* 完全隔離 - Dialog、Drawer、Menu */
.p-dialog,
.p-drawer,
.p-menu {
  contain: layout paint style;
}

/* 佈局隔離 - DataTable、Card */
.p-datatable {
  contain: layout;
}

/* Toast - 不使用 paint（會裁切圓角陰影） */
.p-toast {
  contain: layout style;
}
```

> **注意**：`contain: paint` 會裁切陰影在元素邊界框內。Toast 需顯示圓角陰影，不使用 `paint`。

---

## 4. Content Visibility

對長列表使用 `content-visibility: auto` 跳過視口外元素的渲染，可減少 30-40% 初始渲染時間。

```css
/* DataTable 行 */
.p-datatable-tbody > tr {
  content-visibility: auto;
  contain-intrinsic-size: auto 52px; /* 預估行高 */
}

/* Listbox 選項 */
.p-listbox-option {
  content-visibility: auto;
  contain-intrinsic-size: auto 40px;
}

/* Tree 節點 */
.p-tree-node {
  content-visibility: auto;
  contain-intrinsic-size: auto 40px;
}
```

> **注意**：Safari 的 Cmd+F 搜尋可能無法找到被隱藏的文字。

---

## 5. Transition 優化

避免使用 `transition: all`，改為指定具體屬性：

```css
/* ❌ 避免 */
transition: all 0.3s ease;

/* ✅ 推薦 */
transition:
  transform 0.3s cubic-bezier(0.32, 0.72, 0, 1),
  opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1),
  background-color 0.3s cubic-bezier(0.32, 0.72, 0, 1);
```

---

## 6. Will-Change 提示

僅對實際會動畫的元素使用 `will-change`，避免過度使用（每個都會創建合成層）。

```css
/* Hover 時才啟用 */
.p-button:hover,
.p-card:hover {
  will-change: transform;
}

/* 動畫期間 */
.p-dialog-enter-active,
.p-dialog-leave-active {
  will-change: transform, opacity;
}
```

---

## 檢查清單

- [ ] Dialog 本體是否使用不透明背景而非 `backdrop-filter`？
- [ ] Dialog Mask 是否依層級遞減 blur (4px → 2px → 無)？
- [ ] 所有 `blur()` 值是否已降至 `8px` 以下？
- [ ] 長列表是否已套用 `content-visibility: auto`？
- [ ] 是否避免使用 `transition: all`？
- [ ] `will-change` 是否僅用於實際會動畫的元素？
- [ ] `contain: paint` 是否避免用於需顯示陰影溢出的元件？
- [ ] Toast 動畫是否使用向上滑出 (`translateY(-100%)`)？
