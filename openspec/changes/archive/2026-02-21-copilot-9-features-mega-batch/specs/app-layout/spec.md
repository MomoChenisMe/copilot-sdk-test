## MODIFIED Requirements

### Requirement: Header Toolbar 響應式元件寬度

底部工具列中的元件 MUST 在小螢幕上使用較小的最大寬度：
- CwdSelector 觸發按鈕：小螢幕 `max-w-40`，`sm:` 以上 `max-w-56`
- ModelSelector 觸發按鈕：小螢幕 `max-w-32`，`sm:` 以上 `max-w-52`

工具列容器已使用 `flex-wrap`，MUST 確保在 375px 寬度下正確換行而非溢出。

#### Scenario: 375px 螢幕寬度

- **WHEN** 螢幕寬度為 375px
- **THEN** CwdSelector 最大寬度為 10rem (160px)，ModelSelector 最大寬度為 8rem (128px)，工具列正確換行

#### Scenario: 768px 以上螢幕寬度

- **WHEN** 螢幕寬度 >= 768px
- **THEN** CwdSelector 最大寬度為 14rem (224px)，ModelSelector 最大寬度為 13rem (208px)
