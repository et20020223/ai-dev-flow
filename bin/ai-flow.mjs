#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const VERSION = '0.2.0';
const self = fileURLToPath(import.meta.url);
const payload = path.resolve(path.dirname(self), '../payload');
const begin = '<!-- ai-dev-flow:start -->';
const end = '<!-- ai-dev-flow:end -->';
const hash = s => createHash('sha256').update(s).digest('hex');
const exists = p => { try { fs.lstatSync(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
function safe(root, relative) {
  const full = path.resolve(root, relative);
  const rel = path.relative(root, full);
  if (path.isAbsolute(rel) || rel === '..' || rel.startsWith(`..${path.sep}`)) throw Error(`Path escapes project: ${relative}`);
  let current = root;
  for (const part of rel.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (exists(current) && fs.lstatSync(current).isSymbolicLink()) throw Error(`Refusing symbolic link: ${current}`);
  }
  return full;
}
function read(root, relative) {
  const p = safe(root, relative);
  if (!exists(p)) return null;
  if (!fs.lstatSync(p).isFile()) throw Error(`Expected a regular file: ${p}`);
  return fs.readFileSync(p, 'utf8');
}
function write(root, relative, content) {
  const p = safe(root, relative);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const temp = `${p}.tmp-${randomUUID()}`;
  try { fs.writeFileSync(temp, content, { flag: 'wx', mode: exists(p) ? fs.statSync(p).mode : 0o644 }); fs.renameSync(temp, p); }
  finally { if (exists(temp)) fs.unlinkSync(temp); }
}
function walk(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isSymbolicLink()) throw Error(`Payload contains symbolic link: ${rel}`);
    return e.isDirectory() ? walk(path.join(dir, e.name), rel) : [rel];
  });
}
function region(text, filename) {
  const starts = text.split(begin).length - 1;
  const ends = text.split(end).length - 1;
  if (starts === 0 && ends === 0) return null;
  if (starts !== 1 || ends !== 1 || text.indexOf(end) < text.indexOf(begin)) throw Error(`Malformed managed markers: ${filename}`);
  const a = text.indexOf(begin), b = text.indexOf(end) + end.length;
  return { a, b, text: text.slice(a, b) };
}
function manifest(root, required = true) {
  const raw = read(root, '.ai-flow/install.json');
  if (!raw) { if (required) throw Error('Project is not initialized. Run init using the toolkit first.'); return null; }
  const m = JSON.parse(raw);
  if (m.schema !== 1 || !m.files || typeof m.files !== 'object' || !m.blocks || typeof m.blocks !== 'object') throw Error('Invalid install manifest.');
  return m;
}
function install(root, updating) {
  if (!exists(payload)) throw Error('Run init/update from the downloaded toolkit bin/ai-flow.mjs, not the installed runtime.');
  const old = manifest(root, false);
  if (updating && !old) throw Error('No installation found. Use init first.');
  const next = { schema: 1, version: VERSION, files: {}, blocks: {} };
  const planned = [];
  const conflicts = [];
  const contentMap = {};
  for (const rel of walk(payload)) {
    if (rel === 'ENTRY.md') continue;
    contentMap[rel] = fs.readFileSync(path.join(payload, rel), 'utf8');
  }
  contentMap['.ai-flow/flow.mjs'] = fs.readFileSync(self, 'utf8');
  for (const [rel, content] of Object.entries(contentMap)) {
    const current = read(root, rel);
    if (rel === '.ai-flow/PROJECT.md') {
      if (current === null) planned.push([rel, content]);
      continue;
    }
    next.files[rel] = hash(content);
    if (current === content) continue;
    if (current !== null && (!old?.files[rel] || hash(current) !== old.files[rel])) conflicts.push(rel);
    else planned.push([rel, content]);
  }
  // Removed paths are not deleted automatically; preserve their tracking to make drift visible.
  for (const [rel, digest] of Object.entries(old?.files ?? {})) if (!(rel in next.files)) next.files[rel] = digest;
  const block = `${begin}\n${fs.readFileSync(path.join(payload, 'ENTRY.md'), 'utf8').trim()}\n${end}`;
  for (const rel of ['AGENTS.md', 'CLAUDE.md']) {
    const current = read(root, rel) ?? '';
    const found = region(current, rel);
    next.blocks[rel] = hash(block);
    if (found && found.text !== block && (!old?.blocks[rel] || hash(found.text) !== old.blocks[rel])) { conflicts.push(`${rel} (managed block)`); continue; }
    const updated = found ? current.slice(0, found.a) + block + current.slice(found.b) : current + (current && !current.endsWith('\n') ? '\n' : '') + (current ? '\n' : '') + block + '\n';
    if (updated !== current) planned.push([rel, updated]);
  }
  // Preflight everything before the first write. A conflict never produces a partial update.
  safe(root, '.ai-flow/tasks');
  if (exists(safe(root, '.ai-flow/tasks')) && !fs.statSync(safe(root, '.ai-flow/tasks')).isDirectory()) throw Error('Expected .ai-flow/tasks to be a directory');
  if (conflicts.length) throw Error(`Local changes or unmanaged collisions; nothing written:\n${conflicts.join('\n')}\nSave custom changes, restore managed files to their installed version, then retry and merge deliberately.`);
  for (const [rel, content] of planned) write(root, rel, content);
  fs.mkdirSync(safe(root, '.ai-flow/tasks'), { recursive: true });
  write(root, '.ai-flow/install.json', JSON.stringify(next, null, 2) + '\n');
  console.log(`AI Dev Flow ${VERSION}: ${planned.length} file(s) written in ${root}`);
  console.log('Next: ask your AI to initialize project context in .ai-flow/PROJECT.md. Review changes and commit them yourself to share with the team.');
}
function taskId(id) {
  if (!id || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw Error('Task ID must be 1–64 lowercase letters, digits or hyphens, starting with a letter/digit.');
  return id;
}
function newTask(root, id, title) {
  manifest(root);
  taskId(id);
  if (/\r|\n/.test(title)) throw Error('Task title must be a single line.');
  const template = read(root, '.ai-flow/templates/TASK.md');
  if (template === null) throw Error('Task template is missing.');
  const rel = `.ai-flow/tasks/${id}`;
  const dir = safe(root, rel);
  fs.mkdirSync(safe(root, '.ai-flow/tasks'), { recursive: true });
  // Exclusive creation prevents duplicate IDs even if two local processes race.
  fs.mkdirSync(dir);
  fs.mkdirSync(path.join(dir, 'assets'));
  const values = { TITLE: title, ID: id, DATE: new Date().toISOString() };
  write(root, `${rel}/TASK.md`, template.replace(/\{\{(TITLE|ID|DATE)\}\}/g, (_, key) => values[key]));
  console.log(`Created ${rel}/TASK.md. Paste the requirement and begin discovery.`);
}
function status(root) {
  manifest(root);
  const dir = safe(root, '.ai-flow/tasks');
  if (!exists(dir)) { console.log('No tasks yet.'); return; }
  const names = fs.readdirSync(dir).sort();
  let count = 0;
  for (const id of names) {
    const p = safe(root, `.ai-flow/tasks/${id}`);
    if (!fs.statSync(p).isDirectory()) continue;
    const text = read(root, `.ai-flow/tasks/${id}/TASK.md`);
    if (text === null) continue;
    const field = key => text.split('\n').find(line => line.startsWith(`- ${key}：`))?.split('：').slice(1).join('：') ?? 'unknown';
    console.log(`${id}\t${field('階段')}\t${field('Owner')}`); count++;
  }
  if (!count) console.log('No tasks yet.');
}
function doctor(root) {
  const m = manifest(root);
  const problems = [];
  for (const [rel, digest] of Object.entries(m.files)) {
    const text = read(root, rel);
    if (text === null || hash(text) !== digest) problems.push(`${rel}: missing or modified`);
  }
  for (const [rel, digest] of Object.entries(m.blocks)) {
    const found = region(read(root, rel) ?? '', rel);
    if (!found || hash(found.text) !== digest) problems.push(`${rel}: managed block missing or modified`);
  }
  if (read(root, '.ai-flow/PROJECT.md') === null) problems.push('PROJECT.md is missing');
  if (problems.length) throw Error(problems.join('\n'));
  console.log(`Installation ${m.version}: file integrity OK. This does not verify AI behavior or project tests.`);
}
function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help' || command === 'help') {
    console.log('AI Dev Flow\n  node bin/ai-flow.mjs init|update [project-root]\n  node .ai-flow/flow.mjs new <id> [--title "title"]\n  node .ai-flow/flow.mjs status|doctor\nNode.js 20+. No dependencies or network required. Runtime commands use the current project root.'); return;
  }
  if (command === 'init' || command === 'update') {
    if (args.length > 1 || args[0]?.startsWith('--')) throw Error('Expected at most one project directory.');
    const requested = path.resolve(args[0] ?? '.');
    if (!exists(requested) || !fs.statSync(requested).isDirectory()) throw Error('Project directory must already exist.');
    install(fs.realpathSync(requested), command === 'update'); return;
  }
  const root = fs.realpathSync(process.cwd());
  if (command === 'new') {
    const [id, flag, title] = args;
    if ((args.length !== 1 && args.length !== 3) || (flag && flag !== '--title')) throw Error('Usage: new <id> [--title "title"]');
    newTask(root, id, title ?? id); return;
  }
  if (args.length) throw Error('This command takes no arguments. Run it from the project root.');
  if (command === 'status') return status(root);
  if (command === 'doctor') return doctor(root);
  throw Error(`Unknown command: ${command}`);
}
try { main(); } catch (error) { console.error(`Error: ${error.message}`); process.exitCode = 1; }
