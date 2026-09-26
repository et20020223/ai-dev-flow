# 驗證紀錄

日期：2026-09-24。版本：0.2.0。執行環境：macOS / Node.js v20.19.0。

- `node --test test/*.test.mjs`：13 / 13 通過。
- `node --check bin/ai-flow.mjs`：通過。
- Codex 與 Claude Code 的 SKILL.md：使用 skill-creator 的 quick_validate.py，兩個皆通過；自包含 install-ai-flow skill 也通過。
- 測試涵蓋：初次／重複安裝、既有規則保存、任務建立、重複 ID 拒絕、路徑越界拒絕、管理內容衝突、symlink 拒絕、不完整 marker、含空白路徑、模擬新版更新、專案與任務保留；單一 SKILL.md 離線安裝、重跑保留資料、衝突拒絕、缺少內嵌素材時不寫入。

沒有在真實 Codex、Claude Code、Cursor session 中完成跨工具功能開發。沒有對任何使用者專案執行安裝，本紀錄不將 repository 發布視為產品驗收。CLI 測試使用臨時目錄，完成後自動清理。

Python / PyYAML 僅用於交付前的 skill 格式驗證，不是本工具安裝或執行依賴。
