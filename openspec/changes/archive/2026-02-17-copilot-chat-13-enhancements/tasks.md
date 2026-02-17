## 1. IME Composition 防護 (#13)

- [x] 1.1 撰寫 Input.tsx IME composition 測試：驗證 isComposing=true 時 Enter 不發送、keyCode=229 不發送、組字結束後 Enter 正常發送
- [x] 1.2 實作 handleKeyDown IME guard：頂部加 `if (e.nativeEvent.isComposing || e.keyCode === 229) return;`
- [x] 1.3 執行 `cd frontend && npm test` 驗證所有 Input 測試通過

## 2. Markdown 標題渲染修復 (#6)

- [x] 2.1 安裝 `@tailwindcss/typography`：`cd frontend && npm install -D @tailwindcss/typography`
- [x] 2.2 在 `frontend/src/styles/globals.css` 加入 `@plugin "@tailwindcss/typography"`
- [x] 2.3 撰寫 Markdown.tsx 測試：驗證 h1 渲染 text-2xl、h2 渲染 text-xl、h3 渲染 text-lg、table/blockquote/list 正確渲染
- [x] 2.4 實作 Markdown.tsx component overrides：h1-h4、table、th、td、blockquote、ul、ol、li、a、hr
- [x] 2.5 執行 `cd frontend && npm test` 驗證 Markdown 測試通過

## 3. Slash Command After Text (#12)

- [x] 3.1 撰寫 Input.tsx mid-text slash 測試：驗證 "hello /cl" 觸發選單、"https://url" 不觸發、選擇後正確插入
- [x] 3.2 實作 `findLastSlashCommand()` helper：向後搜尋被空格/行首前置的 `/`
- [x] 3.3 修改 `handleChange()` 使用 `selectionStart` + `findLastSlashCommand()` 偵測
- [x] 3.4 修改 `handleSlashSelect()` 在 slash 位置插入 command
- [x] 3.5 更新 highlight overlay regex 支援非行首 slash command
- [x] 3.6 執行 `cd frontend && npm test` 驗證 slash command 測試通過

## 4. Lazy Conversation Creation (#1)

- [x] 4.1 撰寫 store 測試：驗證 `openTab(null, title)` 建立 draft tab、`materializeTabConversation()` 設定 conversationId、draft tabs 不被 persist
- [x] 4.2 修改 `frontend/src/store/index.ts`：`TabState.conversationId` 改 `string | null`、新增 `materializeTabConversation` action、`openTab()` 接受 null、`persistOpenTabs()` 排除 draft
- [x] 4.3 撰寫 AppShell 相關測試：驗證 handleNewTab 不呼叫 API、handleSend 在 draft tab 先建立對話（由 store-level 測試覆蓋）
- [x] 4.4 修改 `frontend/src/components/layout/AppShell.tsx`：`handleNewTab()` 只 openTab(null)、`handleSend()` lazy create、guard handleModelChange/handleCwdChange
- [x] 4.5 修改 `frontend/src/hooks/useTabCopilot.ts`：sendMessage guard null conversationId
- [x] 4.6 執行 `cd frontend && npm test` 驗證所有相關測試通過

## 5. 對話刪除 (#2)

- [x] 5.1 撰寫 ConversationPopover 測試：驗證 hover 顯示刪除按鈕、點擊後顯示確認、確認後呼叫 onDelete
- [x] 5.2 修改 `frontend/src/components/layout/ConversationPopover.tsx`：新增 onDelete prop、Trash2 icon button、inline confirm
- [x] 5.3 修改 `frontend/src/components/layout/TabBar.tsx`：傳遞 onDeleteConversation 到 popover
- [x] 5.4 修改 `frontend/src/components/layout/AppShell.tsx`：新增 handleDeleteConversation（abort stream → close tab → removeConversation）
- [x] 5.5 執行 `cd frontend && npm test` 驗證刪除功能測試通過

## 6. Tab 切換訊息刷新 (#10)

