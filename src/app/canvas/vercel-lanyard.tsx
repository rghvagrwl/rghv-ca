"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, events, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { BallCollider, CuboidCollider, Physics, RigidBody, useBeforePhysicsStep, useRopeJoint, useSphericalJoint, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TessellateModifier } from "three/addons/modifiers/TessellateModifier.js";
import styles from "./vercel-lanyard.module.css";

const MODEL = "/models/vercel-lanyard/tag.glb";
const BAND_SEGMENTS = 96;
const BAND_WIDTH = 0.27;
const STITCH_COUNT = 9;
// Center and axis of the GLB's upper crossbar, measured in rigid-body space.
const BAR_CENTER = new THREE.Vector3(0, 1.5532, -0.0502);
const BAR_AXLE = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.354);
const LOCAL_X = new THREE.Vector3(1, 0, 0);
const LINK_LENGTH = 0.92;
const FREE_WEBBING_LENGTH = 3 * LINK_LENGTH - 0.1032 - 0.155;
// Down the front, tightly around the wire, and back to the stitched join.
const LOOP_PATH = [
  [0.155, 0.031], [0.055, 0.031], [0, 0.031], [-0.022, 0.022],
  [-0.031, 0], [-0.022, -0.022], [0, -0.031], [0.042, -0.023],
  [0.098, -0.0085], [0.155, -0.0085],
] as const;
const LOOP_SEGMENTS = 24;
const LOOP_CURVE = new THREE.CatmullRomCurve3(
  LOOP_PATH.map(([y, z]) => new THREE.Vector3(0, y, z)), false, "centripetal",
);
const LOOP_SAMPLES = Array.from({ length: LOOP_SEGMENTS + 1 }, (_, i) =>
  LOOP_CURVE.getPoint(i / LOOP_SEGMENTS));
const BAND_PROFILE = [
  [-0.5, 0, 0.62], [-0.44, 0.012, 0.8], [-0.25, 0.02, 0.95],
  [0, 0.024, 1], [0.25, 0.02, 0.95], [0.44, 0.012, 0.8],
  [0.5, 0, 0.62], [0.44, -0.014, 0.5], [0, -0.016, 0.46],
  [-0.44, -0.014, 0.5],
] as const;
const STRAP_REACH = 2.6;
const HORIZONTAL_LIMIT = 1.55;
const CARD_JOINT_OFFSET = new THREE.Vector3(0, 1.45, 0);
let badgeFontReady: Promise<FontFace> | null = null;
type Model = { nodes: Record<"clip" | "clamp", THREE.Mesh> };

function triangleShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.583);
  shape.lineTo(-0.07, 0.462);
  shape.lineTo(0.07, 0.462);
  shape.closePath();
  return shape;
}

function lanyardSlotShape() {
  const slot = new THREE.Shape();
  slot.moveTo(-0.033, 0.932);
  slot.lineTo(0.033, 0.932);
  slot.quadraticCurveTo(0.05, 0.932, 0.05, 0.949);
  slot.quadraticCurveTo(0.05, 0.966, 0.033, 0.966);
  slot.lineTo(-0.033, 0.966);
  slot.quadraticCurveTo(-0.05, 0.966, -0.05, 0.949);
  slot.quadraticCurveTo(-0.05, 0.932, -0.033, 0.932);
  slot.closePath();
  return slot;
}

function cardShape() {
  const left = -0.358;
  const right = 0.358;
  const bottom = 0.023;
  const top = 0.895;
  const radius = 0.026;
  const shape = new THREE.Shape();
  shape.moveTo(left + radius, bottom);
  shape.lineTo(right - radius, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom + radius);
  shape.lineTo(right, top - radius);
  shape.quadraticCurveTo(right, top, right - radius, top);
  shape.lineTo(left + radius, top);
  shape.quadraticCurveTo(left, top, left, top - radius);
  shape.lineTo(left, bottom + radius);
  shape.quadraticCurveTo(left, bottom, left + radius, bottom);
  shape.holes.push(new THREE.Path(triangleShape().getPoints(3).reverse()));
  return shape;
}

function pocketShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.358, -0.004);
  shape.lineTo(0.358, -0.004);
  shape.quadraticCurveTo(0.381, -0.004, 0.381, 0.019);
  shape.lineTo(0.381, 0.909);
  shape.lineTo(-0.381, 0.909);
  shape.lineTo(-0.381, 0.019);
  shape.quadraticCurveTo(-0.381, -0.004, -0.358, -0.004);
  return shape;
}

function headerShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.381, 0.909);
  shape.lineTo(0.381, 0.909);
  shape.quadraticCurveTo(0.383, 0.955, 0.381, 0.984);
  shape.quadraticCurveTo(0.381, 1.012, 0.353, 1.012);
  shape.quadraticCurveTo(0, 1.008, -0.353, 1.012);
  shape.quadraticCurveTo(-0.381, 1.012, -0.381, 0.984);
  shape.quadraticCurveTo(-0.383, 0.955, -0.381, 0.909);
  shape.closePath();
  shape.holes.push(new THREE.Path(lanyardSlotShape().getPoints(12).reverse()));
  for (const x of [-0.265, 0.265]) {
    const hole = new THREE.Path();
    hole.absarc(x, 0.949, 0.014, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return shape;
}

function holderFrontShape() {
  const header = headerShape();
  const outline = new THREE.Shape();
  outline.moveTo(-0.358, -0.004);
  outline.lineTo(0.358, -0.004);
  outline.quadraticCurveTo(0.381, -0.004, 0.381, 0.019);
  outline.lineTo(0.381, 0.909);
  outline.quadraticCurveTo(0.383, 0.955, 0.381, 0.984);
  outline.quadraticCurveTo(0.381, 1.012, 0.353, 1.012);
  outline.quadraticCurveTo(0, 1.008, -0.353, 1.012);
  outline.quadraticCurveTo(-0.381, 1.012, -0.381, 0.984);
  outline.quadraticCurveTo(-0.383, 0.955, -0.381, 0.909);
  outline.lineTo(-0.381, 0.019);
  outline.quadraticCurveTo(-0.381, -0.004, -0.358, -0.004);
  outline.holes.push(...header.holes);
  return outline;
}

function pocketSealShape() {
  const shape = pocketShape();
  const inset = new THREE.Shape();
  inset.moveTo(-0.351, 0.896);
  inset.lineTo(0.351, 0.896);
  inset.quadraticCurveTo(0.369, 0.896, 0.369, 0.878);
  inset.lineTo(0.369, 0.021);
  inset.quadraticCurveTo(0.369, 0.008, 0.351, 0.008);
  inset.lineTo(-0.351, 0.008);
  inset.quadraticCurveTo(-0.369, 0.008, -0.369, 0.021);
  inset.lineTo(-0.369, 0.878);
  inset.quadraticCurveTo(-0.369, 0.896, -0.351, 0.896);
  shape.holes.push(new THREE.Path(inset.getPoints(12)));
  return shape;
}

function filmDepth(x: number, y: number, front: boolean) {
  // Each weld draws the film down independently, with a smooth normal
  // where two welds meet at a corner.
  const freeWidth = 1 - THREE.MathUtils.smootherstep(Math.abs(x), 0.357, 0.381);
  const freeBottom = THREE.MathUtils.smootherstep(y, -0.004, 0.024);
  const header = THREE.MathUtils.smootherstep(y, 0.888, 0.909);
  const bow = 1 - (x / 0.381) ** 2;
  const lowerFold = front
    ? 0.0035 * Math.sin(14 * x + 7 * y) * Math.exp(-((y - 0.14) ** 2) / 0.044)
    : 0;
  // A little spare film gathers diagonally from the lower weld. It changes
  // the reflected window's shape without covering the print with wrinkles.
  const crease = (y - 0.17 - 0.29 * x) / 0.062;
  const shoulder = (x - 0.16) / 0.20;
  const fullness = front ? 0.0065 * Math.exp(-crease * crease - shoulder * shoulder) : 0;
  const depth = front ? 0.021 + 0.02 * bow + lowerFold + fullness : -0.027 - 0.008 * bow;
  return THREE.MathUtils.lerp(depth * freeWidth * freeBottom, front ? 0.019 : 0.0141, header);
}

function holderFrontDepth(x: number, y: number) {
  return y > 0.909 ? 0.019 + headerWarp(x, y) : filmDepth(x, y, true);
}

function flexibleFilm(shape: THREE.Shape, front: boolean) {
  // Scan the die-cut outline in strips, with closely spaced samples in the
  // welds and broader quads across the gently bowed middle of the pocket.
  const { shape: outline, holes } = shape.extractPoints(12);
  const edges: [THREE.Vector2, THREE.Vector2][] = [];
  const rows = new Set<number>();
  const columns = new Set<number>();
  const addSamples = (target: Set<number>, start: number, end: number, count: number) => {
    for (let i = 0; i <= count; i++) target.add(THREE.MathUtils.lerp(start, end, i / count));
  };
  addSamples(rows, -0.004, 0.024, 8);
  addSamples(rows, 0.024, 0.888, front ? 28 : 12);
  addSamples(rows, 0.888, 0.909, 8);
  if (front) addSamples(rows, 0.909, 1.012, 20);
  addSamples(columns, -0.381, -0.357, 8);
  addSamples(columns, -0.357, 0.357, front ? 34 : 16);
  addSamples(columns, 0.357, 0.381, 8);
  for (const contour of [outline, ...holes]) {
    for (let i = 0; i < contour.length; i++) {
      const a = contour[i], b = contour[(i + 1) % contour.length];
      rows.add(a.y);
      if (a.y !== b.y) edges.push(a.y < b.y ? [a, b] : [b, a]);
    }
  }
  const sortedRows = [...rows].sort((a, b) => a - b);
  const sortedColumns = [...columns].sort((a, b) => a - b);
  const positions: number[] = [], normals: number[] = [], indices: number[] = [];
  const depthAt = front ? holderFrontDepth : (x: number, y: number) => filmDepth(x, y, false);
  const step = 0.00025;
  const xAt = ([a, b]: [THREE.Vector2, THREE.Vector2], y: number) =>
    THREE.MathUtils.lerp(a.x, b.x, (y - a.y) / (b.y - a.y));
  const vertex = (x: number, y: number, cache: Map<number, number>) => {
    const key = Math.round(x * 1e8);
    const existing = cache.get(key);
    if (existing !== undefined) return existing;
    const dx = (depthAt(x + step, y) - depthAt(x - step, y)) / (2 * step);
    const dy = (depthAt(x, y + step) - depthAt(x, y - step)) / (2 * step);
    const length = Math.hypot(dx, dy, 1);
    normals.push(-dx / length, -dy / length, 1 / length);
    positions.push(x, y, depthAt(x, y));
    const index = positions.length / 3 - 1;
    cache.set(key, index);
    return index;
  };
  let upper = new Map<number, number>();
  for (let row = 1; row < sortedRows.length; row++) {
    const y0 = sortedRows[row - 1], y1 = sortedRows[row], middle = (y0 + y1) / 2;
    if (y1 - y0 < 1e-8) continue;
    const lower = upper;
    upper = new Map();
    const crossings = edges.filter(([a, b]) => a.y < middle && b.y > middle)
      .sort((a, b) => xAt(a, middle) - xAt(b, middle));
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const left = crossings[i], right = crossings[i + 1];
      const l0 = xAt(left, y0), r0 = xAt(right, y0);
      const l1 = xAt(left, y1), r1 = xAt(right, y1);
      let bottom = vertex(l0, y0, lower), top = vertex(l1, y1, upper);
      const emitQuad = (x0: number, x1: number) => {
        const nextBottom = vertex(x0, y0, lower), nextTop = vertex(x1, y1, upper);
        if (bottom !== nextBottom) indices.push(bottom, nextBottom, nextTop);
        if (top !== nextTop) indices.push(bottom, nextTop, top);
        bottom = nextBottom;
        top = nextTop;
      };
      for (const x of sortedColumns) {
        if (x > Math.min(l0, l1) && x < Math.max(r0, r1)) {
          emitQuad(THREE.MathUtils.clamp(x, l0, r0), THREE.MathUtils.clamp(x, l1, r1));
        }
      }
      emitQuad(r0, r1);
    }
  }
  const film = new THREE.BufferGeometry();
  film.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  film.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  film.setIndex(indices);
  return film;
}

function headerWarp(x: number, y: number) {
  const height = THREE.MathUtils.clamp((y - 0.909) / 0.103, 0, 1);
  const envelope = Math.sin(Math.PI * height) ** 2;
  const width = Math.max(0, 1 - (x / 0.381) ** 2);
  return envelope * width * (0.011 + 0.0007 * Math.sin(9 * x + 6 * y));
}

function curvedHeader(shape: THREE.Shape) {
  const base = new THREE.ExtrudeGeometry(shape, {
    depth: 0.0045, bevelEnabled: true, bevelThickness: 0.0002,
    bevelSize: 0.00045, bevelSegments: 2, curveSegments: 12,
  });
  // ExtrudeGeometry orders the back cap, front cap and beveled walls.
  // The continuous front sheet already supplies the front cap.
  const capCount = base.groups[0].count;
  const keep: number[] = [];
  for (let i = 0; i < capCount / 2; i++) keep.push(i);
  for (let i = capCount; i < base.attributes.position.count; i++) keep.push(i);
  base.setIndex(keep);
  const geometry = new TessellateModifier(0.027, 6).modify(base);
  base.dispose();
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const step = 0.00025;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i);
    positions.setZ(i, positions.getZ(i) + headerWarp(x, y));
    const slopeX = (headerWarp(x + step, y) - headerWarp(x - step, y)) / (2 * step);
    const slopeY = (headerWarp(x, y + step) - headerWarp(x, y - step)) / (2 * step);
    const nz = normals.getZ(i);
    const nx = normals.getX(i) - nz * slopeX, ny = normals.getY(i) - nz * slopeY;
    const length = Math.hypot(nx, ny, nz);
    normals.setXYZ(i, nx / length, ny / length, nz / length);
  }
  return geometry;
}

// Coverage belongs to the vinyl, not the light: otherwise lowering the haze
// to reveal the insert also erases the reflections. Sample the same prefiltered
// environment as the hardware and composite this single dielectric interface.
function shadeVinyl(shader: Parameters<THREE.MeshStandardMaterial["onBeforeCompile"]>[0]) {
  shader.vertexShader = "varying float vSheetY;\n" + shader.vertexShader.replace(
    "#include <begin_vertex>", "#include <begin_vertex>\n vSheetY = position.y;",
  );
  shader.fragmentShader = "varying float vSheetY;\n" + shader.fragmentShader.replace("#include <opaque_fragment>", `
    float nv = clamp(dot(normal, geometryViewDir), 0.0, 1.0);
    float f = 0.043 + 0.957 * pow(1.0 - nv, 5.0);
    float reflected = max(totalSpecular.r, max(totalSpecular.g, totalSpecular.b));
    // Light travels farther through the folded header and a tilted sheet.
    // Absorption reads against white paper without painting a white veil on black.
    float density = opacity * mix(1.0, 2.1, smoothstep(0.895, 0.914, vSheetY));
    float absorbed = 1.0 - exp(-density / max(nv, 0.32));
    float coverage = clamp(absorbed + (1.0 - absorbed) * max(f, reflected / (1.0 + reflected)), 0.001, 1.0);
    outgoingLight = (totalSpecular + 0.39 * absorbed * totalDiffuse) / coverage;
    diffuseColor.a = coverage;
    #include <opaque_fragment>
  `);
}

function cardSurface() {
  return new THREE.ExtrudeGeometry(cardShape(), {
    depth: 0.018, bevelEnabled: true, bevelThickness: 0.002,
    bevelSize: 0.002, bevelSegments: 2, curveSegments: 8,
  });
}

