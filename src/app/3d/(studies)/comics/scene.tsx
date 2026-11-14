"use client";
/* eslint-disable react-hooks/immutability -- Three.js scene nodes and the interaction controller are updated imperatively each frame. */

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import StudyReady from "../../_study-ready";
import ShelfRuler from "../../_books/shelf-ruler";
import { ShelfRail } from "../../_books/shelf-navigation";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { issues } from "./catalog";
import atlas from "./print-atlas.json";
import { ComicObject } from "./comic-object";
import * as THREE from "three";
import styles from "./comics.module.css";

const sections = atlas.sheets.map((_, i) => issues.slice(i * atlas.perSheet, (i + 1) * atlas.perSheet));
const slotsPerStep = 4;
const spacing = 0.91;
const positions = issues.map((_, index) => (index - (issues.length - 1) / 2) * spacing);
const collectionKey = issues.map(issue => issue.slug).join(",");
const shelfYaw = 0.80;
const cameraDistance = 11.3;
const fieldOfView = 19.8;
const shelfElevation = 0.125;
const firstX = positions[0];
const shelfAimHeight = 1.26;
const shelfCenter = (index: number) => 0.135 + issues[index].height / 2;
const restingBend = (index: number) => 0.013 + 0.006 * Math.sin(index * 2.39996);
type Grip = { id: number; index: number; x: number; y: number; coverHeight: number; yaw: number; pitch: number; railX: number; moved: boolean; wasOpen: boolean };
type Controls = { selected: number; hover: number; railX: number; railTarget: number; yaw: number; pitch: number; bendTarget: number; twistTarget: number; grip: Grip | null; scrubbing: boolean; reducedMotion: boolean };
const initialControls = (): Controls => ({ selected: -1, hover: -1, railX: firstX, railTarget: firstX, yaw: 0, pitch: 0, bendTarget: 0, twistTarget: 0, grip: null, scrubbing: false, reducedMotion: false });
const clamp = THREE.MathUtils.clamp;
const indexAtX = (x: number) => clamp((x - positions[0]) / spacing, 0, issues.length - 1);
const nearest = (x: number) => Math.round(indexAtX(x));

