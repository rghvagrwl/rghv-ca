import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { issues } from "../src/app/3d/(studies)/comics/catalog.ts";

// Run with Node 22.18+ after changing the shelf order or artwork.
const root = new URL("../public/3d/comics/", import.meta.url);
const columns = 4, perSheet = 16;
const width = 320, height = 496, gutter = 4;
const sheets = [];
for (let start = 0; start < issues.length; start += perSheet) {
  const group = issues.slice(start, start + perSheet);
  const rows = Math.ceil(group.length / columns);
  const version = createHash("sha256");
  for (const side of ["front", "back"]) {
    const scale = side === "front" ? 1 : 0.5;
    const tileWidth = width * scale, tileHeight = height * scale, pad = gutter * scale;
    const cellWidth = tileWidth + 2 * pad, cellHeight = tileHeight + 2 * pad;
    const tiles = [];
    for (const [index, issue] of group.entries()) {
      const path = new URL(issue.slug + (side === "back" ? "-back.webp" : ".webp"), root);
      const tile = await sharp(fileURLToPath(path)).resize(tileWidth, tileHeight, { fit: "fill" })
        .extend({ top: pad, bottom: pad, left: pad, right: pad, extendWith: "copy" }).png().toBuffer();
      tiles.push({ input: tile, left: (index % columns) * cellWidth, top: Math.floor(index / columns) * cellHeight });
    }
    const output = await sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 3, background: "#444" } })
      .composite(tiles).webp({ quality: side === "front" ? 85 : 78, effort: 6 }).toBuffer();
    version.update(output);
    await writeFile(new URL(`shelf-${side}${sheets.length || ""}.webp`, root), output);
  }
  sheets.push({ rows, version: version.digest("hex").slice(0, 12) });
}
const destination = new URL("../src/app/3d/(studies)/comics/print-atlas.json", import.meta.url);
await writeFile(destination, JSON.stringify({ perSheet, columns, width, height, gutter, sheets }, null, 2) + "\n");