function createBandGeometry(segments = BAND_SEGMENTS, uvDirection = 1) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((segments + 1) * BAND_PROFILE.length * 3);
  const uvs = new Float32Array((segments + 1) * BAND_PROFILE.length * 2);
  const colors = new Float32Array((segments + 1) * BAND_PROFILE.length * 3);
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    for (let side = 0; side < BAND_PROFILE.length; side++) {
      const vertex = i * BAND_PROFILE.length + side;
      const offset = vertex * 2;
      uvs[offset] = uvDirection * i / BAND_SEGMENTS;
      uvs[offset + 1] = side / BAND_PROFILE.length;
      colors[vertex * 3] = BAND_PROFILE[side][2];
      colors[vertex * 3 + 1] = BAND_PROFILE[side][2];
      colors[vertex * 3 + 2] = BAND_PROFILE[side][2];
    }
    if (i < segments) {
      for (let side = 0; side < BAND_PROFILE.length; side++) {
        const next = (side + 1) % BAND_PROFILE.length;
        const a = i * BAND_PROFILE.length + side;
        const b = (i + 1) * BAND_PROFILE.length + side;
        indices.push(a, i * BAND_PROFILE.length + next, b,
          i * BAND_PROFILE.length + next, (i + 1) * BAND_PROFILE.length + next, b);
      }
    }
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