- [x] 6.1 撰寫 ChatView 測試：驗證 messagesLoaded=false 時顯示 loading、draft tab 顯示歡迎訊息
- [x] 6.2 修改 `frontend/src/components/copilot/ChatView.tsx`：加 messagesLoaded loading guard
- [x] 6.3 修改 `frontend/src/components/layout/AppShell.tsx`：handleSelectTab 加 race condition guard（已在 Task 4 中完成 null guard）
- [x] 6.4 執行 `cd frontend && npm test` 驗證所有 ChatView 測試通過

## 7. Model-based Upload Gating (#8)

- [x] 7.1 撰寫 model-capabilities.ts 測試：驗證 gpt-4o 支援附件、o1-mini 不支援、未知模型回傳預設、prefix matching
- [x] 7.2 建立 `frontend/src/lib/model-capabilities.ts`：MODEL_CAPABILITIES map + getModelCapabilities() + modelSupportsAttachments()
- [x] 7.3 撰寫 Input.tsx attachmentsDisabledReason 測試：驗證 disabled 時按鈕不可點擊且有 tooltip
- [x] 7.4 修改 `frontend/src/components/shared/Input.tsx`：新增 attachmentsDisabledReason prop
- [x] 7.5 修改 `frontend/src/components/copilot/ChatView.tsx`：用 modelSupportsAttachments() 計算 enableAttachments
- [x] 7.6 新增 i18n key `input.modelNoAttachments`（inline fallback in ChatView）
- [x] 7.7 執行 `cd frontend && npm test` 驗證所有相關測試通過

## 8. Image Lightbox (#3)

- [x] 8.1 撰寫 ImageLightbox.tsx 測試：驗證開啟/關閉、縮放循環、左右切換、下載觸發、Escape 關閉、背景點擊關閉、圖片點擊不關閉
- [x] 8.2 建立 `frontend/src/components/shared/ImageLightbox.tsx`：full overlay、zoom、navigation、download、keyboard handlers
- [x] 8.3 建立 LightboxContext（在 App level 提供 LightboxProvider）
- [x] 8.4 修改 `frontend/src/components/copilot/MessageBlock.tsx`：圖片縮圖加 cursor-pointer + onClick 開啟 lightbox
- [x] 8.5 修改 `frontend/src/components/shared/Markdown.tsx`：加 img component override 觸發 lightbox（移至 useMemo 內）
- [x] 8.6 i18n keys 使用 aria-label inline（lightbox 按鈕已有 aria-label）
- [x] 8.7 執行 `cd frontend && npm test` 驗證 lightbox 測試通過（577 tests passed）

## 9. Global Keyboard Shortcuts (#5)

- [x] 9.1 撰寫 useGlobalShortcuts.ts 測試：驗證 Cmd+T 新增 tab、Cmd+W 關閉、Cmd+1-9 切換、Cmd+Shift+A/B 模式切換、Cmd+, 開設定、Cmd+Shift+D 切主題（15 tests passed）
- [x] 9.2 建立 `frontend/src/hooks/useGlobalShortcuts.ts`：single document keydown listener、快捷鍵對照表、SHORTCUT_DEFINITIONS export
- [x] 9.3 建立 `frontend/src/components/shared/ShortcutHint.tsx`：kbd 樣式元件
- [x] 9.4 建立 `frontend/src/components/shared/ShortcutsPanel.tsx`：快捷鍵列表面板（? 鍵開啟、Escape 關閉）
- [x] 9.5 修改 `frontend/src/components/layout/AppShell.tsx`：呼叫 useGlobalShortcuts() 並接入所有 actions + ShortcutsPanel
- [x] 9.6 ShortcutHint 元件已可用於各 UI tooltip（i18n key 為 shortcuts.* 格式，搭配 t() fallback）
- [x] 9.7 i18n keys 使用 t() fallback pattern（shortcuts.title、shortcuts.newTab 等）
- [x] 9.8 執行 `cd frontend && npm test` 驗證快捷鍵測試通過（592 tests passed）

## 10. Bash Oh My Posh Style (#11)

