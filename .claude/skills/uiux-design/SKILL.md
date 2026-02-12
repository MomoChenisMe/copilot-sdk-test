---
name: uiux-design
description: |
  前端 UI/UX 設計規範與視覺標準。當進行任何前端 UI 調整時必須使用此技能。包括：
  - 修改樣式、調整元件外觀、設計頁面佈局
  - 使用 Tailwind CSS、調整 PrimeNG 元件
  - 修改 HTML 模板、新增或修改按鈕/表單/對話框/卡片/表格等 UI 元件
  - 處理動畫效果、調整顏色/陰影/圓角/間距
  涵蓋 Apple Glassmorphism 風格與用戶為中心的設計思維。
---

# UI/UX 設計規範

> **核心理念**：以用戶為中心的設計思維 > 視覺樣式規範
> **設計系統**：Apple HIG + Glassmorphism + Tailwind CSS

---

## 設計流程（必須遵守）

1. **UX 思維先行** - 先思考用戶，再動手設計
2. **套用視覺規範** - 遵循 Apple Glassmorphism 風格
3. **使用 Tailwind CSS** - 避免手寫傳統 CSS
4. **驗證實作** - 檢查是否符合規範

---

## UX 設計思維（最高優先）

### 設計前必問

| 問題 | 思考要點 |
|------|---------|
| 誰在用？ | 目標用戶（管理員、一般用戶、訪客） |
| 要做什麼？ | 用戶想完成什麼任務 |
| 怎麼操作最順？ | 最少步驟、最直覺的流程 |
| 可能卡在哪？ | 哪個步驟可能困惑或挫折 |

### 角色扮演法（強制）

設計時必須以第一人稱視角模擬：

```
「我是 [角色]，我想要 [目標]...」
「我點了這個按鈕後，預期會發生什麼？」
「這裡要點三次才能完成，能不能簡化？」
```

### UX 原則

| 原則 | 說明 |
|------|------|
| 最小驚訝 | 介面行為符合用戶預期 |
| 漸進揭露 | 只顯示當前需要的資訊 |
| 明確回饋 | 每個操作都有視覺回饋 |
| 容錯設計 | 允許用戶犯錯並輕鬆修正 |
| 一致性 | 相同功能、相同呈現方式 |

---

## 視覺規範速查

### 禁止事項

| 禁止 | 應該使用 |
|------|----------|
| 實心深色背景 Toast | 毛玻璃效果 `bg-white/70 backdrop-blur-xl` |
| 方角按鈕 | 全圓角 `rounded-full` |
| Textarea 全圓角 | 使用 `rounded-xl` |
| 厚重投影 | 彌散陰影（低透明度 6%-15%） |
| 純黑文字 | `#1D1D1F` |
| Material Design 漸層進度條 | Apple 純色 `#007AFF` |

### 常用參數

| 項目 | 值 |
|------|-----|
| 主色 | `#007AFF` |
| 主要文字 | `#1D1D1F` |
| 次要文字 | `#86868B` |
| 背景色 | `#F5F5F7` |
| 玻璃模糊 | `backdrop-blur-[8px]` |
| 動畫曲線 | `cubic-bezier(0.32, 0.72, 0, 1)` |
| 動畫時長 | `300ms` / `500ms` (大型區塊) |

### 陰影層級

| 層級 | 用途 | Tailwind |
|------|------|----------|
| L1 | 卡片、輸入框 | `shadow-[0_2px_8px_rgba(0,0,0,0.06)]` |
| L2 | 選單、下拉框 | `shadow-[0_4px_12px_rgba(0,0,0,0.08)]` |
| L3 | 對話框 | `shadow-[0_8px_24px_rgba(0,0,0,0.10)]` |
| L4 | 模態視窗 | `shadow-[0_16px_48px_rgba(0,0,0,0.12)]` |

### Apple System Colors

| 用途 | 色碼 |
|------|------|
| Blue | `#007AFF` |
| Green | `#34C759` |
| Orange | `#FF9500` |
| Red | `#FF3B30` |

---

## 元件快速索引

| 元件 | 關鍵樣式 | 常見錯誤 |
|------|----------|----------|
| Dialog | `bg-[#f5f5f7] rounded-[28px]` | ❌ Dialog 本體使用 blur |
| Button | `rounded-full font-semibold` | ❌ 方角按鈕 |
| Card | `bg-white rounded-2xl` (無邊框) | ❌ 使用邊框或陰影 |
| Input | 單行 `rounded-full`，多行 `rounded-xl` | ❌ Textarea 全圓角 |
| Toast | `bg-white/70 backdrop-blur-xl` | ❌ 實心背景 |
| Chip/Tag | `rounded-full px-2.5 py-1` | ❌ 方角標籤 |
| Table | 行背景 `#f9f9fb` / `#f3f3f5` | ❌ 半透明背景 |

---

## 參考文件

依需求載入對應文件：

| 文件 | 內容 |
|------|------|
| [references/design-principles.md](references/design-principles.md) | 核心設計原則（玻璃材質、陰影、動畫） |
| [references/components.md](references/components.md) | 完整元件規範與程式碼範例 |
| [references/performance.md](references/performance.md) | CSS 性能優化指南 |
