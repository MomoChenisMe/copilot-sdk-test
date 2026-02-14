## Context

AI Terminal 是跑在 Linux VPS 上的個人 AI 開發工具。目前存在一個關鍵 bug（助手訊息不顯示）和多項 UI/UX 問題。後端使用 @github/copilot-sdk 的 EventRelay 模式將 SDK 事件轉發到前端，但 SDK 事件的巢狀結構（`{ type, data: { ... } }`）與 EventRelay 的扁平存取（`e.messageId`）不匹配，導致所有事件內容為空。

此外，前端缺少 i18n 支援，所有 UI 字串硬編碼散佈在 15+ 個元件中。

## Goals / Non-Goals

**Goals:**
- 修復 EventRelay 事件結構解析，使助手訊息和 streaming 正常顯示
- 改善聊天介面版面為現代氣泡式佈局
- 修復模型選擇器截斷問題
- 統一全應用的間距系統
- 導入 i18n 支援（zh-TW 預設 + en）附語言切換器

**Non-Goals:**
- 不重構 WebSocket 通訊協議
- 不變更後端 API 結構
- 不新增第三種語言
- 不導入 CSS-in-JS 或其他樣式方案（維持 Tailwind v4）

## Decisions

### Decision 1：EventRelay 防禦性資料存取

**選擇**：在每個事件處理器中加入 `const d = e.data ?? e;`，從 `d` 存取欄位。

**替代方案**：在 EventRelay 建構子中統一包裝 SDK session 的 `on()` 方法，自動展開巢狀事件。
- 取捨：統一包裝更乾淨但需要修改 session 介面，且 SDK 未來可能改變事件結構。防禦性存取（`e.data ?? e`）同時支援巢狀和扁平格式，對 SDK 版本變更更有韌性。

### Decision 2：i18n 方案選擇 react-i18next

**選擇**：`i18next` + `react-i18next` + `i18next-browser-languagedetector`。

**替代方案 A**：`react-intl`（FormatJS）
- 取捨：react-intl 功能更完整（ICU 格式、複數、日期格式化），但對此專案來說過重。i18next 生態系更大、文件更多、設定更簡單。

**替代方案 B**：自建簡易 i18n（context + JSON）
- 取捨：最輕量，但缺少語言偵測、命名空間、插值語法等。隨翻譯成長維護成本高。

### Decision 3：翻譯檔嵌入 bundle（非遠端載入）

**選擇**：翻譯 JSON 直接 import 進 i18n.ts，打包進前端 bundle。

**替代方案**：使用 `i18next-http-backend` 從伺服器載入翻譯檔。
- 取捨：遠端載入適合大規模多語系應用，可做按需載入。但本專案只有 2 種語言、<100 個 key，嵌入 bundle 更簡單且無額外網路請求。

### Decision 4：語言切換器放在 TopBar

**選擇**：在 TopBar 右側（主題切換按鈕旁）加入 Globe icon 按鈕，點擊切換 zh-TW ↔ en。

**替代方案**：放在 Sidebar 設定區或獨立設定頁面。
- 取捨：TopBar 切換最直覺、最快速。Sidebar 設定頁適合更多選項但目前只有兩種語言，開設定頁過重。

### Decision 5：聊天氣泡視覺設計

**選擇**：使用者訊息用 `bg-accent/10` 背景靠右，助手訊息靠左帶 Sparkles icon 和 `pl-8` 縮排。

**替代方案**：使用者訊息用純色背景（如實心 accent），助手無 icon。
- 取捨：純色背景在深色主題下對比太強烈。半透明 accent 背景（`bg-accent/10`）更柔和，且與現有主題系統一致。Sparkles icon 為助手訊息提供視覺錨點。

### Decision 6：測試中的 i18n 處理

**選擇**：在 vitest setup 中真實初始化 i18n（使用 en locale），讓現有英文斷言繼續通過。

**替代方案**：mock `react-i18next` 的 `useTranslation`，讓 `t()` 返回 key。
- 取捨：mock 方式更隔離但所有 test assertion 需改為比對 key（如 `'chat.assistant'` 而非 `'Assistant'`）。真實初始化 en locale 讓現有測試只需最小改動。

## Risks / Trade-offs

- **[風險] SDK 事件結構不確定性** → 緩解：防禦性 `e.data ?? e` 同時支援兩種結構，並加入 debug log 記錄實際接收到的事件格式
- **[風險] i18n 改動範圍大（15+ 檔案）** → 緩解：最後執行 i18n，先完成所有 UI 和 bug 修復，減少重工
- **[風險] Tailwind 間距調整可能影響手機排版** → 緩解：使用 Tailwind 原生 responsive 工具類，所有間距使用 4px 倍數（p-2, p-3, p-4）
- **[權衡] 翻譯嵌入 bundle 增加首次載入大小** → 可接受：兩種語言 <5KB gzip，對首屏載入影響可忽略