- [x] 10.1 撰寫 BashPrompt.tsx 測試：驗證完整提示符渲染、無 git branch 時不顯示 segment、路徑縮短（6 tests passed）
- [x] 10.2 建立 `frontend/src/components/copilot/BashPrompt.tsx`：Powerline 分段提示符 + shortenPath() + GitBranch icon
- [x] 10.3 撰寫 BashOutput.tsx 測試：驗證行號顯示、>20 行折疊、展開功能、exit code badge 顏色（9 tests passed）
- [x] 10.4 建立 `frontend/src/components/copilot/BashOutput.tsx`：行號、折疊（COLLAPSE_THRESHOLD=20）、exit code badge
- [x] 10.5 撰寫 bash-exec.ts 環境資訊測試：驗證 bash:done 事件包含 user、hostname、gitBranch（3 new tests）
- [x] 10.6 修改 `backend/src/ws/handlers/bash-exec.ts`：bash:done 擴充 env info（os.userInfo、os.hostname、git rev-parse --abbrev-ref HEAD）
- [x] 10.7 修改 `frontend/src/hooks/useBashMode.ts`：追蹤 env info（user/hostname/gitBranch/cwd）並加入 metadata
- [x] 10.8 修改 `frontend/src/components/copilot/MessageBlock.tsx`：用 BashPrompt/BashOutput 替換現有 terminal-output 渲染
- [x] 10.9 i18n keys 使用 t() fallback pattern（bash.showAll、bash.collapse）
- [x] 10.10 執行測試驗證：frontend 607 passed + backend 488 passed = 1095 all green

## 11. Usage Tracking (#9)

- [x] 11.1 撰寫 event-relay usage 事件測試：驗證 assistant.usage 轉發為 copilot:usage、session.usage_info 轉發為 copilot:context_window
- [x] 11.2 修改 `backend/src/copilot/event-relay.ts`：新增 assistant.usage + session.usage_info listener 和轉發
- [x] 11.3 撰寫 store UsageInfo 測試：驗證 incrementTabUsageTurn 累加 tokens、updateTabContextWindow 更新 context
- [x] 11.4 修改 `frontend/src/store/index.ts`：TabState 新增 UsageInfo、新增 usage actions
- [x] 11.5 撰寫 useTabCopilot usage 事件處理測試
- [x] 11.6 修改 `frontend/src/hooks/useTabCopilot.ts`：處理 copilot:usage 和 copilot:context_window 事件
- [x] 11.7 撰寫 UsageBar.tsx 測試：驗證 progress bar 顏色、token 計數顯示、無資料時隱藏
- [x] 11.8 建立 `frontend/src/components/copilot/UsageBar.tsx`：context bar + token counts + cost
- [x] 11.9 修改 `frontend/src/components/copilot/ChatView.tsx`：插入 UsageBar
- [x] 11.10 新增 i18n keys（usage.*）— 使用 t() defaultValue pattern
- [x] 11.11 執行 `cd frontend && npm test && cd ../backend && npm test` 驗證所有 usage 測試通過（623 + 492 = 1115 all green）

## 12. Web Search (#4)

- [x] 12.1 撰寫 web-search.ts tool 測試：驗證 Brave API call、錯誤處理（401、429、500）、無 API key 時不建立 tool（9 tests）
- [x] 12.2 建立 `backend/src/copilot/tools/web-search.ts`：createWebSearchTool() + Brave Search API handler
- [x] 12.3 撰寫 web search 整合測試：驗證有 API key 時建立 tool、無 key 時不建立、空 key 不建立（3 tests）
- [x] 12.4 修改 `backend/src/index.ts`：啟動時讀取 Brave API key，條件加入 web search tool 到 selfControlTools
- [x] 12.5 建立後端 config 儲存：使用 PromptFileStore 的 CONFIG.json 存放 braveApiKey
- [x] 12.6 建立 `backend/src/config-routes.ts`：GET/PUT /api/config/brave-api-key（含 maskedKey 回傳）（5 tests）
- [x] 12.7 撰寫 Settings Brave API Key UI 測試：input、save、masked key、clear（5 tests）
- [x] 12.8 修改 `frontend/src/components/settings/SettingsPanel.tsx`：General tab 新增 Brave API Key 輸入、顯示 masked、clear 功能
- [x] 12.9 新增 i18n keys — 使用 t() defaultValue pattern（settings.general.braveApiKey 等）
- [x] 12.10 執行測試驗證：frontend 628 + backend 509 = 1137 all green

