"use client";

import { useEffect, useRef, useState } from "react";

const identityColumns = [
  "Raghav Agarwal is a designer working across product, brand, and digital interfaces. His practice is shaped by observation, with a focus on micro interactions, emotional friction, and inconsistencies in how people experience interfaces. He believes design should feel clear and intuitive, where the decisions do not require explanation.",
  "His work aims to reduce friction and create systems that feel calm, precise, and easy to use. Influenced by the internet and contemporary visual culture, he is interested in how details shape understanding over time, and how consistency can make something feel more coherent the longer it is experienced.",
];

const externalLinks = ["LINKEDIN", "EMAIL", "X", "UNORDINARY"] as const;

const locations = {
  waterloo: {
    city: "WATERLOO",
    code: "YKF",
    timeZone: "America/Toronto",
  },
  calgary: {
    city: "CALGARY",
    code: "YYC",
    timeZone: "America/Edmonton",
  },
} as const;

type LocationKey = keyof typeof locations;
type PanelTabId = "context" | "work" | "entries";
type TrailSquare = {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
};

const panelTabs: ReadonlyArray<{
  id: PanelTabId;
  label: string;
  color: string;
}> = [
  { id: "context", label: "CONTEXT", color: "#5EE7FF" },
  { id: "work", label: "WORK", color: "#FF7FD9" },
  { id: "entries", label: "ENTRIES", color: "#FFE500" },
];

const panelCopyByTab: Record<PanelTabId, string> = {
  context:
    "Context notes live here. This is placeholder copy describing references, influences, and framing details that help ground each section before diving deeper.",
  work:
    "Work highlights appear here. Placeholder copy for selected projects, process snapshots, and quick outcomes that can be expanded as we add more modules.",
  entries:
    "A running collection of thoughts. fragments, notes, and ideas that don't belong anywhere else. some unfinished, some unresolved. mostly just things that don't need to be finished to be worth keeping.",
};
const authorLinkStyle = {
  color: "rgba(0, 0, 0, 0.6)",
  textDecorationColor: "rgba(0, 0, 0, 0.6)",
};
const cursorTrailPalette = [
  "#55E3FF",
  "#FF63CF",
  "#FFE236",
  "#7EF86A",
  "#7FA7FF",
  "#FFB35A",
];

