# 會員搜尋：接力示範

這是虛構操作範例，revision、路徑和驗證結果必須在真實任務中填實際值，不代表已開發或已通過測試。

## 在 Codex 開始

貼上「開始需求：會員列表加入搜尋，依附圖顯示搜尋欄」。AI 先讀專案，詢問搜尋欄位、觸發方式、空結果及錯誤狀態；API 是否支援關鍵字由 AI 查目前程式，無法確認的產品行為整理給 PM。

使用者確認「姓名／email、按 Enter 搜尋、清除時恢復全部」後，記錄為決策與 AC。AI 提出使用現有列表元件、API client 及 query 參數的方案；使用者確認後，任務進入 implement。

## 中途換 Claude Code

使用者：「交接任務 member-search，我要換 Claude Code。」

checkpoint 應包含例如：

- owner：開發者 A / Codex / session A → 開發者 A / Claude Code / session B
- branch/HEAD：填實際值；兩個工具使用同一個本機 checkout
- 已完成：搜尋欄 UI；實際修改的檔案清單
- 未完成：API 接線、空結果狀態
- 驗證：只做了哪些檢查、對應結果；視覺比較未完成
- 工作樹：包含哪些未提交及未追蹤檔案；圖片是否已保存
- 下一步：在已確認 API 約定下實作 keyword 參數，並驗證 Enter 與清除操作

停止 Codex 的寫入，在 Claude Code 輸入：「讀取 .ai-flow/WORKFLOW.md，接續 member-search，先核對 TASK.md、Git status 和 diff。」Claude Code 應找出資料是否一致，再接續剩餘工作，不重新詢問已確認產品決策。

若改為同事在另一台機器接手，這一步必須先傳送程式、任務文件與圖片。只傳 TASK.md 不算完成交接。

## 用 Cursor 審查

實作完成後在 Cursor 輸入：「審查任務 member-search；確認 AC、實際 diff 和驗證結果，先回報發現。」

提供可讀取的 branch/commit 或本機 diff。Cursor 逐項核對 AC，列出具體問題與證據；沒有測試能力的項目標示未驗證。你決定修復後再驗收，AI 可整理 PR 草稿。建立 PR 需要你當次明確指示。

## 多人同時開發

例如前端 UI 與 Nuxt server 功能拆成不同子任務，每項指定 owner、分支、檔案範圍和 API 約定；各自開 worktree。共享 API 型別由一位 owner 負責。整合前核對任務依賴，整合後重新驗證整條使用流程。任務文件中的 owner 不能阻止另一台機器誤改，同步分工仍是團隊責任。