function createStitchGeometry() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STITCH_COUNT * 4 * 3);
  const indices: number[] = [];
  for (let i = 0; i < STITCH_COUNT; i++) {
    const a = i * 4;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    const x = (i / (STITCH_COUNT - 1) - 0.5) * 0.70 * BAND_WIDTH;
    // Follow the crown of the front ply, just below the end of the return.
    const depth = 0.031 + 0.0255 - 0.010 * Math.pow(Math.abs(x) / (0.35 * BAND_WIDTH), 1.5);
    for (let c = 0; c < 4; c++) {
      positions[(a + c) * 3] = x + (c % 2 ? 0.006 : -0.006);
      positions[(a + c) * 3 + 1] = 0.134 + (c >= 2 ? 0.003 : -0.003);
      positions[(a + c) * 3 + 2] = depth;
    }
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createFoldedLoop() {
  const geometry = createBandGeometry(LOOP_SEGMENTS, -1);
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const uvs = geometry.getAttribute("uv") as THREE.BufferAttribute;
  let lengthFromJoin = 0;
  for (let section = 0; section <= LOOP_SEGMENTS; section++) {
    const point = LOOP_SAMPLES[section];
    const before = LOOP_SAMPLES[Math.max(0, section - 1)];
    lengthFromJoin += point.distanceTo(before);
    const after = LOOP_SAMPLES[Math.min(LOOP_SEGMENTS, section + 1)];
    const dy = after.y - before.y;
    const dz = after.z - before.z;
    const length = Math.hypot(dy, dz);
    BAND_PROFILE.forEach(([across, depth], side) => {
      const index = section * BAND_PROFILE.length + side;
      // The weave compresses over a ~0.013-radius wire and relaxes at the seam.
      const contact = 1 - THREE.MathUtils.smootherstep(point.y, 0.02, 0.095);
      const plyDepth = depth * (1 - 0.38 * contact);
      // The selvedges cup around the wire shoulders. This eases their projected
      // width only at the bend and brings both plies back to full width above it.
      const shoulder = Math.pow(2 * across, 4);
      const bendRadius = 1 - (0.22 - 0.70 * shoulder) * contact;
      const barCrown = 0.0105 * contact * shoulder;
      positions.setXYZ(index, across * BAND_WIDTH * (1 - 0.03 * contact),
        point.y * bendRadius + dz / length * plyDepth - barCrown,
        point.z * bendRadius - dy / length * plyDepth);
      uvs.setX(index, -lengthFromJoin / FREE_WEBBING_LENGTH);
    });
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createFabricNormalMap() {
  const size = 256;
  const weaveStep = 16;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const warp = Math.sin(x * Math.PI / weaveStep);
      const weft = Math.sin(y * Math.PI / weaveStep);
      const nx = warp * (0.12 + 0.035 * weft);
      const ny = weft * (0.1 - 0.03 * warp);
      const offset = (y * size + x) * 4;
      pixels[offset] = Math.round((nx + 1) * 127.5);
      pixels[offset + 1] = Math.round((ny + 1) * 127.5);
      pixels[offset + 2] = 255;
      pixels[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 3);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function createFabricColorMap() {
  const size = 256;
  const weaveStep = 16;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const warp = Math.cos(y * Math.PI / weaveStep);
      const weft = Math.cos(x * Math.PI / weaveStep);
      const crossing = ((Math.floor(x / weaveStep) + Math.floor(y / weaveStep)) % 2) * 2 - 1;
      const shade = Math.round(155 + warp * 45 + weft * crossing * 18);
      const offset = (y * size + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = shade;
      pixels[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 3);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function BadgeName() {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    let active = true;
    let current: THREE.CanvasTexture | null = null;
    badgeFontReady ??= new FontFace("Geist Mono Badge", "url(/fonts/geist-mono/GeistMono-Regular.ttf)", { weight: "400", style: "normal" })
      .load().then((loaded) => { document.fonts.add(loaded); return loaded; });
    badgeFontReady.then(() => {
      if (!active) return;
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 128;
      const context = canvas.getContext("2d");
      if (!context) return;
      const fontSize = 70;
      const label = "RAGHAV AGARWAL";
      const letters = [...label];
      const tracking = fontSize * 0.04;
      context.font = `400 ${fontSize}px "Geist Mono Badge"`;
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillStyle = "#ffffff";
      const advances = letters.map((letter) => context.measureText(letter).width);
      const textWidth = advances.reduce((width, advance) => width + advance, 0)
        + tracking * (letters.length - 1);
      let x = (canvas.width - textWidth) / 2;
      letters.forEach((letter, index) => {
        context.fillText(letter, x, 65);
        x += advances[index] + tracking;
      });
      current = new THREE.CanvasTexture(canvas);
      current.colorSpace = THREE.SRGBColorSpace;
      current.anisotropy = 8;
      setTexture(current);
    }).catch(() => { badgeFontReady = null; });
    return () => {
      active = false;
      current?.dispose();
    };
  }, []);
  if (!texture) return null;
  return <mesh position={[0, 0.116, 0.014]} scale={[0.56, 0.075, 1]}>
    <planeGeometry args={[1, 1]} />
    <meshPhysicalMaterial map={texture} color="#141617"
      metalness={0.2} roughness={0.54}
      clearcoat={0.35} clearcoatRoughness={0.2}
      envMapIntensity={0.08} specularIntensity={0.1}
      transparent alphaTest={0.06} depthWrite={false} />
  </mesh>;
}

function PlasticHolder() {
  const seal = useMemo(() => new THREE.ExtrudeGeometry(pocketSealShape(), {
    depth: 0.005, bevelEnabled: true, bevelThickness: 0.001,
    bevelSize: 0.001, bevelSegments: 3, curveSegments: 16,
  }), []);
  const header = useMemo(() => curvedHeader(headerShape()), []);
  const frontFilm = useMemo(() => flexibleFilm(holderFrontShape(), true), []);
  const backFilm = useMemo(() => flexibleFilm(pocketShape(), false), []);
  const outerEdge = useMemo(() => {
    const points = holderFrontShape().getPoints(18);
    if (points[0].distanceTo(points[points.length - 1]) < 0.0001) points.pop();
    const curve = new THREE.CatmullRomCurve3(points.map(({ x, y }) =>
      new THREE.Vector3(x, y, holderFrontDepth(x, y) + 0.0006)), true, "centripetal");
    return new THREE.TubeGeometry(curve, points.length * 2, 0.0013, 6, true);
  }, []);
  const polishedEdges = useMemo(() => {
    const apertures = headerShape().holes.map((hole) => {
      const points = hole.getPoints(24);
      if (points[0].distanceToSquared(points[points.length - 1]) < 1e-8) points.pop();
      const curve = new THREE.CatmullRomCurve3(points.map(({ x, y }) =>
        new THREE.Vector3(x, y, holderFrontDepth(x, y) + 0.0007)), true, "centripetal");
      return new THREE.TubeGeometry(curve, points.length * 2, 0.00115, 6, true);
    });
    const edges = mergeGeometries([outerEdge, ...apertures]);
    apertures.forEach(edge => edge.dispose());
    return edges;
  }, [outerEdge]);
  const seam = useMemo(() => new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(Array.from({ length: 15 }, (_, i) => {
      const x = -0.377 + i * 0.754 / 14;
      return new THREE.Vector3(x, 0.909 + 0.0008 * Math.sin(x * 8),
        0.0205 + 0.0008 * Math.cos(x * 7));
    })), 32, 0.0014, 8, false,
  ), []);
  useEffect(() => () => {
    seal.dispose(); header.dispose(); frontFilm.dispose(); backFilm.dispose(); outerEdge.dispose();
    polishedEdges.dispose(); seam.dispose();
  }, [seal, header, frontFilm, backFilm, outerEdge, polishedEdges, seam]);

  return <group>
    <mesh geometry={backFilm} renderOrder={0}>
      <meshStandardMaterial color="#e6e6e6" roughness={0.18} opacity={0.05}
        transparent depthWrite={false} side={THREE.DoubleSide} forceSinglePass onBeforeCompile={shadeVinyl} />
    </mesh>
    <mesh geometry={seal} position={[0, 0, -0.0025]} renderOrder={2}>
      <meshStandardMaterial color="#dddddd" roughness={0.26} opacity={0.14}
        transparent depthWrite={false} onBeforeCompile={shadeVinyl} />
    </mesh>
    <mesh geometry={header} position={[0, 0, 0.0143]} renderOrder={2}>
      <meshStandardMaterial color="#e8e8e8" roughness={0.17} opacity={0.065}
        transparent depthWrite={false} onBeforeCompile={shadeVinyl} />
    </mesh>
    <mesh geometry={frontFilm} renderOrder={3}>
      <meshStandardMaterial color="#ededed" roughness={0.13} opacity={0.068}
        transparent depthWrite={false} side={THREE.DoubleSide} forceSinglePass onBeforeCompile={shadeVinyl} />
    </mesh>
    <mesh geometry={polishedEdges} renderOrder={5}>
      <meshStandardMaterial color="#e8e8e8" roughness={0.12} opacity={0.17}
        transparent depthWrite={false} onBeforeCompile={shadeVinyl} />
    </mesh>
    <mesh geometry={seam} renderOrder={4}>
      <meshStandardMaterial color="#e6e6e6" roughness={0.20} opacity={0.15}
        transparent depthWrite={false} onBeforeCompile={shadeVinyl} />
    </mesh>
  </group>;
}

// Use badge-local pixels for the small compositor layer so the optical field
// and the three actual openings rotate together. No copy of the page is needed.
const OPTICAL_WIDTH = 320;
const OPTICAL_UNITS = 0.766 / OPTICAL_WIDTH;
const OPTICAL_HEIGHT = 0.103 / OPTICAL_UNITS;

function headerClipPath() {
  const shape = headerShape();
  return `path(evenodd, "${[shape, ...shape.holes].map(path =>
    path.getPoints(16).map(({ x, y }, i) =>
      `${i ? "L" : "M"}${((x + 0.383) / OPTICAL_UNITS).toFixed(2)} ${((1.012 - y) / OPTICAL_UNITS).toFixed(2)}`
    ).join("") + "Z").join("")}")`;
}

function VinylOptics() {
  const slopes = useRef<SVGFEImageElement>(null);
  useEffect(() => {
    const tile = document.createElement("canvas");
    tile.width = 192; tile.height = 36;
    const ctx = tile.getContext("2d");
    if (!ctx) return;
    const field = ctx.createImageData(tile.width, tile.height);
    for (let j = 0; j < tile.height; j++) for (let i = 0; i < tile.width; i++) {
      const x = ((i + 0.5) / tile.width - 0.5) * 0.766;
      const y = 1.012 - (j + 0.5) / tile.height * 0.103;
      const dx = (headerWarp(x + 0.001, y) - headerWarp(x - 0.001, y)) / 0.002;
      const dy = (headerWarp(x, y + 0.001) - headerWarp(x, y - 0.001)) / 0.002;
      // Near the perimeter the two faces pinch together into a narrow lip.
      const lip = THREE.MathUtils.smootherstep(Math.abs(x), 0.344, 0.383);
      const k = 4 * (j * tile.width + i);
      field.data[k] = 128 + 225 * dx + 92 * Math.sign(x) * lip;
      field.data[k + 1] = 128 - 195 * dy;
      field.data[k + 2] = 128; field.data[k + 3] = 255;
    }
    ctx.putImageData(field, 0, 0);
    slopes.current?.setAttribute("href", tile.toDataURL());
  }, []);
  return <svg className={styles.refractionFilter} aria-hidden="true">
    <filter id="lanyard-refraction" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feFlood floodColor="var(--paper)" result="paper" />
      <feComposite in="SourceGraphic" in2="paper" operator="over" result="page" />
      <feImage ref={slopes} x="0%" y="0%" width="100%" height="100%" preserveAspectRatio="none" result="slopes" />
      <feDisplacementMap in="page" in2="slopes" scale="4" xChannelSelector="R" yChannelSelector="G" />
      <feGaussianBlur stdDeviation="0.50 0.20" edgeMode="duplicate" />
    </filter>
  </svg>;
}

function Badge({ peekVisible, refractor }: { peekVisible: boolean; refractor: RefObject<HTMLDivElement | null> }) {
  const { nodes } = useGLTF(MODEL) as unknown as Model;
  const badgeGroup = useRef<THREE.Group>(null);
  const projection = useMemo(() => new THREE.Matrix4(), []);
  const lastTransform = useRef("");
  const card = useMemo(() => cardSurface(), []);
  const shine = useMemo(() => new THREE.ShapeGeometry(cardShape(), 8), []);
  const inset = useMemo(() => new THREE.ShapeGeometry(triangleShape()), []);
  const shineMaterial = useRef<THREE.ShaderMaterial>(null);
  const peekStart = useRef<number | null>(null);
  const reduceMotion = useRef(false);
  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
  useFrame(({ camera, gl }) => {
    const overlay = refractor.current;
    const group = badgeGroup.current;
    if (overlay && group) {
      group.updateWorldMatrix(true, false);
      const rect = gl.domElement.getBoundingClientRect();
      const frame = overlay.offsetParent?.getBoundingClientRect();
      if (frame) {
        // Project the local header plane directly into CSS pixels, including
        // perspective on a sideways drag. The cutout path is static.
        const m = projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
          .multiply(group.matrixWorld).elements;
        const lx = -0.383, ly = 1.012, lz = 0.023;
        const ox = m[0]*lx + m[4]*ly + m[8]*lz + m[12];
        const oy = m[1]*lx + m[5]*ly + m[9]*lz + m[13];
        const ow = m[3]*lx + m[7]*ly + m[11]*lz + m[15];
        const hw = rect.width / 2, hh = rect.height / 2;
        const cx = rect.left - frame.left + hw, cy = rect.top - frame.top + hh;
        const u = OPTICAL_UNITS / ow;
        const transform = `matrix3d(${[
          u * (hw*m[0] + cx*m[3]), u * (-hh*m[1] + cy*m[3]), 0, u*m[3],
          -u * (hw*m[4] + cx*m[7]), -u * (-hh*m[5] + cy*m[7]), 0, -u*m[7],
          0, 0, 1, 0, cx + hw*ox/ow, cy - hh*oy/ow, 0, 1,
        ].map(n => n.toFixed(7)).join(",")})`;
        if (transform !== lastTransform.current) {
          overlay.style.setProperty("transform", transform);
          lastTransform.current = transform;
        }
      }
    }
    if (!shineMaterial.current || reduceMotion.current) return;
    if (!peekVisible) {
      shineMaterial.current.uniforms.uPeekSweep.value = -1;
      return;
    }
    const now = performance.now();
    if (peekStart.current === null) peekStart.current = now;
    const progress = THREE.MathUtils.clamp((now - peekStart.current - 120) / 650, 0, 1);
    shineMaterial.current.uniforms.uPeekSweep.value = progress;
  });
  useEffect(() => () => { card.dispose(); shine.dispose(); inset.dispose(); }, [card, shine, inset]);
  return <group ref={badgeGroup} scale={2.25} position={[0, -1.2, -0.05]}>
    <mesh geometry={card} position={[0, 0, -0.014]} castShadow receiveShadow>
      <meshPhysicalMaterial attach="material-0" color="#0a0a0a" metalness={0}
        roughness={0.54} clearcoat={0.48}
        clearcoatRoughness={0.28}
        envMapIntensity={0.09} specularIntensity={0.1}
        side={THREE.DoubleSide} />
      <meshPhysicalMaterial attach="material-1" color="#282b2d" metalness={0.55}
        roughness={0.36} clearcoat={0.4} clearcoatRoughness={0.24}
        envMapIntensity={0.45} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={shine} position={[0, 0, 0.008]} renderOrder={1}>
      <shaderMaterial ref={shineMaterial}
        transparent depthWrite={false} blending={THREE.NormalBlending}
        side={THREE.FrontSide}
        uniforms={{ uPeekSweep: { value: -1 } }}
        vertexShader={`varying vec2 vCardPosition;
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;
          void main() {
            vCardPosition = position.xy;
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            vWorldNormal = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`}
        fragmentShader={`uniform float uPeekSweep;
          varying vec2 vCardPosition;
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;
          void main() {
            vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
            vec3 normal = normalize(vWorldNormal);
            vec3 reflection = reflect(-viewDirection, normal);
            float travel = (5.0 - vWorldPosition.z) / max(reflection.z, 0.05);
            vec2 lightHit = vWorldPosition.xy + reflection.xy * travel;
            float offset = lightHit.x + 0.28;
            float wideOffset = offset / 0.43, narrowOffset = offset / 0.15;
            float fillOffset = (abs(lightHit.x) - 1.7) / 0.75;
            float broad = exp(-wideOffset * wideOffset);
            float glint = exp(-narrowOffset * narrowOffset);
            float sideFill = exp(-fillOffset * fillOffset);
            float verticalFade = 1.0 - smoothstep(2.0, 3.4, abs(lightHit.y));
            float facing = smoothstep(0.0, 0.18, dot(normal, viewDirection));
            float grazing = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.0);
            float sidewaysTilt = smoothstep(0.08, 0.3, abs(normal.x));
            float light = (0.12 * broad + 0.055 * glint + 0.045 * sideFill)
              * verticalFade * facing * sidewaysTilt * (0.75 + 1.6 * grazing);
            float cardX = (vCardPosition.x + 0.358) / 0.716;
            float cardY = vCardPosition.y - 0.023;
            float diagonal = (cardX + 1.0 - cardY) * 0.5;
            float sweepCenter = mix(-0.25, 1.25, uPeekSweep);
            float sweepOffset = (diagonal - sweepCenter) / 0.13;
            float sweep = exp(-sweepOffset * sweepOffset)
              * sin(clamp(uPeekSweep, 0.0, 1.0) * 3.141593)
              * step(0.0, uPeekSweep);
            light += sweep * 0.28 * facing;
            vec3 reflectionColor = vec3(0.92, 0.95, 1.0);
            gl_FragColor = vec4(reflectionColor, light);
          }`} />
    </mesh>
    <mesh geometry={inset} position={[0, 0, -0.004]}>
      <meshPhysicalMaterial color="#141617"
        metalness={0.2} roughness={0.54}
        clearcoat={0.35} clearcoatRoughness={0.2}
        envMapIntensity={0.08} specularIntensity={0.1}
        side={THREE.DoubleSide} />
    </mesh>
    <BadgeName />
    <PlasticHolder />
    <mesh geometry={nodes.clip.geometry} castShadow>
      <meshPhysicalMaterial color="#d5dce0" metalness={1} roughness={0.12}
        clearcoat={0.85} clearcoatRoughness={0.055} anisotropy={0.28}
        envMapIntensity={1.5} />
    </mesh>
    <mesh geometry={nodes.clamp.geometry} castShadow>
      <meshPhysicalMaterial color="#d5dce0" metalness={1} roughness={0.14}
        clearcoat={0.75} clearcoatRoughness={0.065} anisotropy={0.2}
        envMapIntensity={1.4} />
    </mesh>
    <mesh position={[-0.055, 1.205, 0.046]} renderOrder={2}>
      <planeGeometry args={[0.085, 0.085]} />
      <shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending}
        vertexShader={`varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vUv = uv - 0.5;
            vNormal = normalize(mat3(modelMatrix) * normal);
            vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`}
        fragmentShader={`varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vec3 viewDirection = normalize(cameraPosition - vPosition);
            float facing = max(dot(normalize(vNormal), viewDirection), 0.0);
            float tilt = smoothstep(0.06, 0.34, abs(normalize(vNormal).x));
            float core = exp(-dot(vUv, vUv) * 180.0);
            float horizontal = exp(-abs(vUv.y) * 90.0) * exp(-abs(vUv.x) * 9.0);
            float vertical = exp(-abs(vUv.x) * 90.0) * exp(-abs(vUv.y) * 9.0);
            float flare = max(core, 0.32 * (horizontal + vertical));
            gl_FragColor = vec4(0.9, 0.96, 1.0, flare * facing * (0.025 + 0.32 * tilt));
          }`} />
    </mesh>
  </group>;
}

function Lanyard({ interactive, peekHovered, peekVisible, hoverX, refractor, maxSpeed = 50, minSpeed = 10 }: { interactive: boolean; peekHovered: boolean; peekVisible: boolean; hoverX: { current: number }; refractor: RefObject<HTMLDivElement | null>; maxSpeed?: number; minSpeed?: number }) {
  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<RapierRigidBody>(null!);
  const j2 = useRef<RapierRigidBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);
  const [dragged, setDragged] = useState<THREE.Vector3 | null>(null);
  const [hovered, setHovered] = useState(false);
  const camera = useThree((state) => state.camera);
  const getRendererState = useThree((state) => state.get);
  useLayoutEffect(() => {
    const { clock, invalidate } = getRendererState();
    clock.getDelta();
    invalidate();
  }, [dragged, getRendererState]);
  const canvasHeight = useThree((state) => state.size.height);
  const horizontalLimit = useRef(HORIZONTAL_LIMIT);
  const band = useMemo(() => createBandGeometry(), []);
  const loop = useMemo(() => createFoldedLoop(), []);
  const foldedWebbing = useRef<THREE.Group>(null);
  const cardFrame = useRef<THREE.Group>(null);
  const foldPitch = useRef(0);
  const stitches = useMemo(() => createStitchGeometry(), []);
  const fabricNormalMap = useMemo(() => createFabricNormalMap(), []);
  const fabricColorMap = useMemo(() => createFabricColorMap(), []);
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0x343434, map: fabricColorMap, vertexColors: true,
    roughness: 0.92, metalness: 0,
    specularIntensity: 0.1, sheen: 0.15,
    sheenColor: new THREE.Color(0x242424), sheenRoughness: 0.94,
    normalMap: fabricNormalMap, normalScale: new THREE.Vector2(1.1, 1.1),
    envMapIntensity: 0.12, side: THREE.DoubleSide,
  }), [fabricNormalMap, fabricColorMap]);
  const threadMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x353535, roughness: 1, metalness: 0, side: THREE.DoubleSide,
  }), []);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(Array.from({ length: 5 }, () => new THREE.Vector3()), false, "centripetal"), []);
  const samples = useMemo(() => Array.from({ length: BAND_SEGMENTS + 1 }, () => new THREE.Vector3()), []);
  const lerped = useRef([new THREE.Vector3(), new THREE.Vector3()]);
  const smoothedDrag = useRef(new THREE.Vector3());
  const releasePending = useRef(false);
  const finishDrag = useRef<(() => void) | null>(null);
  const clearDragGuard = useRef<(() => void) | null>(null);
  const peekRest = useRef<{ card: THREE.Vector3; joint: THREE.Vector3 } | null>(null);
  const peekMotion = useRef(0);
  const peekLean = useRef(0);
  const lastBand = useRef(new Float32Array(15).fill(Infinity));
  const lastBandRotation = useRef(new THREE.Quaternion());
  const geometryReady = useRef(false);
  const vectors = useRef({
    vec: new THREE.Vector3(), dir: new THREE.Vector3(), ang: new THREE.Vector3(), rot: new THREE.Vector3(),
    target: new THREE.Vector3(), attachment: new THREE.Vector3(), jointOffset: new THREE.Vector3(),
    barCenter: new THREE.Vector3(), axleRotation: new THREE.Quaternion(), rollAroundWire: new THREE.Quaternion(),
    quaternion: new THREE.Quaternion(), tilt: new THREE.Euler(),
    tangent: new THREE.Vector3(), previousTangent: new THREE.Vector3(),
    front: new THREE.Vector3(), desiredFront: new THREE.Vector3(), right: new THREE.Vector3(),
    frameAxis: new THREE.Vector3(), frameRotation: new THREE.Quaternion(),
  });
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], LINK_LENGTH]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], LINK_LENGTH]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], LINK_LENGTH]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]]);
  useBeforePhysicsStep(world => {
    if (!interactive || !fixed.current || !j3.current || !j1.current || !j2.current) return;
    const anchor = fixed.current.translation();
    const end = j3.current.translation();
    const reach = LINK_LENGTH * 3;
    const distanceSq = (anchor.x - end.x) ** 2 + (anchor.y - end.y) ** 2 + (anchor.z - end.z) ** 2;
    // The rope links still carry the load. A damped bending force guides spare
    // length behind the card as it is lifted; it vanishes when the webbing is taut.
    const sag = Math.min(0.82, 0.35 * Math.sqrt(Math.max(0, reach * reach - distanceSq)));
    if (sag < 0.025) return;
    for (let i = 0; i < 2; i++) {
      const joint = i === 0 ? j1.current : j2.current;
      if (joint.isSleeping()) continue;
      const goalZ = THREE.MathUtils.lerp(anchor.z, end.z, (i + 1) / 3) - sag;
      const acceleration = THREE.MathUtils.clamp(86 * (goalZ - joint.translation().z) - 15 * joint.linvel().z, -36, 36);
      joint.applyImpulse({ x: 0, y: 0, z: joint.mass() * acceleration * world.timestep }, false);
    }
  });
  useEffect(() => {
    if (hovered) document.body.style.cursor = dragged ? "grabbing" : "grab";
    return () => { document.body.style.cursor = ""; };
  }, [hovered, dragged]);
  useEffect(() => () => { clearDragGuard.current?.(); }, []);
  useEffect(() => {
    const updateHorizontalLimit = () => {
      if (!(camera instanceof THREE.PerspectiveCamera) || !canvasHeight) return;
      const worldHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const worldPerPixel = worldHeight / canvasHeight;
      horizontalLimit.current = Math.min(HORIZONTAL_LIMIT,
        Math.max(0.35, (window.innerWidth / 2 - 8) * worldPerPixel - 0.86));
    };
    updateHorizontalLimit();
    window.addEventListener("resize", updateHorizontalLimit);
    return () => window.removeEventListener("resize", updateHorizontalLimit);
  }, [camera, canvasHeight]);
  useEffect(() => {
    geometryReady.current = false;
    return () => {
      band.dispose(); loop.dispose(); stitches.dispose();
    };
  }, [band, loop, stitches]);
  useEffect(() => () => fabricNormalMap.dispose(), [fabricNormalMap]);
  useEffect(() => () => fabricColorMap.dispose(), [fabricColorMap]);
  useEffect(() => () => {
    material.dispose(); threadMaterial.dispose();
  }, [material, threadMaterial]);

  useFrame((state, delta) => {
    if (!fixed.current || !j1.current || !j2.current || !j3.current || !card.current || !cardFrame.current) return;
    const { vec, dir, ang, rot, target, attachment, jointOffset, quaternion, tilt,
      tangent, previousTangent, front, desiredFront, right, frameAxis, frameRotation,
      barCenter, axleRotation, rollAroundWire } = vectors.current;
    if (!interactive) {
      if (!peekRest.current) {
        const cardPosition = card.current.translation();
        const jointPosition = j3.current.translation();
        peekRest.current = {
          card: new THREE.Vector3(cardPosition.x, cardPosition.y, cardPosition.z),
          joint: new THREE.Vector3(jointPosition.x, jointPosition.y, jointPosition.z),
        };
      }
      peekMotion.current = THREE.MathUtils.damp(peekMotion.current, peekHovered ? 1 : 0, 12, Math.min(delta, 0.05));
      peekLean.current = THREE.MathUtils.damp(peekLean.current, peekHovered ? hoverX.current : 0, 10, Math.min(delta, 0.05));
      const offset = peekMotion.current * 0.02;
      const rest = peekRest.current;
      card.current.setTranslation({ x: rest.card.x, y: rest.card.y - offset, z: rest.card.z }, true);
      j3.current.setTranslation({ x: rest.joint.x, y: rest.joint.y - offset, z: rest.joint.z }, true);
      tilt.set(
        -0.035 * peekMotion.current,
        0.14 * peekLean.current,
        -0.02618 + 0.06 * peekLean.current,
        "XYZ",
      );
      quaternion.setFromEuler(tilt);
      card.current.setRotation(quaternion, true);
    }
    if (dragged) {
      // Kinematic pointer targets keep changing even if Rapier previously put
      // all the dynamic links to sleep. Keep sampling input throughout the hold.
      state.invalidate();
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(camera);
      dir.copy(vec).sub(camera.position).normalize();
      vec.add(dir.multiplyScalar(camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((body) => body.current?.wakeUp());
      target.copy(vec).sub(dragged);
      target.x = THREE.MathUtils.clamp(target.x, -horizontalLimit.current, horizontalLimit.current);
      target.z = Math.max(0.08, target.z);
      const rotation = card.current.rotation();
      quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      tilt.setFromQuaternion(quaternion, "XYZ");
      tilt.y = THREE.MathUtils.damp(tilt.y, target.x * 0.36, 12, Math.min(delta, 0.05));
      tilt.z = THREE.MathUtils.damp(tilt.z, target.x * 0.12, 10, Math.min(delta, 0.05));
      quaternion.setFromEuler(tilt);
      card.current.setNextKinematicRotation(quaternion);
      jointOffset.copy(CARD_JOINT_OFFSET).applyQuaternion(quaternion);
      const anchorPosition = fixed.current.translation();
      attachment.copy(target).add(jointOffset).sub(vec.set(anchorPosition.x, anchorPosition.y, anchorPosition.z));
      attachment.clampLength(0, STRAP_REACH);
      target.copy(attachment).add(vec).sub(jointOffset);
      smoothedDrag.current.lerp(target, 1 - Math.exp(-Math.min(delta, 0.05) * 20));
      card.current.setNextKinematicTranslation(smoothedDrag.current);
    } else if (releasePending.current) {
      releasePending.current = false;
      state.invalidate();
      const velocity = card.current.linvel();
      const spin = card.current.angvel();
      card.current.setLinvel({ x: velocity.x * 0.35, y: velocity.y * 0.35, z: velocity.z * 0.35 }, true);
      card.current.setAngvel({ x: spin.x * 0.45, y: spin.y * 0.45, z: spin.z * 0.45 }, true);
      [j1.current, j2.current, j3.current].forEach((joint) => {
        const motion = joint.linvel();
        joint.setLinvel({ x: motion.x * 0.45, y: motion.y * 0.45, z: motion.z * 0.45 }, true);
      });
    }
    [j1.current, j2.current].forEach((joint, index) => {
      const p = joint.translation();
      const smooth = lerped.current[index];
      if (!smooth.lengthSq()) smooth.set(p.x, p.y, p.z);
      vec.set(p.x, p.y, p.z);
      const distance = THREE.MathUtils.clamp(smooth.distanceTo(vec), 0.1, 1);
      smooth.lerp(vec, Math.min(1, delta * (minSpeed + distance * (maxSpeed - minSpeed))));
    });
    const anchor = fixed.current.translation();
    // Rapier interpolates the displayed card between physics steps. Use that
    // same displayed pose for the contact patch, including during a fast drag.
    cardFrame.current.localToWorld(barCenter.copy(BAR_CENTER));
    cardFrame.current.getWorldQuaternion(axleRotation).multiply(BAR_AXLE);
    dir.subVectors(lerped.current[1], barCenter).applyQuaternion(quaternion.copy(axleRotation).invert());
    const pitchTarget = THREE.MathUtils.clamp(Math.atan2(dir.z, Math.max(0.10, dir.y)), -1.1, 0.14);
    foldPitch.current = THREE.MathUtils.damp(foldPitch.current, pitchTarget, 17, Math.min(delta, 0.05));
    quaternion.copy(axleRotation).multiply(rollAroundWire.setFromAxisAngle(LOCAL_X, foldPitch.current));
    if (foldedWebbing.current) {
      foldedWebbing.current.position.copy(barCenter);
      foldedWebbing.current.quaternion.copy(quaternion);
    }
    curve.points[0].copy(barCenter).add(vec.set(0, LOOP_PATH[0][0], LOOP_PATH[0][1]).applyQuaternion(quaternion));
    curve.points[1].copy(curve.points[0]).add(vec.set(0, 0.15, 0).applyQuaternion(quaternion));
    curve.points[2].set(lerped.current[1].x, lerped.current[1].y,
      Math.min(lerped.current[1].z, barCenter.z));
    curve.points[3].set(lerped.current[0].x, lerped.current[0].y,
      Math.min(lerped.current[0].z, Math.max(barCenter.z, anchor.z)));
    curve.points[4].set(anchor.x, anchor.y, anchor.z);
    const firstPosition = band.getAttribute("position") as THREE.BufferAttribute;
    let bandMoved = !geometryReady.current
      || Math.abs(firstPosition.getY(0) - curve.points[0].y) > 0.5;
    curve.points.forEach((point, index) => {
      const offset = index * 3;
      if (Math.abs(point.x - lastBand.current[offset]) > 0.002
        || Math.abs(point.y - lastBand.current[offset + 1]) > 0.002
        || Math.abs(point.z - lastBand.current[offset + 2]) > 0.002) bandMoved = true;
    });
    if (1 - Math.abs(lastBandRotation.current.dot(quaternion)) > 0.000001) bandMoved = true;
    if (bandMoved) {
      curve.points.forEach((point, index) => point.toArray(lastBand.current, index * 3));
      lastBandRotation.current.copy(quaternion);
      for (let i = 0; i <= BAND_SEGMENTS; i++) curve.getPoint(i / BAND_SEGMENTS, samples[i]);
      const positions = band.getAttribute("position") as THREE.BufferAttribute;
      const uvs = band.getAttribute("uv") as THREE.BufferAttribute;
      let lengthFromJoin = 0;
      for (let i = 0; i <= BAND_SEGMENTS; i++) {
        const point = samples[i];
        if (i > 0) lengthFromJoin += point.distanceTo(samples[i - 1]);
        tangent.subVectors(samples[Math.min(BAND_SEGMENTS, i + 1)], samples[Math.max(0, i - 1)]);
        if (tangent.lengthSq() < 0.000001) tangent.set(0, 1, 0);
        tangent.normalize();
        if (i === 0) {
          front.set(0, 0, 1).applyQuaternion(quaternion);
        } else {
          frameAxis.crossVectors(previousTangent, tangent);
          const turn = frameAxis.length();
          if (turn > 0.00001) {
            frameRotation.setFromAxisAngle(frameAxis.multiplyScalar(1 / turn),
              Math.atan2(turn, previousTangent.dot(tangent)));
            front.applyQuaternion(frameRotation);
          }
          // At the wall the webbing faces forward. Let the lower run carry
          // the twist from the hardware, relaxing it only near the anchor.
          desiredFront.set(0, 0, 1).addScaledVector(tangent, -tangent.z);
          if (desiredFront.lengthSq() > 0.08) {
            front.lerp(desiredFront.normalize(), 0.05 * THREE.MathUtils.smoothstep(i / BAND_SEGMENTS, 0.36, 1));
          }
        }
        front.addScaledVector(tangent, -front.dot(tangent));
        if (front.lengthSq() < 0.000001) front.set(0, 1, 0).addScaledVector(tangent, -tangent.y);
        if (front.lengthSq() < 0.000001) front.set(1, 0, 0).addScaledVector(tangent, -tangent.x);
        front.normalize();
        right.crossVectors(tangent, front).normalize();
        front.crossVectors(right, tangent).normalize();
        previousTangent.copy(tangent);
        const width = BAND_WIDTH;
        for (let side = 0; side < BAND_PROFILE.length; side++) {
          const [across, depth] = BAND_PROFILE[side];
          uvs.setX(i * BAND_PROFILE.length + side, lengthFromJoin / FREE_WEBBING_LENGTH);
          positions.setXYZ(i * BAND_PROFILE.length + side,
            point.x + right.x * across * width + front.x * depth,
            point.y + right.y * across * width + front.y * depth,
            point.z + right.z * across * width + front.z * depth);
        }
      }
      positions.needsUpdate = true;
      uvs.needsUpdate = true;
      band.computeVertexNormals();
      geometryReady.current = true;
    }
    const position = card.current.translation();
    if (!dragged && Math.abs(position.x) > horizontalLimit.current) {
      card.current.setTranslation({ x: Math.sign(position.x) * horizontalLimit.current, y: position.y, z: position.z }, true);
      const velocity = card.current.linvel();
      card.current.setLinvel({ x: 0, y: velocity.y, z: velocity.z }, true);
    }
    ang.copy(card.current.angvel());
    rot.copy(card.current.rotation());
    if (Math.abs(rot.y) > 0.01 || Math.abs(ang.y) > 0.01) {
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, false);
    }
  });
  const segment = { colliders: false as const, canSleep: true, angularDamping: 3.5, linearDamping: 3.5 };
  return <>
    <group position={[0, 4.94, 0]}>
      <RigidBody ref={fixed} {...segment} type="fixed" />
      <RigidBody ref={j1} {...segment} position={[0, 0.12, 0]}><BallCollider args={[0.1]} /></RigidBody>
      <RigidBody ref={j2} {...segment} position={[0, 0.24, 0]}><BallCollider args={[0.1]} /></RigidBody>
      <RigidBody ref={j3} {...segment} position={[0, 0.37, 0]}><BallCollider args={[0.1]} /></RigidBody>
      <RigidBody ref={card} {...segment} type={dragged ? "kinematicPosition" : "dynamic"} position={[0, -1.08, 0]} rotation={[0, 0, -0.02618]}>
        <CuboidCollider args={[0.8, 1.125, 0.01]} />
        <group ref={cardFrame} onPointerOver={() => { if (interactive) setHovered(true); }} onPointerOut={() => setHovered(false)}
          onPointerDown={(event: ThreeEvent<PointerEvent>) => {
            if (!interactive) return;
            event.stopPropagation();
            event.nativeEvent.preventDefault();
            clearDragGuard.current?.();
            document.documentElement.dataset.badgeDragging = "true";
            const clearSelection = () => {
              const selection = window.getSelection();
              if (selection && !selection.isCollapsed) selection.removeAllRanges();
            };
            const preventSelection = (nativeEvent: Event) => nativeEvent.preventDefault();
            const pointerId = event.pointerId;
            let finished = false;
            const cleanup = () => {
              document.removeEventListener("selectstart", preventSelection, true);
              document.removeEventListener("dragstart", preventSelection, true);
              document.removeEventListener("selectionchange", clearSelection, true);
              document.removeEventListener("pointerup", onPointerEnd, true);
              document.removeEventListener("pointercancel", onPointerEnd, true);
              delete document.documentElement.dataset.badgeDragging;
              clearSelection();
              clearDragGuard.current = null;
              finishDrag.current = null;
            };
            const endDrag = () => {
              if (finished) return;
              finished = true;
              releasePending.current = true;
              setDragged(null);
              window.requestAnimationFrame(cleanup);
            };
            const onPointerEnd = (nativeEvent: PointerEvent) => {
              if (nativeEvent.pointerId === pointerId) endDrag();
            };
            document.addEventListener("selectstart", preventSelection, true);
            document.addEventListener("dragstart", preventSelection, true);
            document.addEventListener("selectionchange", clearSelection, true);
            document.addEventListener("pointerup", onPointerEnd, true);
            document.addEventListener("pointercancel", onPointerEnd, true);
            clearDragGuard.current = cleanup;
            finishDrag.current = endDrag;
            clearSelection();
            (event.target as Element).setPointerCapture(event.pointerId);
            const p = card.current.translation();
            smoothedDrag.current.set(p.x, p.y, p.z);
            setDragged(event.point.clone().sub(new THREE.Vector3(p.x, p.y, p.z)));
          }}
          onPointerUp={(event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation();
            if ((event.target as Element).hasPointerCapture(event.pointerId)) (event.target as Element).releasePointerCapture(event.pointerId);
            finishDrag.current?.();
          }}>
          <Badge peekVisible={peekVisible && !interactive} refractor={refractor} />
        </group>
      </RigidBody>
    </group>
    <mesh frustumCulled={false}>
      <primitive object={band} attach="geometry" />
      <primitive object={material} attach="material" />
    </mesh>
    <group ref={foldedWebbing}>
      <mesh geometry={loop} material={material} />
      <mesh geometry={stitches} material={threadMaterial} />
    </group>
  </>;
}

