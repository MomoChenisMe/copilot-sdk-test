## ADDED Requirements

### Requirement: 圖片點擊開啟 Lightbox
對話中的圖片縮圖 SHALL 可點擊開啟全螢幕 Lightbox。

#### Scenario: 使用者附件圖片
- **WHEN** 使用者點擊 user message 中的圖片縮圖
- **THEN** Lightbox SHALL 以全螢幕 overlay 開啟該圖片

#### Scenario: Markdown 內嵌圖片
- **WHEN** 使用者點擊 assistant message Markdown 中的圖片
- **THEN** Lightbox SHALL 開啟該圖片

### Requirement: Lightbox 縮放功能
Lightbox SHALL 支援圖片縮放。

#### Scenario: 循環縮放
- **WHEN** 使用者點擊 zoom-in 按鈕或按 + 鍵
- **THEN** 圖片 SHALL 在 1x → 1.5x → 2x → 3x 之間循環放大

#### Scenario: 縮小
- **WHEN** 使用者點擊 zoom-out 按鈕或按 - 鍵
- **THEN** 圖片 SHALL 縮小一級

### Requirement: 多圖切換
Lightbox SHALL 支援同一訊息中多張圖片的切換。

#### Scenario: 左右導航
- **WHEN** 同一訊息有多張圖片且使用者按左/右箭頭或點擊導航按鈕
- **THEN** Lightbox SHALL 切換到前/後一張圖片

#### Scenario: 計數顯示
- **WHEN** 多圖模式下
- **THEN** Lightbox SHALL 顯示 "current / total" 計數

#### Scenario: 單圖不顯示導航
- **WHEN** 訊息只有一張圖片
- **THEN** 導航箭頭 SHALL 不顯示

### Requirement: 圖片下載
Lightbox SHALL 提供下載原圖功能。

#### Scenario: 下載按鈕
- **WHEN** 使用者點擊 download 按鈕
- **THEN** 系統 SHALL 觸發圖片下載（使用 `<a download>` 方式）

### Requirement: Lightbox 關閉
Lightbox SHALL 支援多種關閉方式。

#### Scenario: Escape 鍵關閉
- **WHEN** Lightbox 開啟時使用者按 Escape
- **THEN** Lightbox SHALL 關閉

#### Scenario: 背景點擊關閉
- **WHEN** 使用者點擊 Lightbox 背景（圖片外區域）
- **THEN** Lightbox SHALL 關閉

#### Scenario: 圖片點擊不關閉
- **WHEN** 使用者點擊圖片本身
- **THEN** Lightbox SHALL 不關閉
