## 1. Plan Mode Banner 隱藏（Bash 模式）

- [x] 1.1 撰寫 ChatView plan mode banner 條件渲染測試：驗證 `planMode=true + mode=terminal` 時 banner 不渲染
- [x] 1.2 修改 `ChatView.tsx` line 461：將 `{planMode &&` 改為 `{planMode && !isTerminalMode &&`
- [x] 1.3 驗證測試通過：`planMode=true + mode=copilot` 顯示 banner、`mode=terminal` 隱藏 banner

## 2. TopBar Tooltip

- [x] 2.1 撰寫 TopBar tooltip 渲染測試：驗證每個按鈕 hover 後出現 tooltip 元素
- [x] 2.2 在 `TopBar.tsx` import `Tooltip` component，為 5 個按鈕（Keyboard、OpenSpec、Artifacts、Settings、Theme）包裹 `<Tooltip label={...} position="bottom">`
- [x] 2.3 驗證測試通過 + 編譯無錯誤

## 3. CWD 路徑智慧縮短

- [x] 3.1 撰寫 `shortenPath()` 純函數單元測試：覆蓋短路徑、長路徑、根路徑、home 目錄替換等場景
- [x] 3.2 在 `CwdSelector.tsx` 實作 `shortenPath()` 函數，替換原有 `pathParent`/`pathLast` 分段邏輯
- [x] 3.3 更新按鈕 JSX：使用 `shortenPath(currentCwd)` 渲染，移除 `hidden md:inline` 條件顯示
- [x] 3.4 驗證所有測試通過

## 4. 規格名稱複製按鈕

- [x] 4.1 撰寫 OpenSpecSpecs 複製按鈕測試：驗證按鈕渲染、click 後呼叫 clipboard API、不觸發 `onSelect`
- [x] 4.2 在 `OpenSpecSpecs.tsx` 新增 `copiedName` state 和 Copy/Check icon 按鈕（含 `stopPropagation`）
- [x] 4.3 新增 i18n key：`openspecPanel.specs.copyName`（en.json + zh-TW.json）
- [x] 4.4 驗證測試通過 + 編譯無錯誤

## 5. TopBar Artifacts 按鈕

- [x] 5.1 撰寫 TopBar artifacts 按鈕渲染測試：驗證按鈕存在、徽章顯示邏輯、click 回調
- [x] 5.2 在 `TopBar.tsx` 新增 `onArtifactsClick` 和 `artifactsCount` props，新增 `PanelRight` icon 按鈕（含數量徽章）
- [x] 5.3 在 `AppShell.tsx` 傳遞 `onArtifactsClick` 回調（toggle `setTabArtifactsPanelOpen`）和 `artifactsCount`
- [x] 5.4 新增 i18n key：`topBar.artifacts`（en.json + zh-TW.json）
- [x] 5.5 驗證測試通過 + 互斥面板邏輯正常運作

## 6. 專案設定填滿空間

- [x] 6.1 撰寫 OpenSpecOverview 佈局測試：驗證設定卡片使用 flex-1 且可捲動
- [x] 6.2 修改 `OpenSpecOverview.tsx`：根容器改 `flex flex-col gap-3 h-full`，設定卡片加 `flex-1 flex flex-col min-h-0`，內容區移除 `max-h-64` 改 `flex-1 overflow-y-auto min-h-0`
- [x] 6.3 修改 `OpenSpecPanel.tsx` line 389：overview tab 時 content wrapper 使用 `overflow-hidden`
- [x] 6.4 驗證測試通過 + 視覺確認設定卡片填滿空間

## 7. 規格清單 Summary + 修復 NaN

- [x] 7.1 撰寫後端 `listSpecs()` 測試：驗證回傳包含 `summary`（string）和 `size`（number）欄位
- [x] 7.2 擴展 `backend/src/openspec/openspec-service.ts` 的 `SpecSummary` interface：新增 `summary: string` 和 `size: number`
- [x] 7.3 更新 `listSpecs()` 方法：提取 summary（跳過空行、`#` 標題、`---` 分隔符，取第一段文字前 150 字元）+ `fs.statSync` 取得檔案大小
- [x] 7.4 驗證後端測試通過
- [x] 7.5 更新 `frontend/src/lib/openspec-api.ts` 的 `SpecListItem` interface：新增 `summary?: string`
- [x] 7.6 撰寫 OpenSpecSpecs summary 渲染測試：驗證 summary 顯示 + 無 summary 時不渲染
- [x] 7.7 修改 `OpenSpecSpecs.tsx`：在 spec name 下方加入 `<p className="text-xs text-text-secondary line-clamp-2">`
- [x] 7.8 驗證所有測試通過 + 規格清單正確顯示 summary 和檔案大小（不再 NaN）
