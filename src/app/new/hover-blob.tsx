"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Vaso } from "vaso";

import { hapticTick } from "./haptics";
import { blorp } from "./sound";

// iOS-style fluid list highlight: a grey squircle appears under the hovered
// row and glides to the next one on a slightly bouncy — but still rigid —
// spring. The blob persists while the text is what changes under it. Rendered
// as an extra (hidden-from-a11y) list item so it can sit inside the <ul>.

const STIFFNESS = 260;
const DAMPING = 23;
const PAD_Y = 6; // the blob runs taller than its row, kissing the neighbours
const MAGNET = 10; // how far the near edge stretches toward the cursor

const subscribeNever = () => () => {};

// Lens glass needs an SVG backdrop filter, which only Chromium renders.
// Everywhere else the blob keeps its painted (pre-glass) look — vaso's own
// cloned-backdrop fallback is heavier and looks different, so we skip it.
let lensSupport: boolean | null = null;
function supportsLens() {
  if (lensSupport !== null) return lensSupport;
  const nav = navigator as Navigator & {
    userAgentData?: { brands?: Array<{ brand: string }> };
  };
  const brands = nav.userAgentData?.brands?.map((b) => b.brand) ?? [];
  const chromium =
    brands.some((b) => /Chromium/i.test(b)) ||
    (/Chrome|Chromium|Edg|OPR/.test(navigator.userAgent) &&
      !/Safari\/[\d.]+$/.test(navigator.userAgent.replace(/.*Version\/[\d.]+ /, "")) &&
      !/Version\/[\d.]+.*Safari/.test(navigator.userAgent));
  lensSupport =
    chromium &&
    typeof CSS !== "undefined" &&
    CSS.supports("backdrop-filter", "url(#a)");
  return lensSupport;
}

