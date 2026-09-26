import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const original = fs.readFileSync(fileURLToPath(new URL('../install-ai-flow/SKILL.md', import.meta.url)), 'utf8');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'standalone-flow-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const skill = path.join(root, 'one file $skill.md');
  const script = path.join(root, 'install.mjs');
  const project = path.join(root, 'project with spaces');
  fs.mkdirSync(project);
  fs.writeFileSync(skill, original);
  const match = original.match(/<!-- ai-flow-installer:start -->\s*```javascript\n([\s\S]*?)\n```\s*<!-- ai-flow-installer:end -->/);
  assert.ok(match, 'Executable installer is embedded');
  fs.writeFileSync(script, match[1]);
  const run = () => spawnSync(process.execPath, [script, skill, project], { cwd: root, encoding: 'utf8' });
  return { root, skill, script, project, run };
}
test('the SKILL.md alone installs all three entries and can be rerun without losing context', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.project, 'AGENTS.md'), 'Original instructions\n');
  let r = f.run();
  assert.equal(r.status, 0, r.stderr);
  for (const name of ['.agents/skills/ai-flow/SKILL.md', '.claude/skills/ai-flow/SKILL.md', '.cursor/rules/ai-flow.mdc', '.ai-flow/WORKFLOW.md']) assert.ok(fs.readFileSync(path.join(f.project, name), 'utf8').length);
  assert.ok(fs.readFileSync(path.join(f.project, 'AGENTS.md'), 'utf8').startsWith('Original instructions\n'));
  fs.writeFileSync(path.join(f.project, '.ai-flow/PROJECT.md'), 'Team context');
  r = spawnSync(process.execPath, [path.join(f.project, '.ai-flow/flow.mjs'), 'new', 'from-skill'], { cwd: f.project, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  r = f.run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(f.project, '.ai-flow/PROJECT.md'), 'utf8'), 'Team context');
  assert.ok(fs.existsSync(path.join(f.project, '.ai-flow/tasks/from-skill/TASK.md')));
  assert.equal(fs.existsSync(path.join(f.root, '.ai-flow')), false);
});
test('the single file installer reports modified instructions without replacing them', t => {
  const f = fixture(t);
  assert.equal(f.run().status, 0);
  const workflow = path.join(f.project, '.ai-flow/WORKFLOW.md');
  fs.writeFileSync(workflow, 'User changed the workflow');
  const r = f.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /nothing written/);
  assert.equal(fs.readFileSync(workflow, 'utf8'), 'User changed the workflow');
});
test('an incomplete single file fails before writing into the project', t => {
  const f = fixture(t);
  fs.writeFileSync(f.skill, original.slice(0, original.lastIndexOf('<!-- ai-flow-bundle:start -->')));
  const r = f.run();
  assert.equal(r.status, 1);
  assert.equal(fs.readdirSync(f.project).length, 0);
});
