import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const version = process.argv[2] || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(version)) throw new Error('Expected a full commit SHA for the website version.');
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const file of ['index.html', 'style.css', 'script.js', 'presave.css', 'presave.js', 'presave-config.js', 'bubble.js', 'bricks.js', 'wonguikung.js', '042 favicon.png', 'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png', 'site.webmanifest', 'logo-042.png', 'Grupo 4.png', 'sun.svg', 'huevon_umb.png', 'huevon_move_umb.png', 'manz.png', 'escoba.png', 'eyesopen.png', 'eyesclos.png']) {
  cpSync(join(root, file), join(dist, file));
}
for (const folder of ['fonts', 'audio', 'covers', 'sprites']) cpSync(join(root, folder), join(dist, folder), { recursive: true });
const script = readFileSync(join(dist, 'script.js'), 'utf8').replace(/const BUILD_VERSION='[^']*';/, `const BUILD_VERSION='${version}';`);
const html = readFileSync(join(dist, 'index.html'), 'utf8').replace(/\?v=[a-f0-9]+/g, `?v=${version}`);
writeFileSync(join(dist, 'script.js'), script);
writeFileSync(join(dist, 'index.html'), html);
writeFileSync(join(dist, 'version.json'), JSON.stringify({ version }) + '\n');
writeFileSync(join(dist, '.nojekyll'), '');
console.log(`Prepared website ${version} in dist/`);
