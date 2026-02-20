## 1. 後端 — DEFAULT_OPENSPEC_SDD 預設模板

- [x] 1.1 撰寫 `DEFAULT_OPENSPEC_SDD` 常數測試（`backend/tests/prompts/defaults.test.ts`）：驗證常數存在且包含 Core Philosophy、Workflow Selection、Change Lifecycle、Guidance Rules 等關鍵區段
- [x] 1.2 在 `backend/src/prompts/defaults.ts` 新增 `DEFAULT_OPENSPEC_SDD` 常數，內容來源為 `openspec-workflow` builtin skill（去除 YAML frontmatter），包含完整 OpenSpec SDD 工作流程規則與 slash command 參考
- [x] 1.3 執行 `npm run test -- backend/tests/prompts/defaults.test.ts` 驗證測試通過

## 2. 後端 — Config API 端點

- [x] 2.1 撰寫 config routes 測試（`backend/tests/config-routes.test.ts` 或相應測試檔案）：驗證 `GET /api/config/openspec-sdd` 未設定時回傳 `{ enabled: false }`、已設定時回傳 `{ enabled: true }`；驗證 `PUT /api/config/openspec-sdd` 正確寫入且不影響其他欄位
- [x] 2.2 撰寫自動建立測試：驗證首次啟用時自動建立 `OPENSPEC_SDD.md`、不覆蓋已存在的自訂內容、停用時不刪除檔案
- [x] 2.3 在 `backend/src/config-routes.ts` 實作 `GET/PUT /api/config/openspec-sdd` 路由，含自動建立邏輯與 `readOpenspecSddEnabled()` 匯出函式
- [x] 2.4 執行 config routes 相關測試驗證通過

## 3. 後端 — Prompts API 端點

- [x] 3.1 撰寫 prompts routes 測試（`backend/tests/prompts/routes.test.ts`）：驗證 `GET /api/prompts/openspec-sdd` 讀取檔案內容（含不存在時回傳空字串）、`PUT /api/prompts/openspec-sdd` 寫入內容（含允許空內容）
- [x] 3.2 在 `backend/src/prompts/routes.ts` 實作 `GET/PUT /api/prompts/openspec-sdd` 路由
- [x] 3.3 執行 prompts routes 測試驗證通過

## 4. 後端 — PromptComposer 條件注入

- [x] 4.1 撰寫 PromptComposer 測試（`backend/tests/prompts/composer.test.ts`）：驗證 enabled 時注入且位於 AGENT.md 之後 presets 之前、disabled 時不注入、CONFIG.json 不存在時不注入、OPENSPEC_SDD.md 為空時跳過、CONFIG.json 格式錯誤時不注入
- [x] 4.2 修改 `backend/src/prompts/composer.ts` 的 `compose()` 方法，在 AGENT.md 之後新增 CONFIG.json 讀取 + 條件注入 OPENSPEC_SDD.md 邏輯
- [x] 4.3 執行 PromptComposer 測試驗證通過

## 5. 前端 — API 擴充

- [x] 5.1 在 `frontend/src/lib/api.ts` 的 `configApi` 物件新增 `getOpenspecSdd()` 和 `putOpenspecSdd(enabled)` 方法
- [x] 5.2 在 `frontend/src/lib/prompts-api.ts` 的 `promptsApi` 物件新增 `getOpenspecSdd()` 和 `putOpenspecSdd(content)` 方法

## 6. 前端 — i18n 翻譯

- [x] 6.1 在 `frontend/src/locales/en.json` 的 `settings` 下新增 `agent` 子物件，包含 `openspecSdd`、`openspecSddDesc`、`openspecSddEnabled` 翻譯鍵
- [x] 6.2 在 `frontend/src/locales/zh-TW.json` 鏡像新增對應的繁體中文翻譯

## 7. 前端 — Agent Tab UI

- [x] 7.1 撰寫 SettingsPanel 測試（`frontend/tests/components/settings/SettingsPanel.test.tsx`）：擴充 mock 包含新 API 方法、驗證 Agent tab 渲染 OpenSpec SDD toggle、toggle 切換呼叫正確 API、textarea 條件顯示/隱藏
- [x] 7.2 修改 `frontend/src/components/settings/SettingsPanel.tsx` 的 `AgentTab` 元件：新增 openspecEnabled/openspecContent 狀態、載入邏輯（Promise.all）、toggle handler、save handler、條件展開的 textarea + Save 按鈕
- [x] 7.3 執行前端測試驗證通過

## 8. 端到端驗證

- [x] 8.1 執行全專案測試 `npm test` 驗證所有測試通過
- [x] 8.2 手動驗證：啟動 dev server → Settings > Agent tab → toggle OFF/ON → 確認 CONFIG.json 與 OPENSPEC_SDD.md 正確建立 → 編輯內容 → Save → 發送 Copilot 訊息確認 system prompt 注入