function Scene({ released, peekActive, peekHovered, peekVisible, hoverX, refractor, onReady }: { released: boolean; peekActive: boolean; peekHovered: boolean; peekVisible: boolean; hoverX: { current: number }; refractor: RefObject<HTMLDivElement | null>; onReady: () => void }) {
  const getRendererState = useThree((state) => state.get);
  useLayoutEffect(() => {
    // Start a resumed simulation at its current pose, regardless of time spent idle.
    const { clock, invalidate } = getRendererState();
    clock.getDelta();
    invalidate();
  }, [released, peekActive, peekVisible, peekHovered, getRendererState]);
  useEffect(() => {
    onReady();
  }, [onReady]);
  return <>
    <ambientLight intensity={0.65} />
    <directionalLight position={[-5, 7, 4]} intensity={1.6} />
    <directionalLight position={[4, 1, 5]} intensity={0.35} />
    <Environment resolution={256}>
      {/* A tall window, a narrow kicker and an overhead bounce. Dark gaps
          between panels give the rounded silver bar a distinct silhouette. */}
      <Lightformer intensity={4.4} color="white" position={[-2.65, 1.5, 4.8]} scale={[2.55, 7, 1]} />
      <Lightformer intensity={5.8} color="white" position={[2.45, 0.3, 4.6]} scale={[0.74, 6, 1]} />
      <Lightformer intensity={2.4} color="#ffffff" position={[0.4, 4.5, -1]} scale={[5, 1.7, 1]} />
      <Lightformer intensity={2.2} color="white" position={[-2.7, -1.6, -2.5]} scale={[1.6, 4, 1]} />
    </Environment>
    <Physics paused={!released && !peekActive} gravity={released ? [0, -40, 0] : [0, 0, 0]} timeStep={1 / 60} numSolverIterations={8}
      numInternalPgsIterations={2} interpolate><Lanyard interactive={released} peekHovered={peekHovered} peekVisible={peekVisible} hoverX={hoverX} refractor={refractor} /></Physics>
  </>;
}

