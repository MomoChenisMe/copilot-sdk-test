### Requirement: Header Toolbar 響應式元件寬度

底部工具列中的元件 MUST 在小螢幕上使用較小的最大寬度：
- CwdSelector 觸發按鈕：小螢幕 `max-w-40`，`sm:` 以上 `max-w-56`
- ModelSelector 觸發按鈕：小螢幕 `max-w-32`，`sm:` 以上 `max-w-52`

手機版（< md breakpoint）工具列 MUST 收進 MobileToolbarPopup 彈出選單。桌面版（>= md）工具列 MUST 正常 inline 顯示。

#### Scenario: 375px 螢幕寬度

- **WHEN** 螢幕寬度為 375px
- **THEN** 底部工具列 MUST 顯示為 MobileToolbarPopup 觸發按鈕
- **AND** CwdSelector 和 ModelSelector MUST 在彈出選單中顯示

#### Scenario: 768px 以上螢幕寬度

- **WHEN** 螢幕寬度 >= 768px
- **THEN** 底部工具列 MUST inline 顯示所有元件
- **AND** CwdSelector 最大寬度為 14rem (224px)，ModelSelector 最大寬度為 13rem (208px)

### Requirement: 手機版 TabBar 替換為 MobileDrawer

在手機寬度（< md breakpoint）時，AppShell SHALL 隱藏水平 TabBar 並使用 MobileDrawer 抽屜元件。

#### Scenario: 手機版佈局

- **WHEN** 螢幕寬度 < 768px
- **THEN** AppShell MUST 隱藏 TabBar
- **AND** TopBar MUST 顯示 hamburger 按鈕
- **AND** 點擊 hamburger MUST 開啟 MobileDrawer

#### Scenario: 桌面版佈局不變

- **WHEN** 螢幕寬度 >= 768px
- **THEN** AppShell MUST 正常顯示 TabBar
- **AND** hamburger 按鈕 MUST 隱藏

### Requirement: Cron 圖標標示

TabBar 和 ConversationPopover SHALL 在已啟用 cron 的對話旁顯示 Clock icon 標示。

#### Scenario: TabBar cron 圖標

- **WHEN** 一個 tab 對應的對話 `cronEnabled === true`
- **THEN** tab title 旁 MUST 顯示 Clock icon（10px，accent 色）

#### Scenario: ConversationPopover cron 圖標

- **WHEN** ConversationPopover 中的對話項目 `cronEnabled === true`
- **THEN** 對話標題旁 MUST 顯示 Clock icon

#### Scenario: conversations prop 傳遞 cronEnabled

- **WHEN** AppShell 傳遞 conversations 給 TabBar
- **THEN** 每筆對話物件 MUST 包含 `cronEnabled` 欄位

### Requirement: CronPage 移除（已廢棄）

CronPage 獨立頁面已移除。Cron 排程管理改為：
- **CronConfigPanel**：內嵌在對話中，透過 Clock 工具列按鈕開啟
- **Cron AI Skill**：透過 `/cron` skill 與 AI 協作設定排程
- **Clock icon 標示**：TabBar 和 ConversationPopover 顯示已啟用 cron 的對話

#### Scenario: Cron 管理入口

- **WHEN** 使用者想管理某對話的 cron 排程
- **THEN** 可透過 Clock 工具列按鈕開啟 CronConfigPanel
- **OR** 可透過 `/cron` skill 與 AI 協作設定

#### Scenario: 識別已啟用 cron 的對話

- **WHEN** 使用者想找到哪些對話有啟用 cron
- **THEN** TabBar 和 ConversationPopover 中的 Clock icon 標示即可識別
- **AND** 後端 `GET /api/conversations?cronEnabled=true` API 仍可查詢
