"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { tick, unlockAudio } from "./sound";

const subscribeToNothing = () => () => {};

// Custom cursor in two parts: a small filled square that tracks the pointer
// 1:1 (no smoothing), and a separate full-border frame. Over a
// [data-cursor-target] the square disappears and the frame appears around the
// element; moving between targets glides the frame, leaving a target fades it
// out in place. Styles are written directly to the nodes so pointer movement
// never re-renders React.
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<Element | null>(null);

  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  useEffect(() => {
    const dot = dotRef.current;
    const frame = frameRef.current;
    if (!dot || !frame || !window.matchMedia("(pointer: fine)").matches) return;

    const DOT = 8;
    const PAD = 2;
    // Once latched onto a target, stay latched while the pointer is within
    // this many pixels of its rect — kills the dot flashing back at button
    // edges (padding zones resolve to the parent element).
    const SLACK = 12;

    // Leaving a target changes nothing for a beat: the frame lingers where it
    // was and the dot stays hidden. Only after the pointer has been off any
    // target for this long do they swap — so hopping between adjacent rows,
    // however fast, can never flash the dot or blink the frame.
    let departTimer: number | null = null;
    // Inside a [data-cursor-hide] container (the lists) the dot never shows,
    // even between and below the rows — only the frame lives there.
    let inHideZone = false;
    const cancelDeparture = () => {
      if (departTimer !== null) {
        window.clearTimeout(departTimer);
        departTimer = null;
      }
    };

    const setFree = (x: number, y: number) => {
      // Always track, even while hidden, so the dot reappears under the
      // pointer.
      dot.style.transform = `translate3d(${x - DOT / 2}px, ${y - DOT / 2}px, 0)`;

      if (targetRef.current === null && frame.dataset.visible !== "true") {
        dot.dataset.on = inHideZone ? "false" : "true";
        return;
      }

      if (departTimer === null) {
        departTimer = window.setTimeout(() => {
          departTimer = null;
          targetRef.current = null;
          frame.dataset.visible = "false";
          dot.dataset.on = inHideZone ? "false" : "true";
        }, 130);
      }
    };

    const hideBoth = () => {
      cancelDeparture();
      targetRef.current = null;
      dot.dataset.on = "false";
      frame.dataset.visible = "false";
    };

    // Targets can ask for a roomier frame (data-cursor-pad) — the list rows
    // use it so the frame keeps its size over tighter rows, overlapping the
    // neighbouring lines a touch.
    const padFor = (target: Element) => {
      const custom = Number(target.getAttribute("data-cursor-pad"));
      return Number.isFinite(custom) && custom > 0 ? custom : PAD;
    };

    const paintFrame = (target: Element) => {
      const rect = target.getBoundingClientRect();
      const pad = padFor(target);
      frame.style.transform = `translate3d(${rect.left - pad}px, ${rect.top - pad}px, 0)`;
      frame.style.width = `${rect.width + pad * 2}px`;
      frame.style.height = `${rect.height + pad * 2}px`;
    };

    const setTarget = (target: Element, x: number, y: number) => {
      cancelDeparture();
      if (targetRef.current !== target) tick();
      targetRef.current = target;
      dot.dataset.on = "false";
      // Keep the hidden dot tracking so it reappears exactly under the pointer.
      dot.style.transform = `translate3d(${x - DOT / 2}px, ${y - DOT / 2}px, 0)`;

      const appearing = frame.dataset.visible !== "true";
      // A frame that was hidden snaps straight to its rect — no fly-in from
      // wherever it last was. Between targets it glides.
      if (appearing) frame.style.transition = "none";
      frame.dataset.visible = "true";
      frame.dataset.external = target.hasAttribute("data-cursor-external")
        ? "true"
        : "false";
      paintFrame(target);
      if (appearing) {
        void frame.offsetWidth;
        frame.style.transition = "";
      }
    };

    const resolve = (element: Element | null, x: number, y: number) => {
      // The carousel and lightbox use native cursors (tap zones) — ours
      // steps aside.
      if (element?.closest(".nv-carousel, .nv-lightbox")) {
        hideBoth();
        return;
      }

      const target = element?.closest("[data-cursor-target]") ?? null;
      if (target) {
        setTarget(target, x, y);
        return;
      }

      const current = targetRef.current;
      if (current?.isConnected) {
        const rect = current.getBoundingClientRect();
        if (
          x >= rect.left - SLACK &&
          x <= rect.right + SLACK &&
          y >= rect.top - SLACK &&
          y <= rect.bottom + SLACK
        ) {
          setTarget(current, x, y);
          return;
        }
      }

      setFree(x, y);
    };

    let lastX = -1;
    let lastY = -1;

    const onMouseMove = (event: MouseEvent) => {
      dot.dataset.seen = "true";
      lastX = event.clientX;
      lastY = event.clientY;
      const element = event.target instanceof Element ? event.target : null;
      inHideZone = Boolean(element?.closest("[data-cursor-hide]"));
      resolve(element, event.clientX, event.clientY);
    };

    // Re-resolve from scratch once whatever was under the pointer may have
    // changed without the pointer moving (overlays closing on Escape would
    // otherwise leave the frame latched onto a row).
    const refresh = () => {
      window.setTimeout(() => {
        if (lastX < 0) return;
        targetRef.current = null;
        const element = document.elementFromPoint(lastX, lastY);
        inHideZone = Boolean(element?.closest("[data-cursor-hide]"));
        resolve(element, lastX, lastY);
      }, 90);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") refresh();
    };

    // The frame goes stale if the hovered list scrolls under the pointer.
    const onScroll = () => {
      const target = targetRef.current;
      if (target?.isConnected && frame.dataset.visible === "true") {
        paintFrame(target);
      }
    };

    // A click can replace what's under the pointer (opening the carousel
    // covers the clicked row), which would leave the frame stranded on the
    // old rect. Re-resolve once the new frame has painted.
    const onClick = (event: MouseEvent) => {
      unlockAudio();
      const { clientX, clientY } = event;
      window.setTimeout(() => {
        targetRef.current = null; // drop the latch — re-resolve from scratch
        resolve(document.elementFromPoint(clientX, clientY), clientX, clientY);
      }, 90);
    };

    const onMouseLeave = () => {
      cancelDeparture();
      targetRef.current = null;
      dot.dataset.seen = "false";
      frame.dataset.visible = "false";
    };

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", unlockAudio, {
      capture: true,
      passive: true,
    });
    document.addEventListener("click", onClick, true);
    document.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    document.documentElement.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelDeparture();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", unlockAudio, {
        capture: true,
      });
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("scroll", onScroll, { capture: true });
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div aria-hidden="true" className="nv-cursor-dot" ref={dotRef} />
      <div aria-hidden="true" className="nv-cursor-frame" ref={frameRef} />
    </>,
    document.body,
  );
}
