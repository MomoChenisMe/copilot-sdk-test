## MODIFIED Requirements

### Requirement: SDK 版本偵測路徑解析

`SdkUpdateChecker.getInstalledVersion()` SHALL 使用 `createRequire` 解析主入口再向上查找 `package.json` 以正確偵測版本，避免觸發 `ERR_PACKAGE_PATH_NOT_EXPORTED`。

#### Scenario: 套件被 npm hoisting 到專案根目錄

- **WHEN** `@github/copilot-sdk` 被安裝在專案根目錄的 `node_modules/`（非 `backend/node_modules/`）
- **THEN** `getInstalledVersion()` SHALL 先透過 `createRequire(import.meta.url).resolve('@github/copilot-sdk')` 解析主入口路徑
- **AND** 從 `dirname(mainPath)` 向上遍歷目錄，查找包含 `name: '@github/copilot-sdk'` 的 `package.json`
- **AND** 成功找到後回傳 `pkg.version`

#### Scenario: 套件在 backend/node_modules/

- **WHEN** `@github/copilot-sdk` 安裝在 `backend/node_modules/`
- **THEN** `getInstalledVersion()` SHALL 同樣透過主入口 resolve → 向上查找正確解析並回傳版本號

#### Scenario: 套件不存在

- **WHEN** `@github/copilot-sdk` 未安裝
- **THEN** `getInstalledVersion()` SHALL 回傳 `null` 並以 `log.warn` 記錄錯誤

#### Scenario: createRequire fallback

- **WHEN** `createRequire` 解析失敗（例如 tsx 環境相容性問題）
- **THEN** 系統 SHALL fallback 到嘗試候選路徑（2 層 `../..` 和 3 層 `../../..` 上級目錄），至少有一個能成功

#### Scenario: package.json exports 不導出 ./package.json

- **WHEN** `@github/copilot-sdk/package.json` 的 `exports` 欄位未包含 `./package.json` 子路徑
- **THEN** `getInstalledVersion()` MUST NOT 直接 `require.resolve('@github/copilot-sdk/package.json')`
- **AND** MUST 改用 resolve 主入口 → `dirname` 向上查找的策略
- **AND** 後端啟動時 MUST NOT 輸出 `ERR_PACKAGE_PATH_NOT_EXPORTED` 警告
