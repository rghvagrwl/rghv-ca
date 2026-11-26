import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile, copyFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Full-resolution, pixel-verified optimization. Photos and print scans are not re-encoded.
const manifestPath = 'src/lib/optimized-media.json';
const report = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{"aliases":[],"images":[]}'));
const archive = process.env.MEDIA_ORIGINALS_DIR ?? '/tmp/rghv-media-originals';
const hash = (data) => createHash('sha256').update(data).digest('hex');
const pixels = async (data) => hash(await sharp(data).ensureAlpha().raw().toBuffer());
async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(file)); else files.push(file);
  }
  return files;
}
async function preserve(file) {
  const destination = path.join(archive, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(file, destination);
}
const allFiles = await filesIn('public');
if (!report.beforeBytes) {
  report.beforeBytes = (await Promise.all(allFiles.map(async (file) => (await readFile(file)).length))).reduce((a, b) => a + b, 0);
}
await mkdir('public/media', { recursive: true });
const replacements = new Map();
// All eighteen generic work social previews contain identical bytes.
const canonical = await readFile('public/og/work.png');
for (const file of allFiles.filter((file) => /^public\/og\/work-.+\.png$/.test(file))) {
  if (!(await readFile(file)).equals(canonical)) continue;
  const source = file.slice('public'.length);
  replacements.set(source, '/og/work.png');
  report.aliases.push({ source, destination: '/og/work.png' });
  await preserve(file);
  await unlink(file);
}
for (const file of (await filesIn('public')).filter((file) => file.endsWith('.png'))) {
  const source = file.slice('public'.length);
  if (report.images.some((record) => record.destination === source)) continue;
  const original = await readFile(file);
  const metadata = await sharp(original).metadata();
  const pixelHash = await pixels(original);
  const protectedPNG = file.startsWith('public/og/') || file.startsWith('public/3d/');
  let optimized = await sharp(original).keepIccProfile().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  let destination = source;
  let kind = 'lossless-png';
  if (!protectedPNG) {
    const webp = await sharp(original).keepIccProfile().webp({ lossless: true, effort: 6 }).toBuffer();
    if (webp.length < optimized.length && await pixels(webp) === pixelHash) {
      optimized = webp;
      destination = `/media/${hash(webp).slice(0, 16)}.webp`;
      kind = 'lossless-webp';
    }
  }
  if (optimized.length >= original.length || await pixels(optimized) !== pixelHash) continue;
  await preserve(file);
  await writeFile(path.join('public', destination), optimized);
  if (source !== destination) {
    replacements.set(source, destination);
    report.aliases.push({ source, destination });
    await unlink(file);
  }
  report.images.push({ source, destination, kind, width: metadata.width, height: metadata.height, originalBytes: original.length, bytes: optimized.length, pixelHash, fileHash: hash(optimized) });
}
// Update actual URL references; retain aliases for cached pages and previously shared URLs.
for (const file of [...await filesIn('src'), ...await filesIn('scripts')]) {
  if (file === manifestPath || !/\.(tsx?|mjs|json|css)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  let updated = text;
  for (const [source, destination] of replacements) updated = updated.split(source).join(destination);
  if (updated !== text) await writeFile(file, updated);
}
await writeFile(manifestPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.images.length} losslessly optimized images; ${report.aliases.length} preserved URLs. Originals: ${archive}`);
