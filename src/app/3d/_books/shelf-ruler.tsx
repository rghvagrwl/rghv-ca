"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import styles from "./shelf-ruler.module.css";

import type { ShelfRail } from "./shelf-navigation";

type Grip = {
  id: number; startX: number; startIndex: number; index: number;
  tap: number; threshold: number; dragging: boolean;
};

const tickSpacing = 8;

type RulerProps = {
  rail: ShelfRail;
  items: readonly { title: string }[];
  label: string;
};

export default function ShelfRuler({ rail: channel, items, label }: RulerProps) {
  const strip = useRef<HTMLDivElement>(null);
  const last = items.length - 1;
  const rulerStyle = { "--pitch": `${tickSpacing}px`, "--last": last } as CSSProperties;

  useLayoutEffect(() => {
    const el = strip.current;
    if (!el) return;
    const clampIndex = (index: number) => Math.min(last, Math.max(0, index));
    let position = NaN, announced = -1;
    let pendingKey: number | null = null;
    let grip: Grip | null = null;
    let wheelIndex: number | null = null;
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;

    const paint = (value: number) => {
      const enabled = !!(channel.jump && channel.scrub);
      if ((el.tabIndex === 0) !== enabled) {
        el.tabIndex = enabled ? 0 : -1;
        el.setAttribute("aria-disabled", String(!enabled));
      }
      const next = clampIndex(Number.isFinite(value) ? value : 0);
      if (next !== position) {
        position = next;
        el.style.setProperty("--position", String(next));
      }
      if (pendingKey !== null && Math.abs(next - pendingKey) < 0.001) pendingKey = null;
      const item = Math.round(next);
      if (announced !== item) {
        announced = item;
        el.setAttribute("aria-valuenow", String(item + 1));
        el.setAttribute("aria-valuetext", `${item + 1} of ${items.length}, ${items[item].title}`);
      }
    };
    const unsubscribe = channel.connectRuler(paint);

    const finishWheel = () => {
      if (wheelIndex === null) return;
      clearTimeout(wheelTimer);
      channel.scrub?.(wheelIndex, "end");
      wheelIndex = null;
    };
    const wheel = (event: WheelEvent) => {
      if (!channel.scrub || grip || event.ctrlKey) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      // A line steps one book. A trackpad moves continuously between books.
      const perUnit = event.deltaMode === 1 ? 1 : event.deltaMode === 2 ? el.clientWidth / tickSpacing : 1 / 25;
      const next = clampIndex((wheelIndex ?? position) + delta * perUnit);
      if (wheelIndex === null) {
        if (next === position) return;
        pendingKey = null;
        channel.scrub(position, "start");
      }
      wheelIndex = next;
      channel.scrub(next, "move");
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(finishWheel, 140);
    };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || grip || !channel.jump || !channel.scrub) return;
      const bounds = el.getBoundingClientRect();
      const offset = event.clientX - (bounds.left + bounds.width / 2);
      event.preventDefault();
      el.focus({ preventScroll: true });
      el.setPointerCapture(event.pointerId);
      pendingKey = null;
      grip = {
        id: event.pointerId, startX: event.clientX, startIndex: position, index: position,
        tap: clampIndex(Math.round(position + offset / tickSpacing)),
        threshold: event.pointerType === "touch" ? 5 : 3, dragging: false,
      };
    };
    const move = (event: PointerEvent) => {
      if (!grip || grip.id !== event.pointerId || !channel.scrub) return;
      const dx = event.clientX - grip.startX;
      if (!grip.dragging) {
        if (Math.abs(dx) < grip.threshold) return;
        grip.dragging = true;
        grip.startIndex = position;
        grip.index = position;
        el.dataset.dragging = "";
        channel.scrub(grip.startIndex, "start");
      }
      const next = clampIndex(grip.startIndex - dx / tickSpacing);
      if (next !== grip.index) {
        grip.index = next;
        channel.scrub(next, "move");
      }
    };
    const finish = (tap: boolean) => {
      const held = grip;
      if (!held) return;
      grip = null;
      delete el.dataset.dragging;
      if (el.hasPointerCapture(held.id)) el.releasePointerCapture(held.id);
      if (held.dragging) channel.scrub?.(held.index, "end");
      else if (tap) channel.jump?.(held.tap);
    };
    const release = (event: PointerEvent) => {
      if (grip?.id !== event.pointerId) return;
      // The final movement can arrive on pointerup without a pointermove.
      if (event.type === "pointerup") move(event);
      finish(event.type === "pointerup");
    };
    const blur = () => { pendingKey = null; finishWheel(); finish(false); };
    const key = (event: KeyboardEvent) => {
      if (!channel.jump || grip || event.altKey || event.ctrlKey || event.metaKey) return;
      const current = pendingKey ?? Math.round(position);
      let next: number;
      switch (event.key) {
        case "ArrowLeft": case "ArrowDown": next = current - 1; break;
        case "ArrowRight": case "ArrowUp": next = current + 1; break;
        case "Home": next = 0; break;
        case "End": next = last; break;
        default: return;
      }
      event.preventDefault();
      finishWheel();
      pendingKey = clampIndex(next);
      channel.jump(pendingKey);
    };

    window.addEventListener("pointerdown", finishWheel, true);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("lostpointercapture", release);
    el.addEventListener("keydown", key);
    el.addEventListener("blur", blur);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("pointerdown", finishWheel, true);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", release);
      el.removeEventListener("pointercancel", release);
      el.removeEventListener("lostpointercapture", release);
      el.removeEventListener("keydown", key);
      el.removeEventListener("blur", blur);
      window.removeEventListener("blur", blur);
      finishWheel();
      finish(false);
      unsubscribe();
    };
  }, [channel, items, last]);

  return <div className={styles.frame} ref={strip} style={rulerStyle} role="slider" tabIndex={-1} aria-disabled="true"
    aria-label={label} aria-orientation="horizontal"
    aria-valuemin={1} aria-valuemax={items.length} aria-valuenow={1}>
    <span className={styles.marks} aria-hidden="true" />
  </div>;
}
