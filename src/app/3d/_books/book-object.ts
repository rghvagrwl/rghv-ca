import * as THREE from "three";
import type { Edition } from "./editions";

type Point = [number, number, number];
type UV = [number, number];
type Material = THREE.MeshStandardMaterial;
const ends = [0, 1];
const steps = (count: number) => Array.from({ length: count + 1 }, (_, i) => i / count);
const lerp = THREE.MathUtils.lerp;
const unitUV = (u: number, v: number): UV => [u, v];
const ownedTextures = new WeakMap<THREE.Group, THREE.Texture[]>();
// A glued paperback has creased corners. Cloth over a sewn text block
// has a rounder back, while a jacket breaks over the boards at its folds.
const spineProfiles = {
  paperback: { crown: 0.010, fold: 0.0035, turn: 0.0014 },
  swiss: { crown: 0.025, fold: 0.007, turn: 0.003 },
  jacket: { crown: 0.075, fold: 0.012, turn: 0.004 },
  case: { crown: 0.055, fold: 0.014, turn: 0.0045 },
  cloth: { crown: 0.105, fold: 0.018, turn: 0.006 },
} as const;

// Append independent parametric patches to a material's single draw call.
// uv carries the printing; uv1 measures the grain in physical units so the
// same cloth has the same thread count on the wide cover and the narrow spine.
class Patches {
  positions: number[] = [];
  colorsUV: number[] = [];
  grainUV: number[] = [];
  indices: number[] = [];

  add(us: number[], vs: number[], position: (u: number, v: number) => Point,
      width: number, height: number, reverse = false, uv = unitUV) {
    const start = this.positions.length / 3;
    for (const v of vs) {
      for (const u of us) {
        this.positions.push(...position(u, v));
        this.colorsUV.push(...uv(u, v));
        this.grainUV.push(u * width / 0.14, v * height / 0.14);
      }
    }
    for (let row = 0; row < vs.length - 1; row++) {
      for (let col = 0; col < us.length - 1; col++) {
        const a = start + row * us.length + col, b = a + 1, c = a + us.length, d = c + 1;
        if (reverse) this.indices.push(a, c, b, b, c, d);
        else this.indices.push(a, b, c, b, d, c);
      }
    }
  }

  geometry(normals?: number[]) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(this.colorsUV, 2));
    geometry.setAttribute("uv1", new THREE.Float32BufferAttribute(this.grainUV, 2));
    geometry.setIndex(this.indices);
    if (normals) geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    else geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

function noise(x: number, y: number) {
  let n = Math.imul(x + 37, 374761393) + Math.imul(y + 89, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function repeatTexture(data: Uint8Array<ArrayBuffer>, width: number, height: number, srgb = false) {
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function bitmap(width: number, height: number, pixel: (x: number, y: number) => number, srgb = false) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4, value = Math.round(pixel(x, y));
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return repeatTexture(data, width, height, srgb);
}

function surfaceGrain(linen: boolean) {
  // One repeat is 14 mm. Linen has larger, irregular yarns; the printed
  // buckram is more closely woven and its sizing fills the valleys.
  const size = 256;
  const warpCount = linen ? 20 : 36, weftCount = linen ? 18 : 32;
  const variation = linen ? 0.13 : 0.04;
  const yarnProfile = (count: number, width: number, seed: number) => Array.from({ length: size }, (_, p) => {
    const position = (p + 0.5) * count / size, thread = Math.floor(position);
    const d = 2 * (position % 1 - 0.5) / (width + variation * noise(thread, seed));
    return {
      height: Math.sqrt(Math.max(0, 1 - d * d)),
      lift: 0.32 * Math.cos(Math.PI * (position - 0.5)),
      direction: thread % 2 ? -1 : 1,
    };
  });
  const warp = yarnProfile(warpCount, 0.87, 2), weft = yarnProfile(weftCount, 0.84, 7);
  const heights = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    const row = weft[y];
    for (let x = 0; x < size; x++) {
      const column = warp[x];
      const over = column.height * (0.68 + row.lift * column.direction);
      const under = row.height * (0.68 - column.lift * row.direction);
      heights[y * size + x] = Math.round(56 + 145 * Math.max(over, under));
    }
  }
  return normalTexture(heights, size);
}

function normalTexture(heights: Uint8Array, size: number) {
  // Bake the height field into a tangent-space normal once. This keeps
  // thread relief independent of the camera distance and needs one sample.
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const row = y * size;
    const above = ((y + size - 1) % size) * size, below = ((y + 1) % size) * size;
    for (let x = 0; x < size; x++) {
      const dx = (heights[row + (x + size - 1) % size] - heights[row + (x + 1) % size]) * (2 / 255);
      const dy = (heights[above + x] - heights[below + x]) * (2 / 255);
      const length = Math.sqrt(dx * dx + dy * dy + 1);
      const i = 4 * (row + x);
      pixels[i] = Math.round(127.5 * (1 + dx / length));
      pixels[i + 1] = Math.round(127.5 * (1 + dy / length));
      pixels[i + 2] = Math.round(127.5 * (1 + 1 / length));
      pixels[i + 3] = 255;
    }
  }
  const tex = repeatTexture(pixels, size, size);
  tex.channel = 1;
  return tex;
}

