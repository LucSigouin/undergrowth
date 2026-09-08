// Keep the unchanged browser gates' disposable images inside this lane.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = resolve(root, 'test-results');
const target = fileURLToPath(new URL('./shots/gates/', import.meta.url));
const redirect = (path) => {
  if (typeof path !== 'string') return path;
  const rel = relative(source, resolve(path));
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith('/'))
    ? resolve(target, rel)
    : path;
};
for (const name of ['mkdirSync', 'writeFileSync']) {
  const original = fs[name];
  fs[name] = (path, ...args) => original(redirect(path), ...args);
}
for (const name of ['mkdir', 'writeFile']) {
  const original = fs.promises[name];
  fs.promises[name] = (path, ...args) => original(redirect(path), ...args);
}
syncBuiltinESMExports();
