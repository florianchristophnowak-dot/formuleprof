/**
 * Erzeugt nach dem Build den Service Worker mit der Liste aller
 * auszuliefernden Dateien. Dadurch ist die App vollständig offline nutzbar,
 * ohne dass eine zusätzliche Abhängigkeit nötig ist.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, '..', 'dist');

function collect(directory) {
  const entries = [];
  for (const name of readdirSync(directory)) {
    const full = join(directory, name);
    if (statSync(full).isDirectory()) entries.push(...collect(full));
    else entries.push(full);
  }
  return entries;
}

const files = collect(distDir)
  .map((file) => `./${relative(distDir, file).split('\\').join('/')}`)
  .filter((file) => file !== './sw.js')
  .sort();

const hash = createHash('sha256');
for (const file of files) {
  hash.update(file);
  hash.update(readFileSync(resolve(distDir, file)));
}

const template = readFileSync(resolve(here, 'sw-template.js'), 'utf8');
const output = template
  .replace('__CACHE_NAME__', `formuleprof-${hash.digest('hex').slice(0, 12)}`)
  .replace('__PRECACHE__', JSON.stringify(files, null, 2));

writeFileSync(resolve(distDir, 'sw.js'), output);
console.log(`Service Worker erstellt: ${files.length} Dateien im Offline-Speicher.`);
