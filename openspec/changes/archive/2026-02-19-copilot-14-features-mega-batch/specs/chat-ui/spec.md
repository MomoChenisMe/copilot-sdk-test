## ADDED Requirements

### Requirement: ThinkingIndicator 元件
系統 SHALL 提供 `ThinkingIndicator` 元件（`frontend/src/components/copilot/ThinkingIndicator.tsx`），在 AI 思考中（streaming 且尚無文字輸出或 tool 呼叫）時顯示。元件 MUST 包含三個視覺元素：

1. **Unicode 字元脈動**：從 `['·', '✢', '✳', '✶', '✻', '✽']` 中循環切換，間隔 150ms
2. **隨機狀態短語**：約 30 個動詞短語（如 "Pondering", "Analyzing", "Synthesizing"），每 3-4 秒隨機切換
3. **已用時間**：顯示從開始思考到現在的秒數（如 "2.3s"），每 100ms 更新

動畫 MUST 使用 CSS `@keyframes thinking-pulse` 提供整體脈動效果。

#### Scenario: 思考動畫啟動
- **WHEN** `isStreaming === true` 且 `streamingText` 為空且 `activeToolRecords` 為空
- **THEN** ChatView 顯示 ThinkingIndicator，Unicode 字元開始循環

#### Scenario: Unicode 字元循環
- **WHEN** ThinkingIndicator 顯示中
- **THEN** 字元每 150ms 切換一次，依序顯示 `·` → `✢` → `✳` → `✶` → `✻` → `✽` → `·` ...

#### Scenario: 狀態短語切換
- **WHEN** ThinkingIndicator 已顯示 3-4 秒
- **THEN** 狀態短語隨機切換為另一個（如 "Pondering" → "Synthesizing"）

#### Scenario: 計時器顯示
- **WHEN** ThinkingIndicator 已顯示 5.2 秒
- **THEN** 右側顯示 "5.2s"

#### Scenario: 思考動畫結束
- **WHEN** 收到第一個 AI 文字 delta 或 tool call
- **THEN** ThinkingIndicator 消失，被實際內容取代

### Requirement: Thinking pulse CSS 動畫
`frontend/src/styles/globals.css` SHALL 新增 `@keyframes thinking-pulse` 動畫定義。動畫 MUST 為 opacity 脈動效果：0% opacity 1.0 → 50% opacity 0.5 → 100% opacity 1.0，duration 2s，infinite repeat。

#### Scenario: CSS 動畫定義
- **WHEN** globals.css 被載入
- **THEN** `thinking-pulse` keyframe 動畫可用，ThinkingIndicator 可使用 `animate-[thinking-pulse_2s_ease-in-out_infinite]`

### Requirement: 思考短語 i18n
ThinkingIndicator 的狀態短語 SHALL 支援多語系。`en.json` 和 `zh-TW.json` MUST 各包含約 30 個翻譯後的短語。英文範例："Pondering", "Analyzing", "Weaving thoughts", "Connecting dots"。中文範例："思索中", "分析中", "整理思緒", "串連脈絡"。

#### Scenario: 英文短語
- **WHEN** 語系為 en 且 ThinkingIndicator 顯示
- **THEN** 狀態短語從英文短語集中隨機選取

#### Scenario: 中文短語
- **WHEN** 語系為 zh-TW 且 ThinkingIndicator 顯示
- **THEN** 狀態短語從中文短語集中隨機選取
