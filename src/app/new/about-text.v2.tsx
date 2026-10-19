"use client";

import { useEffect, useRef, useState } from "react";

// The about paragraph, ported from /v3: one continuous block of text that
// unfolds. Clicking a doodled phrase appends its continuation inline, word by
// word; every state reads as one natural piece of writing. Opens are one-way;
// spent marks dry to grey. Type stays Switzer — only the doodles and chips
// come along from v3, scaled down to body size.

type DoodleKind =
  | "underline"
  | "line"
  | "line2"
  | "circle"
  | "box"
  | "triangle"
  | "leaf"
  | "mountain"
  | "smiley"
  | "sparkles"
  | "arrow"
  | "bang";

type Node =
  | string
  | {
      id: string;
      label: string;
      doodle: DoodleKind;
      reveal?: Node[];
      href?: string;
      iconFirst?: boolean; // icon sits before the word (Vercel)
    };

// Lives at module scope: survives client-side navigation (switching pages
// doesn't replay the intro or lose opened text) but resets on a real reload,
// which is exactly when the load-in should play again.
const session: { done: boolean; open: string[] } = { done: false, open: [] };

const CONTENT_1: Node[] = [
  "I was born and raised in ",
  {
    id: "calgary",
    label: "Calgary, Canada",
    doodle: "leaf",
    reveal: [
      ", a city next to the ",
      {
        id: "mountains",
        label: "mountains",
        doodle: "mountain",
        reveal: [", where I like hiking whenever I get the chance"],
      },
    ],
  },
  ". I'm a ",
  {
    id: "designer",
    label: "designer",
    doodle: "sparkles",
    reveal: [
      " who began learning design independently through the internet four years ago",
    ],
  },
  " and ",
  {
    id: "student",
    label: "student",
    doodle: "circle",
    reveal: [" studying Global Business and Digital Arts"],
  },
  " at the ",
  {
    id: "waterloo",
    label: "University of Waterloo",
    doodle: "underline",
    reveal: [", where I'm starting my second year"],
  },
  ". I most recently worked at ",
  {
    id: "vercel",
    label: "Vercel",
    doodle: "triangle",
    iconFirst: true,
    reveal: [
      ", where I worked on ",
      {
        id: "v0",
        label: "v0",
        doodle: "circle",
        reveal: [", a product that lets you turn ideas into software"],
      },
    ],
  },
  ".",
];

const CONTENT_2: Node[] = [
  "I'm especially drawn to ",
  {
    id: "early",
    label: "early-stage products",
    doodle: "line",
    reveal: [
      " built for ",
      {
        id: "creators",
        label: "creators and teams",
        doodle: "smiley",
        reveal: [
          ", especially when good design can make complicated things feel simple",
        ],
      },
      ",",
    ],
  },
  " and ",
  {
    id: "tools",
    label: "delightful tools",
    doodle: "line2",
    reveal: [
      " with intentional decisions, intuitive interfaces, and high-quality execution",
    ],
  },
  ". I'm always interested in chatting, so feel free to ",
  {
    id: "reach",
    label: "reach out",
    doodle: "arrow",
    reveal: [
      " on ",
      {
        id: "linkedin",
        label: "LinkedIn",
        doodle: "box",
        href: "https://linkedin.com/in/rghv-agrwl",
      },
      ", ",
      {
        id: "x",
        label: "X",
        doodle: "box",
        href: "https://x.com/varksed",
      },
      ", or by ",
      {
        id: "email",
        label: "email",
        doodle: "box",
        href: "mailto:rghvagwl@gmail.com",
      },
    ],
  },
  ".",
];

// ---------------------------------------------------------------- doodles ---

function pick(id: string, variants: string[]) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return variants[Math.abs(hash) % variants.length];
}

// Deterministically wobble every coordinate in a path — the same shape,
// re-traced. Cycled by the flipbook engine, the near-identical tracings make
// the line quiver like living ink.
function jitter(d: string, seed: number, amp: number) {
  let i = 0;
  return d.replace(/-?\d+(\.\d+)?/g, (m) => {
    i += 1;
    const x = Math.sin(seed * 374.1 + i * 97.3) * 43758.5453;
    const offset = (x - Math.floor(x) - 0.5) * 2 * amp;
    return (parseFloat(m) + offset).toFixed(2);
  });
}

