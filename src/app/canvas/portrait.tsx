"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useRef, type MouseEvent, type PointerEvent } from "react";
import styles from "./portrait.module.css";
import PortraitSurface from "./portrait-surface";

export default function Portrait() {
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const enlarged = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const pendingClose = useRef(false);
  const photoRef = useRef<HTMLSpanElement>(null);
  const pointerStart = useRef({ x: 0, y: 0 });
  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }
  function photoClick(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail && Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y) > 6) return;
    void animate(Boolean(dialog.current?.open));
  }

  async function animate(closing: boolean) {
    if (!trigger.current || !dialog.current || !enlarged.current) return;
    if (busy.current) {
      if (closing) pendingClose.current = true;
      return;
    }
    busy.current = true;
    if (!closing) {
      if (photoRef.current) enlarged.current.appendChild(photoRef.current);
      dialog.current.showModal();
      // The same canvas moves between containers; no second texture or renderer.
      photoRef.current?.dispatchEvent(new Event("portrait-layout", { bubbles: true }));
      trigger.current.style.visibility = "hidden";
      document.documentElement.style.overflow = "hidden";
    }
    const small = trigger.current.getBoundingClientRect();
    // Measure the resting card, independent of any hover tilt.
    const large = enlarged.current.getBoundingClientRect();
    const transform = `translate(${small.x + small.width / 2 - large.x - large.width / 2}px, ${small.y + small.height / 2 - large.y - large.height / 2}px) scale(${trigger.current.offsetWidth / large.width}, ${trigger.current.offsetHeight / large.height}) rotate(-6deg)`;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    dialog.current.dataset.closing = String(closing);
    if (closing) photoRef.current?.dispatchEvent(new Event("portrait-closing"));
    enlarged.current.style.removeProperty("--rx");
    enlarged.current.style.removeProperty("--ry");
    try {
      const motion = enlarged.current.animate(
        closing
          ? [{ transform: "translate(0, 0) scale(1) rotate(0deg)" }, { transform }]
          : [{ transform }, { transform: "translate(0, 0) scale(1) rotate(0deg)" }],
        { duration: reduced ? 0 : closing ? 560 : 820, easing: closing ? "cubic-bezier(.22,1,.36,1)" : "cubic-bezier(.42,0,.2,1)", fill: "both" },
      );
      photoRef.current?.dispatchEvent(new CustomEvent("portrait-motion", { detail: { motion, closing } }));
      await motion.finished;
    } finally {
      if (closing) {
        if (photoRef.current && trigger.current) trigger.current.appendChild(photoRef.current);
        photoRef.current?.dispatchEvent(new Event("portrait-layout", { bubbles: true }));
        if (trigger.current) trigger.current.style.visibility = "";
        dialog.current?.close();
        document.documentElement.style.removeProperty("overflow");
        trigger.current?.focus({ preventScroll: true });
      }
      enlarged.current?.getAnimations().forEach((animation) => animation.cancel());
      busy.current = false;
      if (pendingClose.current) {
        pendingClose.current = false;
        if (dialog.current?.open) void animate(true);
      }
    }
  }

  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape" && dialog.current?.open) {
      event.preventDefault();
      event.stopPropagation();
      void animate(true);
    }
  });
  useEffect(() => {
    document.addEventListener("keydown", handleEscape, true);
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, []);

  const photo = <span ref={photoRef} className={styles.print}><span className={styles.image}><Image src="/photo/portrait/raghav.webp" alt="Raghav at sunset above the ocean" width={1600} height={2400} sizes="(max-width: 600px) 80vw, 430px" /></span><PortraitSurface /></span>;

  return (
    <div className={styles.root}>
      <button ref={trigger} className={styles.thumbnail} data-portrait-small="true" type="button" aria-label="Enlarge portrait" aria-haspopup="dialog" onPointerDown={pointerDown} onClick={photoClick}>
        {photo}
      </button>
      <dialog ref={dialog} className={styles.dialog} aria-label="Portrait of Raghav" onCancel={(event) => { event.preventDefault(); void animate(true); }} onClick={(event) => { if (event.target === event.currentTarget) void animate(true); }}>
        <button ref={enlarged} className={styles.enlarged} type="button" aria-label="Close enlarged portrait" onPointerDown={pointerDown} onClick={photoClick}></button>
      </dialog>
    </div>
  );
}
