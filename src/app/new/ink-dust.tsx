"use client";

import { useEffect, useRef } from "react";

// Invisible ink, done properly: a canvas overlay scatters genuinely random
// specks over every hidden reveal word. They wander organically, twinkle,
// carry three depths of blur, and fade out toward their cloud's edges so
// nothing ever reads as a box or a repeating tile. When a reveal opens, each
// word's specks disperse and die on that word's own sweep delay, matching
// the ink fading in.

type Speck = {
  ox: number;
  oy: number;
  ax: number;
  ay: number;
  sp: number;
  ph: number;
  r: number;
  a: number;
  tw: number;
  tp: number;
  blur: 0 | 1 | 2;
  born: number;
  fade: number;
  deadAt: number | null;
  vx: number;
  vy: number;
};

type Cloud = {
  el: HTMLElement;
  x: number;
  y: number;
  w: number;
  h: number;
  specks: Speck[];
  dying: boolean;
};

const INK = "17, 17, 17";
const DEATH_MS = 680;

// Reveal state survives client-side navigation EXACTLY — full runs,
// half-brushed letters, gradient edges — and the dust arrival plays only
// on the first load. Module state resets only on a real refresh.
const sessionRevealed = new Set<string>();
type RunSnapshot = {
  scrubbed: number[];
  partial: Array<[number, string]>;
  wave: boolean;
};
const sessionSnapshots = new Map<string, RunSnapshot>();
let sessionArrived = false;

