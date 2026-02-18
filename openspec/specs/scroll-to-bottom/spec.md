## ADDED Requirements

### Requirement: Button visibility

當使用者向上捲動超過 50px 時，scroll-to-bottom button SHALL 出現。

#### Scenario: 使用者向上捲動超過 threshold 時顯示 button

- WHEN 使用者在 chat message 區域向上捲動
- AND 捲動距離距離底部超過 50px
- THEN scroll-to-bottom floating button SHALL 出現

#### Scenario: 頁面載入時位於底部不顯示 button

- WHEN chat view 初始載入
- AND 訊息區域已在底部位置
- THEN scroll-to-bottom button SHALL 不顯示

---

### Requirement: Button hide

當使用者位於底部或接近底部（50px threshold 內）時，button SHALL 隱藏。

#### Scenario: 使用者捲動至底部時隱藏 button

- WHEN scroll-to-bottom button 目前為可見
- AND 使用者手動捲動至底部（距離底部 50px 以內）
- THEN button SHALL 隱藏

#### Scenario: 新訊息自動捲動至底部後隱藏 button

- WHEN 使用者原本在底部位置
- AND 新訊息到達導致自動捲動
- THEN button SHALL 維持隱藏狀態

---

### Requirement: Smooth scroll

點擊 button SHALL 平滑捲動至訊息區域底部。

#### Scenario: 點擊 button 執行 smooth scroll

- WHEN 使用者點擊 scroll-to-bottom button
- THEN 訊息區域 SHALL 以 smooth scroll 行為捲動至底部
- AND 捲動動畫應流暢且不突兀

#### Scenario: Scroll 完成後 button 隱藏

- WHEN smooth scroll 動畫完成
- AND 訊息區域已抵達底部
- THEN scroll-to-bottom button SHALL 隱藏

---

### Requirement: Unread count badge

當使用者已向上捲動且有新訊息到達時，badge SHALL 顯示未讀訊息數量。

#### Scenario: 新訊息到達時顯示 unread count

- WHEN 使用者已向上捲動（scroll-to-bottom button 可見）
- AND 新的 chat message 到達
- THEN button 上的 badge SHALL 顯示未讀訊息的數量
- AND 數量隨每則新訊息遞增

#### Scenario: 使用者在底部時不累計 unread count

- WHEN 使用者位於訊息區域底部
- AND 新的 chat message 到達
- THEN unread count SHALL 維持為 0
- AND badge SHALL 不顯示

---

### Requirement: Unread reset

當使用者到達底部（透過點擊 button 或手動捲動）時，unread count SHALL 重設為 0。

#### Scenario: 點擊 scroll-to-bottom button 重設 unread count

- WHEN 使用者點擊 scroll-to-bottom button
- AND 訊息區域捲動至底部
- THEN unread count SHALL 重設為 0
- AND badge SHALL 消失

#### Scenario: 手動捲動至底部重設 unread count

- WHEN 使用者手動捲動至底部（距離底部 50px 以內）
- THEN unread count SHALL 重設為 0
- AND badge SHALL 消失

---

### Requirement: Animation

Button SHALL 以 fade + translate-y transition 動畫進出。

#### Scenario: Button 出現動畫

- WHEN scroll-to-bottom button 從隱藏變為可見
- THEN button SHALL 以 fade-in 搭配 translate-y（由下往上）的 transition 動畫出現
- AND 動畫應流暢自然

#### Scenario: Button 消失動畫

- WHEN scroll-to-bottom button 從可見變為隱藏
- THEN button SHALL 以 fade-out 搭配 translate-y（由上往下）的 transition 動畫消失
- AND 動畫完成後 button 元素 SHALL 不佔據空間

---

### Requirement: Positioning

Button SHALL 水平置中定位，位於 input area 上方。

#### Scenario: Button 正確定位

- WHEN scroll-to-bottom button 為可見狀態
- THEN button SHALL 水平置中於 chat view
- AND button SHALL 定位於 input area 上方
- AND button SHALL 不遮擋重要的 chat 內容

#### Scenario: 不同視窗大小下維持定位

- WHEN 瀏覽器視窗大小改變
- THEN button SHALL 維持水平置中定位
- AND 與 input area 的相對位置 SHALL 保持一致
