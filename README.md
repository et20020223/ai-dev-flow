# AI Dev Flow

給 Vue、Nuxt 與 monorepo 團隊使用的 AI 開發流程。Codex、Claude Code、Cursor 讀取同一份需求、決策和交接紀錄；同一功能可接力、拆給不同人，或由另一個 AI 審查。

版本 0.2.0。本工具提供流程文件、跨工具入口、任務模板與安裝 CLI；沒有呼叫模型 API，也不需要 API key、MCP 或 npm 套件。需求釐清內建依 grill-me 方法重新撰寫的訪談指引，無需另裝 Matt Pocock 全套 skills。本工具沒有安裝名為 grill-me 的原版 skill，也不提供通用 `/grill-me` 指令。

## 讓 AI 自己安裝（建議）

只需要 [install-ai-flow/SKILL.md](install-ai-flow/SKILL.md) 這一個檔案。將它存到 AI 能讀取的位置，在 Codex、Claude Code 或 Cursor 的目標專案貼上：

> 讀取這份 SKILL.md，依它將 AI Dev Flow 安裝到目前專案，補齊專案背景，驗證安裝結果，並告訴我如何開始需求和跨 AI 交接。

附上檔案或它的本機路徑。AI 會自動安裝三種工具入口、保留現有設定、檢查檔案並提供用法；不需先註冊安裝 skill、不需另下載 zip，也不需自己輸入安裝指令。AI 必須具備終端機與專案寫入能力，環境需 Node.js 20+；工具要求的權限仍依正常流程處理。

安裝 skill 內嵌完整套件，更新時交給 AI 新版檔案即可。它只安裝工作流程；產品需求仍由你提供。若要作為可重複選取的原生 skill，可把整個 install-ai-flow 資料夾放進對應工具的 skill 位置，但直接要求讀本機檔案已足夠。

## 手動安裝

需要 Node.js 20 以上。取得並解壓本工具後，在工具資料夾開終端機，執行一行：

```sh
node bin/ai-flow.mjs init "/你的專案完整路徑"
```

目標可以是既有 Vue/Nuxt/monorepo，也可以是準備開發新產品的空資料夾。資料夾須先存在。安裝離線執行，不修改 package.json、不替你執行 Git 操作。

在 Codex、Claude Code 或 Cursor 開啟目標專案的新對話，貼上：

```text
讀取 .ai-flow/WORKFLOW.md，初始化 AI 開發流程。
請先檢查現有專案，補齊 .ai-flow/PROJECT.md。
接著開始需求：［貼上 PM 需求，附上圖片］。
```

工具會引導你補齊需求並確認技術方案，再進行實作。維護者檢查生成內容後，自行 commit 流程文件，團隊成員 pull 後就能使用。每位成員仍需自己的 AI 工具與適用權限；不需要各自重跑安裝。更新規則後若工具仍使用舊內容，開啟新對話並明確要求重讀。

## 日常只需要這些說法

| 目的 | 在任一 AI 工具輸入 |
| --- | --- |
| 開始功能／新產品 | 開始需求：……（貼上文字與圖片） |
| 修 bug | 開始 bug：……（重現方式、預期與實際結果） |
| 換工具接力 | 接續任務 member-search，先核對交接紀錄與 Git 狀態。 |
| 準備換人／工具 | 交接任務 member-search，我要換 Claude Code。 |
| AI 審查 | 審查任務 member-search，先回報問題與證據。 |

若入口沒有自動載入，前面加「請先讀取 .ai-flow/WORKFLOW.md」。這個檔案路徑是三個工具共同支援的 fallback，不依賴 slash command。Codex 有 ai-flow skill，Claude Code 有同名 project skill，Cursor 有路由 rule；實際選單需由使用中的工具版本確認。

## 實際流程

1. **需求**：PM 原文／圖片 → 分輪 grill → 補畫面狀態、RWD、API 等必要細節 → 記錄 AC 與 PM 待確認問題 → 你確認。
2. **方案**：查看現有程式 → 提案與拆任務 → owner、依賴與檔案範圍 → 你確認。
3. **實作**：AI 在範圍內寫程式、執行可用檢查與視覺比較，每項任務完成便更新紀錄。
4. **驗收**：可換另一個 AI 審查 → 你驗收 → 準備 PR 草稿與人工 code review。

