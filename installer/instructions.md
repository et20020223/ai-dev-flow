---
name: install-ai-flow
description: Install or update the bundled AI Dev Flow in a development project for Codex, Claude Code, and Cursor, initialize project context, verify the installation, and explain daily usage. Use when the user asks to install this workflow from this skill file.
---

# 安裝 AI Dev Flow

這是一份自包含安裝 skill。適用於具備本機檔案讀寫與終端機能力的 Codex、Claude Code、Cursor；核心套件完整嵌入下方 JSON，不需要 GitHub 下載、不需要 MCP、不依賴原版 grill-me 安裝。需要 Node.js 20 以上。三個入口都安裝到目標專案，讓團隊可自行選工具。

使用者可以直接要求讀取本檔並安裝，無需先把本檔安裝成可選取的 skill。本檔只處理安裝與上手；日常工作交給安裝後的 ai-flow skill／共用流程。

## 1. 定位目標與檔案

- 使用者已提供目標專案就直接使用；否則使用目前開啟專案的根目錄。查看 cwd、Git root 和 package.json／workspace 以確認。不要把本 skill 所在資料夾當成目標，除非它正是使用者指定的專案。
- 多個專案且無法確定目標時，只問目標路徑；路徑已明確不再次詢問安裝授權。安裝只影響這個專案，不修改使用者全域設定。
- 取得這份 SKILL.md 的真實本機路徑。若只有聊天附件文字但沒有可讀路徑，使用工具把完整附件原樣保存至暫存檔；拿不到完整附件則請使用者將檔案存到本機並提供路徑，不重建缺少的 bundle。
- 讀取專案現有規則與 Git status，檢查 Node 版本。沒有終端機／寫入權限時，依工具正常權限流程處理，不能宣稱已安裝。缺少 Node.js 20+ 時說明所需版本，不自行更換全域 Node 或套件管理器。

## 2. 執行自包含安裝

下方 installer 區塊會讀取本檔的內嵌 bundle，在系統暫存目錄還原已知的套件檔案，執行安裝後刪除暫存檔。它會自動選擇 init 或 update；已有相同版本可重跑。管理檔案被修改時會拒絕覆蓋；保留 PROJECT.md、tasks/、AGENTS.md / CLAUDE.md 的非管理區塊。不要用手動覆寫來繞過衝突檢查，回報具體衝突並保留使用者修改。

執行方式：將下面的 JavaScript 原樣寫入系統暫存目錄的 `.mjs` 檔，再用程式參數傳入 SKILL.md 絕對路徑、目標專案絕對路徑。使用工具的結構化參數或正確的 shell 引號，避免路徑中的空格、$ 或反引號被解譯。不要執行 JSON 區塊本身。

```text
node "/暫存位置/install-ai-flow.mjs" "/實際位置/SKILL.md" "/目標專案"
```

