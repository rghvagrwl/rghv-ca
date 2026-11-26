import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const manifest = JSON.parse(await readFile('src/lib/optimized-media.json', 'utf8'));
const hash = (data) => createHash('sha256').update(data).digest('hex');
const MiB = 1024 * 1024;
const files = new Map();
const byType = new Map();
const hashes = new Map();

async function inventory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await inventory(file);
      continue;
    }
    const data = await readFile(file);
    const url = `/${path.relative('public', file).split(path.sep).join('/')}`;
    assert(data.length <= 32 * MiB, `${url} exceeds the 32 MiB per-file budget`);
    const digest = hash(data);
    assert(!hashes.has(digest), `Duplicate assets: ${hashes.get(digest)} and ${url}`);
    hashes.set(digest, url);
    files.set(url, { bytes: data.length, fileHash: digest });
    const type = path.extname(file);
    byType.set(type, (byType.get(type) ?? 0) + data.length);
  }
}

await inventory('public');
const total = [...files.values()].reduce((sum, file) => sum + file.bytes, 0);
assert(total <= 200 * MiB, 'Public assets exceed the 200 MiB project budget');

for (const record of manifest.images) {
  const file = files.get(record.destination);
  assert(file, `Missing optimized image: ${record.destination}`);
  assert.equal(file.bytes, record.bytes, `Image size changed: ${record.destination}`);
  assert.equal(file.fileHash, record.fileHash, `Image file changed: ${record.destination}`);
  const image = sharp(path.join('public', record.destination));
  const metadata = await image.metadata();
  assert.equal(metadata.width, record.width, `Width changed: ${record.destination}`);
  assert.equal(metadata.height, record.height, `Height changed: ${record.destination}`);
  const pixels = await image.ensureAlpha().raw().toBuffer();
  assert.equal(hash(pixels), record.pixelHash, `Decoded pixels changed: ${record.destination}`);
}

for (const record of manifest.videos) {
  const file = files.get(record.destination);
  assert(file, `Missing optimized video: ${record.destination}`);
  assert.equal(file.bytes, record.bytes, `Video size changed: ${record.destination}`);
  assert.equal(file.fileHash, record.fileHash, `Video changed: ${record.destination}`);
  assert(record.quality.framesCompared > 0 && record.quality.meanSSIM >= 0.999,
    `Missing high-quality encode verification: ${record.destination}`);
}

const sources = new Set();
for (const { source, destination } of manifest.aliases) {
  assert(!sources.has(source), `Duplicate alias: ${source}`);
  assert(source !== destination && !files.has(source), `Alias shadows an asset: ${source}`);
  assert(files.has(destination), `Alias target missing: ${destination}`);
  sources.add(source);
}

console.log(`Media verified: ${files.size} files, ${(total / 1e6).toFixed(2)} MB / 200 MiB budget.`);
console.log(`${manifest.images.length} pixel-exact images; ${manifest.videos.length} verified video encodes; ${sources.size} working alias targets.`);
for (const [type, bytes] of [...byType].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type}: ${(bytes / 1e6).toFixed(2)} MB`);
}
console.log(`${((manifest.beforeBytes - total) / 1e6).toFixed(2)} MB saved (${((1 - total / manifest.beforeBytes) * 100).toFixed(1)}%).`);