export default function VercelLanyard() {
  const [sceneReady, setSceneReady] = useState(false);
  const [peekVisible, setPeekVisible] = useState(false);
  const [peekHovered, setPeekHovered] = useState(false);
  const [peekActive, setPeekActive] = useState(true);
  const [canvasVisible, setCanvasVisible] = useState(true);
  const [released, setReleased] = useState(false);
  const [mobileCanvas, setMobileCanvas] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const refractor = useRef<HTMLDivElement>(null);
  const opticalClip = useMemo(() => headerClipPath(), []);
  const hoverX = useRef(0);
  const peekTimer = useRef<number | undefined>(undefined);
  // Allow the reveal, its shine, and the damped hover pose to finish before pausing.
  const wakePeek = useCallback(() => {
    setPeekActive(true);
    window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(() => setPeekActive(false), 1300);
  }, []);
  useEffect(() => () => window.clearTimeout(peekTimer.current), []);
  useEffect(() => {
    if (!container.current) return;
    let inView = true;
    const update = () => setCanvasVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    }, { rootMargin: "32px" });
    observer.observe(container.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const markReady = useCallback(() => setSceneReady(true), []);
  const updatePeekHover = useCallback((clientX: number, element: HTMLElement) => {
    const bounds = element.getBoundingClientRect();
    hoverX.current = THREE.MathUtils.clamp((clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
    wakePeek();
  }, [wakePeek]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const sync = () => setMobileCanvas(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!sceneReady) return;
    const timer = window.setTimeout(() => {
      setPeekVisible(true);
      wakePeek();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [sceneReady, wakePeek]);
  return <div className={styles.scene} aria-label="Interactive Vercel badge">
    {released && <>
      <VinylOptics />
      <div className={styles.refractionViewport} aria-hidden="true">
        <div ref={refractor} className={styles.refraction}
          style={{ width: OPTICAL_WIDTH, height: OPTICAL_HEIGHT, clipPath: opticalClip }} />
      </div>
    </>}
    {!released && <button className={styles.peekButton} type="button" aria-label="Drop the Vercel badge"
      onPointerEnter={(event) => { updatePeekHover(event.clientX, event.currentTarget); setPeekHovered(true); }}
      onPointerMove={(event) => updatePeekHover(event.clientX, event.currentTarget)}
      onPointerLeave={() => { hoverX.current = 0; setPeekHovered(false); wakePeek(); }}
      onFocus={() => { setPeekHovered(true); wakePeek(); }} onBlur={() => { setPeekHovered(false); wakePeek(); }}
      onClick={() => setReleased(true)} disabled={!peekVisible} />}
    <div ref={container} className={`${styles.canvas} ${peekVisible ? styles.ready : ""}`}>
      <Canvas camera={{ position: [0, 0, 13], fov: 25 }} dpr={mobileCanvas ? 2.75 : 3.75}
        frameloop={canvasVisible ? "demand" : "never"}
        eventSource={document.body}
        events={(state) => ({
          ...events(state),
          compute: (event, state) => {
            const bounds = container.current?.getBoundingClientRect();
            if (!bounds) return;
            state.pointer.set(
              ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
              -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
            );
            state.raycaster.setFromCamera(state.pointer, state.camera);
          },
        })}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.2; }}>
        <Suspense fallback={null}><Scene released={released} peekActive={peekActive} peekHovered={peekHovered} peekVisible={peekVisible} hoverX={hoverX} refractor={refractor} onReady={markReady} /></Suspense>
      </Canvas>
    </div>
  </div>;
}

useGLTF.preload(MODEL);
