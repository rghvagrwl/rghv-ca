"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import StudyReady from "../_study-ready";
import { editions, initialBookIndex } from "./editions";
import { INITIAL_ART, mountBooks } from "./book-art";
import BookCaption from "./book-caption";
import { paperbackTipTravel } from "./paperback-flex";
import { shelfSweepDuration } from "./spine-reveal";
import { frameInspection, frameShelf, shelfPitch } from "./shelf-flight";
import type { ShelfRail } from "./shelf-navigation";
import styles from "./books.module.css";

const { clamp, lerp, smoothstep } = THREE.MathUtils;
const maxHeight = Math.max(...editions.map(e => e.height / 100));
const FLOOR = -maxHeight / 2;
const SPINE = Math.PI / 2;
const SHELVED_ROTATION = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, SPINE, 0));
const turnProgress = (pull: number) => smoothstep(pull, 0.23, 1);
// Keep the spine visible on the left, with a shallower view across the top.
const OPEN_YAW = 43 * Math.PI / 180;
const OPEN_PITCH = 28 * Math.PI / 180 - shelfPitch;
const viewUpY = Math.cos(shelfPitch), viewUpZ = -Math.sin(shelfPitch);
const inspectDistanceInDiagonals = 2.4;
const GAP = 0.02; // Two millimetres of air between closed bindings.
const wheelGestureGap = 140; // Milliseconds of quiet between trackpad gestures.
const shelf = (() => {
  const width = editions.reduce((sum, book) => sum + book.thickness / 100, 0) + GAP * (editions.length - 1);
  let x = -width / 2;
  const poses = editions.map(e => {
    const halfX = e.thickness / 200, w = e.width / 100;
    const t = 2 * halfX, h = e.height / 100;
    const openWidth = Math.cos(OPEN_YAW) * w + Math.sin(OPEN_YAW) * t;
    const viewPitch = OPEN_PITCH + shelfPitch;
    const openHeight = Math.cos(viewPitch) * h + Math.sin(viewPitch) * (Math.sin(OPEN_YAW) * w + Math.cos(OPEN_YAW) * t);
    const diagonal = Math.hypot(w, h, t), eyeDistance = diagonal * inspectDistanceInDiagonals;
    const tipTravel = paperbackTipTravel(e);
    // Enclose the flexing fore-edge as well as the boards. Yaw can swing
    // the width and thickness across the screen; pitch adds no horizontal span.
    const radius = diagonal / 2 + 2 * tipTravel;
    const tangent = Math.sqrt(1 - (radius / eyeDistance) ** 2);
    const maxX = Math.min(Math.hypot(w, t) / 2 + 2 * tipTravel, radius * tangent);
    const projectedHalfWidth = maxX / (1 - Math.sqrt(radius ** 2 - maxX ** 2) / eyeDistance);
    // Deep folios project a few millimetres farther than pocket paperbacks.
    const spineDepth = clamp((e.width - 150) * 0.0008, -0.04, 0.08);
    const pose = { x: x + halfX, y: FLOOR + h / 2, z: spineDepth - w / 2, halfX, w, openWidth, openHeight,
      eyeDistance, radius, projectedHalfWidth, tipTravel };
    x += 2 * halfX + GAP;
    return pose;
  });
  return { poses };
})();
const LAST = editions.length - 1;
function spineX(index: number) {
  const n = clamp(index, 0, LAST), i = Math.floor(n);
  return lerp(shelf.poses[i].x, shelf.poses[Math.min(i + 1, LAST)].x, n - i);
}
function indexAtX(x: number) {
  for (let i = 1; i <= LAST; i++) {
    const a = shelf.poses[i - 1].x, b = shelf.poses[i].x;
    if (x <= b) return i - 1 + clamp((x - a) / (b - a), 0, 1);
  }
  return LAST;
}

type Spring = { position: number; velocity: number };
function stepSpring(spring: Spring, target: number, rate: number, dt: number, reduced: boolean) {
  const offset = spring.position - target;
  if (reduced || (Math.abs(offset) < 0.00045 && Math.abs(spring.velocity) < 0.008)) {
    spring.position = target;
    spring.velocity = 0;
    return false;
  }
  const decay = Math.exp(-rate * dt);
  const v = spring.velocity + rate * offset;
  spring.position = target + (offset + v * dt) * decay;
  spring.velocity = (spring.velocity - rate * v * dt) * decay;
  return true;
}

