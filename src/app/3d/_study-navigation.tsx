"use client";

import { useLayoutEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./navigation.module.css";

const blurred = { opacity: 0, filter: "blur(10px)" };
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function StudyNavigation({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const motion = useRef<Animation | null>(null);
  const destination = useRef<string | null>(null);

  useLayoutEffect(() => {
    // The next route owns its entrance; release the previous route's exit layer.
    destination.current = null;
    motion.current?.cancel();
    motion.current = null;
  }, [pathname]);

  useLayoutEffect(() => {
    const reset = () => {
      destination.current = null;
      motion.current?.cancel();
      motion.current = null;
    };
    // A browser Back action can interrupt the outgoing animation before push().
    window.addEventListener("popstate", reset);
    return () => { window.removeEventListener("popstate", reset); reset(); };
  }, []);

  function follow(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey || reduced()) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!link || link.target && link.target !== "_self" || link.hasAttribute("download")) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || !(url.pathname === "/3d" || url.pathname.startsWith("/3d/")) ||
      url.pathname === pathname) return;

    event.preventDefault();
    const href = url.pathname + url.search + url.hash;
    if (destination.current === href) return;
    destination.current = href;
    router.prefetch(href);

    const el = root.current!;
    const { opacity, filter } = getComputedStyle(el);
    motion.current?.cancel();
    const exit = el.animate([{ opacity, filter: filter === "none" ? "blur(0px)" : filter }, blurred], {
      duration: 280, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards",
    });
    motion.current = exit;
    exit.onfinish = () => {
      if (destination.current === href) router.push(href);
    };
  }

  return <div ref={root} className={styles.content} onClickCapture={follow}>{children}</div>;
}