function Frames({
  amp,
  d,
  textured,
  split,
}: {
  amp: number;
  d: string;
  textured: boolean;
  split?: boolean;
}) {
  const parts = split
    ? d
        .split(/(?=M)/)
        .map((part) => part.trim())
        .filter(Boolean)
    : null;
  return (
    <>
      {[0, 1, 2].map((f) => (
        <g className={`nx-frame nx-f${f}`} key={f}>
          {parts ? (
            parts.map((part, i) => (
              <path
                d={jitter(part, f * 2 + 1 + i * 7, f === 0 ? 0 : amp)}
                key={i}
                pathLength={1}
                style={{ "--si": i } as React.CSSProperties}
              />
            ))
          ) : (
            <path
              className={f === 0 ? "nx-draw" : undefined}
              d={jitter(d, f * 2 + 1, f === 0 ? 0 : amp)}
              pathLength={1}
            />
          )}
          {textured ? (
            <path
              className={f === 0 ? "nx-thin nx-draw" : "nx-thin"}
              d={jitter(d, f * 2 + 2, amp * 1.4)}
              pathLength={1}
            />
          ) : null}
        </g>
      ))}
    </>
  );
}

const ICONS: Record<string, { d: string; w: number; filled: boolean }> = {
  // Vercel triangle, "filled" with pen scratches
  triangle: {
    d: "M12,4.6 C12.5,5.6 19.8,18 20.3,18.8 C16.6,19.1 7.2,19 3.8,18.8 C5.8,15.2 11,6.4 12,4.6 Z M10.4,9.3 L7.6,15.6 M12.3,8.2 L9.2,16.8 M13.7,10.4 L11.2,17.2 M15.2,12.8 L13.4,17.4 M16.7,15.3 L15.4,17.8",
    w: 24,
    filled: false,
  },
  // Maple leaf: thin stem, three deep-cut lobes, scribbled in
  leaf: {
    d: "M12,0.6 L10.2,4.8 L8.1,3.7 L9.4,9.4 L4.4,6.9 L5.6,9.9 L1.6,10.2 L5.5,13.5 L4.1,15.1 L9.4,16 L8.6,18.5 L11.65,17.1 L11.65,22.6 L12.35,22.6 L12.35,17.1 L15.4,18.5 L14.6,16 L19.9,15.1 L18.5,13.5 L22.4,10.2 L18.4,9.9 L19.6,6.9 L14.6,9.4 L15.9,3.7 L13.8,4.8 Z M12,3.6 L12,16.4 M10.9,5.6 L11.6,8.6 M13.1,5.6 L12.4,8.6 M9.9,10.8 L11.4,14.3 M14.1,10.8 L12.6,14.3 M5.2,10.9 L10.8,13.7 M18.8,10.9 L13.2,13.7 M7.3,15.1 L10.6,15.8 M16.7,15.1 L13.4,15.8",
    w: 24,
    filled: false,
  },
  smiley: {
    d: "M12,3.4 C16.8,3.4 20.6,7.2 20.6,12 C20.6,16.8 16.8,20.6 12,20.6 C7.2,20.6 3.4,16.8 3.4,12 C3.4,7.2 7.2,3.4 12,3.4 M8.4,13.4 C9.8,15.8 14.2,15.8 15.6,13.4 M9,8.9 L9,9.9 M15,8.9 L15,9.9",
    w: 24,
    filled: false,
  },
  // An excited exclamation mark (marks v0).
  bang: {
    d: "M7.2,3 C7.4,6.5 6.6,10.5 6,14.8 M6.6,4.2 C6.7,7.2 6.3,10.2 5.9,13.2 M5.2,18.6 C5.9,18.1 6.8,18.7 6.4,19.5 C6,20.2 4.9,19.8 5.1,19 C5.3,18.5 6,18.4 6.4,18.7",
    w: 12,
    filled: false,
  },
  // A curved annotation arrow swooping down (marks "here").
  arrow: {
    d: "M17.5,3 C20,10.5 15.5,15.8 6,15.6 M9.4,11.8 L5.2,15.6 L9.8,19.2",
    w: 24,
    filled: false,
  },
  // Three four-point sparkles, filled
  sparkles: {
    d: "M9,3 L10.9,9.1 L16.5,11 L10.9,12.9 L9,19 L7.1,12.9 L1.5,11 L7.1,9.1 Z M17.5,1.8 L18.6,4.7 L21.5,5.8 L18.6,6.9 L17.5,9.8 L16.4,6.9 L13.5,5.8 L16.4,4.7 Z M17,13 L17.9,15.5 L20.4,16.4 L17.9,17.3 L17,19.8 L16.1,17.3 L13.6,16.4 L16.1,15.5 Z",
    w: 22,
    filled: true,
  },
};

