"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { navLinks } from "./content";
import HoverBlob from "./hover-blob";
import { tap } from "./sound";
import "./new.css";

export default function Shell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();

  // Canonical hosts rewrite root URLs to /new; direct /new URLs also work.
  const prefix = pathname === "/new" || pathname.startsWith("/new/") ? "/new" : "";
  const homeHref = prefix || "/";
  const topRef = useRef<HTMLDivElement>(null);

  // Page switches: the OLD content is tagged for its blur-out with a direct
  // DOM class (never React state), so the freshly keyed new content can't
  // inherit it for even a frame — one exit, one entry, no restarts.
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const top = topRef.current;
    if (!top) return;
    // Re-seat the resting blob — but ONLY if a real cursor is still on
    // the dock. Touch leaves sticky :hover behind, so gate on actual
    // hover capability; on touch the blob always re-homes to the new
    // active page.
    const canHover = window.matchMedia("(hover: hover)").matches;
    if (!canHover || !top.matches(":hover")) {
      top.dispatchEvent(new PointerEvent("pointerleave"));
    }
  }, [pathname]);

  // The OUTER pill is alive too: it leans toward the cursor and swells a
  // touch while the inner pill is captured — the whole dock reads as one
  // organism. Eased per-frame, imperative, no re-renders.
  useEffect(() => {
    const dock = topRef.current;
    if (!dock) return;
    const state = {
      sx: 1,
      sy: 1,
      lx: 0,
      tsx: 1,
      tsy: 1,
      tlx: 0,
      raf: 0,
    };
    const paint = () => {
      dock.style.transform = `translateX(-50%) translateX(${state.lx.toFixed(2)}px) scale(${state.sx.toFixed(3)}, ${state.sy.toFixed(3)})`;
    };
    const step = () => {
      state.raf = 0;
      state.sx += (state.tsx - state.sx) * 0.16;
      state.sy += (state.tsy - state.sy) * 0.16;
      state.lx += (state.tlx - state.lx) * 0.16;
      paint();
      if (
        Math.abs(state.tsx - state.sx) > 0.001 ||
        Math.abs(state.tsy - state.sy) > 0.001 ||
        Math.abs(state.tlx - state.lx) > 0.1
      ) {
        state.raf = requestAnimationFrame(step);
      }
    };
    const kick = () => {
      if (!state.raf) state.raf = requestAnimationFrame(step);
    };
    const onMove = (event: PointerEvent) => {
      const rect = dock.getBoundingClientRect();
      const px = Math.max(
        -1,
        Math.min(1, (event.clientX - rect.left - rect.width / 2) / (rect.width / 2)),
      );
      // Pushing the inner pill toward an end stretches the outer pill
      // WITH it — the two stay hugged, one organism.
      state.tsx = 1.02 + Math.abs(px) * 0.045;
      state.tsy = 1.09;
      state.tlx = px * 7;
      kick();
    };
    const onLeave = () => {
      state.tsx = 1;
      state.tsy = 1;
      state.tlx = 0;
      kick();
    };
    dock.addEventListener("pointermove", onMove, { passive: true });
    // Only genuinely LEAVING deflates the pill — a click while hovering
    // used to reset the swell and it never came back until the cursor
    // moved again.
    dock.addEventListener("pointerleave", onLeave);
    dock.addEventListener("pointercancel", onLeave);
    window.addEventListener("resize", paint);
    return () => {
      dock.removeEventListener("pointermove", onMove);
      dock.removeEventListener("pointerleave", onLeave);
      dock.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("resize", paint);
      cancelAnimationFrame(state.raf);
    };
  }, []);

  // Every arrival blurs in — including back/forward-cache restores, which
  // skip CSS animations unless they are explicitly restarted.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      for (const el of [topRef.current, contentRef.current]) {
        if (!el) continue;
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
      }
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  return (
    <div className="nv-shell">
      {/* Progressive blur at both edges: five stacked backdrop layers
          with doubling radii, each masked to its own band, so the blur is
          strongest at the screen edge and dissolves to nothing where the
          veil ends. The white fade paints on top (shell::before/::after). */}
      {(["top", "bottom"] as const).map((edge) => (
        <div aria-hidden="true" className="nv-veil" data-edge={edge} key={edge}>
          {[0, 1, 2, 3, 4].map((layer) => (
            <span data-layer={layer} key={layer} />
          ))}
        </div>
      ))}
      <main className="nv-main">
        {/* The DOCK: a floating dark-glass pill at the bottom holding the
            whole nav — R.A. (about), then the pages. The blob glides as a
            lighter pill INSIDE it; the orange orb keeps its journeys. */}
        <nav aria-label="Site" className="nv-dock" ref={topRef}>
          <HoverBlob
            as="span"
            glass
            grab
            home={'.nv-dock-link[data-active="true"]'}
            hug
            pad={0}
            rows=".nv-dock-link"
          />
          {navLinks.map((link) => {
            const href = link.href ? `${prefix}${link.href}` : homeHref;
            return (
              <Link
                className="nv-dock-link"
                data-active={pathname === href}
                href={href}
                key={link.label}
                onClick={(event) => {
                  tap();
                  if (event.detail > 0) event.currentTarget.blur();
                  if (href === pathname) return;
                  event.preventDefault();
                  contentRef.current?.classList.add("nv-leaving");
                  window.setTimeout(() => router.push(href), 330);
                }}
              >
                {link.href ? (
                  link.label
                ) : (
                  <span aria-label="About" className="nv-dock-orb" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="nv-content" key={pathname} ref={contentRef}>
          {children}
        </div>
      </main>

    </div>
  );
}
