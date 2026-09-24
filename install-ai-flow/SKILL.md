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

<!-- ai-flow-bundle:start -->
```json
{
  "format": 1,
  "version": "0.2.0",
  "files": {
    "bin/ai-flow.mjs": "#!/usr/bin/env node\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\nimport { createHash, randomUUID } from 'node:crypto';\n\nconst VERSION = '0.2.0';\nconst self = fileURLToPath(import.meta.url);\nconst payload = path.resolve(path.dirname(self), '../payload');\nconst begin = '<!-- ai-dev-flow:start -->';\nconst end = '<!-- ai-dev-flow:end -->';\nconst hash = s => createHash('sha256').update(s).digest('hex');\nconst exists = p => { try { fs.lstatSync(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };\nfunction safe(root, relative) {\n  const full = path.resolve(root, relative);\n  const rel = path.relative(root, full);\n  if (path.isAbsolute(rel) || rel === '..' || rel.startsWith(`..${path.sep}`)) throw Error(`Path escapes project: ${relative}`);\n  let current = root;\n  for (const part of rel.split(path.sep).filter(Boolean)) {\n    current = path.join(current, part);\n    if (exists(current) && fs.lstatSync(current).isSymbolicLink()) throw Error(`Refusing symbolic link: ${current}`);\n  }\n  return full;\n}\nfunction read(root, relative) {\n  const p = safe(root, relative);\n  if (!exists(p)) return null;\n  if (!fs.lstatSync(p).isFile()) throw Error(`Expected a regular file: ${p}`);\n  return fs.readFileSync(p, 'utf8');\n}\nfunction write(root, relative, content) {\n  const p = safe(root, relative);\n  fs.mkdirSync(path.dirname(p), { recursive: true });\n  const temp = `${p}.tmp-${randomUUID()}`;\n  try { fs.writeFileSync(temp, content, { flag: 'wx', mode: exists(p) ? fs.statSync(p).mode : 0o644 }); fs.renameSync(temp, p); }\n  finally { if (exists(temp)) fs.unlinkSync(temp); }\n}\nfunction walk(dir, prefix = '') {\n  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {\n    const rel = prefix ? `${prefix}/${e.name}` : e.name;\n    if (e.isSymbolicLink()) throw Error(`Payload contains symbolic link: ${rel}`);\n    return e.isDirectory() ? walk(path.join(dir, e.name), rel) : [rel];\n  });\n}\nfunction region(text, filename) {\n  const starts = text.split(begin).length - 1;\n  const ends = text.split(end).length - 1;\n  if (starts === 0 && ends === 0) return null;\n  if (starts !== 1 || ends !== 1 || text.indexOf(end) < text.indexOf(begin)) throw Error(`Malformed managed markers: ${filename}`);\n  const a = text.indexOf(begin), b = text.indexOf(end) + end.length;\n  return { a, b, text: text.slice(a, b) };\n}\nfunction manifest(root, required = true) {\n  const raw = read(root, '.ai-flow/install.json');\n  if (!raw) { if (required) throw Error('Project is not initialized. Run init using the toolkit first.'); return null; }\n  const m = JSON.parse(raw);\n  if (m.schema !== 1 || !m.files || typeof m.files !== 'object' || !m.blocks || typeof m.blocks !== 'object') throw Error('Invalid install manifest.');\n  return m;\n}\nfunction install(root, updating) {\n  if (!exists(payload)) throw Error('Run init/update from the downloaded toolkit bin/ai-flow.mjs, not the installed runtime.');\n  const old = manifest(root, false);\n  if (updating && !old) throw Error('No installation found. Use init first.');\n  const next = { schema: 1, version: VERSION, files: {}, blocks: {} };\n  const planned = [];\n  const conflicts = [];\n  const contentMap = {};\n  for (const rel of walk(payload)) {\n    if (rel === 'ENTRY.md') continue;\n    contentMap[rel] = fs.readFileSync(path.join(payload, rel), 'utf8');\n  }\n  contentMap['.ai-flow/flow.mjs'] = fs.readFileSync(self, 'utf8');\n  for (const [rel, content] of Object.entries(contentMap)) {\n    const current = read(root, rel);\n    if (rel === '.ai-flow/PROJECT.md') {\n      if (current === null) planned.push([rel, content]);\n      continue;\n    }\n    next.files[rel] = hash(content);\n    if (current === content) continue;\n    if (current !== null && (!old?.files[rel] || hash(current) !== old.files[rel])) conflicts.push(rel);\n    else planned.push([rel, content]);\n  }\n  // Removed paths are not deleted automatically; preserve their tracking to make drift visible.\n  for (const [rel, digest] of Object.entries(old?.files ?? {})) if (!(rel in next.files)) next.files[rel] = digest;\n  const block = `${begin}\\n${fs.readFileSync(path.join(payload, 'ENTRY.md'), 'utf8').trim()}\\n${end}`;\n  for (const rel of ['AGENTS.md', 'CLAUDE.md']) {\n    const current = read(root, rel) ?? '';\n    const found = region(current, rel);\n    next.blocks[rel] = hash(block);\n    if (found && found.text !== block && (!old?.blocks[rel] || hash(found.text) !== old.blocks[rel])) { conflicts.push(`${rel} (managed block)`); continue; }\n    const updated = found ? current.slice(0, found.a) + block + current.slice(found.b) : current + (current && !current.endsWith('\\n') ? '\\n' : '') + (current ? '\\n' : '') + block + '\\n';\n    if (updated !== current) planned.push([rel, updated]);\n  }\n  // Preflight everything before the first write. A conflict never produces a partial update.\n  safe(root, '.ai-flow/tasks');\n  if (exists(safe(root, '.ai-flow/tasks')) && !fs.statSync(safe(root, '.ai-flow/tasks')).isDirectory()) throw Error('Expected .ai-flow/tasks to be a directory');\n  if (conflicts.length) throw Error(`Local changes or unmanaged collisions; nothing written:\\n${conflicts.join('\\n')}\\nSave custom changes, restore managed files to their installed version, then retry and merge deliberately.`);\n  for (const [rel, content] of planned) write(root, rel, content);\n  fs.mkdirSync(safe(root, '.ai-flow/tasks'), { recursive: true });\n  write(root, '.ai-flow/install.json', JSON.stringify(next, null, 2) + '\\n');\n  console.log(`AI Dev Flow ${VERSION}: ${planned.length} file(s) written in ${root}`);\n  console.log('Next: ask your AI to initialize project context in .ai-flow/PROJECT.md. Review changes and commit them yourself to share with the team.');\n}\nfunction taskId(id) {\n  if (!id || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw Error('Task ID must be 1–64 lowercase letters, digits or hyphens, starting with a letter/digit.');\n  return id;\n}\nfunction newTask(root, id, title) {\n  manifest(root);\n  taskId(id);\n  if (/\\r|\\n/.test(title)) throw Error('Task title must be a single line.');\n  const template = read(root, '.ai-flow/templates/TASK.md');\n  if (template === null) throw Error('Task template is missing.');\n  const rel = `.ai-flow/tasks/${id}`;\n  const dir = safe(root, rel);\n  fs.mkdirSync(safe(root, '.ai-flow/tasks'), { recursive: true });\n  // Exclusive creation prevents duplicate IDs even if two local processes race.\n  fs.mkdirSync(dir);\n  fs.mkdirSync(path.join(dir, 'assets'));\n  const values = { TITLE: title, ID: id, DATE: new Date().toISOString() };\n  write(root, `${rel}/TASK.md`, template.replace(/\\{\\{(TITLE|ID|DATE)\\}\\}/g, (_, key) => values[key]));\n  console.log(`Created ${rel}/TASK.md. Paste the requirement and begin discovery.`);\n}\nfunction status(root) {\n  manifest(root);\n  const dir = safe(root, '.ai-flow/tasks');\n  if (!exists(dir)) { console.log('No tasks yet.'); return; }\n  const names = fs.readdirSync(dir).sort();\n  let count = 0;\n  for (const id of names) {\n    const p = safe(root, `.ai-flow/tasks/${id}`);\n    if (!fs.statSync(p).isDirectory()) continue;\n    const text = read(root, `.ai-flow/tasks/${id}/TASK.md`);\n    if (text === null) continue;\n    const field = key => text.split('\\n').find(line => line.startsWith(`- ${key}：`))?.split('：').slice(1).join('：') ?? 'unknown';\n    console.log(`${id}\\t${field('階段')}\\t${field('Owner')}`); count++;\n  }\n  if (!count) console.log('No tasks yet.');\n}\nfunction doctor(root) {\n  const m = manifest(root);\n  const problems = [];\n  for (const [rel, digest] of Object.entries(m.files)) {\n    const text = read(root, rel);\n    if (text === null || hash(text) !== digest) problems.push(`${rel}: missing or modified`);\n  }\n  for (const [rel, digest] of Object.entries(m.blocks)) {\n    const found = region(read(root, rel) ?? '', rel);\n    if (!found || hash(found.text) !== digest) problems.push(`${rel}: managed block missing or modified`);\n  }\n  if (read(root, '.ai-flow/PROJECT.md') === null) problems.push('PROJECT.md is missing');\n  if (problems.length) throw Error(problems.join('\\n'));\n  console.log(`Installation ${m.version}: file integrity OK. This does not verify AI behavior or project tests.`);\n}\nfunction main() {\n  const [command, ...args] = process.argv.slice(2);\n  if (!command || command === '--help' || command === 'help') {\n    console.log('AI Dev Flow\\n  node bin/ai-flow.mjs init|update [project-root]\\n  node .ai-flow/flow.mjs new <id> [--title \"title\"]\\n  node .ai-flow/flow.mjs status|doctor\\nNode.js 20+. No dependencies or network required. Runtime commands use the current project root.'); return;\n  }\n  if (command === 'init' || command === 'update') {\n    if (args.length > 1 || args[0]?.startsWith('--')) throw Error('Expected at most one project directory.');\n    const requested = path.resolve(args[0] ?? '.');\n    if (!exists(requested) || !fs.statSync(requested).isDirectory()) throw Error('Project directory must already exist.');\n    install(fs.realpathSync(requested), command === 'update'); return;\n  }\n  const root = fs.realpathSync(process.cwd());\n  if (command === 'new') {\n    const [id, flag, title] = args;\n    if ((args.length !== 1 && args.length !== 3) || (flag && flag !== '--title')) throw Error('Usage: new <id> [--title \"title\"]');\n    newTask(root, id, title ?? id); return;\n  }\n  if (args.length) throw Error('This command takes no arguments. Run it from the project root.');\n  if (command === 'status') return status(root);\n  if (command === 'doctor') return doctor(root);\n  throw Error(`Unknown command: ${command}`);\n}\ntry { main(); } catch (error) { console.error(`Error: ${error.message}`); process.exitCode = 1; }\n",
    "payload/.agents/skills/ai-flow/SKILL.md": "---\nname: ai-flow\ndescription: Coordinate requirements, implementation, review, and cross-tool handoffs for development tasks in this repository. Use when starting a requirement, resuming a task, or handing work to another AI.\n---\n\n# AI Dev Flow\n\n當使用者要求開始需求、釐清需求、接續任務、交接或審查任務時，讀取 repository 根目錄的 `.ai-flow/WORKFLOW.md` 並按其路由處理。共用背景在 `.ai-flow/PROJECT.md`，任務在 `.ai-flow/tasks/<id>/TASK.md`。普通問答不用啟動完整流程。多個入口同時載入時只執行一次。若無法找到 repository 根目錄，先定位包含 `.ai-flow/WORKFLOW.md` 的專案根目錄。\n",
    "payload/.ai-flow/PROJECT.md": "# 專案背景（由團隊維護，更新工具不覆蓋）\n\n狀態：尚未由 AI 檢查專案。第一次使用請說「初始化 AI 開發流程，讀取現有專案並補齊 PROJECT.md」。\n\n## 產品與範圍\n- 產品用途／使用者：待確認\n- 技術：待檢查（Vue / Nuxt / Node.js / monorepo）\n- 套件管理器／Node 版本：依 lockfile 和專案設定確認\n\n## 結構與慣例\n- 前端入口、路由、共用元件、樣式／design tokens：待檢查\n- 狀態管理、API client、server、共用型別：待檢查\n- workspace 清單與責任範圍：待檢查\n- 既有規則／PR 人工 review 流程：待確認\n\n## 開發與驗證指令\n| 用途 | 工作目錄 | 指令 | 證據（設定來源／執行結果） |\n| --- | --- | --- | --- |\n| 啟動 | 待確認 | 待確認 | 未執行 |\n| lint／型別 | 待確認 | 待確認 | 未執行 |\n| 測試／建置 | 待確認 | 待確認 | 未執行 |\n\n## 視覺驗證\n- 目標 viewport、瀏覽器、Figma/圖片來源：按任務確認\n- 預覽啟動方式／測試帳號取得方法：待確認（不要寫入密碼或 token）\n- 可用圖片/瀏覽器工具及限制：待確認\n\n## 團隊共識\n- PM 問題回覆方式／可代決人員：待確認\n- 任務 owner／branch 命名慣例：待確認\n- 專案特殊要求：無已記錄要求\n",
    "payload/.ai-flow/README.md": "# 使用入口\n\n在 Codex、Claude Code 或 Cursor 開啟專案後，直接說：\n\n- 「初始化 AI 開發流程，讀取專案並補齊 PROJECT.md。」\n- 「開始需求：……」並附文字或圖片。\n- 「接續任務 member-search，先核對交接紀錄和實際 Git 狀態。」\n- 「交接任務 member-search，我要換 Claude Code。」\n- 「審查任務 member-search，先回報問題。」\n\n若工具沒有自動載入，明確要求「讀取 .ai-flow/WORKFLOW.md，依流程處理上述任務」。這也是跨工具最通用的啟動方式。\n\n需要手動建任務：`node .ai-flow/flow.mjs new member-search --title \"會員搜尋\"`\n查看任務：`node .ai-flow/flow.mjs status`\n檢查安裝：`node .ai-flow/flow.mjs doctor`\n\n第一次初始化後，維護者檢查並自行 commit 這些流程文件，團隊成員 pull 後直接使用。安裝器與 AI 不會替你 commit 或 push。Git 不會同步未提交修改；換人或換電腦前先確認程式、任務紀錄及素材已透過同意的方式傳送。\n\nPROJECT.md 是團隊可修改的專案設定。WORKFLOW.md、templates/、flow.mjs 和工具入口由安裝器管理；若自行改過，更新會拒絕覆蓋並列出衝突，請先保存自訂內容並手動整合。\n",
    "payload/.ai-flow/templates/TASK.md": "# {{TITLE}}\n\n- ID：{{ID}}\n- 建立時間：{{DATE}}\n- 階段：discover\n- 類型：新產品 / 功能 / bug（待確認）\n- Owner：未指派（人 / 工具 / session）\n- Branch / worktree：待記錄\n- 最後更新：{{DATE}}\n\n## 需求與素材\nPM 原文：待貼上。\n素材放在 assets/，記錄相對路徑、畫面尺寸和註解。尚未持久化的附件需明確標示。\n目標：待確認。\n範圍／非目標：待確認。\nBug 才填：重現步驟、預期／實際、環境與證據。\n\n## 決策與 PM 問題\n| ID | 問題／決策 | 狀態 | 決策者、日期與依據 | 影響的工作 |\n| --- | --- | --- | --- | --- |\n\n## 驗收條件\n| AC | 可觀察的行為（含相關畫面狀態） | 驗證方法 | 結果與證據 |\n| --- | --- | --- | --- |\n\n## 確認紀錄\n- 需求確認：待確認（人、日期、已確認範圍）\n- 方案確認：待確認（人、日期、已確認範圍）\n- 人工驗收：待確認（人、日期、接受的例外）\n\n## 實作方案\n涉及模組、檔案、資料流、API 約定、沿用元件、風險與驗證方法：待確認。\n\n## 子任務與分工\n| ID | 工作與檔案範圍 | Owner / 工具 / session | Branch / worktree | 依賴 | AC | 狀態 |\n| --- | --- | --- | --- | --- | --- | --- |\n\n## 驗證與審查\n| 時間 | 檢查 / review 範圍 | 指令與 cwd / 截圖 | 通過 / 失敗 / 未驗證 | 結果與剩餘風險 |\n| --- | --- | --- | --- | --- |\n\n## 最新交接 checkpoint\n- 時間、原 owner → 下一位 owner：尚未交接\n- Branch / HEAD / worktree：待核對\n- 未提交／未追蹤檔案：待核對（包含程式、素材及本紀錄）\n- 程式與素材取得方式：同一工作目錄 / revision / 傳送包；尚未跨機同步則註明\n- 已完成：尚未開始\n- 最後通過的驗證與適用 revision：無\n- 進行中／尚未驗證：待記錄\n- Blocker 與解除條件／回復階段：無已記錄 blocker\n- 下一步（可直接執行的具體動作）：釐清需求\n- 接手者核對 Git 與檔案結果：待接手\n\n## 重要進度紀錄\n只追加必要的完成、轉移與變更紀錄；最新狀態維護在上方，避免重讀整份聊天。\n",
    "payload/.ai-flow/WORKFLOW.md": "# AI Dev Flow — 共用開發流程\n\n適用於 Vue、Nuxt，以及同一 repository / monorepo 的 Node.js。支援新產品、功能與 bug。這是以文件為主的協作約定，不是自動執行或強制 gate 的系統。\n\n## 入口與讀取順序\n\n收到「開始需求」「接續任務」「交接」「審查任務」時使用本流程。普通問答不必建立任務。\n1. 讀本文件及 `.ai-flow/PROJECT.md`，遵循專案原有規則。\n2. 指定 task ID 時，讀 `.ai-flow/tasks/<id>/TASK.md`。未指定時列出任務供選擇；只有一個活躍任務可提出該任務供使用者確認，勿修改錯誤任務。\n3. 只讀該任務連結到的素材、程式與必要規範，不載入所有歷史任務。\n4. 查看 Git branch、HEAD、status、相關 diff；以實際檔案核對紀錄。缺檔、分支錯誤或紀錄落後時先指出，勿聲稱工作已存在。\n5. 依目前階段提出下一步。已記錄的使用者確認持續有效；方案或需求有實質變更時只重新確認受影響部分。\n\n## 一次初始化專案\n\n使用者第一次要求初始化時，檢查 package.json、lockfile、Vue/Nuxt 設定、workspace、CI 和既有規則，補齊 PROJECT.md。記錄指令的工作目錄及套件管理器；只記錄真的存在的 scripts，未知項目標記未知。區分「從設定找到」與「實際執行成功」。不猜測可用的測試或後端 API。初始化不要執行未要求的部署、migration 或付費操作。\n\n## 任務生命週期\n\n階段依序為 discover → plan → implement → review → done，blocked 可發生於任何階段，需記錄原階段與解除條件。開任務可用 `node .ai-flow/flow.mjs new <id> --title \"標題\"`；直接依模板建立也可以。任務編號用小寫英數及連字號，團隊可使用 issue ID。\n\n### 1. Discover：需求與 grill-me\n\n保留 PM 原文與圖片來源。只有聊天附件無法供下次存取時，請使用者將素材存入任務的 assets/，或明確記錄素材尚未持久化、不能宣稱已保存。\n\n先看素材和專案，再找出需要人決定的事項。分輪提問：同一輪只問前提已確定、目前就能決定的問題；依賴本輪答案的問題留到下一輪。給出有理由的建議，允許「不知道」和反對；不要把沉默當同意，也不要把建議寫成決策。使用者偏好一次一題時遵從。以能消除本次實作歧義為止，不追問與本次範圍無關的問題。\n\n依任務需要釐清：目標與使用者、範圍、主要操作、資料來源與 API 約定、權限、載入/空資料/錯誤/成功狀態、RWD、驗收方式。能從程式和環境查得的事實由 AI 查，不丟回給使用者。\n\n產品行為、商業規則與範圍的缺漏列入 PM 問題清單。使用者可明確代為決策；記錄決策者與依據。PM 未決問題只阻擋依賴它的工作，可先處理獨立且已確認的範圍。禁止以猜測完成受阻功能。需要實物才能決定的互動/畫面，提出有範圍的拋棄式原型，經使用者同意後製作，結果回填決策。\n\n驗收條件用 AC-01 等 ID，寫成可觀察行為。整理範圍、非目標、待確認問題和 AC，取得需求確認並記錄日期、確認者、確認範圍；這是第一個 gate。\n\n### 2. Plan：方案與分工\n\n檢查現有元件、路由、狀態管理、樣式、API client 與 Nuxt server 等實際結構，優先沿用慣例。列出會改的檔案/模組、資料流、API 約定、風險與最小可驗證任務。新產品先確認最小骨架和第一條端到端流程；bug 先記錄重現方式、預期/實際差異與證據，再決定修法。\n\n每個子任務列出 owner（人＋工具＋session）、branch/worktree、檔案範圍、依賴、對應 AC 與狀態。取得方案確認並記錄，才開始正式實作；這是第二個 gate。明確的小 bug 可在同一輪確認簡短需求與方案，仍需證據、驗收與交接。\n\n### 3. Implement：實作與持續記錄\n\n在已確認範圍內實作；遇到改變產品行為、範圍或重要技術選擇時，回到受影響的 gate。微小且符合既定方案的實作選擇自行處理，不反覆請示。\n\n每完成一個子任務、發生 blocker、準備長時間操作或交接前，更新 TASK.md：做了什麼、改了哪些檔案、驗證結果、目前 owner、下一步。不要等整個功能完成才記錄；突然中斷可能丟失最近一次 checkpoint 後的紀錄，新 AI 必須核對 diff。\n\n對 Vue/Nuxt 使用現有檢查，注意相關的 reactivity、SSR/hydration、client/server 邊界、API 錯誤和登入狀態。只為真實風險補測試，不為低影響文字/樣式改動強行建立測試。monorepo 指令需在正確 workspace 執行，API 變動同步更新呼叫端與約定。\n\n視覺驗證：使用已保存的需求圖片與相同 viewport 截圖對比，檢查排版、間距、字級、色彩、RWD 與各狀態。列出差異；允許的偏差需記錄人員確認。沒有瀏覽器/圖片能力時標記「未驗證」，交給具備能力的工具或人員，不聲稱符合 Figma。\n\n### 4. Review：AI 審查與人工驗收\n\n可在另一個工具/新對話提出「審查任務 <id>」。先讀需求、AC、方案與完整相關 diff，審查具體行為、邊界情況與必要測試；不要只相信上一個 AI 的完成宣告。記錄 review 的 base/head 或未提交 diff 的範圍、時間及證據。審查角色預設只回報發現，修復須依使用者指示。\n\n逐項對應 AC：通過／失敗／未驗證，附指令、工作目錄、結果或截圖路徑。沒有測試工具就明確記錄人工步驟，不把未執行寫成通過。準備 PR 說明草稿，包含行為變更、驗證與剩餘風險。人工確認結果是第三個 gate，才標 done；需要後續追蹤的例外也需明確接受。\n\n## 多人、多工具與交接\n\n- 同一 task、同一檔案範圍同時只有一個 writer。並行實作用不同 branch/worktree；避免兩個 AI 同時修改同一工作目錄。TASK.md owner 是協作紀錄，並非分散式鎖，開始前需團隊同步。\n- 拆出不重疊工作、列出依賴；共享型別、API、路由或設定由指定 owner 整合。多個分支的任務紀錄需要合併確認，不能僅按時間覆蓋另一人的決策。\n- 交接時使用模板中的 checkpoint：branch、HEAD、dirty files、檔案如何取得、已決事項、未決問題、驗證、下一步與 owner 轉移。停止原 writer 後再接力。\n- 同機換工具可接手同一工作目錄；跨人/跨機時未 commit 的程式、未追蹤圖片和文件不會由 Git 自動傳送。取得使用者指示再 commit/push，或使用使用者選定的檔案傳送方式；交接標示實際可取得的 revision 或包檔。不要把只寫摘要當作程式已同步。\n- 未經當次使用者指示不 commit、push、開 PR、合併或部署；可以產生草稿。既有明確授權不重複索取。\n- PROJECT.md 存專案慣例；TASK.md 存這次工作的事實。共用流程的修改由維護者更新套件後主動安裝，不在任務中隨意改寫。\n\n## 完成定義\n\n已確認範圍的 AC 有證據、必要檢查通過、視覺差異已處理或被接受、人工驗收完成、剩餘工作與交接資訊清楚。review 階段可產生 PR 草稿，done 不代表已合併或部署。\n",
    "payload/.claude/skills/ai-flow/SKILL.md": "---\nname: ai-flow\ndescription: Coordinate requirements, implementation, review, and cross-tool handoffs for development tasks in this repository. Use when starting a requirement, resuming a task, or handing work to another AI.\n---\n\n# AI Dev Flow\n\n當使用者要求開始需求、釐清需求、接續任務、交接或審查任務時，讀取 repository 根目錄的 `.ai-flow/WORKFLOW.md` 並按其路由處理。共用背景在 `.ai-flow/PROJECT.md`，任務在 `.ai-flow/tasks/<id>/TASK.md`。普通問答不用啟動完整流程。多個入口同時載入時只執行一次。若無法找到 repository 根目錄，先定位包含 `.ai-flow/WORKFLOW.md` 的專案根目錄。\n",
    "payload/.cursor/rules/ai-flow.mdc": "---\ndescription: Route development workflow and cross-tool handoff requests to shared project instructions.\nalwaysApply: true\n---\n\n當使用者要求開始需求、釐清需求、接續任務、交接或審查任務時，讀取 repository 根目錄的 `.ai-flow/WORKFLOW.md` 並按其路由處理。共用背景在 `.ai-flow/PROJECT.md`，任務在 `.ai-flow/tasks/<id>/TASK.md`。普通問答不用啟動完整流程。多個入口同時載入時只執行一次。若無法找到 repository 根目錄，先定位包含 `.ai-flow/WORKFLOW.md` 的專案根目錄。\n",
    "payload/ENTRY.md": "當使用者要求開始需求、釐清需求、接續任務、交接或審查任務時，讀取 repository 根目錄的 `.ai-flow/WORKFLOW.md` 並按其路由處理。共用背景在 `.ai-flow/PROJECT.md`，任務在 `.ai-flow/tasks/<id>/TASK.md`。普通問答不用啟動完整流程。多個入口同時載入時只執行一次。若無法找到 repository 根目錄，先定位包含 `.ai-flow/WORKFLOW.md` 的專案根目錄。\n"
  }
}
```
<!-- ai-flow-bundle:end -->
