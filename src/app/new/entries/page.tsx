"use client";

import HoverBlob from "../hover-blob";
import ListBand from "../list-band";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { entries, type Entry } from "../content";
import MagneticButton from "../magnetic";
import { lockScroll, unlockScroll } from "../scroll-lock";

const subscribeToNothing = () => () => {};


type Rect = { top: number; left: number; width: number; height: number };
// entering → the page fades fully out, then the row title FLIPs into the
// reader heading; assembling → the body text pours in as sand on a canvas;
// settling → the real text crossfades in under the last settling grains;
// open → canvas gone.
type Phase = "entering" | "assembling" | "settling" | "open";

// A longer, calmer sequence than work: the page takes its time fading out,
// then the title drifts up gently into place.
const FADE_MS = 620;
const FLIP_MS = 800;
const FLIP_EASE = "cubic-bezier(0.35, 0, 0.12, 1)";

// The reader body split into word spans, each carrying its reading-order
// index — the blur-in sweeps top-left to bottom-right, word by word.
function ReaderBody({ paragraphs }: { paragraphs: string[] }) {
  const out: React.ReactNode[] = [];
  let wi = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const words = paragraphs[i].match(/\S+\s*/g) ?? [];
    const spans: React.ReactNode[] = [];
    for (let j = 0; j < words.length; j++) {
      spans.push(
        <span
          className="nv-rw"
          key={j}
          style={{ "--wi": wi } as React.CSSProperties}
        >
          {words[j]}
        </span>,
      );
      wi += 1;
    }
    out.push(<p key={paragraphs[i].slice(0, 32)}>{spans}</p>);
  }
  return <>{out}</>;
}

export default function EntriesPage() {
  const [open, setOpen] = useState<{ entry: Entry; from: Rect } | null>(null);
  const [phase, setPhase] = useState<Phase>("entering");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cloneRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  const handleOpen = (
    entry: Entry,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const title = event.currentTarget.querySelector(".nv-entry-title");
    const rect = title?.getBoundingClientRect();
    setOpen({
      entry,
      from: rect
        ? {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }
        : { top: 0, left: 0, width: 0, height: 0 },
    });
    // Without a measurable row title (keyboard open) there is no FLIP —
    // go straight to the blur-in.
    setPhase(rect && rect.width >= 1 ? "entering" : "assembling");
  };

  const [closing, setClosing] = useState(false);
  const handleClose = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    (document.activeElement as HTMLElement | null)?.blur?.();
    // Blur the reader away, then unmount.
    setClosing(true);
    timerRef.current = window.setTimeout(() => {
      setClosing(false);
      setOpen(null);
    }, 560);
  }, []);

  // FLIP: a clone of the title starts at the row's rect (scaled down to the
  // row's type size) and glides into the reader heading's position — after
  // the page has fully faded out.
  useEffect(() => {
    if (!open || phase !== "entering" || open.from.width < 1) return;
    const heading = headingRef.current;
    const clone = cloneRef.current;

    if (!heading || !clone) {
      timerRef.current = window.setTimeout(() => setPhase("assembling"), 0);
      return;
    }

    const target = heading.getBoundingClientRect();
    const scale = target.height > 0 ? open.from.height / target.height : 1;

    // Pin the clone over the row while the page fades out underneath...
    clone.style.transition = "none";
    clone.style.transform = `translate3d(${open.from.left - target.left}px, ${open.from.top - target.top}px, 0) scale(${scale})`;
    void clone.offsetWidth;

    // ...then glide it up into the heading position.
    const flipTimer = window.setTimeout(() => {
      clone.style.transition = `transform ${FLIP_MS}ms ${FLIP_EASE}`;
      clone.style.transform = "translate3d(0, 0, 0) scale(1)";
    }, FADE_MS);
    timerRef.current = window.setTimeout(
      () => setPhase("assembling"),
      FADE_MS + FLIP_MS + 20,
    );
    return () => {
      window.clearTimeout(flipTimer);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [open, phase]);

  // The rollout radiates from the top-centre of the text, the same
  // language as the about-me reveal: each word's delay is its measured
  // distance from that origin, so the body condenses outward in a wave.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      const words = document.querySelectorAll<HTMLElement>(
        ".nv-reader-body .nv-rw",
      );
      if (!words.length) return;
      const first = words[0].getBoundingClientRect();
      const ox = window.innerWidth / 2;
      const oy = first.top;
      words.forEach((word) => {
        const rect = word.getBoundingClientRect();
        const dist = Math.hypot(
          rect.left + rect.width / 2 - ox,
          rect.top + rect.height / 2 - oy,
        );
        word.style.setProperty(
          "--wd",
          `${Math.round(Math.min(760, dist * 0.78))}ms`,
        );
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Blur-in: once the heading has settled, the body sharpens into place,
  // paragraph by paragraph (the whole site speaks blur now).
  useEffect(() => {
    if (!open || phase !== "assembling") return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const wordCount = open.entry.paragraphs.join(" ").split(/\s+/).length;
    const total = reduce ? 0 : 700 + wordCount * 12;
    timerRef.current = window.setTimeout(() => setPhase("open"), total);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [open, phase]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    document.addEventListener("keydown", onKeyDown);
    lockScroll();
    document.body.setAttribute("data-overlay", "");

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
      document.body.removeAttribute("data-overlay");
    };
  }, [open, handleClose]);

  return (
    <div className="nv-page">
      <div className="nv-col" data-col="3">
        <ListBand>
        <ul className="nv-entry-list" data-cursor-hide>
          <HoverBlob glass rows=".nv-entry-head" />
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                className="nv-entry-head"
                data-cursor-pad="7"
                data-cursor-target
                onClick={(event) => handleOpen(entry, event)}
                type="button"
              >
                <span
                  className="nv-entry-title"
                  style={{
                    visibility:
                      open?.entry.id === entry.id && !closing
                        ? "hidden"
                        : undefined,
                  }}
                >
                  {entry.title}
                </span>
                <span className="nv-entry-year">{entry.year}</span>
              </button>
            </li>
          ))}
        </ul>
        </ListBand>
      </div>

      {mounted && open
        ? createPortal(
            <div
              aria-label={open.entry.title}
              aria-modal="true"
              className="nv-reader"
              data-closing={closing || undefined}
              data-phase={phase}
              role="dialog"
            >
              <div className="nv-reader-close">
                <HoverBlob
                  as="span"
                  pad={4}
                  padX={12}
                  grab
                  rows=".nv-carousel-close"
                />
                <MagneticButton
                  className="nv-carousel-close"
                  onClick={handleClose}
                >
                  Close
                </MagneticButton>
              </div>

              <div className="nv-reader-inner">
                <div className="nv-reader-heading-wrap">
                  <h2 className="nv-reader-heading" ref={headingRef}>
                    {open.entry.title}
                  </h2>
                  <div
                    aria-hidden="true"
                    className="nv-reader-heading nv-reader-clone"
                    ref={cloneRef}
                  >
                    {open.entry.title}
                  </div>
                </div>

                <div className="nv-reader-stage">
                  <div className="nv-reader-body">
                    <ReaderBody paragraphs={open.entry.paragraphs} />
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