小 bug 可在同輪確認簡短需求與方案。新產品先確認最小端到端範圍。純問答不建立任務。已確認的內容不重問；產品規則和範圍變動再確認受影響部分。

## 手動任務工具

以下指令在目標專案根目錄執行：

```sh
node .ai-flow/flow.mjs new member-search --title "會員搜尋"
node .ai-flow/flow.mjs status
node .ai-flow/flow.mjs doctor
```

new 建立任務模板，不會執行 AI。status 顯示任務階段與 owner。doctor 驗證安裝檔案完整性，不驗證產品或 AI 行為。平時直接請 AI 建任務也可以。階段與進度由 AI 或人依事實更新，CLI 不會判斷工作已完成。

## 文件位置與更新

```text
.ai-flow/
  WORKFLOW.md          共用流程（安裝器管理）
  PROJECT.md           專案知識、指令與慣例（團隊維護）
  tasks/<id>/TASK.md   需求、AC、方案、分工、驗證與交接
  tasks/<id>/assets/   可持久化的需求圖片／驗證素材
  templates/TASK.md   任務模板
  flow.mjs            任務工具
  install.json        版本與安裝雜湊
.agents/skills/ai-flow/SKILL.md
.claude/skills/ai-flow/SKILL.md
.cursor/rules/ai-flow.mdc
AGENTS.md / CLAUDE.md  原內容保留，只加入一段管理區塊
```

更新時取得新版工具，在新版工具資料夾執行：

```sh
node bin/ai-flow.mjs update "/你的專案完整路徑"
```

PROJECT.md、tasks/ 與既有規則的非管理區塊不覆蓋。管理檔案有自訂修改時，整次更新會在寫入前停止；先另存自訂內容、還原到安裝時版本，再更新並人工合併。一般專案慣例放 PROJECT.md。不要同時執行兩個安裝／更新程序。更新前保留 Git 版本可供回復；不自動刪除舊版檔案。

## 多人與跨 AI

以 task ID 交接，避免「繼續剛才那個」造成誤接。並行任務採不同 branch/worktree、明確 owner 與檔案範圍；紀錄是團隊約定，不是分散式鎖。同一任務換工具時，停止原 writer 再接手。

Git 只會同步已提交且已傳送的內容。換電腦前確認程式碼、TASK.md 和素材都已經由同意的方式傳送；只更新交接摘要並不足夠。AI 不自行 commit、push、開 PR、合併或部署，使用者當次要求時才執行。

圖片若只在上一個工具的聊天裡，下一個工具可能看不到。請保存到 assets/ 或提供可讀取的來源。第一次只需文字／圖片；Figma MCP 不是安裝前提。視覺驗證需使用者或 AI 具備可用的預覽與圖片比較能力，缺少能力時標示未驗證。

## 維護與目前驗證範圍

```sh
npm test
npm run check
```

安裝器用 Node 內建測試驗證保留規則、重複安裝、更新、任務建立及衝突拒絕。自包含安裝 skill 與工具共 13 項測試通過。入口格式參考各工具官方文件；尚未在三個真實 AI session 中完成同一功能的接力驗收。第一次導入建議用一個小功能試跑，依實際工具的讀取結果調整入口。

工具原始碼以獨立 Git repository 維護；目前未發布到 npm。安裝、規則和任務都沒有伺服器端同步或執行強制機制。

- [完整流程](payload/.ai-flow/WORKFLOW.md)
- [跨工具交接範例](docs/handoff-example.md)
- [設計決策與驗收](docs/design.md)
- [來源與相容性依據](docs/sources.md)

## 維護單檔安裝 skill

修改 `installer/instructions.md`、`bin/` 或 `payload/` 後，執行 `npm run build:skill` 重建 `install-ai-flow/SKILL.md`，再執行 `npm test`。對外分享重建後的單一 SKILL.md 即可，內含版本及全部安裝素材。