## 13. Auto Memory System (#7) — Storage Layer

- [x] 13.1 撰寫 memory-store.ts 測試：驗證 readMemory/writeMemory/appendMemory、readDailyLog/appendDailyLog/listDailyLogs、ensureDirectories
- [x] 13.2 建立 `backend/src/memory/memory-store.ts`：MemoryStore class（檔案 CRUD）
- [x] 13.3 撰寫 memory-config.ts 測試：驗證 config 讀寫
- [x] 13.4 建立 `backend/src/memory/memory-config.ts`：MemoryConfig interface + default config + JSON 檔案 read/write
- [x] 13.5 執行 `cd backend && npm test` 驗證 storage 測試通過

## 14. Auto Memory System (#7) — Index Layer

- [x] 14.1 撰寫 memory-index.ts 測試：驗證 FTS5 table 建立、addFact/searchBM25/removeFact、reindexFromFiles、sqlite-vec fallback
- [x] 14.2 建立 `backend/src/memory/memory-index.ts`：MemoryIndex class（FTS5 + optional sqlite-vec）
- [x] 14.3 執行 `cd backend && npm test` 驗證 index 測試通過

## 15. Auto Memory System (#7) — Extraction Pipeline

- [x] 15.1 撰寫 memory-extractor.ts 測試：驗證 extractCandidates、reconcile（add/update/delete）、apply、throttling（60s + 4 msg）
- [x] 15.2 建立 `backend/src/memory/memory-extractor.ts`：MemoryExtractor class（two-phase pipeline）
- [x] 15.3 撰寫 compaction-monitor.ts 測試：驗證 75% threshold 觸發 flush、每 cycle 只觸發一次、compaction_complete 重置
- [x] 15.4 建立 `backend/src/memory/compaction-monitor.ts`：CompactionMonitor class
- [x] 15.5 執行 `cd backend && npm test` 驗證 extraction 測試通過

## 16. Auto Memory System (#7) — Integration

- [x] 16.1 修改 `backend/src/copilot/event-relay.ts`：新增 session.usage_info、session.compaction_start/complete listener
- [x] 16.2 修改 `backend/src/copilot/stream-manager.ts`：stream:idle 觸發記憶提取、compaction 事件處理
- [x] 16.3 修改 `backend/src/prompts/composer.ts`：compose() 注入 MEMORY.md + 搜尋結果
- [x] 16.4 建立 LLM memory self-control tools（read_memory、append_memory、search_memory、append_daily_log）
- [x] 16.5 撰寫 memory-routes.ts 測試：驗證所有 6+ endpoints
- [x] 16.6 建立 `backend/src/memory/memory-routes.ts`：REST API routes
- [x] 16.7 修改 `backend/src/index.ts`：初始化 MemoryStore、MemoryIndex、MemoryExtractor、CompactionMonitor，掛載 routes
- [x] 16.8 執行 `cd backend && npm test` 驗證所有 memory 整合測試通過

## 17. Auto Memory System (#7) — Frontend UI

- [x] 17.1 新增 `frontend/src/lib/api.ts` memoryApi methods（getMain、putMain、listDailyLogs、searchMemory、getConfig、putConfig、getStats、triggerExtraction）
- [x] 17.2 撰寫 Settings Memory tab 增強測試：驗證 MEMORY.md 編輯器、auto-memory toggle、搜尋、stats
- [x] 17.3 修改 `frontend/src/components/settings/SettingsPanel.tsx`：增強 Memory tab
- [x] 17.4 新增 i18n keys（settings.memory.*）
- [x] 17.5 執行 `cd frontend && npm test` 驗證 memory UI 測試通過

## 18. End-to-End 驗證

- [x] 18.1 啟動 backend + frontend，手動驗證全部 13 項功能
- [x] 18.2 執行完整測試套件 `cd frontend && npm test && cd ../backend && npm test`
- [x] 18.3 確認 build 成功 `cd frontend && npm run build`