function Collection({ rail }: { rail: ShelfRail }) {
  const controls = useRef<Controls>(initialControls());
  const { camera, gl, size, invalidate } = useThree();
  const roots = useRef<Array<THREE.Group | null>>([]);
  const [shelfStep, setShelfStep] = useState(0);
  const [inspected, setInspected] = useState(-1);
  const flexes = useRef(issues.map((_, index) => ({ bend: restingBend(index), twist: 0 })));
  const springs = useRef(issues.map(() => ({ bendVelocity: 0, twistVelocity: 0 })));
  const expansion = useRef(0);
  const hoverTilt = useRef({ enabled: false, yaw: 0, pitch: 0, point: new THREE.Vector3() });
  const baseZoom = size.height / (2 * cameraDistance * Math.tan(THREE.MathUtils.degToRad(fieldOfView) / 2));
  // Prefetch a screenful plus a few offscreen covers while the shelf moves.
  const reach = Math.ceil(size.width / (2 * baseZoom * spacing)) + 5;
  const firstVisible = shelfStep * slotsPerStep - reach;
  const lastVisible = (shelfStep + 1) * slotsPerStep + reach;
  // Leave room for the entire front and sleeve when a long phone is held upright.
  const widthToDistance = size.height / (2 * size.width * 0.86 * Math.tan(THREE.MathUtils.degToRad(fieldOfView) / 2));

  const choose = useCallback((index: number) => {
    const c = controls.current;
    c.selected = index; c.hover = -1;
    setInspected(index);
    c.yaw = 0; c.pitch = 0; c.bendTarget = 0; c.twistTarget = 0;
    if (index >= 0) c.railTarget = positions[index];
    invalidate();
  }, [invalidate]);

  useLayoutEffect(() => rail.connectScene((index, phase) => {
    const c = controls.current;
    if (phase !== "move") {
      choose(-1);
      if (c.grip && gl.domElement.hasPointerCapture(c.grip.id)) {
        gl.domElement.releasePointerCapture(c.grip.id);
      }
      c.grip = null;
      gl.domElement.style.cursor = "";
    }
    c.scrubbing = phase !== "end";
    c.railTarget = positions[0] + (phase === "end" ? Math.round(index) : index) * spacing;
    invalidate();
  }), [rail, choose, gl, invalidate]);

  useEffect(() => {
    const surface = gl.domElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hoverMotion = window.matchMedia("(any-hover: hover) and (prefers-reduced-motion: no-preference)");
    const syncHoverMotion = () => {
      controls.current.reducedMotion = reducedMotion.matches;
      hoverTilt.current.enabled = hoverMotion.matches;
      invalidate();
    };
    syncHoverMotion();
    hoverMotion.addEventListener("change", syncHoverMotion);
    reducedMotion.addEventListener("change", syncHoverMotion);
    const move = (event: PointerEvent) => {
      const c = controls.current, g = c.grip;
      if (!g || g.id !== event.pointerId) return;
      const dx = event.clientX - g.x, dy = event.clientY - g.y;
      if (!g.moved && Math.hypot(dx, dy) > (event.pointerType === "touch" ? 7 : 4)) g.moved = true;
      if (!g.moved) return;
      if (g.index < 0) {
        c.railTarget = clamp(g.railX - dx / baseZoom, positions[0], positions[issues.length - 1]);
      } else {
        const span = Math.min(surface.clientWidth, surface.clientHeight);
        const yaw = g.yaw + 2 * Math.PI * dx / (span * 0.85);
        const pitch = clamp(g.pitch + 3.35 * dy / span, -0.85, 0.85);
        // Integrate the turn itself so coalesced touch and high-rate mouse events exert the same load.
        const turn = yaw - c.yaw;
        const tilt = pitch - c.pitch;
        c.bendTarget = clamp(c.bendTarget + 0.42 * turn, -0.15, 0.15);
        c.twistTarget = clamp(c.twistTarget + 0.16 * g.coverHeight * turn - 0.42 * tilt, -0.10, 0.10);
        c.yaw = yaw;
        c.pitch = pitch;
      }
      invalidate();
    };
    const end = (event: PointerEvent) => {
      const c = controls.current, g = c.grip;
      if (!g || g.id !== event.pointerId) return;
      if (event.type === "pointerup") move(event);
      if (event.type === "pointerup" && !g.moved && g.wasOpen) choose(-1);
      c.grip = null;
      if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
      surface.style.cursor = c.hover >= 0 ? "grab" : "";
      invalidate();
    };
    const wheel = (event: WheelEvent) => {
      const c = controls.current;
      if (c.selected >= 0 || c.grip || c.scrubbing || event.ctrlKey) return;
      event.preventDefault();
      c.hover = -1; surface.style.cursor = "";
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      c.railTarget = clamp(c.railTarget + delta / baseZoom, positions[0], positions[issues.length - 1]);
      invalidate();
    };
    const key = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const c = controls.current;
      if ((event.key === "Enter" || event.key === " ") && !event.repeat) choose(c.selected >= 0 ? -1 : nearest(c.railTarget));
      else if (event.key === "Escape") choose(-1);
      else if (event.key === "ArrowRight") choose(Math.min(issues.length - 1, (c.selected < 0 ? nearest(c.railTarget) : c.selected) + 1));
      else if (event.key === "ArrowLeft") choose(Math.max(0, (c.selected < 0 ? nearest(c.railTarget) : c.selected) - 1));
      else return;
      event.preventDefault();
    };
    surface.addEventListener("wheel", wheel, { passive: false });
    surface.addEventListener("keydown", key);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      hoverMotion.removeEventListener("change", syncHoverMotion);
      reducedMotion.removeEventListener("change", syncHoverMotion);
      surface.removeEventListener("wheel", wheel);
      surface.removeEventListener("keydown", key);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [baseZoom, choose, gl, invalidate]);

  const pick = (event: ThreeEvent<PointerEvent>, index: number) => {
    event.stopPropagation();
    const c = controls.current;
    if (c.grip || c.scrubbing || event.button !== 0 || !event.nativeEvent.isPrimary) return;
    c.hover = -1;
    const wasOpen = c.selected >= 0 && (c.selected === index || index < 0);
    if (index >= 0 && !wasOpen) choose(index);
    gl.domElement.focus({ preventScroll: true });
    gl.domElement.setPointerCapture(event.pointerId);
    const object = roots.current[index];
    const coverHeight = object ? clamp(2 * object.worldToLocal(event.point.clone()).y / issues[index].height, -1, 1) : 0;
    c.grip = { id: event.pointerId, index: index < 0 ? c.selected : index, x: event.clientX, y: event.clientY,
      coverHeight, yaw: wasOpen ? c.yaw : 0,
      pitch: wasOpen ? c.pitch : 0, railX: c.railX, moved: false, wasOpen };
    gl.domElement.style.cursor = "grabbing";
    invalidate();
  };
  const hover = (event: ThreeEvent<PointerEvent>, index: number) => {
    event.stopPropagation();
    const c = controls.current, tilt = hoverTilt.current, node = roots.current[index];
    if (event.pointerType === "touch" || c.grip || !node) return;
    gl.domElement.style.cursor = "grab";
    c.hover = index;
    if (c.selected >= 0 || !tilt.enabled) return;
    // Follow the cursor across the sleeve, using its own axes at the shelf angle.
    const local = node.worldToLocal(tilt.point.copy(event.point));
    tilt.yaw = -0.028 + 0.031 * clamp(2 * local.x / issues[index].bag, -1, 1);
    tilt.pitch = -0.036 * clamp(2 * local.y / issues[index].height, -1, 1);
    invalidate();
  };
  const leave = (index: number) => {
    const c = controls.current;
    if (c.hover !== index) return;
    c.hover = -1;
    if (!c.grip) gl.domElement.style.cursor = "";
    invalidate();
  };

  useFrame((_, delta) => {
    const c = controls.current, dt = Math.min(delta, 0.05);
    let moving = false;
    const toward = (value: number, goal: number, speed: number) => {
      if (Math.abs(value - goal) < 0.0002) return goal;
      moving = true;
      return THREE.MathUtils.damp(value, goal, speed, dt);
    };
    const previousX = c.railX;
    const followingHand = c.scrubbing || c.grip?.index === -1;
    c.railX = c.reducedMotion ? c.railTarget : toward(c.railX, c.railTarget, followingHand ? 36 : 11);
    expansion.current = toward(expansion.current, c.selected >= 0 ? 1 : 0, 9);
    // The shelf travels opposite the camera. Let the loose edge trail that
    // motion, using actual travel so every browsing gesture loads the same spring.
    const speed = (c.railX - previousX) / Math.max(dt, 0.001);
    const shelfBend = c.selected < 0 && !c.reducedMotion ? 0.062 * Math.tanh(speed / 4.5) : 0;
    const open = expansion.current;
    const subject = c.selected;
    camera.position.x = c.railX;
    const shelfIndex = indexAtX(c.railX);
    rail.report(shelfIndex);
    const step = Math.floor(shelfIndex / slotsPerStep);
    if (step !== shelfStep) setShelfStep(step);
    const inspectionDistance = Math.max(cameraDistance - 1.05, (issues[subject]?.bag ?? 0) * widthToDistance + 0.9);
    camera.position.z = toward(camera.position.z, THREE.MathUtils.lerp(cameraDistance, inspectionDistance, open), 10);
    const aimHeight = shelfAimHeight + 0.055 * open;
    const aimDepth = 0.9 * open;
    const elevation = THREE.MathUtils.lerp(shelfElevation, 0.028, open);
    camera.position.y = aimHeight + elevation * (camera.position.z - aimDepth);
    camera.lookAt(camera.position.x, aimHeight, aimDepth);
    const grip = c.grip?.moved && c.grip.index >= 0 ? c.grip : null;
    const gripBend = grip ? 0.043 * Math.tanh(c.yaw - grip.yaw) : 0;
    const gripTwist = grip ? grip.coverHeight * gripBend * 0.8 - 0.044 * Math.sin(c.pitch - grip.pitch) : 0;
    const response = 24;
    const springDecay = Math.exp(-response * dt);
    for (let i = 0; i < issues.length; i++) {
      const node = roots.current[i]; if (!node) continue;
      const active = i === subject;
      const wing = subject < 0 || active ? 0 : (i < subject ? -1.43 : 1.43) * open;
      node.position.x = toward(node.position.x, positions[i] + wing, 10);
      node.position.y = toward(node.position.y, active ? THREE.MathUtils.lerp(shelfCenter(i), 1.315, open) : shelfCenter(i), 10);
      node.position.z = toward(node.position.z, active ? open * 0.9 : 0, 10);
      const tilt = hoverTilt.current;
      const hovering = tilt.enabled && c.hover === i && subject < 0 && !c.grip;
      const desiredYaw = active ? 0.13 + c.yaw : shelfYaw + (hovering ? tilt.yaw : 0);
      const desiredPitch = active ? c.pitch : hovering ? tilt.pitch : 0;
      const turn = THREE.MathUtils.euclideanModulo(desiredYaw - node.rotation.y + Math.PI, 2 * Math.PI) - Math.PI;
      node.rotation.y = toward(node.rotation.y, node.rotation.y + turn, 13);
      node.rotation.x = toward(node.rotation.x, desiredPitch, 13);
      const flex = flexes.current[i], spring = springs.current[i];
      const compliance = issues[i].compliance;
      // A tilted issue sags toward gravity even after the hand stops turning.
      const sag = 0.072 * Math.sin(node.rotation.x) * Math.cos(node.rotation.y);
      const bendLoad = active ? c.bendTarget + gripBend + sag : shelfBend + (hovering ? -0.48 * tilt.yaw : 0);
      // The top corner trails slightly farther than the bottom of the sleeved issue.
      const twistLoad = active ? c.twistTarget + gripTwist : 0.17 * shelfBend + (hovering ? 0.52 * tilt.pitch : 0);
      const bendGoal = restingBend(i) + bendLoad * compliance;
      const twistGoal = twistLoad * compliance;
      // Analytic critically damped response stays stable through dropped frames.
      const bendOffset = flex.bend - bendGoal;
      const twistOffset = flex.twist - twistGoal;
      const bendStep = (spring.bendVelocity + response * bendOffset) * dt;
      const twistStep = (spring.twistVelocity + response * twistOffset) * dt;
      flex.bend = bendGoal + (bendOffset + bendStep) * springDecay;
      flex.twist = twistGoal + (twistOffset + twistStep) * springDecay;
      spring.bendVelocity = (spring.bendVelocity - response * bendStep) * springDecay;
      spring.twistVelocity = (spring.twistVelocity - response * twistStep) * springDecay;
      const distanceToRest = Math.abs(flex.bend - bendGoal) + Math.abs(flex.twist - twistGoal);
      if (distanceToRest + Math.abs(spring.bendVelocity) + Math.abs(spring.twistVelocity) > 0.0001) {
        moving = true;
      } else {
        flex.bend = bendGoal;
        flex.twist = twistGoal;
        spring.bendVelocity = spring.twistVelocity = 0;
      }
    }
    const loadDecay = Math.exp(-dt * 10);
    c.bendTarget *= loadDecay;
    c.twistTarget *= loadDecay;
    if (Math.abs(c.bendTarget) + Math.abs(c.twistTarget) > 0.0001) moving = true;
    if (moving) invalidate();
  }, -1);

  return <>
    {sections.map((section, sectionIndex) => {
      const start = sectionIndex * atlas.perSheet;
      const end = start + section.length;
      const keepSelected = inspected >= start && inspected < end;
      if (sectionIndex !== 0 && !keepSelected && (end <= firstVisible || start > lastVisible)) return null;
      // Only the first section blocks the initial ready marker. A later texture
      // download can resolve independently while the previous section is visible.
      return <Suspense key={sectionIndex} fallback={null}>
        {sectionIndex === 0 && <StudyReady />}
        {section.map((issue, slot) => {
          const index = start + slot;
          return <group key={issue.slug} ref={node => { roots.current[index] = node; }}
            position={[positions[index], shelfCenter(index), 0]} rotation={[0, shelfYaw, 0]}
            onPointerDown={event => pick(event, index)}
            onPointerMove={event => hover(event, index)} onPointerOut={() => leave(index)}>
            <ComicObject issue={issue} index={index} inspected={inspected === index} flex={{ current: flexes.current[index] }}
              shelf={roots} neighbor={issues[index + 1]} />
          </group>;
        })}
      </Suspense>;
    })}
    <mesh position={[0, 1.23, -1]} onPointerDown={event => pick(event, -1)}>
      <planeGeometry args={[(issues.length - 1) * spacing + 24, 12]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  </>;
}

export default function ComicsScene() {
  const [rail] = useState(() => new ShelfRail(0));
  return <main className={styles.stage} aria-label="Comics">
    <div className={styles.canvas}>
      <Canvas camera={{ position: [firstX, shelfAimHeight + shelfElevation * cameraDistance, cameraDistance], fov: fieldOfView, near: 0.1, far: 100 }}
        frameloop="demand" dpr={[1, 1.75]} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl, camera }) => { camera.lookAt(firstX, shelfAimHeight, 0); gl.setClearColor(0, 0);
          gl.toneMapping = THREE.NeutralToneMapping; gl.domElement.tabIndex = 0;
          gl.domElement.setAttribute("role", "application");
          gl.domElement.setAttribute("aria-label", "Comics in clear sleeves. Select a comic, then drag to inspect it. Swipe or scroll to browse."); }}>
        <Collection key={collectionKey} rail={rail} />
      </Canvas>
    </div>
    <ShelfRuler rail={rail} items={issues} label="Browse comics" />
    <p className={styles.sr}>{issues.map(issue => issue.title).join("; ")}</p>
  </main>;
}
