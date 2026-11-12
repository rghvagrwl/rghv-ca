"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, events, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import styles from "./vercel-lanyard.module.css";

const MODEL = "/models/vercel-lanyard/tag.glb";
const BAND_SEGMENTS = 96;
const BAND_WIDTH = 0.27;
const STITCH_SECTION = 8;
const STITCH_COUNT = 9;
// Cross-section of the webbing around the ring's upper bar, in card-local Y/Z.
const LOOP_PATH = [
  [0.07, 0.055], [0.035, 0.06], [0.007, 0.047], [-0.012, 0.018],
  [-0.012, -0.025], [0.01, -0.078], [0.055, -0.125],
  [0.11, -0.13], [0.17, -0.078], [0.225, -0.025],
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
  const top = 1.023;
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
  shape.holes.push(new THREE.Path(lanyardSlotShape().getPoints(8).reverse()));
  return shape;
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
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
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

function Badge({ peekVisible }: { peekVisible: boolean }) {
  const { nodes } = useGLTF(MODEL) as unknown as Model;
  const card = useMemo(() => cardSurface(), []);
  const shine = useMemo(() => new THREE.ShapeGeometry(cardShape(), 8), []);
  const inset = useMemo(() => new THREE.ShapeGeometry(triangleShape()), []);
  const shineMaterial = useRef<THREE.ShaderMaterial>(null);
  const peekStart = useRef<number | null>(null);
  const reduceMotion = useRef(false);
  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
  useFrame(() => {
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
  return <group scale={2.25} position={[0, -1.2, -0.05]}>
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
            float broad = exp(-pow(offset / 0.43, 2.0));
            float glint = exp(-pow(offset / 0.15, 2.0));
            float sideFill = exp(-pow((abs(lightHit.x) - 1.7) / 0.75, 2.0));
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
            float sweep = exp(-pow((diagonal - sweepCenter) / 0.13, 2.0))
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

function Lanyard({ interactive, peekHovered, peekVisible, hoverX, maxSpeed = 50, minSpeed = 10 }: { interactive: boolean; peekHovered: boolean; peekVisible: boolean; hoverX: { current: number }; maxSpeed?: number; minSpeed?: number }) {
  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<RapierRigidBody>(null!);
  const j2 = useRef<RapierRigidBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);
  const [dragged, setDragged] = useState<THREE.Vector3 | null>(null);
  const [hovered, setHovered] = useState(false);
  const camera = useThree((state) => state.camera);
  const canvasHeight = useThree((state) => state.size.height);
  const horizontalLimit = useRef(HORIZONTAL_LIMIT);
  const band = useMemo(() => createBandGeometry(), []);
  const loop = useMemo(() => createBandGeometry(LOOP_SEGMENTS, -1), []);
  const stitches = useMemo(() => createStitchGeometry(), []);
  const fabricNormalMap = useMemo(() => createFabricNormalMap(), []);
  const fabricColorMap = useMemo(() => createFabricColorMap(), []);
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0x252525, map: fabricColorMap, vertexColors: true,
    roughness: 0.92, metalness: 0,
    specularIntensity: 0.1, sheen: 0.15,
    sheenColor: new THREE.Color(0x242424), sheenRoughness: 0.94,
    normalMap: fabricNormalMap, normalScale: new THREE.Vector2(1.1, 1.1),
    envMapIntensity: 0.12, side: THREE.DoubleSide,
  }), [fabricNormalMap, fabricColorMap]);
  const threadMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x353535, roughness: 1, metalness: 0, side: THREE.DoubleSide,
  }), []);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(Array.from({ length: 5 }, () => new THREE.Vector3()), false, "chordal"), []);
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
    quaternion: new THREE.Quaternion(), tilt: new THREE.Euler(),
    tangent: new THREE.Vector3(), previousTangent: new THREE.Vector3(),
    front: new THREE.Vector3(), desiredFront: new THREE.Vector3(), right: new THREE.Vector3(),
    frameAxis: new THREE.Vector3(), frameRotation: new THREE.Quaternion(),
  });
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 0.92]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 0.92]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 0.92]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]]);
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
    if (!fixed.current || !j1.current || !j2.current || !j3.current || !card.current) return;
    const { vec, dir, ang, rot, target, attachment, jointOffset, quaternion, tilt,
      tangent, previousTangent, front, desiredFront, right, frameAxis, frameRotation } = vectors.current;
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
    const end = j3.current.translation();
    const anchor = fixed.current.translation();
    const cardRotation = card.current.rotation();
    quaternion.set(cardRotation.x, cardRotation.y, cardRotation.z, cardRotation.w);
    // The long strap meets a short return that wraps under the ring's top bar.
    vec.set(0, LOOP_PATH[0][0], LOOP_PATH[0][1]).applyQuaternion(quaternion);
    curve.points[0].set(end.x + vec.x, end.y + vec.y, end.z + vec.z);
    vec.set(0, 0.27, 0.01).applyQuaternion(quaternion);
    curve.points[1].set(end.x + vec.x, end.y + vec.y, end.z + vec.z);
    curve.points[2].set(lerped.current[1].x, lerped.current[1].y,
      Math.min(lerped.current[1].z, end.z - 0.08));
    curve.points[3].set(lerped.current[0].x, lerped.current[0].y,
      Math.min(lerped.current[0].z, end.z - 0.06));
    curve.points[4].set(anchor.x, anchor.y, anchor.z);
    const firstPosition = band.getAttribute("position") as THREE.BufferAttribute;
    let bandMoved = !geometryReady.current
      || Math.abs(firstPosition.getY(0) - curve.points[0].y) > 0.5;
    curve.points.forEach((point, index) => {
      const offset = index * 3;
      if (Math.abs(point.x - lastBand.current[offset]) > 0.002
        || Math.abs(point.y - lastBand.current[offset + 1]) > 0.002
        || Math.abs(point.z - lastBand.current[offset + 2]) > 0.002) bandMoved = true;
      lastBand.current[offset] = point.x;
      lastBand.current[offset + 1] = point.y;
      lastBand.current[offset + 2] = point.z;
    });
    if (1 - Math.abs(lastBandRotation.current.dot(quaternion)) > 0.000001) bandMoved = true;
    lastBandRotation.current.copy(quaternion);
    if (bandMoved) {
      for (let i = 0; i <= BAND_SEGMENTS; i++) curve.getPoint(i / BAND_SEGMENTS, samples[i]);
      const positions = band.getAttribute("position") as THREE.BufferAttribute;
      const loopPositions = loop.getAttribute("position") as THREE.BufferAttribute;
      const stitchPositions = stitches.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i <= BAND_SEGMENTS; i++) {
        const point = samples[i];
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
          desiredFront.copy(camera.position).sub(point);
          desiredFront.addScaledVector(tangent, -desiredFront.dot(tangent)).normalize();
          front.lerp(desiredFront, 0.015);
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
          positions.setXYZ(i * BAND_PROFILE.length + side,
            point.x + right.x * across * width + front.x * depth,
            point.y + right.y * across * width + front.y * depth,
            point.z + right.z * across * width + front.z * depth);
        }
        if (i === STITCH_SECTION - 1) {
          for (let stitch = 0; stitch < STITCH_COUNT; stitch++) {
            const center = ((stitch / (STITCH_COUNT - 1)) * 2 - 1) * 0.35 * width;
            for (let corner = 0; corner < 4; corner++) {
              const across = center + (corner % 2 ? 0.006 : -0.006);
              const along = corner >= 2 ? 0.003 : -0.003;
              const depth = 0.029;
              stitchPositions.setXYZ(stitch * 4 + corner,
                point.x + right.x * across + tangent.x * along + front.x * depth,
                point.y + right.y * across + tangent.y * along + front.y * depth,
                point.z + right.z * across + tangent.z * along + front.z * depth);
            }
          }
        }
      }
      positions.needsUpdate = true;
      band.computeVertexNormals();
      for (let section = 0; section <= LOOP_SEGMENTS; section++) {
        const point = LOOP_SAMPLES[section];
        const before = LOOP_SAMPLES[Math.max(0, section - 1)];
        const after = LOOP_SAMPLES[Math.min(LOOP_SEGMENTS, section + 1)];
        const dy = after.y - before.y;
        const dz = after.z - before.z;
        const inverseLength = 1 / Math.hypot(dy, dz);
        const normalY = dz * inverseLength;
        const normalZ = -dy * inverseLength;
        for (let side = 0; side < BAND_PROFILE.length; side++) {
          const [across, depth] = BAND_PROFILE[side];
          vec.set(across * BAND_WIDTH, point.y + normalY * depth,
            point.z + normalZ * depth).applyQuaternion(quaternion);
          loopPositions.setXYZ(section * BAND_PROFILE.length + side,
            end.x + vec.x, end.y + vec.y, end.z + vec.z);
        }
      }
      loopPositions.needsUpdate = true;
      loop.computeVertexNormals();
      stitchPositions.needsUpdate = true;
      stitches.computeVertexNormals();
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
        <group onPointerOver={() => { if (interactive) setHovered(true); }} onPointerOut={() => setHovered(false)}
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
          <Badge peekVisible={peekVisible && !interactive} />
        </group>
      </RigidBody>
    </group>
    <mesh frustumCulled={false}>
      <primitive object={band} attach="geometry" />
      <primitive object={material} attach="material" />
    </mesh>
    <mesh frustumCulled={false}>
      <primitive object={loop} attach="geometry" />
      <primitive object={material} attach="material" />
    </mesh>
    <mesh frustumCulled={false}>
      <primitive object={stitches} attach="geometry" />
      <primitive object={threadMaterial} attach="material" />
    </mesh>
  </>;
}

