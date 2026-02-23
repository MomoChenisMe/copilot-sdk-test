## MODIFIED Requirements

### Requirement: Button visibility

當使用者向上捲動超過 50px 時，scroll-to-bottom button SHALL 出現。**額外條件：當訊息內容未超出容器高度時，button MUST NOT 出現，無論 scroll 狀態如何。**

#### Scenario: 使用者向上捲動超過 threshold 時顯示 button

- **WHEN** 使用者在 chat message 區域向上捲動
- **AND** 捲動距離距離底部超過 50px
- **AND** 訊息內容高度超過容器高度（存在可捲動內容）
- **THEN** scroll-to-bottom floating button SHALL 出現

#### Scenario: 頁面載入時位於底部不顯示 button

- **WHEN** chat view 初始載入
- **AND** 訊息區域已在底部位置
- **THEN** scroll-to-bottom button SHALL 不顯示

#### Scenario: 內容未溢出容器時不顯示 button

- **WHEN** 訊息內容總高度未超出 scroll container 的可視高度
- **THEN** scroll-to-bottom button MUST NOT 出現
- **AND** unread count MUST 維持為 0

### Requirement: Unread count badge

當使用者已向上捲動且有新訊息到達時，badge SHALL 顯示未讀訊息數量。**新增條件：DOM 未掛載或內容未溢出時 MUST NOT 遞增計數。**

#### Scenario: 新訊息到達時顯示 unread count

- **WHEN** 使用者已向上捲動（scroll-to-bottom button 可見）
- **AND** 新的 chat message 到達
- **AND** scroll container 的 `scrollHeight` 大於 `clientHeight`（內容實際溢出）
- **THEN** button 上的 badge SHALL 顯示未讀訊息的數量
- **AND** 數量隨每則新訊息遞增

#### Scenario: 使用者在底部時不累計 unread count

- **WHEN** 使用者位於訊息區域底部
- **AND** 新的 chat message 到達
- **THEN** unread count SHALL 維持為 0
- **AND** badge SHALL 不顯示

#### Scenario: DOM 未掛載時不累計 unread count

- **WHEN** scroll container 的 ref 尚未掛載（`scrollRef.current` 為 null）
- **AND** messages、streamingText 或 toolRecords 發生變化
- **THEN** unread count MUST NOT 遞增
- **AND** showScrollButton MUST 維持為 false

#### Scenario: 自動捲動後內容未溢出時重置按鈕

- **WHEN** auto-scroll 執行完畢（`isAutoScrolling` 為 true）
- **AND** 捲動後 `scrollHeight <= clientHeight + threshold`（內容未溢出）
- **THEN** showScrollButton MUST 設為 false
- **AND** unreadCount MUST 重設為 0
