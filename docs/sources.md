# 來源與相容性依據

查閱日期：2026-09-24。

- Matt Pocock [grill-me 說明](https://github.com/mattpocock/skills/blob/main/docs/productivity/grill-me.md) 與 [grilling skill](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md)：本工具借鑑分輪詢問、先處理前提已確定的決策、保留使用者判斷及確認共同理解的工作方法。正文為本工具重新撰寫，不包含原版套件或腳本。原版需要自己的相依 skill，本工具無此執行依賴。
- [Codex skills](https://developers.openai.com/codex/skills)：Codex project skill 入口，另透過 AGENTS.md 明確路由。
- [Claude Code skills](https://code.claude.com/docs/en/skills)：`.claude/skills/<name>/SKILL.md` 的 project skill；另保留 CLAUDE.md 入口。
- [Cursor Rules](https://cursor.com/docs/rules)：`.cursor/rules/*.mdc` 與 alwaysApply 路由。只加入短路由，不把整套流程放進每次對話。

未依賴供應商內部 API。工具行為可能隨版本更新；入口格式檢查與 CLI 測試不等同於三個 AI 的實際端到端驗收。直接要求讀取 `.ai-flow/WORKFLOW.md` 是相容性 fallback。
