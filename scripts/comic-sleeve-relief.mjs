// Run with node scripts/comic-sleeve-relief.mjs. RGB stores the surface slopes and
// height; A encodes fine abrasion used only by handled sleeves.
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const width = 512, height = 784;
const bagWidth = 1.51, bagHeight = 2.31;
const maxHeight = 0.045, maxSlope = 1.25;
const heights = new Float32Array(width * height);
const clamp = value => Math.max(0, Math.min(1, value));
const fade = value => (value = clamp(value), value * value * (3 - 2 * value));

// Each crease has an origin at or near a welded edge and dies out toward the print.
// Coordinates are proportions of the sleeve. Breadth, lift and bow are scene units.
const creases = [
  // Broad, shallow buckles in the loose film carry streaks across larger areas.
  [0.01, 0.86, 0.95, 0.59, 0.062, 0.029, -0.115],
  [0.18, 0.00, 0.97, 0.44, 0.049, 0.023, 0.084],
  [0.00, 0.98, 0.29, 0.48, 0.036, 0.015, 0.038],
  [0.00, 0.94, 0.68, 0.69, 0.022, 0.0130, -0.037],
  [0.02, 0.93, 0.27, 0.71, 0.008, 0.0052, 0.024],
  [0.00, 0.65, 0.32, 0.55, 0.011, 0.0060, -0.014],
  [0.00, 0.12, 0.57, 0.32, 0.018, 0.0130, 0.041],
  [0.04, 0.14, 0.25, 0.31, 0.008, 0.0058, -0.014],
  [0.10, 0.00, 0.58, 0.51, 0.027, 0.0085, -0.092],
  [0.98, 1.00, 0.81, 0.65, 0.012, 0.0095, -0.037],
  [1.00, 0.94, 0.53, 0.81, 0.011, 0.0078, 0.026],
  [1.00, 0.49, 0.62, 0.27, 0.021, 0.0085, -0.039],
  [1.00, 0.22, 0.74, 0.14, 0.011, 0.0090, 0.010],
  [0.92, 0.00, 0.50, 0.20, 0.009, 0.0060, 0.030],
];
for (let i = 0; i < creases.length; i++) {
  const [ax, ay, bx, by, breadth, lift, bow] = creases[i];
  const dx = (bx-ax)*bagWidth, dy = (by-ay)*bagHeight;
  const length = Math.hypot(dx, dy);
  for (let row = 0; row < height; row++) {
    const y = (1 - row/(height-1) - ay) * bagHeight;
    for (let col = 0; col < width; col++) {
      const x = (col/(width-1) - ax) * bagWidth;
      const t = (x*dx + y*dy) / (length*length);
      if (t < 0 || t > 1) continue;
      const arch = 4*t*(1-t);
      const curve = bow*arch + breadth*0.33*Math.sin(9*t + i)*arch;
      const offset = (y*dx - x*dy)/length - curve;
      const radius = breadth * (0.5 + 0.65*Math.sin(Math.PI*t));
      const d = offset / radius;
      if (Math.abs(d) > 4) continue;
      heights[row*width+col] += lift * fade(t/0.06) * fade((1-t)/0.46) * Math.exp(-d*d);
    }
  }
}
const sample = (x,y) => heights[Math.max(0, Math.min(height-1,y))*width + Math.max(0, Math.min(width-1,x))];
// Short streaks left by repeated handling collect near corners and the mouth.
// Bake them once so the animated film needs no extra sampler or procedural noise.
let state = 1271993;
function random() {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 4294967296;
}
const abrasion = new Float32Array(width * height);
const patches = [
  // Center, patch spread and predominant scratch direction (image coordinates).
  [0.085, 0.15, 0.11, 0.15, 0.82], [0.93, 0.11, 0.085, 0.09, 1.12],
  [0.86, 0.94, 0.10, 0.08, -0.59], [0.03, 0.87, 0.05, 0.10, -1.21],
  [0.58, 0.036, 0.20, 0.035, 0.19],
];
for (const [cx, cy, spreadX, spreadY, direction] of patches) {
  for (let mark = 0; mark < 52; mark++) {
    const x = width * (cx + spreadX * (random() + random() - 1));
    const y = height * (cy + spreadY * (random() + random() - 1));
    const length = 3 + 41 * random() ** 2;
    const theta = direction + 0.9 * (random() - 0.5);
    const dx = Math.cos(theta), dy = Math.sin(theta);
    const curve = 0.13 * length * (random() - 0.5);
    const strength = 0.34 + 0.66 * random();
    for (let t = 0; t < length; t += 0.5) {
      const arc = 4 * t / length * (1 - t / length);
      const px = x + dx * t - dy * curve * arc;
      const py = y + dy * t + dx * curve * arc;
      for (let iy = Math.floor(py); iy <= Math.ceil(py); iy++) {
        for (let ix = Math.floor(px); ix <= Math.ceil(px); ix++) {
          if (iy < 0 || iy >= height || ix < 0 || ix >= width) continue;
          const coverage = Math.max(0, 1 - Math.hypot(ix - px, iy - py));
          const i = iy * width + ix;
          abrasion[i] = Math.max(abrasion[i], arc * coverage * strength);
        }
      }
    }
  }
}
const pixels = Buffer.alloc(width * height * 4);
for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
  const i=(y*width+x)*4;
  const gx=(sample(x+1,y)-sample(x-1,y))*(width-1)/(2*bagWidth);
  const gy=(sample(x,y-1)-sample(x,y+1))*(height-1)/(2*bagHeight);
  pixels[i]=Math.round(128 + Math.max(-1,Math.min(1,gx/maxSlope))*127);
  pixels[i+1]=Math.round(128 + Math.max(-1,Math.min(1,gy/maxSlope))*127);
  pixels[i+2]=Math.round(clamp(sample(x,y)/maxHeight)*255);
  // Stay nearly opaque so browser decoding retains the RGB relief data.
  pixels[i+3]=255-Math.round(abrasion[y*width+x]*63);
}
const path = fileURLToPath(new URL("../public/3d/comics/sleeve-relief.png", import.meta.url));
await sharp(pixels, {raw:{width,height,channels:4}}).png({compressionLevel:9}).toFile(path);
