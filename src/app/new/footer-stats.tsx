"use client";

import { useEffect, useRef, useState } from "react";

// Site footer: a quiet sentence that cycles through the last visit and
// visitor totals. Clicking swaps sentences through a soft fade-blur. Data
// comes from /api/footer-stats (which also registers the visit).

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

function numberWord(value: number) {
  return value < 10 ? NUMBER_WORDS[value] : String(value);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// A sentence as letter spans, each with a rising delay index. During a
// swap the OLD sentence's letters blur away at the same moment the new
// sentence's letters condense in — a simultaneous unveil.
function FooterLetters({ text }: { text: string }) {
  // Letters grouped into unbreakable words so the sentence wraps at
  // spaces, never mid-word, on narrow screens.
  const out: React.ReactNode[] = [];
  let i = 0;
  for (const word of text.split(/(\s+)/)) {
    if (!word) continue;
    const letters = [...word].map((ch, j) => (
      <span
        className="nv-fl"
        key={i + j}
        style={{ "--fi": i + j } as React.CSSProperties}
      >
        {ch}
      </span>
    ));
    out.push(
      /^\s+$/.test(word) ? (
        <span key={`s${i}`}>{letters}</span>
      ) : (
        <span key={`w${i}`} style={{ whiteSpace: "nowrap" }}>
          {letters}
        </span>
      ),
    );
    i += word.length;
  }
  return <>{out}</>;
}

function SwappingSentence({
  text,
  swapKey,
}: {
  text: string;
  swapKey: number;
}) {
  // Keep the departing sentence visible while the next one sweeps in.
  // If clicked again mid-swap, finish this sweep and then show the latest
  // requested sentence, without exposing an empty frame between them.
  const [shown, setShown] = useState({ text, key: swapKey });
  const [leaving, setLeaving] = useState<{ text: string; id: number } | null>(
    null,
  );
  const latestRef = useRef({ text, key: swapKey });
  const shownRef = useRef({ text, key: swapKey });
  const busyRef = useRef(false);
  const idRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    latestRef.current = { text, key: swapKey };
    const trySwap = () => {
      if (busyRef.current) return;
      const latest = latestRef.current;
      if (latest.key === shownRef.current.key) {
        if (latest.text !== shownRef.current.text) {
          shownRef.current = { ...latest };
          setShown({ ...latest });
        }
        return;
      }
      busyRef.current = true;
      idRef.current += 1;
      setLeaving({ text: shownRef.current.text, id: idRef.current });
      shownRef.current = { ...latest };
      setShown({ ...latest });
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        busyRef.current = false;
        setLeaving(null);
        trySwap();
      }, 760);
    };
    trySwap();
  }, [swapKey, text]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  return (
    <span className="nv-fsw">
      <span
        aria-hidden="true"
        className={`nv-fold${leaving ? ` nv-fold-${leaving.id % 2}` : ""}`}
      >
        {leaving ? <FooterLetters text={leaving.text} /> : null}
      </span>
      <span className="nv-fnew" key={shown.key}>
        <FooterLetters text={shown.text} />
      </span>
    </span>
  );
}

type Stats = {
  visitorsToday: number;
  visitorsAllTime: number;
  lastVisitorLabel: string;
  lastVisitorSeenAt: number | null;
};

function titleCase(label: string) {
  return (
    label
      .toLowerCase()
      // Unicode-aware: capitalise only after spaces, hyphens, and slashes
      // — accents and apostrophes are NOT word boundaries, so Montréal,
      // St. John's, and São Paulo case correctly.
      .replace(
        /(^|[\s\-/(])(\p{L})/gu,
        (_, prefix: string, letter: string) => prefix + letter.toUpperCase(),
      )
      // Acronym countries stay ALL CAPS through the title-casing.
      .replace(/(^|[\s,])(usa|uk|uae)(?=$|[\s,.])/gi, (match) =>
        match.toUpperCase(),
      )
      // Intl's mouthful for HK reads terribly in a sentence.
      .replace(/Hong Kong Sar China/g, "Hong Kong")
  );
}

function naturalAge(seenAt: number | null, nowMs: number) {
  if (!seenAt || Number.isNaN(seenAt)) return "a little while ago";
  const seconds = Math.max(0, Math.floor((nowMs - seenAt) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${numberWord(seconds)} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return minutes === 1 ? "a minute ago" : `${numberWord(minutes)} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return hours === 1 ? "an hour ago" : `${numberWord(hours)} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "a day ago" : `${numberWord(days)} days ago`;
}

export default function SiteFooter() {
  const [stats, setStats] = useState<Stats | null>(null);
  // One quiet line, four states, cycled by clicking: where the last
  // visitor was from, when they were here, today's count, all-time count.
  const [mode, setMode] = useState(0);
  const modeRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/footer-stats", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setStats({
          visitorsToday:
            typeof data.visitorsToday === "number" ? data.visitorsToday : 0,
          visitorsAllTime:
            typeof data.visitorsAllTime === "number" ? data.visitorsAllTime : 0,
          lastVisitorLabel:
            typeof data.lastVisitorLabel === "string" && data.lastVisitorLabel
              ? data.lastVisitorLabel
              : "",
          lastVisitorSeenAt:
            typeof data.lastVisitorSeenAt === "number"
              ? data.lastVisitorSeenAt
              : null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // The age line is computed at click time (render stays pure).
  const [whenText, setWhenText] = useState("a little while ago");

  if (!stats) {
    return null;
  }

  const place =
    stats.lastVisitorLabel && !stats.lastVisitorLabel.startsWith("UNKNOWN")
      ? titleCase(stats.lastVisitorLabel)
      : "somewhere unknown";

  const sentences = [
    `The last visitor was from ${place}.`,
    `The last visit was ${whenText}.`,
    capitalize(
      `${numberWord(stats.visitorsToday)} ${stats.visitorsToday === 1 ? "visitor" : "visitors"} so far today.`,
    ),
    capitalize(
      `${numberWord(stats.visitorsAllTime)} ${
        stats.visitorsAllTime === 1 ? "visitor" : "visitors"
      } since this site was made.`,
    ),
  ];

  const advance = () => {
    const next = (modeRef.current + 1) % 4;
    modeRef.current = next;
    setMode(next);
    if (next === 1) {
      setWhenText(naturalAge(stats.lastVisitorSeenAt, Date.now()));
    }
  };

  return (
    <footer className="nv-footer">
      <button
        aria-label="Cycle visitor stats"
        className="nv-footer-stat"
        onClick={advance}
        type="button"
      >
        <SwappingSentence swapKey={mode} text={sentences[mode]} />
      </button>
    </footer>
  );
}
