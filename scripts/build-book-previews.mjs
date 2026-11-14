// Rebuild after changing a book's art. Every sheet fits a 2048px texture.
import { createHash } from "node:crypto";
import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import sharp from "sharp";

const books = new URL("../public/books/", import.meta.url);
const manifest = new URL("../src/app/3d/_books/book-art-manifest.json", import.meta.url);
const limit = 2048;
const gutter = 6;
// The oblique opening shot exposes enough of the printed boards to read headlines.
const coverWidth = 218;
const coverHeight = 300;
const spineHeight = 864;
const files = await readdir(books);
const ids = files.filter(name => name.endsWith("-spine.webp"))
  .map(name => name.slice(0, -"-spine.webp".length)).sort();
if (!ids.length) throw new Error("No book art found");

function versionedURL(filename, bytes) {
  return `/books/${filename}?v=${createHash("sha256").update(bytes).digest("hex").slice(0, 12)}`;
}

async function tile(bytes, width, height) {
  return sharp(bytes).resize(width, height, { fit: "fill" })
    .extend({ top: gutter, right: gutter, bottom: gutter, left: gutter, extendWith: "copy" })
    .png().toBuffer();
}

function newSheet() { return { width: 0, height: 0, parts: [] }; }
const covers = [];
const spines = [];
const editions = {};
const cellWidth = coverWidth + 2 * gutter;
const cellHeight = coverHeight + 2 * gutter;
const columns = Math.floor(limit / cellWidth);
const pairsPerSheet = columns * Math.floor(limit / (2 * cellHeight));
let strip = newSheet();
let spineX = 0, spineY = 0;
spines.push(strip);

for (const [index, id] of ids.entries()) {
  const coverSheet = Math.floor(index / pairsPerSheet);
  const pair = index % pairsPerSheet;
  const left = (pair % columns) * cellWidth;
  const top = Math.floor(pair / columns) * 2 * cellHeight;
  const cover = covers[coverSheet] ??= newSheet();
  const entry = {};
  editions[id] = entry;
  for (const [row, side] of ["front", "back", "spine"].entries()) {
    const name = side === "front" ? `${id}.webp` : `${id}-${side}.webp`;
    const bytes = await readFile(new URL(name, books));
    entry[side] = versionedURL(name, bytes);
    if (side === "spine") {
      const { width, height } = await sharp(bytes).metadata();
      const w = Math.max(1, Math.round(width / height * spineHeight));
      const packedWidth = w + 2 * gutter, packedHeight = spineHeight + 2 * gutter;
      if (packedWidth > limit) throw new Error(`${name} is too wide to be a book spine`);
      if (spineX + packedWidth > limit) { spineX = 0; spineY += packedHeight; }
      if (spineY + packedHeight > limit) {
        strip = newSheet();
        spines.push(strip);
        spineX = spineY = 0;
      }
      entry.spineTile = { sheet: spines.length - 1, x: spineX + gutter, y: spineY + gutter, w, h: spineHeight };
      strip.parts.push({ input: await tile(bytes, w, spineHeight), left: spineX, top: spineY });
      spineX += packedWidth;
      strip.width = Math.max(strip.width, spineX);
      strip.height = spineY + packedHeight;
    } else {
      const y = top + row * cellHeight;
      entry[side + "Tile"] = { sheet: coverSheet, x: left + gutter, y: y + gutter, w: coverWidth, h: coverHeight };
      cover.parts.push({ input: await tile(bytes, coverWidth, coverHeight), left, top: y });
      cover.width = Math.max(cover.width, left + cellWidth);
      cover.height = Math.max(cover.height, y + cellHeight);
    }
  }
}

async function writeSheet({ width, height, parts }, filename, quality) {
  const bytes = await sharp({ create: { width, height, channels: 3, background: "#f8f7f4" } })
    .composite(parts).webp({ quality, smartSubsample: true, effort: 6 }).toBuffer();
  await writeFile(new URL(filename, books), bytes);
  return { url: versionedURL(filename, bytes), width, height };
}

const coverSheets = await Promise.all(covers.map((sheet, i) =>
  writeSheet(sheet, i === 0 ? "shelf-preview.webp" : `shelf-preview-${i}.webp`, 85)));
const spineSheets = await Promise.all(spines.map((sheet, i) =>
  writeSheet(sheet, `shelf-spines-${i}.webp`, 91)));
await writeFile(manifest, JSON.stringify({ coverSheets, spineSheets, editions }, null, 2) + "\n");
const generated = new Set([...coverSheets, ...spineSheets].map(sheet => sheet.url.split("?")[0].slice("/books/".length)));
for (const name of files) {
  if (/^shelf-(?:preview(?:-\d+)?|spines-\d+)\.webp$/.test(name) && !generated.has(name)) {
    await unlink(new URL(name, books));
  }
}
console.log(`Packed ${ids.length} books into ${coverSheets.length} cover and ${spineSheets.length} spine sheets.`);