type Grip = { id: number; index: number; x: number; y: number; yaw: number; pitch: number; moved: boolean; wasOpen: boolean; pan: boolean; railX: number };
type Controls = {
  selected: number; hover: number; hoverX: number; hoverY: number; yaw: number; pitch: number; reduced: boolean;
  grip: Grip | null;
};
function subscribeToSize(update: () => void) {
  window.addEventListener("resize", update);
  return () => window.removeEventListener("resize", update);
}
function pixelDensity() {
  return Math.min(3.5, Math.max(2.75, window.devicePixelRatio * 1.55),
    Math.sqrt(11_000_000 / Math.max(1, window.innerWidth * window.innerHeight)));
}

function Studio() {
  return <>
    <hemisphereLight args={["#ffffff", "#e4e2dd", 1.04]} />
    <directionalLight position={[-6, 4.4, 4.7]} intensity={3.0} />
    <Environment frames={1} resolution={256} environmentIntensity={0.76}>
      <Lightformer position={[-4.6, 2.6, 3.4]} intensity={3.3} scale={[3.8, 6.5, 1]} />
      <Lightformer position={[4.5, 0.8, 0.5]} intensity={0.85} scale={[2.2, 5.0, 1]} />
      <Lightformer position={[0, 4, -2]} intensity={1.35} scale={[5, 4, 1]} />
    </Environment>
  </>;
}

type ShelfProps = { onReady: (ready: boolean) => void; navigator: ShelfRail };
type CaptionSize = { index: number; width: number; height: number };

