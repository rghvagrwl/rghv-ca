import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const albums = JSON.parse(await readFile('src/lib/captures.json', 'utf8'));
const images = JSON.parse(await readFile('src/lib/capture-images.json', 'utf8'));
const used = new Set();
const referenced = new Set();
const slugs = new Set();
let bytes = 0;
for (const album of albums) {
  if (slugs.has(album.slug)) throw new Error(`Duplicate album slug: ${album.slug}`);
  slugs.add(album.slug);
  for (const id of album.images) {
    const image = images[id];
    if (!image?.alt || !image.width || !image.height || image.sources.length !== 3) throw new Error(`Incomplete image: ${id}`);
    if (used.has(id)) continue;
    used.add(id);
    let previousWidth = 0;
    for (const source of image.sources) {
      const data = await readFile(path.join('public', source.src));
      const metadata = await sharp(data).metadata();
      const hash = createHash('sha256').update(data).digest('hex').slice(0, 12);
      if (!source.src.endsWith(`/${hash}-${source.width}.webp`)) throw new Error(`Unversioned asset: ${source.src}`);
      if (data.length !== source.bytes || metadata.width !== source.width || metadata.format !== 'webp') throw new Error(`Stale asset metadata: ${source.src}`);
      if (source.width <= previousWidth || source.width > 1024 || Math.abs(metadata.width / metadata.height - image.width / image.height) > 0.01) throw new Error(`Invalid image dimensions: ${source.src}`);
      if (data.length > 512 * 1024) throw new Error(`Image exceeds 512 KiB budget: ${source.src}`);
      previousWidth = source.width;
      if (!referenced.has(source.src)) bytes += data.length;
      referenced.add(source.src);
    }
  }
}
for (const id of Object.keys(images)) {
  if (!used.has(id)) throw new Error(`Unused manifest entry: ${id}`);
}
for (const file of await readdir('public/photo/captures')) {
  if (!referenced.has(`/photo/captures/${file}`)) throw new Error(`Unused capture asset: ${file}. Remove stale variants before shipping.`);
}
if (bytes > 20 * 1024 * 1024) throw new Error('Captures exceed the 20 MiB library budget. Review before increasing it.');
console.log(`${albums.length} albums, ${used.size} photos, ${referenced.size} static variants: ${(bytes / 1e6).toFixed(2)} MB / 20 MiB budget.`);
