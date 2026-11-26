import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Import originals from outside public; only bounded, versioned WebP files ship.
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/prepare-capture-images.mjs /path/to/import.json');
const root = process.cwd();
const manifestPath = path.join(root, 'src/lib/capture-images.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{}'));
const entries = JSON.parse(await readFile(input, 'utf8'));
await mkdir(path.join(root, 'public/photo/captures'), { recursive: true });
let inputBytes = 0;
let outputBytes = 0;
for (const { id, source, alt } of entries) {
  const original = await readFile(source);
  inputBytes += original.length;
  const metadata = await sharp(original).rotate().metadata();
  const { width, height } = metadata.autoOrient ?? metadata;
  if (!width || !height || !alt) throw new Error(`Missing dimensions or alt text: ${id}`);
  const sources = [];
  for (const target of [192, 512, 1024]) {
    const { data, info } = await sharp(original).rotate()
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: target === 192 ? 74 : 82, effort: 6 })
      .toBuffer({ resolveWithObject: true });
    if (sources.some((variant) => variant.width === info.width)) continue;
    const hash = createHash('sha256').update(data).digest('hex').slice(0, 12);
    const src = `/photo/captures/${hash}-${info.width}.webp`;
    await writeFile(path.join(root, 'public', src), data);
    sources.push({ src, width: info.width, bytes: data.length });
    outputBytes += data.length;
  }
  manifest[id] = { width, height, alt, sources };
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ photos: entries.length, inputMB: inputBytes / 1e6, outputMB: outputBytes / 1e6 }, null, 2));
