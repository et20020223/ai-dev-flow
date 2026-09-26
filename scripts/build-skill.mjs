import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'installer/instructions.md'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
function walk(dir, prefix) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name), `${prefix}/${e.name}`) : [`${prefix}/${e.name}`]);
}
const names = ['bin/ai-flow.mjs', ...walk(path.join(root, 'payload'), 'payload')];
const bundle = { format: 1, version: pkg.version, files: Object.fromEntries(names.map(name => [name, fs.readFileSync(path.join(root, name), 'utf8')])) };
const out = path.join(root, 'install-ai-flow/SKILL.md');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, source + '\n<!-- ai-flow-bundle:start -->\n```json\n' + JSON.stringify(bundle, null, 2) + '\n```\n<!-- ai-flow-bundle:end -->\n');
console.log(`Built ${out} (${fs.statSync(out).size} bytes)`);
