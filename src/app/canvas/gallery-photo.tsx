"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import styles from "./gallery-photo.module.css";

export function useGalleryPointerMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const allowed = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    let x = 0;
    let y = 0;

    function draw() {
      frame = 0;
      root.style.setProperty("--gallery-pointer-x", `${x * 8}px`);
      root.style.setProperty("--gallery-pointer-y", `${y * 5}px`);
    }

    function move(event: PointerEvent) {
      if (event.pointerType !== "mouse" || !allowed.matches) return;
      x = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
      y = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
      if (!frame) frame = requestAnimationFrame(draw);
    }

    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      root.style.removeProperty("--gallery-pointer-x");
      root.style.removeProperty("--gallery-pointer-y");
    }

    function preferenceChanged() {
      if (!allowed.matches) reset();
    }

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointercancel", reset);
    window.addEventListener("blur", reset);
    document.addEventListener("pointerleave", reset);
    allowed.addEventListener("change", preferenceChanged);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointercancel", reset);
      window.removeEventListener("blur", reset);
      document.removeEventListener("pointerleave", reset);
      allowed.removeEventListener("change", preferenceChanged);
      reset();
    };
  }, []);
}

export default function GalleryPhoto({ children, className, style, motion = true }: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  motion?: boolean;
}) {
  return (
    <figure className={`${styles.frame} ${className ?? ""}`} style={style} data-pointer-motion={motion || undefined}>
      <div className={styles.surface}>{children}</div>
    </figure>
  );
}