function Shelf({ onSelect, onRevealCaption, onReady, density, captionSize, navigator }: ShelfProps & {
  onSelect: (i: number) => void; onRevealCaption: (i: number) => void; density: number; captionSize: CaptionSize;
}) {
  const { gl, size, get, set, invalidate } = useThree();
  const browseCamera = useRef(get().camera as THREE.OrthographicCamera);
  const [inspectCamera] = useState(() => new THREE.PerspectiveCamera());
  const showingCases = useRef(false);
  const captionPending = useRef(false);
  const revealClock = useRef({ elapsed: 0, firstView: true });
  const library = useRef<ReturnType<typeof mountBooks> | null>(null);
  const controls = useRef<Controls>({ selected: -1, hover: -1, hoverX: 0, hoverY: 0, grip: null, yaw: 0, pitch: 0, reduced: false });
  const animation = useRef(editions.map(() => ({
    focus: { position: 0, velocity: 0 }, rate: 12.5, padding: 0, captionWidth: 0,
    handoffScale: 0, handoffStart: 0, elevation: 0, handoffElevation: 0,
    returnTurn: 0, returnPose: new THREE.Quaternion(),
    bend: { position: 0, velocity: 0 }, twist: { position: 0, velocity: 0 },
    hover: 0, lookX: 0, lookY: 0, yaw: 0, pitch: 0,
  })));
  const roots = useRef<Array<THREE.Group | null>>([]);
  const bindings = useRef<Array<THREE.Group | null>>([]);
  const hits = useRef<Array<THREE.Mesh | null>>([]);
  const reopening = useRef({ index: -1, elapsed: 0, rotation: new THREE.Quaternion() });
  const rail = useRef({ position: spineX(initialBookIndex), target: spineX(initialBookIndex),
    velocity: 0, focusRate: 0, scrubbing: false, wheel: false });
  const zoom = size.height * 0.72 / maxHeight;
  // Fit the rotating book between the top margin and the actual wrapped text.
  const topMargin = clamp(size.height * 0.085, 14, 88);
  const bottomMargin = captionSize.height + clamp(size.height * 0.034, 12, 32);
  const focusHeight = Math.max(1, size.height - topMargin - bottomMargin);
  const lift = Math.max(0, (bottomMargin - topMargin) / 2);
  // Each viewport edge defines a plane through the eye. Fit a sphere around
  // the rotating book between those planes, including its off-center lift.
  const topRoom = size.height / 2 - topMargin, bottomRoom = size.height / 2 - bottomMargin;
  const verticalZoom = (room: number, offset: number, radius: number, eyeDistance: number) =>
    Math.sqrt(Math.max(1, ((room - offset) / radius) ** 2 - (room / eyeDistance) ** 2));
  useLayoutEffect(() => {
    if (captionSize.index >= 0) animation.current[captionSize.index].captionWidth = captionSize.width;
    invalidate();
  }, [captionSize, invalidate]);
  const choose = useCallback((i: number) => {
    const c = controls.current;
    const blend = reopening.current, node = roots.current[i];
    const incoming = animation.current[i];
    const exchanging = i >= 0 && c.selected >= 0 && i !== c.selected;
    if (i !== c.selected && incoming?.focus.position > 0 && node) {
      // Picking a returning cover back up must start from its visible pose,
      // not the unwrapped drag angles it had before it was released.
      blend.index = i; blend.elapsed = 0; blend.rotation.copy(node.quaternion);
      animation.current[i].yaw = 0; animation.current[i].pitch = 0;
    } else if (i !== blend.index) blend.index = -1;
    if (c.selected >= 0 && c.selected !== i) {
      const node = roots.current[c.selected], outgoing = animation.current[c.selected];
      if (node) {
        outgoing.returnTurn = turnProgress(outgoing.focus.position);
        outgoing.returnPose.copy(node.quaternion);
      }
      outgoing.rate = exchanging ? 8 : 5.8;
    }
    if (incoming) {
      incoming.handoffScale = 0;
      const lens = get().camera;
      if (exchanging && node && lens instanceof THREE.PerspectiveCamera) {
        const depth = -viewUpZ * node.position.y + viewUpY * node.position.z;
        const eyeDepth = -viewUpZ * lens.position.y + viewUpY * lens.position.z;
        incoming.handoffScale = get().size.height * lens.projectionMatrix.elements[5] / (2 * (eyeDepth - depth));
        incoming.handoffStart = clamp(incoming.focus.position, 0, 1);
        incoming.handoffElevation = incoming.elevation;
      }
      incoming.rate = exchanging ? 8 : 12.5;
      // Lead the turn slightly so an edge spine has room to unfold on screen.
      rail.current.focusRate = incoming.rate * 1.08;
      rail.current.target = shelf.poses[i].x;
      library.current?.inspect(i);
    }
    rail.current.wheel = false;
    c.selected = i; c.yaw = 0; c.pitch = 0; c.hover = -1;
    captionPending.current = i >= 0;
    onSelect(i); invalidate();
  }, [get, invalidate, onSelect]);
  const art = useLoader(THREE.TextureLoader, INITIAL_ART);
  const cadence = useRef({ frames: 0, seconds: 0, ratio: 1, active: false });

  useLayoutEffect(() => {
    const r = rail.current;
    return navigator.connectScene((index, phase) => {
      if (phase !== "move") choose(-1);
      r.focusRate = r.velocity = 0;
      r.scrubbing = phase !== "end";
      r.target = spineX(phase === "end" ? Math.round(index) : index);
      invalidate();
    });
  }, [navigator, choose, invalidate]);

  useLayoutEffect(() => {
    const anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    const books = mountBooks(bindings.current.map(binding => binding!), art, anisotropy, invalidate);
    library.current = books;
    shelf.poses.forEach((pose, i) => {
      const node = roots.current[i]!;
      node.position.set(pose.x, pose.y, pose.z);
      node.quaternion.copy(SHELVED_ROTATION);
    });
    books.updateSpineContacts();
    const ground = getComputedStyle(document.documentElement).getPropertyValue("--canvas-page-bg").trim();
    books.setIntroGround(new THREE.Color(ground));
    revealClock.current = { elapsed: 0, firstView: true };
    controls.current.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (controls.current.reduced) books.finishSpineReveals();
    onReady(true);
    invalidate();
    const resume = () => { if (!document.hidden) invalidate(); };
    document.addEventListener("visibilitychange", resume);
    return () => {
      document.removeEventListener("visibilitychange", resume);
      library.current = null;
      books.dispose();
    };
  }, [art, gl, invalidate, onReady]);

  useLayoutEffect(() => {
    frameShelf(browseCamera.current, size.width, size.height, rail.current.position, zoom);
    invalidate();
  }, [size.width, size.height, invalidate, zoom]);

  useEffect(() => {
    const surface = gl.domElement;
    const read = () => controls.current;
    let wheelEnd: ReturnType<typeof setTimeout> | undefined;
    const snapRail = () => { const r = rail.current; r.target = spineX(Math.round(indexAtX(r.target))); invalidate(); };
    const end = (event: PointerEvent) => {
      const c = read(), g = c.grip;
      if (!g || g.id !== event.pointerId) return;
      // Some browsers coalesce the last movement into pointerup. Apply its
      // final coordinates before deciding whether this was a tap or a drag.
      if (event.type === "pointerup") move(event);
      if (g.pan) snapRail();
      c.grip = null;
      if (surface.hasPointerCapture(g.id)) surface.releasePointerCapture(g.id);
      if (event.type === "pointerup" && !g.moved) choose(g.wasOpen || g.index < 0 ? -1 : g.index);
      surface.style.cursor = c.hover >= 0 ? "grab" : "";
      invalidate();
    };
    const move = (event: PointerEvent) => {
      const c = read(), g = c.grip;
      if (!g || g.id !== event.pointerId) return;
      const dx = event.clientX - g.x, dy = event.clientY - g.y;
      if (!g.moved && Math.hypot(dx, dy) > (event.pointerType === "touch" ? 7 : 4)) {
        g.moved = true;
        g.pan = g.index < 0 || (c.selected < 0 && Math.abs(dx) > Math.abs(dy));
        if (!g.pan && !g.wasOpen) choose(g.index);
        surface.style.cursor = "grabbing";
      }
      if (!g.moved) return;
      if (g.pan) {
        const r = rail.current;
        r.focusRate = r.velocity = 0;
        r.target = clamp(g.railX - dx / zoom, shelf.poses[0].x, shelf.poses[LAST].x);
        invalidate(); return;
      }
      const span = Math.min(surface.clientWidth, surface.clientHeight);
      c.yaw = g.yaw + 2 * Math.PI * dx / (span * 0.85);
      c.pitch = clamp(g.pitch + 3.35 * dy / span, -1.35 - OPEN_PITCH, 1.35 - OPEN_PITCH);
      invalidate();
    };
    const wheel = (event: WheelEvent) => {
      const r = rail.current;
      if (read().selected >= 0 || read().grip || r.scrubbing || event.ctrlKey) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientWidth : 1;
      r.focusRate = r.velocity = 0;
      r.target = clamp(r.target + delta * unit / zoom, shelf.poses[0].x, shelf.poses[LAST].x);
      r.wheel = true; clearTimeout(wheelEnd);
      wheelEnd = setTimeout(() => { if (r.wheel) { r.wheel = false; snapRail(); } }, wheelGestureGap);
      invalidate();
    };
    const key = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const { selected, hover } = read(), n = editions.length;
      const current = selected < 0 ? Math.round(indexAtX(rail.current.target)) : selected;
      if (event.key === "Escape") choose(-1);
      else if (event.key === "ArrowRight") choose((current + 1) % n);
      else if (event.key === "ArrowLeft") choose((current - 1 + n) % n);
      else if (event.key === "Enter" || event.key === " ") choose(selected >= 0 ? -1 : hover >= 0 ? hover : current);
      else return;
      event.preventDefault(); invalidate();
    };
    const blur = () => {
      const c = read(), g = c.grip; c.grip = null; c.hover = -1;
      if (g && surface.hasPointerCapture(g.id)) surface.releasePointerCapture(g.id);
      surface.style.cursor = ""; invalidate();
    };
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      read().reduced = motion.matches;
      if (motion.matches) library.current?.finishSpineReveals();
      invalidate();
    };
    updateMotion();
    motion.addEventListener("change", updateMotion);
    surface.addEventListener("wheel", wheel, { passive: false });
    surface.addEventListener("keydown", key);
    surface.addEventListener("lostpointercapture", end);
    window.addEventListener("blur", blur);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      clearTimeout(wheelEnd);
      motion.removeEventListener("change", updateMotion);
      surface.removeEventListener("wheel", wheel);
      surface.removeEventListener("keydown", key);
      surface.removeEventListener("lostpointercapture", end);
      window.removeEventListener("blur", blur);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("pointermove", move);
      blur();
    };
  }, [gl, choose, invalidate, zoom]);

  const pick = (event: ThreeEvent<PointerEvent>, index: number) => {
    event.stopPropagation();
    const c = controls.current;
    if (c.grip || !event.nativeEvent.isPrimary || event.button !== 0) return;
    const surface = gl.domElement;
    surface.focus({ preventScroll: true }); surface.setPointerCapture(event.pointerId);
    rail.current.wheel = false;
    const wasOpen = c.selected === index;
    c.grip = { id: event.pointerId, index, x: event.clientX, y: event.clientY, moved: false,
      wasOpen, yaw: wasOpen ? c.yaw : 0, pitch: wasOpen ? c.pitch : 0, pan: false, railX: rail.current.position };
    invalidate();
  };

  useFrame(({ camera, setDpr }, delta) => {
    const books = library.current;
    if (!books || document.hidden) return;
    const c = controls.current, state = animation.current, dt = Math.min(delta, 0.05);
    let moving = false;
    function toward(a: number, b: number, k: number) {
      if (c.reduced || Math.abs(a - b) < 0.00012) return b;
      moving = true; return lerp(a, b, -Math.expm1(-k * dt));
    }
    const r = rail.current;
    if (r.focusRate) {
      if (stepSpring(r, r.target, r.focusRate, dt, c.reduced)) moving = true;
    } else {
      r.position = toward(r.position, r.target, c.grip?.pan || r.scrubbing ? 36 : 11);
    }
    const index = indexAtX(r.position);
    navigator.report(index);

    let totalPadding = 0;
    let zoomWeight = 0;
    let weightedZoom = 0;
    let pivotDepthSum = 0;
    let inverseDistanceSum = 0;
    let handoffScale = 0, handoffDepth = 0;
    for (let i = 0; i < state.length; i++) {
      const node = roots.current[i]; if (!node) continue;
      const p = shelf.poses[i], s = state[i], active = i === c.selected;
      if (stepSpring(s.focus, active ? 1 : 0, s.rate, dt, c.reduced)) moving = true;
      const pull = clamp(s.focus.position, 0, 1);
      // Measure the incoming caption immediately, then reveal it once the
      // actual cover has lifted clear, including on slower frames.
      if (active && captionPending.current && pull >= 0.90) {
        captionPending.current = false;
        onRevealCaption(i);
      }
      const turn = turnProgress(pull), slide = smoothstep(pull, 0, 0.38);
      const hovered = !c.reduced && !c.grip && i === c.hover;
      s.hover = toward(s.hover, hovered ? 1 : 0, 11);
      s.lookX = toward(s.lookX, hovered ? c.hoverX : 0, 11);
      s.lookY = toward(s.lookY, hovered ? c.hoverY : 0, 11);
      const previousYaw = s.yaw, previousPitch = s.pitch;
      if (active) {
        s.yaw = toward(s.yaw, c.yaw, 19);
        s.pitch = toward(s.pitch, c.pitch, 19);
      } else if (pull === 0) {
        s.yaw = 0; s.pitch = 0;
      }
      node.position.z = p.z + (p.w + 0.42) * slide;
      // An incoming spine is already enlarged by the current lens. Start
      // lifting as it pulls out; reversing mid-handoff retraces the same lift.
      s.elevation = turn;
      if (s.handoffScale) {
        s.elevation = pull >= s.handoffStart
          ? lerp(s.handoffElevation, 1, (pull - s.handoffStart) / (1 - s.handoffStart || 1))
          : s.handoffElevation * pull / s.handoffStart;
      }
      node.position.y = lerp(p.y, -viewUpZ * node.position.z / viewUpY, s.elevation);
      if (!active && pull > 0 && s.returnTurn > 0) {
        node.quaternion.slerpQuaternions(SHELVED_ROTATION, s.returnPose, Math.min(1, turn / s.returnTurn));
      } else {
        node.rotation.set(
          (OPEN_PITCH + s.pitch - s.lookY * 0.043) * turn,
          lerp(SPINE, OPEN_YAW + s.yaw + s.lookX * 0.092, turn),
          0, "XYZ");
        const blend = reopening.current;
        if (active && blend.index === i) {
          blend.elapsed += dt;
          if (c.reduced || blend.elapsed >= 0.32) blend.index = -1;
          else {
            node.quaternion.slerp(blend.rotation, 1 - smoothstep(blend.elapsed, 0, 0.32));
            moving = true;
          }
        }
      }
      const binding = bindings.current[i];
      const tip = smoothstep(s.hover, 0, 1) * (1 - slide);
      if (binding && (tip > 0 || binding.rotation.z !== 0)) {
        // Local +Z runs across the spine. Rock the binding around its bottom
        // front edge, rather than tilting it around its center.
        const angle = tip * THREE.MathUtils.degToRad(3 + 0.4 * s.lookY);
        const twist = -tip * THREE.MathUtils.degToRad(0.5) * s.lookX;
        binding.rotation.set(0, twist, angle, "YXZ");
        const halfW = p.w / 2, halfH = editions[i].height / 200;
        binding.position.set(halfW, halfH, 0).applyQuaternion(binding.quaternion);
        binding.position.x -= halfW; binding.position.y -= halfH;
        // Keep the original slot hittable and include the newly exposed pages
        // so following their top edge doesn't drop the hover or miss a click.
        const hit = hits.current[i];
        if (hit) {
          const rise = Math.max(0, p.w * Math.sin(angle) - 2 * halfH * (1 - Math.cos(angle)));
          const side = (p.w + 2 * halfH * Math.sin(angle)) * Math.abs(Math.sin(twist));
          hit.scale.set(1, 1 + rise / (2 * halfH), 1 + side / p.halfX);
          hit.position.y = rise / 2;
          hit.position.z = 0;
        }
      }
      library.current?.reveal(i, pull > 0 || tip > 0);
      node.updateMatrix();
      if (p.tipTravel && (pull > 0 || s.bend.position !== 0 || s.twist.position !== 0)) {
        // A turn about the spine loads both free corners together. Pitching
        // loads them in opposite directions, in proportion to their height.
        const rotating = active && !c.reduced && dt > 0;
        const yawSpeed = rotating ? (s.yaw - previousYaw) / dt : 0;
        const pitchSpeed = rotating ? (s.pitch - previousPitch) / dt : 0;
        const gravity = -node.matrix.elements[9]; // World down along the local cover normal.
        const bendTarget = p.tipTravel * (0.42 * gravity + 0.78 * Math.tanh(yawSpeed * 0.23));
        const twistTarget = -p.tipTravel * 0.50 * Math.tanh(pitchSpeed * Math.cos(node.rotation.y) * 0.28);
        const settleRate = lerp(26, 16, p.tipTravel / 0.095);
        if (stepSpring(s.bend, bendTarget * turn, settleRate, dt, c.reduced || !pull)) moving = true;
        if (stepSpring(s.twist, twistTarget * turn, settleRate, dt, c.reduced || !pull)) moving = true;
        library.current?.flex(i, s.bend.position, s.twist.position);
        const hit = hits.current[i];
        if (hit && tip === 0) {
          // Include the curved free edge when picking the book nearly edge-on.
          const twist = Math.abs(s.twist.position);
          const low = Math.min(0, s.bend.position - twist);
          const high = Math.max(0, s.bend.position + twist);
          hit.scale.z = 1 + (high - low) / (2 * p.halfX);
          hit.position.z = (low + high) / 2;
        }
      }
      s.padding = 0;
      if (pull > 0) {
        const { radius, eyeDistance } = p;
        const bookZoom = Math.min(size.height * 0.70 / p.openHeight, focusHeight / p.openHeight,
          size.width * 0.78 / p.openWidth, size.width * 0.46 / p.projectedHalfWidth,
          verticalZoom(topRoom, lift, radius, eyeDistance), verticalZoom(bottomRoom, -lift, radius, eyeDistance));
        const pivotDepth = -viewUpZ * node.position.y + viewUpY * node.position.z;
        if (active && s.handoffScale && pull < 1) {
          handoffScale = lerp(s.handoffScale, bookZoom, smoothstep(pull, s.handoffStart, 1));
          handoffDepth = pivotDepth;
        } else if (active && pull === 1) s.handoffScale = 0;
        // In perspective the back corners of neighboring covers lean into the
        // gap. Leave room for the caption all the way back to their fore-edges.
        const neighborDepth = Math.max(shelf.poses[i - 1]?.w ?? 0, shelf.poses[i + 1]?.w ?? 0);
        const gapScale = 1 + (pivotDepth + neighborDepth) / eyeDistance;
        const captionClearance = (s.captionWidth / 2 + 12) / bookZoom;
        const coverClearance = p.projectedHalfWidth + 0.08;
        s.padding = (Math.max(captionClearance, coverClearance) * gapScale - p.halfX - GAP) * pull;
        const weight = smoothstep(pull, 0, 1);
        zoomWeight += weight;
        weightedZoom += weight * bookZoom;
        pivotDepthSum += weight * pivotDepth;
        inverseDistanceSum += weight / eyeDistance;
      }
      totalPadding += s.padding;
    }

    // Each binding reserves its width while it turns. The book leaving the
    // center and the book entering it can share the row on the same frame.
    let leftPadding = 0;
    for (let i = 0; i < state.length; i++) {
      const node = roots.current[i]; if (!node) continue;
      const padding = state[i].padding;
      node.position.x = shelf.poses[i].x + 2 * leftPadding + padding - totalPadding;
      leftPadding += padding;
      node.updateMatrix();
    }
    // Travel along the closed shelf. Neighbors move aside as the cover turns;
    // following those displaced spines would send the camera across the opening gap twice.
    const center = r.position;
    const ortho = browseCamera.current;
    const strength = Math.min(1, zoomWeight);
    const perspective = strength > 0.002;
    const pivotDepth = zoomWeight > 0 ? pivotDepthSum / zoomWeight : 0;
    const inverseDistance = perspective ? inverseDistanceSum / Math.max(1, zoomWeight) : 0;
    let fit = (weightedZoom + zoom * Math.max(0, 1 - zoomWeight)) / Math.max(1, zoomWeight);
    // During a handoff, ease the incoming cover from its actual on-screen
    // size. Compensate for the magnification as it travels toward the eye.
    if (handoffScale) fit = handoffScale * (1 - (handoffDepth - pivotDepth) * inverseDistance);
    for (let i = 0; i < state.length; i++) {
      const book = roots.current[i], pull = state[i].focus.position;
      // The settled inspection lens already fits every rotation. Individual
      // corners only need checking as a binding enters or leaves the row.
      if (!book || pull <= 0 || pull === 1) continue;
      const e = editions[i], m = book.matrix.elements;
      // Fit the actual projected corners. The nearest corner magnifies most,
      // and can cross the caption even when the pivot is perfectly centered.
      let safe = fit;
      // Reserve the caption margin as the book lifts into its inspection
      // position. Applying the full margin on the shelf makes the lens shrink then grow.
      const turn = turnProgress(pull);
      const pixelLift = turn * lift;
      const topRoom = size.height / 2 - turn * topMargin;
      const bottomRoom = size.height / 2 - turn * bottomMargin;
      for (let corner = 0; corner < 8; corner++) {
        const x = (corner & 1 ? 1 : -1) * e.width / 200;
        const y = (corner & 2 ? 1 : -1) * e.height / 200;
        const foreEdge = corner & 1 ? state[i].bend.position + (corner & 2 ? 1 : -1) * state[i].twist.position : 0;
        const z = (corner & 4 ? 1 : -1) * e.thickness / 200 + foreEdge;
        // Frame its width at the destination. An outgoing cover can leave
        // the viewport during a handoff without zooming out the whole shelf.
        const coverX = m[0] * x + m[4] * y + m[8] * z;
        const worldY = m[1] * x + m[5] * y + m[9] * z + m[13];
        const worldZ = m[2] * x + m[6] * y + m[10] * z + m[14];
        const up = viewUpY * worldY + viewUpZ * worldZ;
        const depth = -viewUpZ * worldY + viewUpY * worldZ;
        const depthScale = 1 - (depth - pivotDepth) * inverseDistance;
        const verticalRoom = up >= 0 ? topRoom * depthScale - pixelLift : bottomRoom * depthScale + pixelLift;
        safe = Math.min(safe, size.width * 0.46 * depthScale / Math.max(0.0001, Math.abs(coverX)),
          Math.max(1, verticalRoom) / Math.max(0.0001, Math.abs(up)));
      }
      fit = lerp(fit, safe, smoothstep(pull, 0, 0.65));
    }
    const lens = perspective ? inspectCamera : ortho;
    if (perspective) frameInspection(inspectCamera, center, pivotDepth, 1 / inverseDistance, fit, size.width, size.height);
    else {
      if (ortho.position.x !== center) { ortho.position.x = center; ortho.updateMatrixWorld(); }
      if (Math.abs(fit - ortho.zoom) > 0.0001) { ortho.zoom = fit; ortho.updateProjectionMatrix(); }
    }
    if (camera !== lens) set({ camera: lens });
    if (showingCases.current !== perspective) {
      library.current?.setOverview(perspective);
      showingCases.current = perspective;
    }
    // Lift in the camera plane so the offset doesn't alter the perspective depth.
    for (let i = 0; i < state.length; i++) {
      const turn = turnProgress(state[i].focus.position), book = roots.current[i];
      if (turn > 0 && book) {
        const offset = turn * lift / fit;
        book.position.y += viewUpY * offset;
        book.position.z += viewUpZ * offset;
      }
    }
    // Only bindings that intersect this frame start drawing. A fast jump can
    // skip books entirely; their first entrance will still play on the way back.
    const wave = revealClock.current;
    wave.elapsed += Math.min(delta, 0.1);
    const halfWidth = size.width / (2 * fit);
    const firstView = wave.firstView;
    // The camera starts over book zero, leaving empty space on its left.
    const firstX = shelf.poses[0].x;
    let initialSpan = 0;
    if (firstView) {
      for (const p of shelf.poses) {
        if (p.x - p.halfX > center + halfWidth) break;
        initialSpan = p.x - firstX;
      }
    }
    for (let i = 0; i < state.length; i++) {
      const node = roots.current[i];
      if (!node || books.isSpineRevealed(i)) continue;
      const p = shelf.poses[i];
      // In perspective the far end of a closed book can enter first.
      const farDepth = -viewUpZ * FLOOR + viewUpY * (node.position.z - p.w / 2);
      const reach = halfWidth * (1 + (pivotDepth - farDepth) * inverseDistance);
      if (Math.abs(node.position.x - center) > reach + p.halfX) continue;
      const delay = firstView && initialSpan > 0 ? shelfSweepDuration * (p.x - firstX) / initialSpan : 0;
      books.beginSpineReveal(i, wave.elapsed, delay);
    }
    wave.firstView = false;
    const drawing = books.advanceSpineReveals(wave.elapsed);
    if (!moving && !drawing) {
      const halfView = size.width / (2 * fit) * (1 + Math.max(0, pivotDepth) * inverseDistance);
      library.current?.sharpen(Math.round(index), Math.floor(indexAtX(center - halfView)), Math.ceil(indexAtX(center + halfView)));
    }
    library.current?.updateSpineContacts();
    // Keep print razor-sharp at rest. Lower the moving framebuffer only
    // when consecutive frames actually miss their budget on this device.
    const meter = cadence.current;
    if (drawing && !meter.active) {
      const drawingDpr = Math.min(density, window.devicePixelRatio || 1, 1.75);
      if (get().viewport.dpr > drawingDpr) {
        meter.ratio = drawingDpr / density;
        setDpr(drawingDpr);
      }
    }
    moving ||= drawing;
    if (moving && meter.active && delta > 0) {
      // Count sustained slow frames too; cap the influence of a single
      // stalled frame when the tab resumes.
      meter.seconds += Math.min(delta, 0.1); meter.frames++;
      if (meter.seconds >= 0.42 && meter.frames >= 5) {
        if (meter.seconds / meter.frames > 1 / 46 && meter.ratio > 0.6) {
          meter.ratio = Math.max(0.6, meter.ratio * 0.80);
          setDpr(Math.max(Math.min(density, 1.5), density * meter.ratio));
        }
        meter.seconds = 0; meter.frames = 0;
      }
    } else if (!moving) {
      if (meter.ratio !== 1) { setDpr(density); invalidate(); }
      meter.seconds = 0; meter.frames = 0; meter.ratio = 1;
    }
    meter.active = moving;
    if (moving) invalidate();
  });

  const lookAtPointer = (event: ThreeEvent<PointerEvent>, i: number) => {
    event.stopPropagation();
    const c = controls.current, node = roots.current[i];
    if (!node || c.grip || !library.current?.isSpineRevealed(i) || event.pointerType === "touch" ||
        (c.selected !== i && animation.current[i].focus.position > 0)) return;
    // Use the projected center and the physical dimensions of the binding,
    // not a triangle's UV, so crossing a seam cannot flip the direction.
    const open = c.selected === i;
    const e = editions[i];
    c.hover = i;
    c.hoverX = clamp((event.point.x - node.position.x) / ((open ? e.width : e.thickness) / 200), -1, 1);
    c.hoverY = clamp((event.point.y - node.position.y) / (e.height / 200), -1, 1);
    get().gl.domElement.style.cursor = "grab"; invalidate();
  };

  return <>{editions.map((e, i) => <group key={e.id} ref={node => { roots.current[i] = node; }}>
    <group ref={node => { bindings.current[i] = node; }} />
    {/* Raycast twelve triangles per binding instead of every page and board. */}
    <mesh visible={false} ref={node => { hits.current[i] = node; }} onPointerDown={event => pick(event, i)}
      onPointerOver={event => lookAtPointer(event, i)}
      onPointerMove={event => lookAtPointer(event, i)}
      onPointerOut={() => {
        const c = controls.current;
        if (c.hover === i) { c.hover = -1; if (!c.grip) get().gl.domElement.style.cursor = ""; invalidate(); }
      }}>
      <boxGeometry args={[e.width / 100, e.height / 100, e.thickness / 100]} /><meshBasicMaterial />
    </mesh>
  </group>)}
    <mesh position-z={-8} visible={false} onPointerDown={event => {
      if (controls.current.grip) return;
      if (controls.current.selected < 0) pick(event, -1);
      else choose(-1);
    }}>
      <planeGeometry args={[120, 120]} /><meshBasicMaterial />
    </mesh>
  </>;
}

