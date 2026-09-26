import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const cli = fileURLToPath(new URL('../bin/ai-flow.mjs', import.meta.url));
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-flow-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function run(root, args, runtime = false) {
  return spawnSync(process.execPath, [runtime ? path.join(root, '.ai-flow/flow.mjs') : cli, ...args], { cwd: root, encoding: 'utf8' });
}
const read = (r, p) => fs.readFileSync(path.join(r, p), 'utf8');
const put = (r, p, s) => fs.writeFileSync(path.join(r, p), s);
test('initialization preserves existing rules and repeat installation is idempotent', t => {
  const root = fixture(t);
  put(root, 'AGENTS.md', '# Team rules\nUse existing components.\n');
  put(root, 'CLAUDE.md', 'Existing Claude instructions');
  assert.equal(run(root, ['init']).status, 0);
  assert.ok(read(root, 'AGENTS.md').startsWith('# Team rules\nUse existing components.\n'));
  const before = read(root, 'AGENTS.md');
  assert.equal(run(root, ['init']).status, 0);
  assert.equal(read(root, 'AGENTS.md'), before);
  assert.equal(run(root, ['doctor'], true).status, 0);
});
test('installed runtime creates portable tasks; updates preserve context, tasks and custom rules', t => {
  const root = fixture(t);
  assert.equal(run(root, ['init']).status, 0);
  const result = run(root, ['new', 'member-search', '--title', '搜尋 $1 {{ID}}'], true);
  assert.equal(result.status, 0, result.stderr);
  assert.match(read(root, '.ai-flow/tasks/member-search/TASK.md'), /^# 搜尋 \$1 \{\{ID\}\}/);
  put(root, '.ai-flow/PROJECT.md', 'Custom team context');
  fs.appendFileSync(path.join(root, 'AGENTS.md'), '\nMore team rules\n');
  const original = read(root, '.ai-flow/tasks/member-search/TASK.md');
  assert.equal(run(root, ['update']).status, 0);
  assert.equal(read(root, '.ai-flow/PROJECT.md'), 'Custom team context');
  assert.equal(read(root, '.ai-flow/tasks/member-search/TASK.md'), original);
  assert.ok(read(root, 'AGENTS.md').endsWith('More team rules\n'));
  assert.match(run(root, ['status'], true).stdout, /member-search\tdiscover/);
});
test('duplicate task IDs and path traversal fail without overwriting work', t => {
  const root = fixture(t);
  run(root, ['init']);
  assert.equal(run(root, ['new', 'bug-1'], true).status, 0);
  const before = read(root, '.ai-flow/tasks/bug-1/TASK.md');
  assert.equal(run(root, ['new', 'bug-1'], true).status, 1);
  assert.equal(run(root, ['new', '../escape'], true).status, 1);
  assert.equal(read(root, '.ai-flow/tasks/bug-1/TASK.md'), before);
  assert.equal(fs.existsSync(path.join(root, '.ai-flow/escape')), false);
});
test('managed file conflicts abort all writes and doctor reports drift', t => {
  const root = fixture(t);
  run(root, ['init']);
  put(root, '.ai-flow/WORKFLOW.md', 'Local modifications');
  fs.unlinkSync(path.join(root, '.cursor/rules/ai-flow.mdc'));
  const before = read(root, '.ai-flow/install.json');
  const result = run(root, ['update']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /nothing written/);
  assert.equal(fs.existsSync(path.join(root, '.cursor/rules/ai-flow.mdc')), false);
  assert.equal(read(root, '.ai-flow/install.json'), before);
  assert.equal(run(root, ['doctor'], true).status, 1);
});
test('unmanaged file collision never overwrites or partially installs', t => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, '.ai-flow'));
  put(root, '.ai-flow/WORKFLOW.md', 'Existing other workflow');
  assert.equal(run(root, ['init']).status, 1);
  assert.equal(read(root, '.ai-flow/WORKFLOW.md'), 'Existing other workflow');
  assert.equal(fs.existsSync(path.join(root, 'AGENTS.md')), false);
});
test('symlinked project internals are refused before any writes', t => {
  const root = fixture(t), external = fixture(t);
  fs.symlinkSync(external, path.join(root, '.claude'), 'dir');
  const result = run(root, ['init']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /symbolic link/);
  assert.equal(fs.existsSync(path.join(root, '.ai-flow')), false);
  assert.deepEqual(fs.readdirSync(external), []);
});
test('malformed managed markers fail without changing user files', t => {
  const root = fixture(t);
  put(root, 'CLAUDE.md', 'Hello\n<!-- ai-dev-flow:start -->\nIncomplete block');
  const original = read(root, 'CLAUDE.md');
  assert.equal(run(root, ['init']).status, 1);
  assert.equal(read(root, 'CLAUDE.md'), original);
  assert.equal(fs.existsSync(path.join(root, '.ai-flow')), false);
});
test('explicit target directory with spaces works; unrelated cwd is untouched', t => {
  const root = fixture(t), target = path.join(root, 'project with spaces');
  fs.mkdirSync(target);
  assert.equal(run(root, ['init', target]).status, 0);
  assert.ok(fs.existsSync(path.join(target, '.ai-flow/WORKFLOW.md')));
  assert.equal(fs.existsSync(path.join(root, 'AGENTS.md')), false);
  assert.equal(run(target, ['init'], true).status, 1);
});
test('a new toolkit updates unchanged managed files and blocks while keeping task data', t => {
  const root = fixture(t), toolkit = fixture(t);
  run(root, ['init']);
  run(root, ['new', 'upgrade-test'], true);
  const task = read(root, '.ai-flow/tasks/upgrade-test/TASK.md');
  const source = path.resolve(path.dirname(cli), '..');
  fs.cpSync(path.join(source, 'payload'), path.join(toolkit, 'payload'), { recursive: true });
  fs.mkdirSync(path.join(toolkit, 'bin'));
  fs.copyFileSync(cli, path.join(toolkit, 'bin/ai-flow.mjs'));
  fs.appendFileSync(path.join(toolkit, 'payload/.ai-flow/WORKFLOW.md'), '\nNew upstream guidance.\n');
  fs.appendFileSync(path.join(toolkit, 'payload/ENTRY.md'), '\nUpdated routing.\n');
  fs.appendFileSync(path.join(root, 'AGENTS.md'), '\nUser rule preserved.\n');
  const result = spawnSync(process.execPath, [path.join(toolkit, 'bin/ai-flow.mjs'), 'update', root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(read(root, '.ai-flow/WORKFLOW.md'), /New upstream guidance/);
  assert.match(read(root, 'AGENTS.md'), /Updated routing/);
  assert.match(read(root, 'AGENTS.md'), /User rule preserved/);
  assert.equal(read(root, '.ai-flow/tasks/upgrade-test/TASK.md'), task);
  assert.equal(run(root, ['doctor'], true).status, 0);
});
test('modified managed instruction blocks are preserved and block updates', t => {
  const root = fixture(t);
  run(root, ['init']);
  const edited = read(root, 'AGENTS.md').replace('<!-- ai-dev-flow:start -->', '<!-- ai-dev-flow:start -->\nCustom block edit');
  put(root, 'AGENTS.md', edited);
  const result = run(root, ['update']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /managed block/);
  assert.equal(read(root, 'AGENTS.md'), edited);
});
