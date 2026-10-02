// Preview-only: copies of dist/ shared as a Claude artifact need relative links,
// and artifact paths may not start with "_", so _astro/ becomes assets/.
// Usage: cp -r dist /tmp/preview && node tools/relative-preview.mjs /tmp/preview
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, dirname, posix } from 'node:path';
const root = process.argv[2];
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const exists = (p) => { try { return statSync(join(root, p)); } catch { return null; } };
for (const file of walk(root)) {
  if (!/\.(html|css)$/.test(file)) continue;
  const fromDir = dirname(relative(root, file));
  const fix = (url) => {
    let [path, hash = ''] = url.split('#');
    let target = path.replace(/^\//, '');
    const st = exists(target);
    if (target === '' || (st && st.isDirectory())) target = posix.join(target, 'index.html');
    let rel = posix.relative(fromDir === '.' ? '' : fromDir, target) || 'index.html';
    return rel + (hash ? '#' + hash : '');
  };
  let s = readFileSync(file, 'utf8');
  s = s.replace(/(href|src|srcset)="(\/[^"]*)"/g, (_, a, v) =>
    `${a}="${v.split(/,\s*/).map((part) => { const [u, d] = part.split(/\s+/); return u.startsWith('/') && !u.startsWith('//') ? fix(u) + (d ? ' ' + d : '') : part; }).join(', ')}"`);
  s = s.replace(/url\((\/_astro\/[^)]*)\)/g, (_, u) => `url(${fix(u)})`);
  writeFileSync(file, s);
}

// Rename _astro/ to assets/ and update references.
import { renameSync } from 'node:fs';
renameSync(join(root, '_astro'), join(root, 'assets'));
for (const file of walk(root)) {
  if (!/\.(html|css)$/.test(file)) continue;
  writeFileSync(file, readFileSync(file, 'utf8').replaceAll('_astro/', 'assets/'));
}