export default function BooksScene({ navigator, onReady }: ShelfProps) {
  const [selected, setSelected] = useState(-1);
  const [revealedCaption, setRevealedCaption] = useState(-1);
  const selectBook = useCallback((index: number) => {
    setSelected(index);
    setRevealedCaption(-1);
  }, []);
  const [captionSize, setCaptionSize] = useState<CaptionSize>({ index: -1, width: 0, height: 120 });
  const measureCaption = useCallback((index: number, width: number, height: number) => {
    setCaptionSize(last => last.index === index && last.width === width && last.height === height
      ? last : { index, width, height });
  }, []);
  const density = useSyncExternalStore(subscribeToSize, pixelDensity, () => 2.25);
  return <>
    <Canvas orthographic camera={{ near: 0.05, far: 50, position: [0, 0, 20] }}
      frameloop="demand" dpr={density}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={state => {
        const gl = state.gl; gl.setClearColor(0, 0);
        gl.toneMapping = THREE.NeutralToneMapping;
        const surface = gl.domElement;
        surface.tabIndex = 0; surface.setAttribute("role", "application");
        surface.setAttribute("aria-label", `${editions.length} books. Drag the ticks below or swipe the shelf to browse. Tap a spine to inspect it, then drag to rotate. Use the arrow keys to choose a book, or Escape to return it.`);
        surface.setAttribute("aria-describedby", "shelf-titles");
      }}>
      <Suspense fallback={null}>
        <Studio /><Shelf onSelect={selectBook} onRevealCaption={setRevealedCaption} onReady={onReady} density={density}
          captionSize={captionSize} navigator={navigator} />
        <StudyReady />
      </Suspense>
    </Canvas>
    <BookCaption selected={selected} revealed={revealedCaption} onMeasure={measureCaption} />
    <p id="shelf-titles" className={styles.sr}>{editions.map(e => e.title + " by " + e.author).join("; ")}.</p>
    <p className={styles.sr} aria-live="polite">{selected < 0 ? "Books on the shelf." :
      `${editions[selected].title} by ${editions[selected].author}, ${editions[selected].year}. Selected.`}</p>
  </>;
}
