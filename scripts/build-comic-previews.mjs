import { createHash } from "node:crypto";
import { readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Each folded cover returns to its true trim ratio on the mesh. Reverse previews
// only appear briefly during a turn while the selected issue's full scans load.
const root = new URL("../public/3d/comics/", import.meta.url);
const slugs = (await readdir(root))
  .filter(name => name.endsWith("-back.webp") && name !== "shelf-back.webp")
  .map(name => name.slice(0, -"-back.webp".length)).sort();
const columns = Math.ceil(Math.sqrt(slugs.length * 1.55));
const rows = Math.ceil(slugs.length / columns);
const width = 320, height = 496, gutter = 4;
const version = createHash("sha256");
for (const side of ["front", "back"]) {
  const scale = side === "front" ? 1 : 0.5;
  const tileWidth = width * scale, tileHeight = height * scale, pad = gutter * scale;
  const cellWidth = tileWidth + 2 * pad, cellHeight = tileHeight + 2 * pad;
  const tiles = [];
  for (const [index, slug] of slugs.entries()) {
    const path = new URL(slug + (side === "back" ? "-back.webp" : ".webp"), root);
    const tile = await sharp(fileURLToPath(path)).resize(tileWidth, tileHeight, { fit: "fill" })
      .extend({ top: pad, bottom: pad, left: pad, right: pad, extendWith: "copy" }).png().toBuffer();
    tiles.push({ input: tile, left: (index % columns) * cellWidth, top: Math.floor(index / columns) * cellHeight });
  }
  const output = await sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 3, background: "#444" } })
    .composite(tiles).webp({ quality: side === "front" ? 85 : 78, effort: 6 }).toBuffer();
  version.update(output);
  await writeFile(new URL(`shelf-${side}.webp`, root), output);
}
const destination = new URL("../src/app/3d/(studies)/comics/print-atlas.json", import.meta.url);
await writeFile(destination, JSON.stringify({ version: version.digest("hex").slice(0, 12), columns, rows, width, height, gutter, slugs }, null, 2) + "\n");