export default function HoverBlob({
  rows,
  as: Tag = "li",
  pad = PAD_Y,
  padX = 0,
  tone,
  release,
  grab = false,
  home,
  hug = false,
  external = false,
  glass = false,
}: {
  rows: string;
  as?: "li" | "span";
  pad?: number;
  padX?: number;
  tone?: string;
  release?: number;
  grab?: boolean;
  /** Selector for the RESTING row: the blob lives there when nothing is
      hovered instead of disappearing, and glides back on leave. */
  home?: string;
  /** Keep the blob fully INSIDE the list's padding box (for closed
      vessels like the dock pill) — the stretch compresses against the
      wall instead of poking through the curve. */
  hug?: boolean;
  /** Externally driven: the blob ignores the REAL pointer and follows
      only synthetic (untrusted) events dispatched by a controller. */
  external?: boolean;
  /** Render the blob as a refractive liquid-glass lens (vaso) instead of
      a painted fill. The shell element still carries the spring. */
  glass?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const lensRef = useRef<HTMLElement>(null);
  // The vaso lens styles itself differently on the server (no SVG
  // refraction) than on the client, so it mounts client-side only — the
  // blob starts hidden anyway, so nothing is visible a frame early. The
  // external-store form is the hydration-safe way to say "client only".
  const lensOk = useSyncExternalStore(subscribeNever, supportsLens, () => false);
  const glassOn = glass && lensOk;

  useEffect(() => {
    const blob = ref.current;
    const lens = lensRef.current;
    const list = blob?.parentElement;
    if (!blob || !lens || !list) return;

    const setOn = (value: string) => {
      blob.setAttribute("data-on", value);
      lens.setAttribute("data-on", value);
    };

    const s = {
      x: 0, y: 0, w: 0, h: 0,
      vx: 0, vy: 0, vw: 0, vh: 0,
      tx: 0, ty: 0, tw: 0, th: 0,
      ps: 1, pv: 0, pt: 1, // press scale: value, velocity, target
      lx: 0, ly: 0, // magnetic lean target of the captured text
      clx: 0, cly: 0, // eased lean actually painted
      hs: 1, // eased hover swell — never snaps onto a fresh title
      on: false, raf: 0, last: 0,
    };
    let currentRow: Element | null = null;
    let prevTitle: HTMLElement | null = null;
    let lastX = -1;
    let lastY = -1;

    const paint = () => {
      // Squash and stretch with travel: horizontal motion flattens and
      // widens the blob, vertical motion narrows and lengthens it.
      // Deformation is measured in PIXELS, not proportion — a wide list blob
      // stays essentially rigid while a small chip squashes noticeably.
      const speedX = Math.abs(s.vx);
      const speedY = Math.abs(s.vy);
      const wide =
        Math.min(16, speedX * 0.012) - Math.min(12, speedY * 0.009);
      const tall =
        Math.min(12, speedY * 0.01) - Math.min(10, speedX * 0.008);
      // Press scale composes INSIDE the transform, after the translate, so
      // it can only breathe in place — never shove the blob around.
      const sx = (1 + wide / Math.max(90, s.w)) * s.ps;
      const sy = (1 + tall / Math.max(56, s.h)) * s.ps;
      const transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(
        2,
      )}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      for (const el of [blob, lens]) {
        if (glassOn && el === blob) {
          // The lens is placed by LAYOUT, not transform: Chrome samples an
          // SVG backdrop filter from a stale region while the element's
          // transform animates, which painted an opaque disc mid-glide.
          // The stretch folds into the box size instead.
          const gw = s.w * sx;
          const gh = s.h * sy;
          el.style.transform = "";
          el.style.left = `${(s.x + (s.w - gw) / 2).toFixed(2)}px`;
          el.style.top = `${(s.y + (s.h - gh) / 2).toFixed(2)}px`;
          el.style.width = `${gw.toFixed(2)}px`;
          el.style.height = `${gh.toFixed(2)}px`;
          continue;
        }
        el.style.transformOrigin = "50% 50%";
        el.style.transform = transform;
        el.style.width = `${s.w.toFixed(2)}px`;
        el.style.height = `${s.h.toFixed(2)}px`;
      }
      // The captured text rides the SAME press spring as the blob — they
      // squash and pop as one.
      if (prevTitle) {
        prevTitle.style.transform = `translate(${s.clx.toFixed(
          1,
        )}px, ${s.cly.toFixed(1)}px) scale(${(s.hs * s.ps).toFixed(3)})`;
      }
    };

    const step = (now: number) => {
      const dt = Math.min(0.032, (now - (s.last || now)) / 1000);
      s.last = now;
      let settled = true;
      const springs: Array<["x" | "y" | "w" | "h", "vx" | "vy" | "vw" | "vh", "tx" | "ty" | "tw" | "th"]> = [
        ["x", "vx", "tx"],
        ["y", "vy", "ty"],
        ["w", "vw", "tw"],
        ["h", "vh", "th"],
      ];
      for (const [p, v, t] of springs) {
        const dist = s[t] - s[p];
        s[v] += (dist * STIFFNESS - s[v] * DAMPING) * dt;
        s[p] += s[v] * dt;
        if (Math.abs(dist) > 0.1 || Math.abs(s[v]) > 0.5) settled = false;
      }
      // Underdamped press spring: quick squash, springy release overshoot.
      const pd = s.pt - s.ps;
      s.pv += (pd * 480 - s.pv * 17) * dt;
      s.ps += s.pv * dt;
      if (Math.abs(pd) > 0.002 || Math.abs(s.pv) > 0.02) settled = false;
      // The text lean and swell ease toward their targets — never a jump.
      s.clx += (s.lx - s.clx) * Math.min(1, 11 * dt);
      s.cly += (s.ly - s.cly) * Math.min(1, 11 * dt);
      s.hs += (1.02 - s.hs) * Math.min(1, 9 * dt);
      if (
        Math.abs(s.lx - s.clx) > 0.08 ||
        Math.abs(s.ly - s.cly) > 0.08 ||
        Math.abs(1.02 - s.hs) > 0.002
      ) {
        settled = false;
      }
      paint();
      s.raf = settled ? 0 : requestAnimationFrame(step);
    };

    const kick = () => {
      if (!s.raf) {
        s.last = 0;
        s.raf = requestAnimationFrame(step);
      }
    };

    // The magnetic pull: within a row the blob leans toward the cursor and
    // its near edge stretches out elastically.
    const aim = (clientX: number, clientY: number) => {
      if (!currentRow) return;
      const listRect = list.getBoundingClientRect();
      const rect = currentRow.getBoundingClientRect();
      // If the list itself is transformed (the dock swells while hovered),
      // rects arrive in SCALED space — normalise, or targets measured
      // mid-swell bake permanent residue into the resting shape.
      const listTransform = getComputedStyle(list).transform;
      const listMatrix =
        listTransform && listTransform !== "none"
          ? new DOMMatrixReadOnly(listTransform)
          : null;
      const scaleX = listMatrix ? listMatrix.a || 1 : 1;
      const scaleY = listMatrix ? listMatrix.d || 1 : 1;
      const px = Math.max(
        -1,
        Math.min(1, (clientX - rect.left - rect.width / 2) / (rect.width / 2)),
      );
      const py = Math.max(
        -1,
        Math.min(1, (clientY - rect.top - rect.height / 2) / (rect.height / 2)),
      );
      // The magnetic lean only wakes up once the blob has arrived — while it
      // is still travelling between rows it flies straight, no sideways
      // shape-shifting.
      const settledness = Math.max(0, 1 - Math.abs(s.ty - s.y) / 30);
      const stretch = px * MAGNET * settledness;
      // Absolute children position from the PADDING box; rects measure the
      // BORDER box — on a bordered list (the dock) the blob sat one border
      // width low/right without this.
      const borderX = (list as HTMLElement).clientLeft || 0;
      const borderY = (list as HTMLElement).clientTop || 0;
      s.tx =
        (rect.left - listRect.left) / scaleX -
        borderX -
        padX +
        (stretch < 0 ? stretch : 0) +
        px * 2.5 * settledness;
      s.tw = rect.width / scaleX + padX * 2 + Math.abs(stretch);
      if (hug) {
        const inset = 3;
        const roomW = (list as HTMLElement).clientWidth;
        s.tx = Math.max(inset, Math.min(s.tx, roomW - s.tw - inset));
      }
      // Centre the blob on the text line itself, not the row box.
      const title =
        currentRow.querySelector<HTMLElement>(
          ".nv-work-title, .nv-entry-title",
        ) ?? (currentRow as HTMLElement);
      const mid = title.getBoundingClientRect();
      s.th = rect.height / scaleY + pad * 2;
      s.ty =
        (mid.top + mid.height / 2 - listRect.top) / scaleY -
        borderY -
        s.th / 2 +
        py * 2.5;
      // The absorbed text leans with the blob (applied each frame in paint,
      // together with the shared press scale) and scales around the BLOB'S
      // centre — pressing squashes text and glass as one nested unit.
      s.lx = px * 1.2;
      s.ly = py * 0.8;
      if (prevTitle !== title) {
        if (prevTitle) {
          // The abandoned title glides back to rest instead of snapping.
          const old = prevTitle;
          old.style.transition = "transform 240ms ease";
          old.style.transform = "";
          window.setTimeout(() => {
            old.style.transition = "";
          }, 260);
        }
        // EVERY fresh capture eases in from rest — never a leftover swell
        // or stale lean applied instantly.
        s.clx = 0;
        s.cly = 0;
        s.hs = 1;
        title.style.transition = "";
      }
      prevTitle = title;
      kick();
    };

    // Resistance: an adjacent row only captures the blob once the pointer is
    // properly inside it (past a third of its height), not at the shared edge.
    const wantsSwitch = (row: Element, clientY: number) => {
      if (!currentRow) return true;
      const rect = row.getBoundingClientRect();
      const prev = currentRow.getBoundingClientRect();
      const f = (clientY - rect.top) / rect.height;
      if (prev.top < rect.top) return f > 0.34; // moving down
      if (prev.top > rect.top) return f < 0.66; // moving up
      return true;
    };

    let breatheUntil = 0;
    let breatheTimer = 0;
    let leftRect: DOMRect | null = null;
    let leftAt = 0;
    const track = (event: Event) => {
      const pointer = event as PointerEvent;
      if (external && event.isTrusted) return;
      // Mobile lists are plain scroll-and-tap: the blob ignores touch
      // entirely unless this instance explicitly grabs (the dock).
      if (
        pointer.pointerType === "touch" &&
        !grab &&
        release === undefined
      ) {
        return;
      }
      lastX = pointer.clientX;
      lastY = pointer.clientY;
      if (touchDown) {
        touchDown.moved += Math.hypot(
          pointer.clientX - touchDown.x,
          pointer.clientY - touchDown.y,
        );
        touchDown.x = pointer.clientX;
        touchDown.y = pointer.clientY;
        // Edge zones scroll the page while the finger keeps previewing.
        edgeScroll =
          pointer.clientY > window.innerHeight - 150
            ? 11
            : pointer.clientY < 140
              ? -11
              : 0;
        if (edgeScroll && !edgeRaf) edgeRaf = requestAnimationFrame(edgeLoop);
      }
      // Touch lists engage only on a REAL drag: a resting tap must never
      // flash the capture (or its preview) for a frame.
      if (
        pointer.pointerType === "touch" &&
        release === undefined &&
        (!touchDown || touchDown.moved < 12)
      ) {
        return;
      }
      let row = (pointer.target as Element).closest?.(rows);
      // Grab mode: the container is ONE surface — every position inside
      // it maps to the nearest row by pure geometry, no reliance on which
      // element happened to catch the event. The blob always follows.
      if (grab) {
        let best: Element | null = null;
        let bestD = Infinity;
        for (const candidate of list.querySelectorAll(rows)) {
          const rect = candidate.getBoundingClientRect();
          const d = Math.abs(pointer.clientX - (rect.left + rect.width / 2));
          if (d < bestD) {
            bestD = d;
            best = candidate;
          }
        }
        row = best;
      } else if (pointer.pointerType === "touch") {
        // Touch drags implicitly capture the pointer on the first-touched
        // element, so event.target never changes mid-drag — resolve the
        // row under the FINGER instead.
        row =
          document
            .elementFromPoint(pointer.clientX, pointer.clientY)
            ?.closest?.(rows) ?? null;
      }
      if (row && list.contains(row) && row !== currentRow) {
        if (release !== undefined) {
          // Between links the blob BREATHES: the old capture fades fully
          // out, and only then does the new one fade in. The guard window
          // matches the CSS fade, and EVERY route back in respects it —
          // including the pointermove that lands right after a leave.
          const now = performance.now();
          if (currentRow) {
            // Neighbours GLIDE — links sitting close on the same line are
            // one gesture apart and the blob keeps its body travelling
            // between them. Only distant links make it breathe.
            const a = currentRow.getBoundingClientRect();
            const b = row.getBoundingClientRect();
            const gx = Math.max(0, b.left - a.right, a.left - b.right);
            const gy = Math.max(0, b.top - a.bottom, a.top - b.bottom);
            if (Math.hypot(gx, gy * 2.5) < 170) {
              switchTo(row, pointer);
              return;
            }
            leave();
            breatheUntil = now + 300;
          }
          if (now < breatheUntil) {
            const target = row;
            window.clearTimeout(breatheTimer);
            breatheTimer = window.setTimeout(() => {
              if (currentRow !== null) return;
              const r = target.getBoundingClientRect();
              if (
                lastX >= r.left - 6 &&
                lastX <= r.right + 6 &&
                lastY >= r.top - 6 &&
                lastY <= r.bottom + 6
              ) {
                switchTo(target, {
                  clientX: lastX,
                  clientY: lastY,
                } as PointerEvent);
              }
            }, Math.max(20, breatheUntil - now));
            return;
          }
          switchTo(row, pointer);
          return;
        }
        if (grab || external || wantsSwitch(row, pointer.clientY)) {
          switchTo(row, pointer);
        }
        return;
      }
      // Lists hold their capture anywhere over the block (continuous
      // glides); a `release` radius makes sparse targets (links) let go
      // once the pointer is no longer near.
      if (release !== undefined && !row && currentRow) {
        const r = currentRow.getBoundingClientRect();
        const dx = Math.max(r.left - pointer.clientX, 0, pointer.clientX - r.right);
        const dy = Math.max(r.top - pointer.clientY, 0, pointer.clientY - r.bottom);
        // Elliptical: vertical distance counts triple, so drifting onto the
        // neighbouring LINE releases immediately even though it is only a
        // few pixels away geometrically.
        if (Math.hypot(dx, dy * 3) > release) {
          leave();
          return;
        }
      }
      aim(pointer.clientX, pointer.clientY);
    };

    const switchTo = (row: Element, pointer: PointerEvent, silent = false) => {
      const wasOn = s.on && currentRow !== null;
      // A finger sliding onto a new row gets a tiny physical tick.
      if (!silent && pointer.pointerType === "touch" && wasOn) hapticTick();
      currentRow?.removeAttribute("data-blob");
      row.setAttribute("data-blob", "");
      currentRow = row;
      // The capture IS the hover, as far as the page is concerned.
      row.dispatchEvent(new CustomEvent("nv-blobcapture", { bubbles: true }));
      // Links read differently: blue-ringed blob, and the cursor promises a
      // link anywhere the grace zone can still open it.
      const isLink = row.tagName === "A" || !!row.querySelector("a");
      blob.setAttribute("data-link", isLink ? "true" : "false");
      // As long as the blob holds something clickable, the cursor promises
      // it — everywhere in the grace zone, not just on the element itself.
      (list as HTMLElement).style.cursor = isLink ? "alias" : "pointer";
      aim(pointer.clientX, pointer.clientY);
      // A capture right after a nearby release GLIDES in from where the
      // blob let go (crossing the short gap between neighbouring links
      // releases mid-way; the journey must still read as one).
      let glideIn = false;
      if (!wasOn && leftRect && performance.now() - leftAt < 500) {
        const b = row.getBoundingClientRect();
        const gx = Math.max(0, b.left - leftRect.right, leftRect.left - b.right);
        const gy = Math.max(0, b.top - leftRect.bottom, leftRect.top - b.bottom);
        glideIn = Math.hypot(gx, gy * 2.5) < 170;
      }
      if (!wasOn && !glideIn) {
        // First landing: appear in place, no fly-in.
        s.x = s.tx;
        s.y = s.ty;
        s.w = s.tw;
        s.h = s.th;
        s.vx = 0;
        s.vy = 0;
        s.vw = 0;
        s.vh = 0;
        paint();
      } else if (wasOn && !silent) {
        blorp();
      }
      s.on = true;
      blob.setAttribute("data-on", "true");
      kick();
    };

    // Press-and-hold squashes the blob in place; releasing pops it up a
    // touch before it settles and bows out. A release in the grace zone
    // still activates the captured element.
    let touchDown: { x: number; y: number; moved: number } | null = null;
    let touchTap = false;
    // After a drag-release opens a row, the finger lifting fires a
    // pointerleave whose goHome would still resolve the OLD active row —
    // the blob slid back and then forward again. Remember what was just
    // opened and hold position until the route catches up.
    let openedHref: string | null = null;
    let openedAt = 0;
    let edgeScroll = 0;
    let edgeRaf = 0;
    const edgeLoop = () => {
      if (!edgeScroll) {
        edgeRaf = 0;
        return;
      }
      window.scrollBy(0, edgeScroll);
      edgeRaf = requestAnimationFrame(edgeLoop);
    };

    const press = (event?: Event) => {
      const pointer = event as PointerEvent | undefined;
      if (
        pointer?.pointerType === "touch" &&
        !grab &&
        release === undefined
      ) {
        return;
      }
      if (pointer?.pointerType === "touch" && release === undefined) {
        touchDown = { x: pointer.clientX, y: pointer.clientY, moved: 0 };
      }
      if (!s.on) return;
      s.pt = 1 - Math.min(0.042, 9 / Math.max(70, s.w));
      kick();
    };

    const pressRelease = () => {
      // A dragged finger releasing over a row OPENS it — the preview you
      // stopped on is the one you meant. Taps still open via native click.
      if (touchDown && touchDown.moved > 14 && currentRow) {
        openedHref = currentRow.getAttribute("href");
        openedAt = performance.now();
        (currentRow as HTMLElement).click();
      }
      // A clean TAP: the upcoming native click belongs to the row that
      // was actually tapped — claim must not redirect it to the resting
      // capture (with a home blob that hijacked every mobile tap).
      touchTap = touchDown !== null && touchDown.moved <= 14;
      touchDown = null;
      edgeScroll = 0;
      if (s.pt === 1) return;
      s.pt = 1;
      kick();
      // Home-mode blobs STAY where you clicked — that row is about to be
      // the active page; sliding away and back read as a stutter.
      if (!home) window.setTimeout(leave, 210);
    };

    // Capture-phase click ownership: any click inside the list activates the
    // CAPTURED row — the one the blob (and highlight) is on — never a
    // neighbour the pointer happens to graze.
    const claim = (event: Event) => {
      if (touchTap) {
        touchTap = false;
        return;
      }
      if (!currentRow) return;
      const target = (event.target as Element).closest?.(rows);
      if (target === currentRow) return;
      event.stopPropagation();
      event.preventDefault();
      (currentRow as HTMLElement).click();
    };

    const goHome = () => {
      const target = home ? list.querySelector(home) : null;
      if (!target) return false;
      const rect = target.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (target === currentRow) {
        // Already home — but the last hover may have left lean/stretch
        // residue. Re-aim dead centre so the resting shape is ALWAYS the
        // same: hugging its text, centred, no memory of the exit path.
        aim(cx, cy);
        return true;
      }
      // A just-opened row is ABOUT to become the active page: stay on it
      // rather than sliding back to the outgoing page and forward again.
      if (
        openedHref &&
        performance.now() - openedAt < 1500 &&
        target.getAttribute("href") !== openedHref
      ) {
        return true;
      }
      if (openedHref && target.getAttribute("href") === openedHref) {
        openedHref = null;
      }
      switchTo(target, { clientX: cx, clientY: cy } as PointerEvent, true);
      return true;
    };

    const leave = () => {
      // With a home row the blob never vanishes — it glides back to the
      // selected item.
      if (home && goHome()) return;
      if (currentRow) {
        list.dispatchEvent(new CustomEvent("nv-blobrelease", { bubbles: true }));
        leftRect = currentRow.getBoundingClientRect();
        leftAt = performance.now();
      }
      s.on = false;
      currentRow?.removeAttribute("data-blob");
      currentRow = null;
      (list as HTMLElement).style.cursor = "";
      s.pt = 1;
      kick();
      if (prevTitle) {
        const old = prevTitle;
        old.style.transition = "transform 240ms ease";
        old.style.transform = "";
        window.setTimeout(() => {
          old.style.transition = "";
        }, 260);
      }
      prevTitle = null;
      s.clx = 0;
      s.cly = 0;
      s.hs = 1;
      setOn("false");
    };

    if (home) {
      window.setTimeout(() => {
        if (currentRow === null) goHome();
      }, 80);
    }
    // Scrolling slides rows under a PARKED cursor — the bubble follows:
    // re-resolve whatever now sits under the last known pointer position.
    const onScroll = () => {
      if (lastX < 0 || !window.matchMedia("(hover: hover)").matches) return;
      const under = document
        .elementFromPoint(lastX, lastY)
        ?.closest?.(rows);
      if (under && list.contains(under) && under !== currentRow) {
        switchTo(under, {
          clientX: lastX,
          clientY: lastY,
        } as PointerEvent, true);
      }
    };
    document.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    list.addEventListener("pointerover", track);
    list.addEventListener("pointermove", track);
    list.addEventListener("pointerleave", leave);
    list.addEventListener("pointerdown", press);
    list.addEventListener("pointerup", pressRelease);
    list.addEventListener("click", claim, true);
    return () => {
      list.removeEventListener("pointerover", track);
      list.removeEventListener("pointermove", track);
      list.removeEventListener("pointerleave", leave);
      list.removeEventListener("pointerdown", press);
      list.removeEventListener("pointerup", pressRelease);
      list.removeEventListener("click", claim, true);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.clearTimeout(breatheTimer);
      cancelAnimationFrame(edgeRaf);
      cancelAnimationFrame(s.raf);
    };
  }, [rows, pad, padX, release, grab, home, hug, external, glassOn]);

  return (
    <>
      <Tag
        aria-hidden="true"
        className="nv-blob"
        data-glass={glassOn ? "true" : undefined}
        data-on="false"
        data-tone={tone}
        ref={ref as React.Ref<never>}
      >
        {glassOn ? (
          // The lens fills the spring-driven shell; the shell's inline
          // width/height drive vaso's measurement through its own observer.
          <Vaso
            blur={0}
            component="span"
            depth={1.8}
            dispersion={1.4}
            specular={0.6}
            style={{
              position: "absolute",
              inset: 0,
              display: "block",
              // Vaso reads its radius from its own box; carry the shell's
              // (pill, card, or link) through so the lens matches.
              borderRadius: "inherit",
            }}
          />
        ) : null}
      </Tag>
      {/* The lens paints ABOVE the text: a rim-masked backdrop blur, so
          anything crossing the frame's edge refracts while the captured
          word in the clear centre stays crisp. */}
      <Tag
        aria-hidden="true"
        className="nv-blob-lens"
        data-on="false"
        ref={lensRef as React.Ref<never>}
      />
    </>
  );
}