function SectionHeader({
  activeTab,
  secondary,
}: {
  activeTab: PanelTabId | null;
  secondary: string;
}) {
  const isContextActive = activeTab === "context";
  const contextColor =
    panelTabs.find((tab) => tab.id === "context")?.color ?? "#5EE7FF";

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-3">
        <span
          className="px-1.5 py-0.5 text-[12px] font-medium tracking-[0.05em]"
          style={
            isContextActive
              ? { backgroundColor: contextColor, color: "#000000" }
              : { backgroundColor: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.4)" }
          }
        >
          CONTEXT
        </span>
        <span className="text-[12px] font-medium tracking-[0.05em] text-muted">
          {secondary}
        </span>
      </div>
      <div className="h-px w-full bg-line" />
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg
      className="block h-5 w-5 shrink-0 text-current transition-colors duration-150"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M13.4793 10.833H3.3335V9.16634H13.4793L8.81266 4.49967L10.0002 3.33301L16.6668 9.99967L10.0002 16.6663L8.81266 15.4997L13.4793 10.833Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Home() {
  const [locationKey, setLocationKey] = useState<LocationKey>("waterloo");
  const [clock, setClock] = useState("");
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<PanelTabId | null>(null);
  const [isSelectorBouncing, setIsSelectorBouncing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [trailSquares, setTrailSquares] = useState<TrailSquare[]>([]);
  const lastTrailTimeRef = useRef(0);
  const lastTrailPointRef = useRef({ x: 0, y: 0 });
  const trailIdRef = useRef(0);
  const selectorBounceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: locations[locationKey].timeZone,
    });

    const updateClock = () => {
      setClock(formatter.format(new Date()));
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [locationKey]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsLoaded(true), 40);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const spawnTrailSquare = (clientX: number, clientY: number) => {
      trailIdRef.current += 1;
      const id = trailIdRef.current;
      const color =
        cursorTrailPalette[
          Math.floor(Math.random() * cursorTrailPalette.length)
        ];

      setTrailSquares((prev) => {
        const next = [
          ...prev,
          {
            id,
            x: clientX - 2,
            y: clientY - 2,
            color,
            size: Math.floor(Math.random() * 5) + 4,
          },
        ];
        return next.length > 14 ? next.slice(next.length - 14) : next;
      });

      window.setTimeout(() => {
        setTrailSquares((prev) => prev.filter((square) => square.id !== id));
      }, 360);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const now = performance.now();
      const dx = event.clientX - lastTrailPointRef.current.x;
      const dy = event.clientY - lastTrailPointRef.current.y;
      const movedEnough = Math.hypot(dx, dy) > 16;
      const cooledDown = now - lastTrailTimeRef.current > 72;
      const shouldSpawn = Math.random() < 0.52;

      if (movedEnough && cooledDown && shouldSpawn) {
        spawnTrailSquare(event.clientX, event.clientY);
        lastTrailTimeRef.current = now;
        lastTrailPointRef.current.x = event.clientX;
        lastTrailPointRef.current.y = event.clientY;
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  const activeLocation = locations[locationKey];

  const handleLocationToggle = () => {
    setLocationKey((prev) => (prev === "waterloo" ? "calgary" : "waterloo"));
  };

  const togglePanelTab = (tabId: PanelTabId) => {
    setIsSelectorBouncing(false);
    requestAnimationFrame(() => setIsSelectorBouncing(true));
    if (selectorBounceTimeoutRef.current !== null) {
      window.clearTimeout(selectorBounceTimeoutRef.current);
    }
    selectorBounceTimeoutRef.current = window.setTimeout(
      () => setIsSelectorBouncing(false),
      260,
    );
    setActivePanelTab((prev) => (prev === tabId ? null : tabId));
  };

  useEffect(() => {
    return () => {
      if (selectorBounceTimeoutRef.current !== null) {
        window.clearTimeout(selectorBounceTimeoutRef.current);
      }
    };
  }, []);

  const reveal = (delayMs: number) => ({
    className: `reveal-on-load transition-[opacity,transform] duration-220 ease-out ${
      isLoaded ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
    }`,
    style: {
      transitionDelay: isLoaded ? `${Math.min(delayMs, 120)}ms` : "0ms",
    },
  });

  return (
    <main className="min-h-screen bg-background pb-20 pt-4">
      <div className="pointer-events-none fixed inset-0 z-40">
        {trailSquares.map((square) => (
          <span
            key={square.id}
            className="cursor-trail-square"
            style={{
              left: square.x,
              top: square.y,
              backgroundColor: square.color,
              width: square.size,
              height: square.size,
            }}
          />
        ))}
      </div>

      <div className="container-frame">
        <section className="grid gap-10 min-[940px]:grid-cols-3 xl:gap-20">
          <div
            className={`w-full max-w-[480px] ${reveal(0).className}`}
            style={reveal(0).style}
          >
            <div className="flex items-center justify-between text-[12px] uppercase tracking-[0.02em] text-black/40">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-between pr-3 transition-colors hover:text-black/60"
                onClick={handleLocationToggle}
                aria-label={`Switch location and time to ${
                  locationKey === "waterloo" ? "Calgary" : "Waterloo"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-[44px] text-left">
                    {activeLocation.code}
                  </span>
                  <span className="inline-block w-[90px] text-left">
                    {activeLocation.city}
                  </span>
                  <span className="inline-block w-[68px] text-left font-sans">
                    {clock}
                  </span>
                </span>
              </button>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center border border-black/50 bg-transparent text-[16px] leading-none text-black transition-all duration-150"
                  onClick={() => setIsIntroOpen((prev) => !prev)}
                  aria-label={isIntroOpen ? "Close intro note" : "Open intro note"}
                >
                  {isIntroOpen ? "×" : "+"}
                </button>
              </div>
            </div>

            <div
              className={`grid transition-[grid-template-rows,margin-top] duration-520 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isIntroOpen ? "mt-2 grid-rows-[1fr]" : "mt-0 grid-rows-[0fr]"
              }`}
            >
              <div
                className={`min-h-0 transition-opacity duration-260 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                  isIntroOpen ? "opacity-100 delay-320" : "opacity-0 delay-0"
                }`}
              >
                <p className="text-[12px] leading-[1.5] text-black/40 text-justify">
                  The idea for this version of the website began in March of
                  2025, then was paused due to a lack of creative vision. It
                  was revisited a few weeks later following a shift in
                  perspective, with a focus on building and committing rather
                  than waiting for the &ldquo;perfect moment&rdquo;. The site
                  was developed using tools and technologies that were not fully
                  understood, treating the process as a way of thinking through
                  making.
                </p>

                <p className="mt-2 text-[12px] leading-[1.5] text-black/40 text-justify">
                  Inspired by the works of{" "}
                  <a
                    href="#"
                    className="text-black/60 underline decoration-dotted underline-offset-2"
                    style={authorLinkStyle}
                  >
                    Adam Ho
                  </a>
                  ,{" "}
                  <a
                    href="#"
                    className="text-black/60 underline decoration-dotted underline-offset-2"
                    style={authorLinkStyle}
                  >
                    Frank Chimero
                  </a>
                  ,{" "}
                  <a
                    href="#"
                    className="text-black/60 underline decoration-dotted underline-offset-2"
                    style={authorLinkStyle}
                  >
                    Benji Taylor
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="text-black/60 underline decoration-dotted underline-offset-2"
                    style={authorLinkStyle}
                  >
                    Jakub Jakubik
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>

          <div
            className={`w-full max-w-[480px] ${reveal(90).className}`}
            style={reveal(90).style}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {panelTabs.map((tab, index) => {
                const isSelected = activePanelTab === tab.id;
                const hasAnySelected = activePanelTab !== null;
                const sideShift =
                  hasAnySelected && !isSelected ? (index === 0 ? -1 : index === 2 ? 1 : 0) : 0;

                return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => togglePanelTab(tab.id)}
                  className={`inline-flex h-6 items-center justify-center gap-1 border-[0.5px] border-black/50 px-2 py-[2px] text-[clamp(11px,0.76vw,12px)] font-medium leading-none transition-[transform,box-shadow,background-color,border-color,color] duration-350 ease-[cubic-bezier(0.22,1.35,0.32,1)] ${
                    isSelectorBouncing ? "selector-jolt" : ""
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: tab.color,
                          borderColor: "#000000",
                          color: "#000000",
                          boxShadow: "none",
                          transform: "translateX(0px) scale(1.01)",
                        }
                      : {
                          transform: `translateX(${sideShift}px) scale(1)`,
                        }
                  }
                  onMouseEnter={(event) => {
                    event.currentTarget.style.borderColor = "#000000";
                    event.currentTarget.style.color = "#000000";
                    event.currentTarget.style.boxShadow = "1px 1px 0 0 #000000";
                  }}
                  onMouseLeave={(event) => {
                    if (isSelected) {
                      event.currentTarget.style.borderColor = "#000000";
                      event.currentTarget.style.color = "#000000";
                      event.currentTarget.style.boxShadow = "none";
                      return;
                    }
                    event.currentTarget.style.borderColor = "rgba(0,0,0,0.5)";
                    event.currentTarget.style.color = "rgb(0,0,0)";
                    event.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {isSelected ? (
                    <span
                      aria-hidden="true"
                      className="inline-block h-[5px] w-[5px] bg-black"
                    />
                  ) : null}
                  <span>{tab.label}</span>
                </button>
              );
              })}
            </div>

            <div
              className={`grid transition-[grid-template-rows,opacity,margin-top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                activePanelTab
                  ? "mt-2 grid-rows-[1fr] opacity-100"
                  : "mt-0 grid-rows-[0fr] opacity-0"
              }`}
            >
              <div
                className={`min-h-0 transition-opacity duration-220 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                  activePanelTab ? "opacity-100 delay-140" : "opacity-0 delay-0"
                } ${isSelectorBouncing && activePanelTab ? "selector-jolt" : ""}`}
              >
                <p className="text-[12px] leading-[1.5] text-black/40 text-justify">
                  {activePanelTab ? panelCopyByTab[activePanelTab] : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[480px]" aria-hidden="true" />
        </section>

        <div
          className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
            isIntroOpen ? "h-12 md:h-16 xl:h-12" : "h-5 md:h-7 xl:h-5"
          }`}
        />

        <section className={reveal(160).className} style={reveal(160).style}>
          <SectionHeader activeTab={activePanelTab} secondary="IDENTITY" />

          <div className="mt-2 grid gap-6 md:grid-cols-2 xl:gap-6">
            {identityColumns.map((paragraph) => (
              <p
                key={paragraph}
                className="max-w-[52rem] text-[clamp(16px,1.35vw,20px)] font-medium leading-[1.5] tracking-[-0.015em] text-black/80 text-justify"
                style={{ fontFeatureSettings: "'salt' 1" }}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section className={`mt-8 ${reveal(240).className}`} style={reveal(240).style}>
          <SectionHeader activeTab={activePanelTab} secondary="EXTERNAL" />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {externalLinks.map((link) => (
              <a
                key={link}
                href="#"
                className="inline-flex items-center gap-2 border border-black/50 px-3 py-1.5 text-[clamp(16px,1.35vw,20px)] font-medium leading-none text-black transition-[color,border-color,box-shadow] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ boxShadow: "none" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.color = "#003CFF";
                  event.currentTarget.style.borderColor = "#003CFF";
                  event.currentTarget.style.boxShadow = "2px 2px 0 0 #003CFF";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color = "#000000";
                  event.currentTarget.style.borderColor = "rgba(0,0,0,0.5)";
                  event.currentTarget.style.boxShadow = "none";
                }}
              >
                <span className="text-current transition-colors duration-260">{link}</span>
                <span className="inline-flex h-5 w-5 items-center justify-center shrink-0">
                  <ArrowIcon />
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