function paperTooth() {
  // On a 14 mm tile, short overlapping fibres give the light something to
  // catch at inspection distance. Mipmaps average them away on the shelf.
  const size = 128;
  const heights = new Uint8Array(size * size);
  const grain = (x: number, y: number) => noise((x + size) % size, (y + size) % size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fibre = grain(x - 1, y) + 2 * grain(x, y) + grain(x + 1, y);
      heights[y * size + x] = 60 + fibre * 32 + grain(x, y - 1) * 25;
    }
  }
  return normalTexture(heights, size);
}

export function createBookGrains() {
  // A shared strip of paper edges, repeated once per 32 leaves on a book
  // head. The final texel row is white for the matching board-edge vertices.
  const shelfLeaves = bitmap(256, 8, (x, y) => {
    if (y === 7) return 255;
    const leaf = Math.floor(x / 8);
    return 239 + 8 * noise(leaf, y >> 2) - (x % 8 < 2 ? 14 : 0) - (x % 128 < 5 ? 11 : 0);
  }, true);
  shelfLeaves.wrapT = THREE.ClampToEdgeWrapping;
  return { linen: surfaceGrain(true), buckram: surfaceGrain(false), paper: paperTooth(), shelfLeaves };
}

function leafEdges(pageCount: number) {
  // Edge grain is indexed by actual leaves, not by the book's height.
  // Small cut and fold differences persist across each leaf. Mipmapping
  // integrates several paper layers per pixel when the shelf is at a distance.
  const leaves = Math.round(pageCount / 2);
  const width = 2048, height = 64;
  const leafAt = new Uint16Array(width), tone = new Float64Array(width);
  for (let x = 0; x < width; x++) {
    const sheet = (x + 0.5) * leaves / width;
    const leaf = Math.floor(sheet), signature = Math.floor(leaf / 8);
    const seam = Math.exp(-Math.pow((sheet % 1 - 0.18) / 0.15, 2));
    const sectionSeam = Math.exp(-Math.pow((sheet % 8 - 0.28) / 0.37, 2));
    leafAt[x] = leaf;
    tone[x] = 242 + 6 * noise(leaf, 3) + 5 * noise(signature, 11) - 18 * seam - 19 * sectionSeam;
  }
  // One wave per leaf. Combine the leaf phase and row phase instead of
  // reevaluating the sine at every pixel of the same sheet.
  const phaseSin = new Float64Array(leaves), phaseCos = new Float64Array(leaves);
  for (let leaf = 0; leaf < leaves; leaf++) {
    const phase = 2 * Math.PI * noise(leaf, 9);
    phaseSin[leaf] = 1.8 * Math.sin(phase);
    phaseCos[leaf] = 1.8 * Math.cos(phase);
  }
  const data = new Uint8Array(width * height * 4), fiber = new Float64Array(leaves);
  for (let y = 0; y < height; y++) {
    const phase = 2 * Math.PI * y / height, s = Math.sin(phase), c = Math.cos(phase);
    for (let leaf = 0; leaf < leaves; leaf++) fiber[leaf] = phaseSin[leaf] * c + phaseCos[leaf] * s;
    for (let x = 0; x < width; x++) {
      const i = 4 * (y * width + x), value = Math.round(tone[x] + fiber[leafAt[x]]);
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return repeatTexture(data, width, height, true);
}

function addCopperFoil(material: THREE.MeshPhysicalMaterial) {
  // Use the already-filtered cover texel as a spot-color separation. The
  // metallic lettering has a stronger green component than the red swoosh;
  // whites, blacks, and the jacket reverse keep their paper finish.
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <metalnessmap_fragment>", `
      #include <metalnessmap_fragment>
      float warmRange = diffuseColor.r - diffuseColor.b;
      float goldHue = (diffuseColor.g - diffuseColor.b) / max(warmRange, 0.0001);
      float foil = smoothstep(0.20, 0.34, goldHue) * smoothstep(0.025, 0.095, warmRange);
      roughnessFactor = mix(roughnessFactor, 0.34, foil);
      metalnessFactor = 0.69 * foil;
    `);
  };
  material.customProgramCacheKey = () => "shoe-dog-copper";
}

export function setBookOverview(model: THREE.Group, visible: boolean) {
  const shell = model.getObjectByName("Shelf case");
  if (shell) shell.visible = visible;
}

// The opening shot needs real cover faces and pages on the entire row.
// The simpler case is hidden once the camera sees the spines straight on.
export function buildBook(edition: Edition, front: THREE.Texture, spine: THREE.Texture, back: THREE.Texture,
    grains: ReturnType<typeof createBookGrains>, spineOnly = false) {
  // Local dimensions are in decimeters, with the board faces normal to Z.
  const w = edition.width / 100, h = edition.height / 100, t = edition.thickness / 100;
  const swiss = edition.binding === "swiss", jacket = edition.binding === "jacket", linen = edition.binding === "cloth";
  const soft = edition.binding === "paperback";
  const board = soft ? 0.004 : Math.min(t * 0.11, swiss ? 0.025 : 0.020);
  const profile = spineProfiles[edition.binding];
  const foldWidth = Math.min(profile.fold, t * 0.11);
  const halfCore = t / 2 - foldWidth, crown = t * profile.crown;
  const jointAngle = Math.atan(2 * crown / halfCore);
  const foldRadius = foldWidth / (1 - Math.sin(jointAngle));
  const shoulder = crown + foldRadius * Math.cos(jointAngle);
  const left = -w / 2 + shoulder, right = w / 2, span = right - left;
  const grain = linen ? grains.linen : swiss ? grains.buckram : grains.paper;
  const relief = linen ? 0.46 : swiss ? 0.17 : jacket ? 0.07 : 0.16;
  const cover = (map?: THREE.Texture) => {
    const material = new THREE.MeshPhysicalMaterial({
      name: map ? "Printed cover" : "Wrapped board",
      color: map ? "#ffffff" : edition.stock, map: map ?? null,
      roughness: linen ? 0.88 : swiss ? 0.76 : jacket ? 0.51 : soft ? 0.78 : 0.65,
      normalMap: grain, normalScale: new THREE.Vector2(relief, relief),
      ior: 1.46, specularIntensity: jacket ? 0.76 : 0.40,
      clearcoat: jacket ? 0.15 : 0, clearcoatRoughness: 0.36,
      sheen: linen ? 0.15 : swiss ? 0.065 : 0, sheenColor: edition.stock, sheenRoughness: 0.88,
    });
    if (edition.id === "shoe-dog" && (map === front || map === spine)) addCopperFoil(material);
    return material;
  };
  const radius = soft ? 0.005 : 0.012;
  // Measure the print partly around the fold, so the edge ink follows the
  // binding around its corners without stretching. The roundover is tangent
  // to both the crowned back and the adjoining boards.
  const halfPi = Math.PI / 2;
  const joint = halfCore / (halfCore + foldRadius * (halfPi - jointAngle));
  const halfSpine = [...steps(8).map(u => joint * u), ...steps(5).slice(1).map(u => lerp(joint, 1, u))];
  const curvedSpine = [
    ...halfSpine.slice(1).reverse().map(u => (1 - u) / 2), ...halfSpine.map(u => (1 + u) / 2),
  ];
  const spineSection = (u: number) => {
    const a = Math.abs(2 * u - 1), sign = Math.sign(u - 0.5);
    const core = Math.min(1, a / joint);
    const angle = a <= joint ? Math.atan(2 * crown * core / halfCore)
      : lerp(jointAngle, halfPi, (a - joint) / (1 - joint));
    const intoFold = a > joint;
    return {
      x: -w / 2 + crown * core * core + (intoFold ? foldRadius * (Math.cos(jointAngle) - Math.cos(angle)) : 0),
      z: sign * (halfCore * core + (intoFold ? foldRadius * (Math.sin(angle) - Math.sin(jointAngle)) : 0)),
      nx: -Math.cos(angle), nz: sign * Math.sin(angle),
    };
  };
  const endAngle = (v: number) => Math.asin(Math.max(0, 1 - Math.min(v, 1 - v) * h / profile.turn));
  const margin = profile.turn / h;
  const capRows = [0, margin * (1 - Math.sin(Math.PI / 3)), margin * 0.5, margin];
  const spineRows = [...capRows, ...(jacket ? [0.2, 0.4, 0.6, 0.8] : []), ...capRows.map(v => 1 - v).reverse()];
  const sections = new Map(curvedSpine.map(u => [u, spineSection(u)]));
  const coverRoll = (v: number) => profile.turn * (1 - Math.cos(endAngle(v)));
  const wrap = Math.min(board * 0.45, (foldRadius - profile.turn) * 0.8);
  const jacketPhase = noise(edition.pages, Math.round(w * 100)) * Math.PI;
  const spinePoint = (u: number, v: number, inside = 0, normals?: number[]): Point => {
    const p = sections.get(u)!;
    const inset = coverRoll(v) + inside * wrap;
    let x = p.x - p.nx * inset;
    const cap = endAngle(v);
    const nx = p.nx * Math.cos(cap);
    let ny = Math.sign(v - 0.5) * Math.sin(cap), nz = p.nz * Math.cos(cap);
    if (jacket && Math.abs(p.z) < halfCore && v > margin && v < 1 - margin) {
      // A loose jacket can lift slightly between its folded shoulders. The
      // bow and its slope both vanish at the shoulders and the trimmed ends.
      const s = p.z / halfCore, envelope = 1 - s * s;
      const phase = Math.PI * v, wave = 2 * phase + jacketPhase + s * 0.8;
      const longitudinal = Math.sin(phase) ** 2, amplitude = 0.005;
      const crest = 0.5 + 0.5 * Math.sin(wave);
      const offset = amplitude * envelope * envelope * longitudinal;
      x -= offset * crest;
      const slopeZ = amplitude * longitudinal * envelope / halfCore *
        (-4 * s * crest + envelope * 0.4 * Math.cos(wave));
      const slopeY = amplitude * envelope * envelope * Math.PI / h *
        (Math.sin(2 * phase) * crest + longitudinal * Math.cos(wave));
      ny += nx * slopeY;
      nz += nx * slopeZ;
    }
    if (normals) {
      const length = Math.hypot(nx, ny, nz);
      normals.push(nx / length, ny / length, nz / length);
    }
    return [x, (v - 0.5) * h, p.z - p.nz * inset];
  };
  const printedSpine = new Patches();
  // Analytic normals keep grazing reflections continuous from the crown
  // into the shoulders and across the tiny turn-in at the head and tail.
  const spineNormals: number[] = [];
  printedSpine.add(curvedSpine, spineRows, (u, v) => spinePoint(u, v, 0, spineNormals), t, h);
  // Keep the visible cut edge batched into the same draw and stretch only
  // the final texel over it, so the head and tail retain their printed wrap.
  for (const v of ends) {
    printedSpine.add(curvedSpine, ends, (u, inside) => {
      spineNormals.push(0, v === 0 ? -1 : 1, 0);
      return spinePoint(u, v, inside);
    }, t, wrap, v === 0, u => [u, v]);
  }
  const ink = cover(spine);
  const group = new THREE.Group();
  group.name = edition.id;
  group.add(new THREE.Mesh(printedSpine.geometry(spineNormals), ink));
  const pageDepth = t - 2 * (board + (soft ? 0.0008 : 0.004));
  const pageHeight = h - (soft ? 0.005 : swiss ? 0.043 : 0.052);
  const signatures = Math.ceil(edition.pages / 16);
  const fold = (u: number) => 0.5 - 0.5 * Math.cos(u * signatures * Math.PI * 2);
  const blockLeft = (u: number) => -w / 2 + (swiss ? 0.028 : 0.024)
    + shoulder * Math.pow(2 * u - 1, 2) + (swiss ? 0.007 * fold(u) : 0);
  const blockRight = (u: number) => w / 2 - (soft ? 0.0025 : 0.023) - (swiss || soft ? 0.002 : 0.013) * (1 - Math.pow(2 * u - 1, 2)) - 0.0018 * fold(u);
  const zAt = (u: number) => pageDepth * (u - 0.5);
  if (spineOnly) {
    const shell = new THREE.Group();
    shell.name = "Shelf case";
    const block = new Patches();
    const at = (x: number, y: number, z: number): Point => [
      lerp(blockLeft(z), blockRight(z), x), (y - 0.5) * pageHeight, zAt(z),
    ];
    const head = new Patches();
    const whiteRow = (): UV => [0.5, 7.5 / 8];
    const headUV = (u: number, x: number): UV => [u * Math.round(edition.pages / 2) / 32, (1 + 4 * x) / 8];
    head.add(steps(12), ends, (z, x) => at(x, 1, z), pageDepth, span, false, headUV);
    const paperVertices = head.positions.length / 3;
    block.add(steps(6), ends, (z, x) => at(x, 0, z), pageDepth, span, true);
    block.add(ends, ends, (z, y) => at(1, y, z), pageDepth, pageHeight, true);
    shell.add(new THREE.Mesh(block.geometry(), new THREE.MeshStandardMaterial({
      name: "Shelved page block", color: edition.paper, roughness: 0.96,
    })));
    for (const sign of [-1, 1]) {
      const face = new Patches();
      const z = sign * t / 2;
      const outerZ = (u: number, v: number) => z - sign * (1 - u) * coverRoll(v);
      face.add(ends, spineRows, (u, v) => [lerp(left, right, u), (v - 0.5) * h, outerZ(u, v)],
        span, h, sign < 0, (u, v) => [sign > 0 ? u : 1 - u, v]);
      // The thin rolled head, tail and fore edge carry the jacket color.
      face.add(ends, ends, (u, b) => [lerp(left, right, u), -h / 2, lerp(outerZ(u, 0), z - sign * board, b)],
        span, board, sign > 0, u => [sign > 0 ? u : 1 - u, 0]);
      head.add(ends, ends, (u, b) => [lerp(left, right, u), h / 2, lerp(outerZ(u, 1), z - sign * board, b)],
        span, board, sign < 0, whiteRow);
      face.add(ends, ends, (b, v) => [right, (v - 0.5) * h, z - sign * board * b],
        board, h, sign < 0, (_, v) => [sign > 0 ? 1 : 0, v]);
      shell.add(new THREE.Mesh(face.geometry(), cover(sign > 0 ? front : back)));
    }
    // Keep the recessed paper and projecting boards together in a single
    // draw. The same head stays visible when the flyover faces are hidden.
    const geometry = head.geometry();
    const paperColor = new THREE.Color(edition.paper), boardColor = new THREE.Color(edition.stock);
    const colors: number[] = [];
    for (let i = 0; i < head.positions.length / 3; i++) {
      const color = i < paperVertices ? paperColor : boardColor;
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    group.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      name: "Shelved head", map: grains.shelfLeaves, vertexColors: true, roughness: 0.93,
    })));
    shell.visible = false;
    group.add(shell);
    return group;
  }
  const leaves = leafEdges(edition.pages);
  const boardMaterial = cover();
  const paper = new THREE.MeshStandardMaterial({ name: "Cut leaves", color: edition.paper, map: leaves, roughness: 0.96 });
  const endpaper = new THREE.MeshStandardMaterial({ name: "Pasted endpaper", color: edition.paper, roughness: 0.95 });
  const jacketInside = jacket ? new THREE.MeshStandardMaterial({ name: "Jacket reverse", color: "#e9e5d9", roughness: 0.89 }) : endpaper;
  const patches = new Map<Material, Patches>();
  const batch = (material: Material) => {
    let result = patches.get(material);
    if (!result) { result = new Patches(); patches.set(material, result); }
    return result;
  };

  // The shallow case joint is pressed into the cover next to its spine.
  // More columns through the joint and rolled edges keep the raking highlight continuous.
  const pageColumns = soft ? steps(16) : ends;
  const across = Array.from(new Set([
    0, 0.15 * radius / span, 0.5 * radius / span, radius / span,
    ...steps(20).map(u => (radius + 0.14 * u) / span), ...(soft ? pageColumns : [0.35, 0.7]),
    1 - radius / span, 1 - 0.5 * radius / span, 1 - 0.15 * radius / span, 1,
  ])).sort((a, b) => a - b);
  const middleRows = [0.21, 0.5, 0.76];
  const along = [...capRows, ...middleRows, ...capRows.map(v => 1 - v).reverse()];
  const pageRows = soft ? [0, ...middleRows, 1] : ends;
  const halfHeight = (u: number) => {
    const dx = Math.max(0, radius - (1 - u) * span);
    return h / 2 - radius + Math.sqrt(Math.max(0, radius * radius - dx * dx));
  };
  const hinge = (u: number) => (soft ? 0.0015 : jacket ? 0.0037 : 0.0085) *
    Math.exp(-Math.pow((u * span - (swiss ? 0.090 : 0.058)) / (jacket ? 0.031 : 0.020), 2));
  for (const sign of [-1, 1]) {
    const outer = sign > 0 ? cover(front) : back ? cover(back) : boardMaterial;
    const face = (u: number, v: number, outside: boolean): Point => {
      const margin = Math.min(u * span, (1 - u) * span, v * h, (1 - v) * h);
      const roll = (soft ? 0.0005 : 0.003) * Math.pow(Math.max(0, 1 - margin / 0.006), 2);
      const jacketDip = jacket ? 0.0026 * Math.sin(Math.PI * v) *
        Math.exp(-Math.pow((u * span - 0.092 - 0.017 * Math.sin(6 * v)) / 0.084, 2)) : 0;
      const jointBlend = THREE.MathUtils.smoothstep(u * span, 0, 0.024);
      const z = outside ? t / 2 - lerp(coverRoll(v), hinge(u) + jacketDip + roll, jointBlend) : t / 2 - board + roll * 0.45;
      return [left + u * span, (2 * v - 1) * halfHeight(u), sign * z];
    };
    batch(outer).add(across, along, (u, v) => face(u, v, true), span, h, sign < 0,
      (u, v) => [sign > 0 ? u : 1 - u, v]);
    batch(endpaper).add(across, soft ? along : ends, (u, v) => face(u, v, false), span, h, sign > 0);
    for (const v of ends) {
      batch(boardMaterial).add(across, ends, (u, inset) => face(u, v, inset === 0),
        span, board, (v === 0) === (sign > 0));
    }
    for (const u of ends) {
      batch(jacket && u === 1 ? jacketInside : boardMaterial).add(ends, along,
        (inset, v) => face(u, v, inset === 0), board, h, (u === 0) === (sign > 0));
    }
    if (jacket) {
      // Jacket flaps turn around the board's fore-edge and return inside
      // the cover; the thin lip can be seen between board and text block.
      batch(jacketInside).add(ends, ends, (u, v) => {
        const p = face(lerp(0.65, 0.999, u), v, false);
        return [p[0], p[1] * 0.9985, p[2] - sign * 0.0015];
      }, span * 0.35, h, sign > 0);
    }
  }

  batch(boardMaterial).add(curvedSpine, ends, (u, v) => spinePoint(u, v, 1), t, h, true);

  const paperSections = steps(Math.max(48, signatures * 4));
  // Use the cover's physical x columns inside the block. Only the first
  // and last columns follow the cut of each signature at its two edges.
  const pageX = (u: number, x: number) => {
    if (x === 0) return blockLeft(u);
    if (x === 1) return blockRight(u);
    return left + x * span;
  };
  const paperHalfHeight = (u: number) => pageHeight / 2 - 0.0008 * fold(u);
  for (const sign of [-1, 1]) {
    batch(paper).add(paperSections, pageColumns, (u, x) => [pageX(u, x),
      sign * paperHalfHeight(u), zAt(u)], pageDepth, w, sign < 0);
  }
  for (const edge of [blockLeft, blockRight]) {
    batch(paper).add(paperSections, pageRows, (u, v) => [edge(u),
      soft ? (2 * v - 1) * paperHalfHeight(u) : (v - 0.5) * pageHeight, zAt(u)],
      pageDepth, h, edge === blockRight);
  }
  for (const u of ends) {
    batch(endpaper).add(pageColumns, pageRows, (x, y) => [pageX(u, x),
      (y - 0.5) * pageHeight, zAt(u)], w, h, u === 0);
  }

  const textures = [leaves];
  if (!swiss && !soft) {
    const stitch = bitmap(64, 8, x => (x < 30 ? 158 : 239) + 6 * Math.sin(x * Math.PI / 4), true);
    textures.push(stitch);
    const headband = new THREE.MeshStandardMaterial({ name: "Woven endbands", color: edition.paper, map: stitch, roughness: 0.89 });
    for (const sign of [-1, 1]) {
      batch(headband).add(steps(24), steps(12), (u, v) => {
        const angle = v * Math.PI * 2;
        return [blockLeft(u) + 0.005 + Math.cos(angle) * 0.006,
          sign * (pageHeight / 2 + 0.001 + Math.sin(angle) * 0.006), zAt(u)];
      }, pageDepth, 0.038, sign > 0, (u, v) => [u * pageDepth / 0.014, v]);
    }
  }

  ownedTextures.set(group, textures);
  for (const [material, patchesForMaterial] of patches) {
    const mesh = new THREE.Mesh(patchesForMaterial.geometry(), material);
    group.add(mesh);
  }
  return group;
}

export function disposeBook(group: THREE.Group) {
  group.traverse(object => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    }
  });
  for (const texture of ownedTextures.get(group) ?? []) texture.dispose();
  ownedTextures.delete(group);
}