function Doodle({
  id,
  kind,
  label,
}: {
  id: string;
  kind: DoodleKind;
  label: string;
}) {
  const icon = ICONS[kind];
  if (icon) {
    return (
      <svg
        aria-hidden="true"
        className={`nx-doodle nx-icon${icon.filled ? " nx-fill" : ""}`}
        data-kind={kind}
        viewBox={`0 0 ${icon.w} 24`}
      >
        <Frames amp={0.35} d={icon.d} split={icon.filled} textured={false} />
      </svg>
    );
  }

  if (kind === "mountain") {
    // A zigzag range sitting on top of the word, tallest at the "t".
    const u = Math.max(56, Math.round(label.length * 8.5));
    const peaks = [
      [0.1, 15],
      [0.26, 23],
      [0.4, 34],
      [0.58, 20],
      [0.78, 26],
      [0.92, 12],
    ];
    let d = "M2,38";
    for (let i = 0; i < peaks.length; i++) {
      const [fx, h] = peaks[i];
      d += ` L${Math.round(fx * u)},${38 - h}`;
      const nextX = i < peaks.length - 1 ? peaks[i + 1][0] : 1;
      d += ` L${Math.round(((fx + nextX) / 2) * u)},36`;
    }
    d += ` L${u - 2},38`;
    return (
      <svg
        aria-hidden="true"
        className="nx-doodle"
        data-kind={kind}
        preserveAspectRatio="none"
        style={{
          left: "50%",
          top: "-0.04em",
          width: "76%",
          height: "0.62em",
          transform: "translateX(-50%)",
        }}
        viewBox={`0 0 ${u} 40`}
      >
        <Frames amp={0.9} d={d} textured={false} />
      </svg>
    );
  }

  if (kind === "line" || kind === "line2") {
    const u = Math.max(26, Math.round(label.length * 8.5));
    let d = `M3,${kind === "line2" ? 13 : 18} C${(u * 0.35).toFixed(0)},${
      kind === "line2" ? 11.4 : 16.4
    } ${(u * 0.65).toFixed(0)},${kind === "line2" ? 14.8 : 19.8} ${u - 3},${
      kind === "line2" ? 12.4 : 17.4
    }`;
    if (kind === "line2") {
      d += ` M5,25 C${(u * 0.3).toFixed(0)},23.6 ${(u * 0.7).toFixed(0)},26.6 ${
        u - 5
      },24.6`;
    }
    return (
      <svg
        aria-hidden="true"
        className="nx-doodle"
        data-kind={kind}
        preserveAspectRatio="none"
        style={{
          left: "50%",
          bottom: "-0.06em",
          width: "100%",
          height: "0.7em",
          transform: "translateX(-50%)",
        }}
        viewBox={`0 0 ${u} 40`}
      >
        <Frames amp={0.9} d={d} textured={false} />
      </svg>
    );
  }

  if (kind === "circle") {
    const d = pick(id, [
      "M50,3 C82,1 99,9 98,20 C97,32 76,38 48,37 C20,36 2,30 3,19 C4,8 24,4 58,4",
      "M42,4 C14,6 1,13 3,22 C5,33 28,38 55,37 C83,36 98,29 97,18 C96,7 70,2 36,5 C30,5.5 24,7 20,9",
    ]);
    return (
      <svg
        aria-hidden="true"
        className="nx-doodle"
        data-kind={kind}
        preserveAspectRatio="none"
        style={{
          left: "50%",
          top: "50%",
          width: "104%",
          height: "120%",
          transform: "translate(-50%, -50%)",
        }}
        viewBox="0 0 100 40"
      >
        <Frames amp={0.9} d={d} textured />
      </svg>
    );
  }

  if (kind === "box") {
    // Hand-drawn box generated at the word's proportions.
    const u = Math.max(60, Math.round(label.length * 8.5));
    const d = `M7,10 C${(u * 0.3).toFixed(0)},6 ${(u * 0.7).toFixed(0)},6 ${
      u - 7
    },9 C${u - 3},15 ${u - 4},26 ${u - 7},31 C${(u * 0.62).toFixed(0)},35 ${(
      u * 0.3
    ).toFixed(0)},34 7,32 C4,26 4,16 7,10 C8.5,9.4 ${(u * 0.18).toFixed(
      0
    )},8.6 ${(u * 0.3).toFixed(0)},8.4`;
    return (
      <svg
        aria-hidden="true"
        className="nx-doodle"
        data-kind={kind}
        preserveAspectRatio="none"
        style={{
          left: "50%",
          top: "50%",
          width: "106%",
          height: "132%",
          transform: "translate(-50%, -50%)",
        }}
        viewBox={`0 0 ${u} 40`}
      >
        <Frames amp={0.9} d={d} textured />
      </svg>
    );
  }

  // underline — a tight wiggle generated at the word's own proportions, so
  // long labels get more waves instead of stretched ones.
  const u = Math.max(26, Math.round(label.length * 8.5));
  const waves = Math.max(3, Math.round(u / 6));
  const startUp = pick(id, ["a", "b"]) === "a";
  const step = (u - 6) / waves;
  let x = 3;
  let d = "M3,20";
  for (let i = 0; i < waves; i++) {
    const peak = (i % 2 === 0) === startUp ? 9 : 31;
    d += ` Q${(x + step / 2).toFixed(1)},${peak} ${(x + step).toFixed(1)},20`;
    x += step;
  }
  return (
    <svg
      aria-hidden="true"
      className="nx-doodle"
      data-kind={kind}
      preserveAspectRatio="none"
      style={{
        left: "50%",
        bottom: "-0.04em",
        width: "102%",
        height: "0.7em",
        transform: "translateX(-50%)",
      }}
      viewBox={`0 0 ${u} 40`}
    >
      <Frames amp={0.9} d={d} textured={false} />
    </svg>
  );
}