function Scene({ released, peekHovered, peekVisible, hoverX, onReady }: { released: boolean; peekHovered: boolean; peekVisible: boolean; hoverX: { current: number }; onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return <>
    <ambientLight intensity={0.65} />
    <directionalLight position={[-5, 7, 4]} intensity={1.6} />
    <directionalLight position={[4, 1, 5]} intensity={0.35} />
    <Environment resolution={256}>
      <Lightformer intensity={3.5} color="white" position={[-2, 0, 5]}
        rotation={[0, 0, 0]} scale={[0.06, 7, 1]} />
      <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
      <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
      <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
      <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
    </Environment>
    <Physics gravity={released ? [0, -40, 0] : [0, 0, 0]} timeStep={1 / 60} numSolverIterations={8}
      numInternalPgsIterations={2} interpolate><Lanyard interactive={released} peekHovered={peekHovered} peekVisible={peekVisible} hoverX={hoverX} /></Physics>
  </>;
}

export default function VercelLanyard() {
  const [sceneReady, setSceneReady] = useState(false);
  const [peekVisible, setPeekVisible] = useState(false);
  const [peekHovered, setPeekHovered] = useState(false);
  const [released, setReleased] = useState(false);
  const [mobileCanvas, setMobileCanvas] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const hoverX = useRef(0);
  const markReady = useCallback(() => setSceneReady(true), []);
  const updatePeekHover = useCallback((clientX: number, element: HTMLElement) => {
    const bounds = element.getBoundingClientRect();
    hoverX.current = THREE.MathUtils.clamp((clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const sync = () => setMobileCanvas(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!sceneReady) return;
    const timer = window.setTimeout(() => setPeekVisible(true), 500);
    return () => window.clearTimeout(timer);
  }, [sceneReady]);
  return <div className={styles.scene} aria-label="Interactive Vercel badge">
    {!released && <button className={styles.peekButton} type="button" aria-label="Drop the Vercel badge"
      onPointerEnter={(event) => { updatePeekHover(event.clientX, event.currentTarget); setPeekHovered(true); }}
      onPointerMove={(event) => updatePeekHover(event.clientX, event.currentTarget)}
      onPointerLeave={() => { hoverX.current = 0; setPeekHovered(false); }}
      onFocus={() => setPeekHovered(true)} onBlur={() => setPeekHovered(false)}
      onClick={() => setReleased(true)} disabled={!peekVisible} />}
    <div ref={container} className={`${styles.canvas} ${peekVisible ? styles.ready : ""}`}>
      <Canvas camera={{ position: [0, 0, 13], fov: 25 }} dpr={mobileCanvas ? 2.75 : 3.75}
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
        <Suspense fallback={null}><Scene released={released} peekHovered={peekHovered} peekVisible={peekVisible} hoverX={hoverX} onReady={markReady} /></Suspense>
      </Canvas>
    </div>
  </div>;
}

useGLTF.preload(MODEL);