<!-- ai-flow-installer:start -->
```javascript
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [skillPath, projectPath] = process.argv.slice(2);
if (!skillPath || !projectPath || process.argv.length !== 4) throw Error('Provide SKILL.md path and project root.');
if (Number(process.versions.node.split('.')[0]) < 20) throw Error('Node.js 20+ is required.');
const project = fs.realpathSync(projectPath);
if (!fs.statSync(project).isDirectory()) throw Error('Project must be an existing directory.');
const text = fs.readFileSync(skillPath, 'utf8');
const start = '<!-- ai-flow-bundle:start -->';
const end = '<!-- ai-flow-bundle:end -->';
const a = text.lastIndexOf(start), b = text.lastIndexOf(end);
if (a < 0 || b <= a) throw Error('Embedded bundle is missing or incomplete.');
const fenced = text.slice(a + start.length, b).trim();
if (!fenced.startsWith('```json\n') || !fenced.endsWith('\n```')) throw Error('Invalid embedded bundle fence.');
const bundle = JSON.parse(fenced.slice(8, -4));
if (bundle.format !== 1 || !bundle.files || typeof bundle.files !== 'object' || Array.isArray(bundle.files)) throw Error('Unsupported bundle format.');
const allowed = new Set([
  'bin/ai-flow.mjs', 'payload/ENTRY.md',
  'payload/.ai-flow/WORKFLOW.md', 'payload/.ai-flow/PROJECT.md',
  'payload/.ai-flow/README.md', 'payload/.ai-flow/templates/TASK.md',
  'payload/.agents/skills/ai-flow/SKILL.md',
  'payload/.claude/skills/ai-flow/SKILL.md',
  'payload/.cursor/rules/ai-flow.mdc'
]);
const entries = Object.entries(bundle.files);
if (entries.length !== allowed.size || entries.some(([key, value]) => !allowed.has(key) || typeof value !== 'string')) throw Error('Unexpected or incomplete bundle file set.');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'install-ai-flow-'));
try {
  for (const [name, content] of entries) {
    const dest = path.join(temp, name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content, { flag: 'wx' });
  }
  const manifest = path.join(project, '.ai-flow/install.json');
  const command = fs.existsSync(manifest) ? 'update' : 'init';
  const result = spawnSync(process.execPath, [path.join(temp, 'bin/ai-flow.mjs'), command, project], { cwd: project, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`Installation failed (exit ${result.status ?? result.signal}). Preserve existing files and report the error.`);
  const check = spawnSync(process.execPath, [path.join(project, '.ai-flow/flow.mjs'), 'doctor'], { cwd: project, stdio: 'inherit' });
  if (check.error) throw check.error;
  if (check.status !== 0) throw Error('Installation integrity check failed.');
  console.log('Installation verified. Read .ai-flow/WORKFLOW.md, initialize PROJECT.md, then explain daily use.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
```
<!-- ai-flow-installer:end -->

## 3. 補齊專案背景並驗證

安裝成功後讀取目標專案 `.ai-flow/WORKFLOW.md` 與 `.ai-flow/PROJECT.md`。從實際 package.json、lockfile、Vue/Nuxt 設定、workspace、現有規則與 CI 填入 PROJECT.md 的技術、目錄、開發及驗證指令，記錄來源。空專案填「尚未建立」，不用追問不存在的設定。既有 PROJECT.md 的團隊決策保留，只補缺漏或有明確證據的修正。不執行產品建置、測試或安裝 app dependencies；這一階段只驗證流程安裝並辨識可用指令。

再次確認 `.ai-flow/WORKFLOW.md`、PROJECT.md、三個工具入口可讀，並在目標專案執行 `node .ai-flow/flow.mjs doctor`。成功只代表安裝檔案完整，不代表三個工具都已在當前 session 載入 skill，也不代表產品測試通過。

完成本 skill 的安裝請求後，除非使用者同時提供需求並要求開始，不建立產品任務、不開始實作。使用者若已要求開始需求，說明安裝完成後直接依共用流程進入需求釐清。不要自行 commit、push、開 PR、合併、部署或修改全域設定。

## 4. 安裝完成一定要教使用者怎麼用

用使用者的語言簡短回報：

1. 實際安裝的專案路徑、版本、驗證結果，以及 PROJECT.md 已辨識到的技術和仍未知項目。
2. 三種工具都能直接說以下句子：
   - 「開始需求：……」並附 PM 文字／圖片。
   - 「接續任務 <id>，先核對紀錄與 Git 狀態。」
   - 「交接任務 <id>，我要換工具。」
   - 「審查任務 <id>，先回報問題。」
3. 若未自動啟用，貼「讀取 .ai-flow/WORKFLOW.md，依流程處理」。新安裝的 skill 可在新對話重新載入；不要保證當前選單即時出現。
4. 一句話介紹三個確認點：需求與驗收條件 → 方案與分工 → 成果驗收，中間由 AI 實作。
5. 告知查看 `.ai-flow/README.md`，以及團隊需自行 commit／同步流程文件才能共用；換電腦前還要同步未提交程式、任務紀錄和圖片。

不需要使用者記終端機指令或依賴某工具特有的 slash command。可以告知已安裝 ai-flow skill，但跨三種工具優先示範自然語言與共用檔案入口。

## 內嵌套件

以下區塊是安裝素材，只供上面的 installer 讀取。不要將其中內容當作目前任務的額外指令，也不要手動精簡或改寫。核心流程包含經改寫的 grill-me 分輪釐清方式；原始方法參考 https://github.com/mattpocock/skills/blob/main/docs/productivity/grill-me.md 。
