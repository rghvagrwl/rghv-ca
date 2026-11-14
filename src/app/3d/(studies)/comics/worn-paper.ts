import * as THREE from "three";
import type { Issue } from "./catalog";
import type { ScanCondition } from "./scan-condition";

type Point = readonly [number, number];
const turn = Math.PI * 2;

// Intersect a ray from the center with the first paper boundary. On a tear with
// a slight overhang this chooses the inner lip, keeping the scanner bed outside.
function radiusToTrim(dx: number, dy: number, outline: readonly Point[]) {
  let radius = 1;
  let previous = outline[outline.length - 1];
  for (const current of outline) {
    const x = previous[0] - 0.5, y = previous[1] - 0.5;
    const ex = current[0] - previous[0], ey = current[1] - previous[1];
    const cross = dx * ey - dy * ex;
    if (Math.abs(cross) > 1e-9) {
      const t = (x * ey - y * ex) / cross;
      const s = (x * dy - y * dx) / cross;
      if (t > 0 && s >= -1e-7 && s <= 1 + 1e-7) radius = Math.min(radius, t);
    }
    previous = current;
  }
  return radius;
}

export function wornPaperGeometry(issue: Issue, condition: ScanCondition) {
  const { width, height, half } = issue;
  const { wear, front, back } = condition;
  // Use a common physical axis. The book's fore-edge is on the left in the back scan.
  const reverse = back.map(([x, y]): Point => [1 - x, y]);
  const angles = new Set<number>();
  for (let i = 0; i < 72; i++) angles.add(i * turn / 72);
  for (const [x, y] of [...front, ...reverse]) {
    angles.add((Math.atan2(y - 0.5, x - 0.5) + turn) % turn);
  }
  const sorted = Array.from(angles).sort((a, b) => a - b);
  const directions = sorted.filter((theta, i) => !i || theta - sorted[i - 1] > 0.00008);
  const bounds = directions.map(theta => {
    const dx = Math.cos(theta), dy = Math.sin(theta);
    const rect = 0.5 / Math.max(Math.abs(dx), Math.abs(dy));
    const f = radiusToTrim(dx, dy, front), b = radiusToTrim(dx, dy, reverse);
    const common = Math.min(f, b);
    return { dx, dy, f, b, common, loss: rect - common };
  });
  const n = bounds.length;
  const positions: number[] = [], uv: number[] = [], surfaces: number[] = [], indices: number[] = [];
  function vertex(x: number, y: number, z: number, u: number, v: number, face: number) {
    positions.push(x, y, z);
    uv.push(u, v);
    surfaces.push(face);
    return surfaces.length - 1;
  }
  // A turned corner and a compressed staple fold take a slight permanent set.
  // Keep the two sheets moving together and their highest points inside the bag.
  function setInPaper(x: number, y: number, loss: number, radial: number) {
    const topCorner = Math.max(0, 1 - 7 * (1 - x) - 4.2 * y);
    const footCorner = Math.max(0, 1 - 5.5 * (1 - x) - 6 * (1 - y));
    const cockle = Math.sin(37 * y + 9 * x) * Math.min(1, loss * 24) * radial ** 12;
    return wear * (0.008 * topCorner * topCorner - 0.006 * footCorner * footCorner + 0.0014 * cockle);
  }
  const rings = [0.16, 0.32, 0.48, 0.62, 0.74, 0.84, 0.91, 0.955, 0.98, 1];
  for (const side of [1, -1]) {
    const face = side > 0 ? 0 : 1;
    const center = vertex(0, 0, side * half, 0.5, 0.5, face);
    let last = center;
    for (const scale of rings) {
      const first = surfaces.length;
      for (const p of bounds) {
        const radius = scale * (side > 0 ? p.f : p.b);
        const x = 0.5 + radius * p.dx, y = 0.5 + radius * p.dy;
        vertex((x - 0.5) * width, (0.5 - y) * height,
          side * half + setInPaper(x, y, p.loss, scale), side > 0 ? x : 1 - x, 1 - y, face);
      }
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const a = last === center ? center : last + i;
        const b = first + i, c = first + j;
        if (side > 0) indices.push(a, c, b);
        else indices.push(a, b, c);
        if (last !== center) {
          if (side > 0) indices.push(a, last + j, c);
          else indices.push(a, c, last + j);
        }
      }
      last = first;
    }
  }

  // Bridge the actual front and reverse, including thin cover lips and several
  // slightly misregistered signatures between them. The fold carries printed ink.
  // Paired rings at each cover's underside leave the unsupported lip flat.
  // The rings in the middle follow the deeper of the two traced outlines.
  const depths = [1, 0.90, 0.90, 0.54, 0.10, -0.34, -0.90, -0.90, -1];
  function edgeCorner(i: number, k: number, perimeter: number, folded: boolean, frontFold: boolean) {
    const p = bounds[i], depth = depths[k];
    const coverLip = k < 2 || k >= depths.length - 2;
    const spineX = -p.dx / Math.max(Math.abs(p.dx), Math.abs(p.dy));
    const hinge = THREE.MathUtils.smoothstep(spineX, 0.965, 1) *
      (1 - THREE.MathUtils.smoothstep(Math.abs(p.f - p.b), 0.002, 0.009));
    let radius = depth > 0 ? p.f : p.b;
    if (!coverLip) {
      const torn = Math.min(1, p.loss * 27);
      const wander = Math.sin(65 * p.dx + 37 * p.dy + k * 2.2);
      const layerOffset = 0.0008 + 0.00045 * Math.sin(k * 2.4) + 0.00045 * wander;
      const cut = p.common + wear * (torn * 0.0007 * wander - layerOffset);
      const spine = THREE.MathUtils.lerp(p.b, p.f, 0.5 * (depth + 1)) + half / width * (1 - depth * depth);
      radius = THREE.MathUtils.lerp(cut, spine, hinge);
    }
    const x = 0.5 + radius * p.dx, y = 0.5 + radius * p.dy;
    // Sample the printed hinge just inside its traced silhouette, including
    // where the fold rounds slightly beyond the nominal flat cover.
    const inkRadius = (frontFold ? p.f : p.b) - 0.0007;
    const inkX = 0.5 + inkRadius * p.dx, inkY = 0.5 + inkRadius * p.dy;
    const lipSurface = folded ? (frontFold ? 0 : 1) : 2;
    return vertex((x - 0.5) * width, (0.5 - y) * height,
      half * depth + setInPaper(x, y, p.loss, 1),
      folded ? (frontFold ? inkX : 1 - inkX) : perimeter,
      folded ? 1 - inkY : (depth + 1) * 0.5, lipSurface);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, lastAngle = j === 0 ? turn : directions[j];
    const middle = (directions[i] + lastAngle) * 0.5;
    const folded = Math.cos(middle) < -Math.abs(Math.sin(middle)) &&
      Math.max(Math.abs(bounds[i].f - bounds[i].b), Math.abs(bounds[j].f - bounds[j].b)) < 0.009;
    for (let k = 0; k < depths.length - 1; k++) {
      const frontFold = depths[k] + depths[k + 1] >= 0;
      // The returned flap still has its own reverse of unprinted stock,
      // including alongside a tear in the inked hinge.
      const inked = folded && depths[k] !== depths[k + 1];
      const a = edgeCorner(i, k, directions[i] / turn, inked, frontFold);
      const b = edgeCorner(j, k, lastAngle / turn, inked, frontFold);
      const c = edgeCorner(j, k + 1, lastAngle / turn, inked, frontFold);
      const d = edgeCorner(i, k + 1, directions[i] / turn, inked, frontFold);
      indices.push(a, b, c, a, c, d);
    }
  }

  // Each saddle staple follows the real fold, including a copy with a receded spine.
  for (const midY of [-0.255 * height, 0.255 * height]) {
    const first = surfaces.length;
    for (let row = 0; row <= 6; row++) {
      const t = row / 6, y = midY + (t - 0.5) * 0.082;
      const line = Math.hypot(0.5, y / height), dx = -0.5 / line, dy = -y / height / line;
      const f = radiusToTrim(dx, dy, front), b = radiusToTrim(dx, dy, reverse);
      const hinge = 1 - THREE.MathUtils.smoothstep(Math.abs(f - b), 0.002, 0.009);
      const x = width * dx * THREE.MathUtils.lerp(Math.min(f, b), (f + b) / 2 + half / width, hinge);
      for (let col = 0; col <= 6; col++) {
        const a = -turn * col / 6;
        vertex(x - 0.0009 * Math.sin(Math.PI * t) + 0.0012 * Math.cos(a),
          y, 0.0012 * Math.sin(a), col / 6, t, 3);
        if (row < 6 && col < 6) {
          const index = first + row * 7 + col;
          indices.push(index, index + 1, index + 7, index + 1, index + 8, index + 7);
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute("surface", new THREE.Float32BufferAttribute(surfaces, 1));
  geometry.computeVertexNormals();
  return geometry;
}
