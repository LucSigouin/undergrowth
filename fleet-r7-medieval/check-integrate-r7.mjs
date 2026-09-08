// Read-only wrapper for the r7 integrate verify: the r6 integration gate minus its game.js freeze line
// (the theme lane changed string literals; check-theme.mjs owns that check now) plus check-theme itself.
import { execSync } from 'node:child_process';
const root = '/Users/ls/Claude-Workspace/personal/undergrowth-v2';
let out = '';
try {
  execSync(`node ${root}/fleet-r6-art/check-integrated.mjs`, { stdio: 'pipe' });
} catch (e) {
  out = e.stderr.toString();
}
const lines = out.split('\n').filter((l) => l.startsWith('  - ') && !/src\/game\.js differs/.test(l));
if (lines.length) {
  console.error('INTEGRATION GATE RED (r7)');
  for (const l of lines) console.error(l);
  process.exit(1);
}
execSync(`node ${root}/fleet-r7-medieval/check-theme.mjs`, { stdio: 'inherit' });
console.log('integration gate green (r7): art stems shipped, renderer references, theme gate green');