export default function InkDust({ scrub = false }: { scrub?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const body = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !body || !ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Dark mode inks its dust in light. (dark parked: restore the
    // matchMedia check when dark mode returns)
    // const inkRGB = window.matchMedia("(prefers-color-scheme: dark)")
    //   .matches ? "232, 232, 230" : INK;
    const inkRGB = INK;
    // Clouds are keyed by stable text+position identity, NOT by element —
    // React recreates spans on re-render, and an adopted cloud must carry on
    // seamlessly. Once an identity is revealed it goes on the never-again
    // list: dust can never return to opened text.
    const clouds = new Map<string, Cloud>();
    const revealed = new Set<string>();
    let raf = 0;
    let dpr = 1;
    let paused = false;
    // Set on cleanup. Any async straggler (fonts.ready, stray timeouts)
    // must die here — a resurrected engine keeps painting stale dust over
    // revealed text on the SHARED canvas. This was THE phantom-specks bug.
    let dead = false;
    // The page arrives CLEAN: no dust and no scrubbing for a settling
    // beat, then the ink condenses in — and only once it has FULLY
    // arrived does the brush go live. Returning within the session skips
    // the whole ceremony: dust is already home.
    const firstArrival = !sessionArrived;
    sessionArrived = true;
    const settleUntil = firstArrival ? performance.now() + 2000 : 0;
    const brushAt = firstArrival ? settleUntil + 2450 : 0;

    // Specks are pre-rendered ONCE as tiny sprites (three focus depths) and
    // blitted with drawImage — no canvas filters in the hot loop, which is
    // what makes this cheap enough to run constantly.
    // Rendered large and drawn small: the downscale is what makes each
    // speck a smooth round point instead of a blocky cluster of pixels.
    const SPRITE = 48;
    const sprites: HTMLCanvasElement[] = [0, 1, 2].map((level) => {
      const c = document.createElement("canvas");
      c.width = SPRITE;
      c.height = SPRITE;
      const g = c.getContext("2d")!;
      const half = SPRITE / 2;
      // Every tier is a crisp dot — depth comes from opacity alone, no
      // soft blurred motes.
      const peak = [1, 0.55, 0.26][level];
      const grad = g.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, `rgba(${inkRGB}, ${peak})`);
      grad.addColorStop(0.72, `rgba(${inkRGB}, ${peak})`);
      grad.addColorStop(0.9, `rgba(${inkRGB}, 0)`);
      grad.addColorStop(1, `rgba(${inkRGB}, 0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, SPRITE, SPRITE);
      return c;
    });

    const resize = () => {
      const rect = body.getBoundingClientRect();
      // Full device density (capped at 2x) — the 1.5x cap left Retina
      // screens upscaling the dust and reading it as pixel-y.
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    const spawn = (
      el: HTMLElement,
      x: number,
      y: number,
      w: number,
      h: number,
      birthDelay?: number,
    ): Cloud => {
      const small =
        window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
      const count = small
        ? Math.max(10, Math.min(130, Math.round((w * h) / 18)))
        : Math.max(14, Math.min(220, Math.round((w * h) / 12)));
      const specks: Speck[] = [];
      const t = performance.now();
      // A melt wave hands each word an explicit birth window so its specks
      // condense exactly while ITS letters fade; generic re-veil spawns
      // stagger through the melt.
      // The page-load arrival drifts in gently: staggered births and a
      // long fade. Everything after settles back to the quick fade.
      const arriving = firstArrival && t < settleUntil + 600;
      const lateBirth =
        birthDelay ??
        (t < reveilUntil
          ? 500 + Math.random() * 1700
          : arriving
            ? Math.random() * 900
            : 0);
      const birthSpread = birthDelay !== undefined ? 1300 : 500;
      const fade = arriving && birthDelay === undefined ? 1500 : 550;
      for (let i = 0; i < count; i++) {
        const tier = (
          Math.random() < 0.35 ? 2 : Math.random() < 0.5 ? 1 : 0
        ) as 0 | 1 | 2;
        specks.push({
          ox: Math.random() * w,
          oy: h * (0.1 + Math.random() * 0.85),
          ax: reduce ? 0 : 0.6 + Math.random() * 2.4,
          ay: reduce ? 0 : 0.5 + Math.random() * 1.9,
          sp: 0.6 + Math.random() * 1.7,
          ph: Math.random() * Math.PI * 2,
          r: 0.36, // uniform speck size — depth comes from opacity alone
          a: [0.68, 0.47, 0.28][tier] + Math.random() * [0.28, 0.2, 0.14][tier],
          tw: reduce ? 0 : 0.7 + Math.random() * 1.7,
          tp: Math.random() * Math.PI * 2,
          blur: tier,
          born: t + lateBirth + Math.random() * birthSpread,
          fade,
          deadAt: null,
          vx: (Math.random() - 0.5) * 14,
          vy: -3 - Math.random() * 9,
        });
      }
      return { el, x, y, w, h, specks, dying: false };
    };

    const isWordEl = (el: HTMLElement) =>
      el.classList.contains("nx-w") ||
      (el.classList.contains("nx-t") && !el.querySelector(".nx-w"));

    const readDelay = (el: HTMLElement) => {
      const raw =
        el.style.getPropertyValue("--ud") ||
        getComputedStyle(el).getPropertyValue("--ud");
      return parseFloat(raw) || 0;
    };

    const keyOf = (el: HTMLElement, x: number, y: number) =>
      `${el.textContent}|${Math.round(x / 4)}:${Math.round(y / 4)}`;

    const sync = () => {
      rebuildRuns();
      const bodyRect = body.getBoundingClientRect();
      const seen = new Set<string>();
      body.querySelectorAll<HTMLElement>(".nx-r .nx-w, .nx-r .nx-t").forEach(
        (el) => {
          if (!isWordEl(el)) return;
          if (!el.closest(".nx-r[data-blur]")) return;
          if (el.getAttribute("data-scrub") === "on") return;
          const r = el.getBoundingClientRect();
          if (r.width < 2) return;
          const x = r.left - bodyRect.left;
          const y = r.top - bodyRect.top + r.height * 0.16;
          const w = r.width;
          const h = r.height * 0.66;
          const key = keyOf(el, x, y);
          seen.add(key);
          if (revealed.has(key)) return; // opened text never re-dusts
          const existing = clouds.get(key);
          if (existing && !existing.dying) {
            // Adopt the (possibly recreated) element; the cloud carries on.
            existing.el = el;
            existing.x = x;
            existing.y = y;
            existing.w = w;
            existing.h = h;
          } else if (!existing && performance.now() >= settleUntil) {
            clouds.set(key, spawn(el, x, y, w, h));
          }
        },
      );
      const t = performance.now();
      for (const [key, cloud] of clouds) {
        if (seen.has(key)) continue;
        if (!cloud.dying) {
          // Revealed: disperse on the word's sweep beat, and remember the
          // identity (and which run owns it) so dust never comes back —
          // until that run's own re-veil clears the slate.
          markRevealed(key, cloud);
          cloud.dying = true;
          lastEventT = t;
          const delay = cloud.el.isConnected ? readDelay(cloud.el) : 0;
          for (const s of cloud.specks) {
            s.deadAt = t + delay + Math.random() * 180;
          }
        }
      }
      kick();
    };

    let frameFlip = 0;
    const frame = () => {
      raf = 0;
      if (dead || paused) return;
      const t = performance.now();
      // Ambient dust idles at half rate — wander and twinkle are slow
      // motions. Full rate only while a brush, dispersal, or re-veil is
      // actually animating.
      frameFlip = (frameFlip + 1) % 3;
      if (frameFlip !== 0 && t - lastEventT > 3000 && t > reveilUntil + 3500) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const ts = t / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(
        0,
        0,
        canvas.width / dpr + 1,
        canvas.height / dpr + 1,
      );

      let alive = 0;
      for (const cloud of clouds.values()) {
        for (const s of cloud.specks) {
          if (s.deadAt !== null && t > s.deadAt + DEATH_MS) continue;
          alive++;
          let alpha = s.a * (0.68 + 0.32 * Math.sin(ts * s.tw * 2 + s.tp));
          alpha *= Math.min(1, Math.max(0, (t - s.born) / s.fade));
          let px = cloud.x + s.ox + s.ax * Math.sin(ts * s.sp * 2 + s.ph);
          let py =
            cloud.y + s.oy + s.ay * Math.cos(ts * s.sp * 1.7 + s.ph * 1.3);
          let size = s.r * 3.8; // sprite draw size — smaller, darker points
          const edge = Math.min(s.ox, cloud.w - s.ox);
          alpha *= Math.min(1, 0.25 + edge / 14);
          if (s.deadAt !== null && t > s.deadAt) {
            const p = (t - s.deadAt) / DEATH_MS;
            alpha *= Math.max(0, 1 - p);
            px += s.vx * p;
            py += s.vy * p;
            size *= 1 - p * 0.5;
          }
          if (alpha <= 0.012) continue;
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            sprites[s.blur],
            Math.round((px - size / 2) * dpr) / dpr,
            Math.round((py - size / 2) * dpr) / dpr,
            size,
            size,
          );
        }
      }
      ctx.globalAlpha = 1;

      // Prune fully-dead clouds (their keys stay on the revealed list).
      for (const [key, cloud] of clouds) {
        if (
          cloud.dying &&
          cloud.specks.every((s) => s.deadAt !== null && t > s.deadAt + DEATH_MS)
        ) {
          clouds.delete(key);
        }
      }

      if (alive > 0 || clouds.size > 0) {
        raf = requestAnimationFrame(frame);
      } else {
        // The loop is stopping: whatever was painted this cycle would
        // otherwise FREEZE on the canvas forever. Leave it blank.
        ctx.clearRect(0, 0, canvas.width / dpr + 1, canvas.height / dpr + 1);
      }
    };

    const kick = () => {
      if (dead) return;
      if (!raf) raf = requestAnimationFrame(frame);
    };

    // Restore EXACTLY what the visitor already earned this session:
    // fully-revealed runs, individual brushed letters, and the gradient
    // frontier — no dust over any of it, no re-brushing.
    body.querySelectorAll<HTMLElement>(".nx-r[data-blur]").forEach((runEl) => {
      const key = runEl.textContent || "";
      if (sessionRevealed.has(key)) {
        runEl.setAttribute("data-wave", "");
        runEl
          .querySelectorAll<HTMLElement>(".nx-l, .nx-w, .nx-t")
          .forEach((el) => {
            if (el.classList.contains("nx-l") || isWordEl(el)) {
              el.setAttribute("data-scrub", "on");
            }
          });
        return;
      }
      const snap = sessionSnapshots.get(key);
      if (!snap) return;
      const letters = runEl.querySelectorAll<HTMLElement>(".nx-l");
      for (const index of snap.scrubbed) {
        letters[index]?.setAttribute("data-scrub", "on");
      }
      for (const [index, rv] of snap.partial) {
        const letter = letters[index];
        if (letter && !letter.hasAttribute("data-scrub")) {
          letter.style.setProperty("--rv", rv);
          letter.setAttribute("data-rv", "");
        }
      }
    });

    resize();
    const initial = window.setTimeout(() => {
      sync();
    }, 60);
    let settleTimer = 0;
    let brushTimer = 0;
    if (firstArrival) {
      body.setAttribute("data-ink-settle", "");
      settleTimer = window.setTimeout(() => {
        sync();
      }, 2050);
      brushTimer = window.setTimeout(() => {
        body.removeAttribute("data-ink-settle");
      }, 4500);
    }
    if (process.env.NODE_ENV !== "production") {
      // Debug state rides ON THIS canvas — multiple InkDust instances
      // (uifork variants, strict-mode remounts) must never cross wires.
      (canvas as unknown as Record<string, unknown>).__ink = {
        clouds,
        revealed,
        runs: () => runsCache,
      };
    }

    // Scrub-to-reveal: words condense into focus where the cursor passes.
    // Each revealed run keeps its own quiet-clock: leave one alone for ten
    // seconds and it exhales back into dust on its own while the others
    // stay put.
    const SCRUB_RADIUS = 34;
    const REVEIL_AFTER = 20000;
    const runTouch = new Map<HTMLElement, number>();
    const keyRun = new Map<string, HTMLElement>();

    const markRevealed = (key: string, cloud: Cloud) => {
      revealed.add(key);
      const owner = cloud.el.closest<HTMLElement>(".nx-r");
      if (owner) keyRun.set(key, owner);
    };

    // All scrub geometry is measured once and cached body-relative, so a
    // pointermove costs a single body rect read — never a per-letter
    // layout pass.
    type LetterPos = { el: HTMLElement; cx: number; cy: number; hw: number };
    type RunInfo = {
      el: HTMLElement;
      x: number;
      y: number;
      w: number;
      h: number;
      letters: LetterPos[];
    };
    let runsCache: RunInfo[] = [];
    const letterRect = new Map<HTMLElement, LetterPos>();
    const rebuildRuns = () => {
      const br = body.getBoundingClientRect();
      runsCache = [];
      letterRect.clear();
      body.querySelectorAll<HTMLElement>(".nx-r[data-blur]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 1) return;
        const letters: LetterPos[] = [];
        el.querySelectorAll<HTMLElement>(".nx-l").forEach((letter) => {
          const lr = letter.getBoundingClientRect();
          const pos = {
            el: letter,
            cx: lr.left + lr.width / 2 - br.left,
            cy: lr.top + lr.height / 2 - br.top,
            hw: lr.width / 2 + 4,
          };
          letters.push(pos);
          letterRect.set(letter, pos);
        });
        runsCache.push({
          el,
          x: r.left - br.left,
          y: r.top - br.top,
          w: r.width,
          h: r.height,
          letters,
        });
      });
    };

    // THE invariant: dust never sits on ink. Any letter carrying
    // data-scrub kills every living speck over its span — called on each
    // brush pass for nearby clouds and swept globally once a second, so
    // no straggler can park on revealed text.
    const healCloud = (cloud: Cloud, t: number) => {
      if (cloud.dying) return;
      for (const letter of cloud.el.querySelectorAll<HTMLElement>(
        ".nx-l[data-scrub], .nx-l[data-rv]",
      )) {
        // A gradient-edge letter past half ink reads as text — it sheds
        // its dust too; fainter edges keep their haze.
        if (!letter.hasAttribute("data-scrub")) {
          const rv = parseFloat(letter.style.getPropertyValue("--rv")) || 0;
          if (rv < 0.55) continue;
        }
        const pos = letterRect.get(letter);
        if (!pos) continue;
        for (const speck of cloud.specks) {
          if (speck.deadAt !== null) continue;
          if (Math.abs(cloud.x + speck.ox - pos.cx) <= pos.hw) {
            speck.deadAt = t + Math.random() * 120;
          }
        }
      }
    };

    // One run melts back on its own — the reveal in reverse: a slow wave
    // rolls from the run's start, each letter fading on its own beat while
    // that word's specks are born THROUGH the fade. The text literally
    // becomes the dust.
    const MELT_LETTER_MS = 1500;
    const reveilRun = (runEl: HTMLElement) => {
      runEl.removeAttribute("data-wave");
      runEl.setAttribute("data-reveil", "");
      const t = performance.now();
      const bodyRect = body.getBoundingClientRect();
      const info = runsCache.find((r) => r.el === runEl);
      const first = info?.letters[0];
      const ox = first ? first.cx : 0;
      const oy = first ? first.cy : 0;
      const waveDelay = (cx: number, cy: number) =>
        Math.min(2600, Math.hypot(cx - ox, cy - oy) * 3.2);
      let maxDelay = 0;
      const pending: HTMLElement[] = [];
      if (info) {
        for (const letter of info.letters) {
          if (!letter.el.hasAttribute("data-scrub")) continue;
          const delay = waveDelay(letter.cx, letter.cy);
          maxDelay = Math.max(maxDelay, delay);
          letter.el.style.transitionDelay = `${Math.round(delay)}ms`;
          letter.el.removeAttribute("data-scrub");
          pending.push(letter.el);
        }
      }
      runEl.querySelectorAll<HTMLElement>(".nx-l[data-rv]").forEach((el) => {
        el.removeAttribute("data-rv");
        el.style.removeProperty("--rv");
      });
      // Words and links ride the same wave.
      runEl.querySelectorAll<HTMLElement>("[data-scrub]").forEach((el) => {
        if (el.classList.contains("nx-l")) {
          el.removeAttribute("data-scrub");
          return;
        }
        const r = el.getBoundingClientRect();
        const delay = waveDelay(
          r.left + r.width / 2 - bodyRect.left,
          r.top + r.height / 2 - bodyRect.top,
        );
        maxDelay = Math.max(maxDelay, delay);
        if (el.classList.contains("nx-t")) {
          el.style.transitionDelay = `${Math.round(delay)}ms`;
          pending.push(el);
        }
        el.removeAttribute("data-scrub");
      });
      window.setTimeout(() => {
        for (const el of pending) el.style.transitionDelay = "";
      }, maxDelay + MELT_LETTER_MS + 400);
      window.setTimeout(
        () => runEl.removeAttribute("data-reveil"),
        maxDelay + MELT_LETTER_MS + 600,
      );
      reveilUntil = t + maxDelay + MELT_LETTER_MS;
      lastEventT = t;
      for (const [key, owner] of keyRun) {
        if (owner !== runEl) continue;
        keyRun.delete(key);
        revealed.delete(key);
        clouds.delete(key);
      }
      // Condense the dust back on the SAME wave: each word's specks are
      // born through its letters' fade window, so text and dust cross
      // mid-air.
      runEl.querySelectorAll<HTMLElement>(".nx-w, .nx-t").forEach((el) => {
        if (!isWordEl(el)) return;
        const r = el.getBoundingClientRect();
        if (r.width < 2) return;
        const x = r.left - bodyRect.left;
        const y = r.top - bodyRect.top + r.height * 0.16;
        const w = r.width;
        const h = r.height * 0.66;
        const key = keyOf(el, x, y);
        if (clouds.has(key)) return;
        const delay = waveDelay(x + w / 2, y + h / 2);
        clouds.set(key, spawn(el, x, y, w, h, delay + 250));
      });
      kick();
    };

    // One swipe is enough: the touched letters reveal instantly and the
    // rest of that run unfolds as a RIPPLE outward from the brush point.
    const rippleReveal = (
      run: RunInfo,
      px: number,
      py: number,
      t: number,
      maxWaveDelay = 950,
    ) => {
      const runEl = run.el;
      if (runEl.hasAttribute("data-wave")) return;
      runEl.setAttribute("data-wave", "");
      sessionRevealed.add(runEl.textContent || "");
      // Brushing mid-melt cancels THAT run's re-veil: its text condenses
      // straight back from wherever the exhale had reached.
      runEl.removeAttribute("data-reveil");
      runTouch.set(runEl, t);
      const pending: HTMLElement[] = [];
      let maxDelay = 0;
      for (const letter of run.letters) {
        if (letter.el.hasAttribute("data-rv")) {
          letter.el.removeAttribute("data-rv");
          letter.el.style.removeProperty("--rv");
        }
        if (letter.el.hasAttribute("data-scrub")) continue;
        const dist = Math.hypot(letter.cx - px, letter.cy - py);
        // The rollout spreads with a little resistance, but briskly.
        const delay = Math.min(maxWaveDelay, dist * 1.5);
        maxDelay = Math.max(maxDelay, delay);
        letter.el.style.transitionDelay = `${Math.round(delay)}ms`;
        letter.el.setAttribute("data-scrub", "on");
        pending.push(letter.el);
      }
      window.setTimeout(() => {
        for (const letter of pending) letter.style.transitionDelay = "";
      }, maxDelay + 700);
      // EVERY word element in the run is marked revealed — not just the
      // ones with live clouds — so sync can never mistake a rippled word
      // for hidden and re-dust it over visible text.
      runEl.querySelectorAll<HTMLElement>(".nx-w, .nx-t").forEach((el) => {
        if (isWordEl(el)) el.setAttribute("data-scrub", "on");
      });
      // Links land as plain ink first, then dot into linkhood a beat after
      // the ripple — no blob grab mid-reveal.
      runEl.querySelectorAll<HTMLElement>(".nx-t").forEach((el) => {
        el.setAttribute("data-fresh", "");
        window.setTimeout(() => el.removeAttribute("data-fresh"), 1500);
      });
      for (const [key, cloud] of clouds) {
        if (!runEl.contains(cloud.el)) continue;
        markRevealed(key, cloud);
        cloud.dying = true;
        for (const speck of cloud.specks) {
          if (speck.deadAt !== null) continue;
          const dist = Math.hypot(
            cloud.x + speck.ox - px,
            cloud.y + speck.oy - py,
          );
          speck.deadAt =
            t + Math.min(maxWaveDelay, dist * 1.5) + Math.random() * 160;
        }
      }
    };

    const segDist = (
      x: number,
      y: number,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
    ) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const l2 = dx * dx + dy * dy;
      const u = l2
        ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l2))
        : 0;
      return Math.hypot(x - (x1 + dx * u), y - (y1 + dy * u));
    };

    let prevBX = 0;
    let prevBY = 0;
    let lastBrushT = 0;
    let lastEventT = 0;

    const scrubAt = (clientX: number, clientY: number) => {
      const t = performance.now();
      const br = body.getBoundingClientRect();
      const px = clientX - br.left;
      const py = clientY - br.top;
      // The brush is the SEGMENT from the last processed point — move
      // coalescing must never leave unrevealed letters or living specks
      // in the gaps of a fast swipe.
      const jump =
        t - lastBrushT > 200 || Math.hypot(px - prevBX, py - prevBY) > 150;
      const x1 = jump ? px : prevBX;
      const y1 = jump ? py : prevBY;
      // Speed resistance: the brush narrows as the stroke quickens, so a
      // racing swipe only grazes while a slow deliberate pass reveals.
      const speed = jump
        ? 0
        : Math.hypot(px - x1, py - y1) / Math.max(16, t - lastBrushT);
      const brush = Math.max(0.4, Math.min(1, 1.1 - speed * 0.45));
      prevBX = px;
      prevBY = py;
      lastBrushT = t;
      lastEventT = t;
      for (const run of runsCache) {
        if (!run.el.isConnected) continue;
        const slack = SCRUB_RADIUS * 2 + (run.w + run.h) / 2;
        if (
          segDist(run.x + run.w / 2, run.y + run.h / 2, x1, y1, px, py) > slack
        ) {
          continue;
        }
        let on = 0;
        let lit = false;
        // A wrapped run's bounding box spans whole lines, so proximity to
        // the box means nothing — only passing near a run's actual LETTERS
        // resets its quiet-clock.
        let near = run.letters.length === 0;
        for (const letter of run.letters) {
          const dist = segDist(letter.cx, letter.cy, x1, y1, px, py);
          if (dist <= SCRUB_RADIUS * 1.5) near = true;
          if (letter.el.hasAttribute("data-scrub")) {
            on++;
            continue;
          }
          if (dist <= SCRUB_RADIUS * 0.8 * brush) {
            letter.el.setAttribute("data-scrub", "on");
            if (letter.el.hasAttribute("data-rv")) {
              letter.el.removeAttribute("data-rv");
              letter.el.style.removeProperty("--rv");
            }
            on++;
            lit = true;
          } else if (dist <= SCRUB_RADIUS * 1.6 * brush) {
            // The brush edge: partial ink, strongest near the core, so a
            // half-revealed word bleeds smoothly back into dust.
            const strength =
              1 -
              (dist - SCRUB_RADIUS * 0.8 * brush) /
                (SCRUB_RADIUS * 0.8 * brush);
            const prev =
              parseFloat(letter.el.style.getPropertyValue("--rv")) || 0;
            if (strength > prev) {
              letter.el.style.setProperty("--rv", strength.toFixed(3));
              letter.el.setAttribute("data-rv", "");
            }
          }
        }
        if (near) runTouch.set(run.el, t);
        // One honest swipe (a handful of letters) is enough to start the
        // rollout; a mere graze stays partial.
        if (
          lit &&
          !run.el.hasAttribute("data-wave") &&
          on >= 6 &&
          on / Math.max(1, run.letters.length) >= 0.25
        ) {
          rippleReveal(run, px, py, t);
        }
      }
      for (const [key, cloud] of clouds) {
        if (cloud.dying) continue;
        if (!cloud.el.isConnected) continue;
        const reach = SCRUB_RADIUS + (cloud.w + cloud.h) / 2;
        if (
          segDist(
            cloud.x + cloud.w / 2,
            cloud.y + cloud.h / 2,
            x1,
            y1,
            px,
            py,
          ) > reach
        ) {
          continue;
        }
        // Dust never sits on ink: revealed letters under this cloud take
        // their specks with them in the SAME frame.
        healCloud(cloud, t);
        if (
          cloud.el.getAttribute("data-scrub") !== "on" &&
          !cloud.el.querySelector(".nx-l")
        ) {
          const dx = Math.max(cloud.x - px, 0, px - (cloud.x + cloud.w));
          const dy = Math.max(cloud.y - py, 0, py - (cloud.y + cloud.h));
          if (Math.hypot(dx, dy) <= SCRUB_RADIUS * 0.6) {
            // Letterless links reveal whole at the brush core — as plain
            // ink first; linkhood arrives a beat later.
            cloud.el.setAttribute("data-scrub", "on");
            cloud.el.setAttribute("data-fresh", "");
            const freshEl = cloud.el;
            window.setTimeout(() => freshEl.removeAttribute("data-fresh"), 1500);
            markRevealed(key, cloud);
            cloud.dying = true;
            for (const speck of cloud.specks) {
              if (speck.deadAt === null) {
                speck.deadAt = t + Math.random() * 140;
              }
            }
            continue;
          }
        }
        for (const speck of cloud.specks) {
          if (speck.deadAt !== null) continue;
          if (
            segDist(
              cloud.x + speck.ox,
              cloud.y + speck.oy,
              x1,
              y1,
              px,
              py,
            ) <=
            SCRUB_RADIUS * brush
          ) {
            speck.deadAt = t + Math.random() * 120;
          }
        }
      }
      kick();
    };

    // Pointermoves are coalesced to one scrub per frame — the browser can
    // fire several per frame and each brush pass is real work.
    let scrubQueued = false;
    let scrubX = 0;
    let scrubY = 0;
    let pressed: { x: number; y: number; moved: boolean } | null = null;
    const onScrubMove = (event: Event) => {
      const pointer = event as PointerEvent;
      if (pointer.type === "pointerdown") {
        pressed = { x: pointer.clientX, y: pointer.clientY, moved: false };
      } else if (
        pressed &&
        Math.hypot(pointer.clientX - pressed.x, pointer.clientY - pressed.y) > 12
      ) {
        pressed.moved = true;
      }
      if (performance.now() < brushAt) return;
      scrubX = pointer.clientX;
      scrubY = pointer.clientY;
      if (scrubQueued) return;
      scrubQueued = true;
      requestAnimationFrame(() => {
        scrubQueued = false;
        scrubAt(scrubX, scrubY);
      });
    };
    const onPressEnd = (event: PointerEvent) => {
      if (
        pressed &&
        Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 12
      ) {
        pressed.moved = true;
      }
    };
    const onPressCancel = () => {
      pressed = null;
    };
    const onRevealClick = (event: MouseEvent) => {
      const t = performance.now();
      const wasDrag = pressed?.moved ?? false;
      pressed = null;
      if (t < settleUntil || event.button !== 0 || wasDrag) return;
      if (
        event.target instanceof Element &&
        event.target.closest("a, button, [role='button']")
      ) {
        return;
      }
      if (window.getSelection()?.toString()) return;
      const rect = body.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      for (const run of runsCache) {
        if (run.el.isConnected) rippleReveal(run, px, py, t, 1500);
      }
      kick();
    };
    let idleInterval = 0;
    if (scrub) {
      body.addEventListener("pointermove", onScrubMove, { passive: true });
      body.addEventListener("pointerdown", onScrubMove, { passive: true });
      body.addEventListener("pointerup", onPressEnd, { passive: true });
      body.addEventListener("pointercancel", onPressCancel, { passive: true });
      body.addEventListener("click", onRevealClick);
      idleInterval = window.setInterval(() => {
        const now = performance.now();
        for (const cloud of clouds.values()) healCloud(cloud, now);
        for (const [runEl, last] of runTouch) {
          if (now - last < REVEIL_AFTER) continue;
          runTouch.delete(runEl);
          if (!runEl.isConnected) continue;
          // A run revealed IN FULL has been earned — it never re-veils
          // this visit. Only partial scribbles melt back.
          if (runEl.hasAttribute("data-wave")) continue;
          if (runEl.querySelector("[data-scrub], [data-rv]")) {
            reveilRun(runEl);
          }
        }
      }, 1000);
    }

    const onVisibility = () => {
      paused = document.hidden;
      if (!paused) kick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const intersect = new IntersectionObserver((entries) => {
      paused = document.hidden || !entries[0]?.isIntersecting;
      if (!paused) kick();
    });
    intersect.observe(body);

    // Re-veiling (idle timeout) means dust is allowed back everywhere —
    // but only AFTER the words have melted out, never on top of visible
    // text.
    let reveilUntil = 0;
    const onReveil = () => {
      revealed.clear();
      reveilUntil = performance.now() + 5000;
    };
    body.addEventListener("nx-reveil", onReveil);

    const mutations = new MutationObserver((list) => {
      // Letter-level scrub flips are purely visual — never resync (and
      // re-measure) for those; only word/run-level changes matter.
      const meaningful = list.some(
        (m) =>
          m.type !== "attributes" ||
          !(m.target as HTMLElement).classList?.contains("nx-l"),
      );
      if (meaningful) sync();
    });
    mutations.observe(body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-blur", "data-scrub"],
    });
    const sizes = new ResizeObserver(() => {
      resize();
      sync();
    });
    sizes.observe(body);
    document.fonts?.ready
      .then(() => {
        if (!dead) sync();
      })
      .catch(() => {});

    return () => {
      dead = true;
      // Photograph the exact reveal state for this session before the
      // page lets go of the DOM.
      body
        .querySelectorAll<HTMLElement>(".nx-r[data-blur]")
        .forEach((runEl) => {
          const key = runEl.textContent || "";
          if (sessionRevealed.has(key)) return;
          const letters = [
            ...runEl.querySelectorAll<HTMLElement>(".nx-l"),
          ];
          const scrubbed: number[] = [];
          const partial: Array<[number, string]> = [];
          letters.forEach((letter, index) => {
            if (letter.hasAttribute("data-scrub")) scrubbed.push(index);
            else if (letter.hasAttribute("data-rv")) {
              partial.push([
                index,
                letter.style.getPropertyValue("--rv") || "0",
              ]);
            }
          });
          if (scrubbed.length || partial.length) {
            sessionSnapshots.set(key, {
              scrubbed,
              partial,
              wave: runEl.hasAttribute("data-wave"),
            });
          } else {
            sessionSnapshots.delete(key);
          }
        });
      window.clearTimeout(initial);
      window.clearTimeout(settleTimer);
      window.clearTimeout(brushTimer);
      body.removeAttribute("data-ink-settle");
      window.clearInterval(idleInterval);
      if (scrub) {
        body.removeEventListener("pointermove", onScrubMove);
        body.removeEventListener("pointerdown", onScrubMove);
        body.removeEventListener("pointerup", onPressEnd);
        body.removeEventListener("pointercancel", onPressCancel);
        body.removeEventListener("click", onRevealClick);
      }
      body.removeEventListener("nx-reveil", onReveil);
      document.removeEventListener("visibilitychange", onVisibility);
      intersect.disconnect();
      mutations.disconnect();
      sizes.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [scrub]);

  return <canvas aria-hidden="true" className="nx-ink-canvas" ref={ref} />;
}
