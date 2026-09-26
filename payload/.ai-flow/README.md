# 使用入口

在 Codex、Claude Code 或 Cursor 開啟專案後，直接說：

- 「初始化 AI 開發流程，讀取專案並補齊 PROJECT.md。」
- 「開始需求：……」並附文字或圖片。
- 「接續任務 member-search，先核對交接紀錄和實際 Git 狀態。」
- 「交接任務 member-search，我要換 Claude Code。」
- 「審查任務 member-search，先回報問題。」

若工具沒有自動載入，明確要求「讀取 .ai-flow/WORKFLOW.md，依流程處理上述任務」。這也是跨工具最通用的啟動方式。

需要手動建任務：`node .ai-flow/flow.mjs new member-search --title "會員搜尋"`
查看任務：`node .ai-flow/flow.mjs status`
檢查安裝：`node .ai-flow/flow.mjs doctor`

第一次初始化後，維護者檢查並自行 commit 這些流程文件，團隊成員 pull 後直接使用。安裝器與 AI 不會替你 commit 或 push。Git 不會同步未提交修改；換人或換電腦前先確認程式、任務紀錄及素材已透過同意的方式傳送。

PROJECT.md 是團隊可修改的專案設定。WORKFLOW.md、templates/、flow.mjs 和工具入口由安裝器管理；若自行改過，更新會拒絕覆蓋並列出衝突，請先保存自訂內容並手動整合。