// -------------------------------------------------------------- rendering ---

type Anim = { base: number; step: number } | null;

function frac(x: number) {
  return x - Math.floor(x);
}

// Light punctuation pacing: a beat at commas, a breath at periods.
function pauseAfter(token: string) {
  if (/[.!?]['")’]*\s*$/.test(token)) return 420;
  if (/[,;:]['")’]*\s*$/.test(token)) return 160;
  return 0;
}

function Segments({
  nodes,
  open,
  toggle,
  anim,
}: {
  nodes: Node[];
  open: Set<string>;
  toggle: (id: string) => void;
  anim: Anim;
}) {
  // One clock flows through the entire tree — blurred text included, since
  // every word is on the page from the first frame.
  const ctx = { clock: anim ? anim.base : 0, sc: anim ? anim.base : 0 };

  const wordSpans = (text: string, keyBase: string): React.ReactNode[] => {
    const parts = text.match(/\s*\S+\s*/g) ?? [];
    const out: React.ReactNode[] = [];
    for (let p = 0; p < parts.length; p++) {
      const style = {
        "--wd": `${Math.round(ctx.clock)}ms`,
      } as React.CSSProperties;
      ctx.sc += 1;
      const r1 = frac(Math.sin(ctx.sc * 127.1) * 43758.5453);
      const r2 = frac(Math.sin(ctx.sc * 311.7) * 43758.5453);
      let gap = 64 + 52 * r1;
      if (r2 < 0.05) gap += 220 + 300 * r1; // a long think
      else if (r2 < 0.18) gap = 22 + 26 * r1; // a quick burst
      ctx.clock += gap + pauseAfter(parts[p]);
      out.push(
        <span className="nx-w" key={`${keyBase}-${p}`} style={style}>
          {parts[p]}
        </span>,
      );
    }
    return out;
  };

  // veiled = inside a still-blurred reveal, so nothing in here can be
  // focused until the parent is opened.
  const walk = (input: Node[], veiled: boolean): React.ReactNode[] => {
    let list = input;
    const rendered: React.ReactNode[] = [];
    for (let index = 0; index < list.length; index++) {
      const node = list[index];

      if (typeof node === "string") {
        if (!anim || node.trim() === "") {
          rendered.push(<span key={index}>{node}</span>);
          continue;
        }
        rendered.push(<span key={index}>{wordSpans(node, String(index))}</span>);
        continue;
      }

      const isOpen = open.has(node.id);

      // Pull punctuation that directly follows a reveal-less trigger (the
      // contact links) into a no-wrap group so a lone "," can't wrap alone.
      let punctuation = "";
      if (!node.reveal) {
        const next = list[index + 1];
        if (typeof next === "string") {
          const match = next.match(/^[.,;:!?)’"']+/);
          if (match) {
            punctuation = match[0];
            list = [
              ...list.slice(0, index + 1),
              next.slice(punctuation.length),
              ...list.slice(index + 2),
            ];
          }
        }
      }

      const doodle = (
        <Doodle id={node.id} kind={node.doodle} label={node.label} />
      );

      // Each word of a multi-word label arrives on its own beat.
      const labelWords = node.label.split(" ");
      let lastSlot: React.CSSProperties | undefined;
      const labelSpans: React.ReactNode[] = [];
      for (let w = 0; w < labelWords.length; w++) {
        let style: React.CSSProperties | undefined;
        if (anim) {
          style = {
            "--wd": `${Math.round(ctx.clock)}ms`,
          } as React.CSSProperties;
          ctx.sc += 1;
          const r1 = frac(Math.sin(ctx.sc * 127.1) * 43758.5453);
          ctx.clock += 64 + 52 * r1;
          if (w === labelWords.length - 1) {
            ctx.clock += 60 + pauseAfter(node.label + punctuation);
          }
        }
        lastSlot = style;
        labelSpans.push(
          <span className="nx-w" key={w} style={style}>
            {labelWords[w] + (w < labelWords.length - 1 ? " " : "")}
          </span>,
        );
      }
      const punctSpan =
        punctuation && anim ? (
          <span className="nx-w" style={lastSlot}>
            {punctuation}
          </span>
        ) : (
          punctuation
        );

      const inner = node.iconFirst ? (
        <>
          {doodle}
          {labelSpans}
        </>
      ) : (
        <>
          {labelSpans}
          {doodle}
        </>
      );

      const chip = node.href ? (
        <a
          className="nx-t"
          data-doodle={node.doodle}
          href={node.href}
          rel="noreferrer"
          style={lastSlot}
          tabIndex={veiled ? -1 : undefined}
          target={node.href.startsWith("mailto:") ? undefined : "_blank"}
        >
          {inner}
        </a>
      ) : (
        <button
          aria-expanded={isOpen}
          className="nx-t"
          data-doodle={node.doodle}
          data-spent={isOpen || undefined}
          disabled={isOpen}
          onClick={() => toggle(node.id)}
          style={lastSlot}
          tabIndex={veiled ? -1 : undefined}
          type="button"
        >
          {inner}
        </button>
      );

      // The reveal is ALWAYS rendered — closed just means out of focus.
      rendered.push(
        <span key={node.id}>
          <span className="nx-nowrap">
            {chip}
            {punctSpan}
          </span>
          {node.reveal ? (
            <span
              aria-hidden={isOpen ? undefined : true}
              className="nx-r"
              data-blur={isOpen ? undefined : ""}
            >
              {walk(node.reveal, veiled || !isOpen)}
            </span>
          ) : null}
        </span>,
      );
    }
    return rendered;
  };

  return <>{walk(nodes, false)}</>;
}

type FlipItem = {
  el: SVGSVGElement;
  phase: number;
  speed: number; // frames per second, eased toward target
  target: number;
  hover: boolean;
};

const FLIP_SPEED = 4.2; // ~240ms per frame at full tilt

export default function AboutText() {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [pop, setPop] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const introRef = useRef(false);
  const flipRef = useRef<{
    items: FlipItem[];
    raf: number;
    last: number;
    timers: number[];
  }>({ items: [], raf: 0, last: 0, timers: [] });

  useEffect(() => {
    if (!session.done) return;
    introRef.current = true; // the intro already played this session
    const timers = [
      window.setTimeout(() => {
        setReady(true);
        setArrived(true);
        setRestoring(true);
        if (session.open.length) setOpen(new Set(session.open));
      }, 0),
      window.setTimeout(() => setRestoring(false), 1200),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  // Flipbook engine, same as /v3: frame rate eases up on hover and winds
  // down slowly, plus one spin-up-and-coast pass when a doodle first lands.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const store = flipRef.current;

    document
      .querySelectorAll<SVGSVGElement>(".nx-doodle:not([data-anim])")
      .forEach((el) => {
        el.setAttribute("data-anim", "");
        const item: FlipItem = {
          el,
          phase: 0,
          speed: 0,
          target: 0,
          hover: false,
        };
        store.items.push(item);

        const trigger = el.closest(".nx-t");
        if (trigger) {
          trigger.addEventListener("pointerenter", () => {
            if (trigger.hasAttribute("data-spent")) return;
            item.hover = true;
            item.target = FLIP_SPEED;
          });
          trigger.addEventListener("pointermove", (event) => {
            if (trigger.hasAttribute("data-spent")) return;
            const pointer = event as PointerEvent;
            const rect = trigger.getBoundingClientRect();
            const px = ((pointer.clientX - rect.left) / rect.width - 0.5) * 2;
            const py = ((pointer.clientY - rect.top) / rect.height - 0.5) * 2;
            (trigger as HTMLElement).style.transform = `translate(${(
              px * 2
            ).toFixed(1)}px, ${(py * 1.3).toFixed(1)}px) scale(1.03)`;
          });
          trigger.addEventListener("pointerleave", () => {
            item.hover = false;
            item.target = 0;
            (trigger as HTMLElement).style.transform = "";
          });
          trigger.addEventListener("click", () => {
            window.setTimeout(() => {
              if (trigger.hasAttribute("data-spent")) {
                item.hover = false;
                item.target = 0;
                (trigger as HTMLElement).style.transform = "";
              }
            }, 60);
          });
        }

        // Doodles wait for the base text to sharpen, then draw together;
        // on restored visits everything is instant.
        const draw = introRef.current ? 150 : 1900;
        el.style.setProperty("--dd", `${draw}ms`);
        store.timers.push(
          window.setTimeout(() => {
            item.target = FLIP_SPEED;
            store.timers.push(
              window.setTimeout(() => {
                if (!item.hover) item.target = 0;
              }, 750),
            );
          }, draw + 950),
        );
      });
    if (!introRef.current) {
      // Blur settles → text sharpens → doodles draw → chips pop → open.
      store.timers.push(
        window.setTimeout(() => {
          setArrived(true);
          setPop(true);
        }, 2750),
        window.setTimeout(() => {
          setPop(false);
          setReady(true);
          session.done = true;
        }, 3500),
      );
    }
    introRef.current = true;

    if (!store.raf) {
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - (store.last || now)) / 1000);
        store.last = now;
        for (const item of store.items) {
          const ease = item.target > item.speed ? 7 : 1.6;
          item.speed += (item.target - item.speed) * Math.min(1, ease * dt);
          if (item.target === 0 && item.speed < 0.12) {
            item.speed = 0;
            item.phase = 0;
          }
          if (item.speed > 0) item.phase += item.speed * dt;
          const frame = [0, 1, 2, 1][Math.floor(item.phase) % 4];
          const value = String(frame);
          if (item.el.getAttribute("data-frame") !== value) {
            item.el.setAttribute("data-frame", value);
          }
        }
        store.raf = requestAnimationFrame(tick);
      };
      store.raf = requestAnimationFrame(tick);
    }
  }, [open]);

  useEffect(() => {
    const store = flipRef.current;
    return () => {
      cancelAnimationFrame(store.raf);
      store.timers.forEach((id: number) => window.clearTimeout(id));
    };
  }, []);

  const toggle = (id: string) => {
    if (!ready) return; // nothing opens until the intro has fully landed
    setOpen((previous) => {
      if (previous.has(id)) return previous; // one-way
      const next = new Set(previous);
      next.add(id);
      session.open = [...next];
      return next;
    });
  };

  return (
    <>
      {/* Shared ink filter, softened for body-size strokes. */}
      <svg
        aria-hidden="true"
        height="0"
        style={{ position: "absolute" }}
        width="0"
      >
        <defs>
          <filter
            colorInterpolationFilters="sRGB"
            height="360%"
            id="nx-ink"
            width="220%"
            x="-60%"
            y="-130%"
          >
            <feTurbulence
              baseFrequency="0.8"
              numOctaves="3"
              result="fibres"
              seed="7"
              type="fractalNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="fibres"
              scale="1.8"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div
        className="nx-body"
        data-intro={arrived ? undefined : ""}
        data-pop={pop ? "" : undefined}
        data-restore={restoring ? "" : undefined}
      >
        <p className="nv-bio nx-text">
          <Segments anim={null} nodes={CONTENT_1} open={open} toggle={toggle} />
        </p>
        <p className="nv-bio nx-text">
          <Segments anim={null} nodes={CONTENT_2} open={open} toggle={toggle} />
        </p>
      </div>
    </>
  );
}
