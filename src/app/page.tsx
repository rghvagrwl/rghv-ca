"use client";

import { useEffect, useRef, useState } from "react";

const identityBodyOne =
  " is a designer working across product, brand, and digital interfaces. His practice is shaped by observation, with a focus on micro interactions, emotional friction, and inconsistencies in how people experience interfaces. He believes design should feel clear and intuitive, where the decisions do not require explanation.";
const identityBodyTwo =
  "His work aims to reduce friction and create systems that feel calm, precise, and easy to use. Influenced by the internet and contemporary visual culture, he is interested in how details shape understanding over time, and how consistency can make something feel more coherent the longer it is experienced.";

const externalLinks = [
  { label: "LINKEDIN", disabled: false },
  { label: "EMAIL", disabled: false },
  { label: "X", disabled: false },
  { label: "UNORDINARY", disabled: true },
] as const;

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
type EntryPhase =
  | "closed"
  | "main-fading-out"
  | "entry-header-sliding"
  | "entry-visible"
  | "entry-header-return-prep"
  | "entry-header-returning"
  | "entry-fading-out";
type DividerRect = {
  top: number;
  left: number;
  width: number;
};
type CursorBadgeMode = "read-more" | "close-entry" | null;
type HoveredControl = "bring" | "show" | "truncate" | null;
type TrailSquare = {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  lockedColor?: boolean;
};
type Point = {
  x: number;
  y: number;
};
type ResizeHandle =
  | "n"
  | "e"
  | "s"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

const PROFILE_ASPECT_RATIO = 4 / 3;
const PROFILE_MIN_WIDTH = 180;
const PROFILE_MAX_WIDTH = 860;

const panelTabs: ReadonlyArray<{
  id: PanelTabId;
  label: string;
  color: string;
}> = [
  { id: "context", label: "CONTEXT", color: "#5EE7FF" },
  { id: "work", label: "WORK", color: "#FF4FD9" },
  { id: "entries", label: "ENTRIES", color: "#FFE500" },
];

const panelCopyByTab: Record<PanelTabId, string> = {
  context:
    "Contextualizing my work along with selected links and background. This includes experience, education, and what I’m currently focused on. Not everything here is part of the work itself, but it helps frame how and why it is made.",
  work:
    "A selection of visual work across product, brand, and digital interfaces. Including client projects, rejected directions, and personal explorations. Some pieces were developed for real use, while others remain as concepts or unused paths. All work is presented without explanation, leaving space for interpretation.",
  entries:
    "A running collection of thoughts. Fragments, notes, and ideas that don't belong anywhere else. Some unfinished, some unresolved. Mostly just things that don't need to be finished to be worth keeping.",
};
const authorLinkStyle = {
  color: "rgba(0, 0, 0, 0.6)",
  textDecorationColor: "rgba(0, 0, 0, 0.6)",
};
const cursorTrailPalette = [
  "#00C8FF",
  "#FF4FD9",
  "#FFD400",
  "#35E85A",
  "#4B68FF",
  "#FF8A00",
];
const workProjects = [
  {
    id: "unordinary",
    title: "UNORDINARY",
    year: "2024",
    images: [
      "/unordinary/Unordinary 1.png",
      "/unordinary/Unordinary 2.png",
      "/unordinary/Unordinary 3.png",
      "/unordinary/Unordinary 4.png",
      "/unordinary/Unordinary 5.png",
      "/unordinary/Unordinary 6.png",
      "/unordinary/Unordinary 7.png",
      "/unordinary/Unordinary 8.png",
    ],
  },
  {
    id: "minimum",
    title: "MINIMUM",
    year: "2024",
    images: [
      "/minimum/Minimum 1.png",
      "/minimum/Minimum 2.png",
      "/minimum/Minimum 3.png",
      "/minimum/Minimum 4.png",
      "/minimum/Minimum 5.png",
      "/minimum/Minimum 6.png",
    ],
  },
  {
    id: "chrono",
    title: "CHRONO",
    year: "2024",
    images: ["/chrono/Chrono 1.png", "/chrono/Chrono 2.png"],
  },
  {
    id: "context",
    title: "CONTEXT",
    year: "2024",
    images: [
      "/context/Context 1.png",
      "/context/Context 2.png",
      "/context/Context 3.png",
      "/context/Context 4.png",
      "/context/Context 5.png",
      "/context/Context 6.png",
    ],
  },
  {
    id: "crisped",
    title: "CRISPED",
    year: "2024",
    images: [
      "/crisped/Crisped 1.png",
      "/crisped/Crisped 2.png",
      "/crisped/Crisped 3.png",
    ],
  },
  {
    id: "faktor",
    title: "FAKTOR",
    year: "2024",
    images: ["/faktor/Name.png", "/faktor/Name-1.png", "/faktor/Name-2.png"],
  },
  {
    id: "instafleet",
    title: "INSTAFLEET",
    year: "2024",
    images: [
      "/instafleet/Instafleet 1.png",
      "/instafleet/Instafleet 2.png",
      "/instafleet/Instafleet 3.png",
    ],
  },
  {
    id: "merge-club",
    title: "MERGE CLUB",
    year: "2024",
    images: [
      "/merge club/Merge 1.png",
      "/merge club/Merge 2.png",
      "/merge club/Merge 3.png",
      "/merge club/Merge 4.png",
    ],
  },
  {
    id: "on-deck-founders",
    title: "ON DECK FOUNDERS",
    year: "2024",
    images: [
      "/on deck founders/ODF 1.png",
      "/on deck founders/ODF 2.png",
      "/on deck founders/ODF 3.png",
      "/on deck founders/ODF 4.png",
    ],
  },
  {
    id: "para",
    title: "PARA",
    year: "2024",
    images: ["/para/Para 1.png", "/para/Para 2.png"],
  },
  {
    id: "prism-collective",
    title: "PRISM COLLECTIVE",
    year: "2024",
    images: ["/prism collective/Prism 1.png", "/prism collective/Prism 2.png"],
  },
  {
    id: "socratica",
    title: "SOCRATICA",
    year: "2024",
    images: ["/socratica/Socratica 1.png", "/socratica/Socratica 2.png"],
  },
  {
    id: "zero-email",
    title: "ZERO EMAIL",
    year: "2024",
    images: ["/zero email/Zero 1.png", "/zero email/Zero 2.png"],
  },
] as const;
const workLoadMoreThreshold = 6;
const identityScaleClass = "text-[clamp(16px,1.35vw,20px)]";
const entryTitle = "LIVING WITHOUT REGRETS";
const entryYear = "2025";
const entryExcerpt =
  "A few months ago, a friend and I were walking home from the gym when he asked me what my biggest regrets were. It caught me off guard, but I answered honestly. I wished I had tried harder academically in high school. That maybe I should have gone down a more traditional academic route. I told him I regretted saying no to certain opportunities...";
const entryContentParagraphs = [
  "A few months ago, a friend and I were walking home from the gym when he asked me what my biggest regrets were. It caught me off guard, but I answered honestly.",
  "I wished I had tried harder academically in high school. That maybe I should have gone down a more traditional academic route. I told him I regretted saying no to certain opportunities. I regretted hesitating when I should have leaned in.",
  "He shared some of his own regrets too. Different details, same tone. We both had moments we thought we could have handled better. But he finished with something simple:",
  "I don’t think it’s good to regret anything.",
  "It sounded unrealistic. Of course there are things to regret.",
  "Maybe that’s the point?",
  "The decisions I regretted were made based on who I was. My confidence level. My fears. My understanding of risk. It’s easy to say I should have known better. But I only know better because it happened.",
  "Regret assumes there was a cleaner path. A smarter move. A more optimal version of events. Maybe there was.",
  "It’s easy to look back at your past and reorganize it with the clarity you have now. You can see the red flags you missed. The better options you didn’t choose. The risks you were too hesitant to take. With distance, everything feels obvious. But that clarity only exists because you went through it.",
  "You made decisions with the mindset you had at that time. With your level of confidence, your insecurities, your priorities, and your understanding of the world. Expecting your past self to operate with your current perspective doesn’t make sense. The growth came from the experience itself.",
  "The relationship that didn’t last probably shaped how you understand commitment, communication, or even yourself. The academic path that feels uncertain might have given you a lens you wouldn’t trade now. The opportunity you declined may have clarified what actually matters to you.",
  "None of those things are neutral. They leave an imprint.",
  "Regret tends to assume that a different choice would have led to a cleaner outcome. Maybe it would have. But it also would have led to a different version of you. And there’s no guarantee that version would feel more aligned than the one you are now.",
  "I’ve started to think of my past less as a collection of right and wrong decisions, and more as a sequence of necessary ones. Not perfect, not always efficient, but necessary for building perspective. The clarity I have today wasn’t available to me then. It was earned.",
  "Living without regret doesn’t mean pretending everything worked out the way you hoped. It means accepting that even the missteps carried information. They sharpened your standards. They revealed what you value. They exposed your limits and expanded them.",
  "You don’t need to rewrite your past to feel at peace with it. You just need to recognize that it built you in ways you couldn’t have predicted at the time.",
  "If it shaped how you move today, then it wasn’t wasted.",
] as const;

function HeaderWithDivider({
  children,
  className = "",
  dividerClassName = "",
}: {
  children: React.ReactNode;
  className?: string;
  dividerClassName?: string;
}) {
  return (
    <div className={`flex flex-col gap-0 ${className}`}>
      {children}
      <div className={`h-px w-full bg-line ${dividerClassName}`} />
    </div>
  );
}

function SectionHeader({
  activeTab,
  secondary,
  onClick,
}: {
  activeTab: PanelTabId | null;
  secondary: string;
  onClick?: () => void;
}) {
  const isContextActive = activeTab === "context";
  const contextColor =
    panelTabs.find((tab) => tab.id === "context")?.color ?? "#5EE7FF";

  return (
    <HeaderWithDivider>
      <button
        type="button"
        className="flex w-full items-center gap-3 text-left"
        onClick={onClick}
        aria-label={`Show context ${secondary.toLowerCase()} section`}
      >
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
        <span
          className={`text-[12px] font-medium tracking-[0.05em] ${
            isContextActive ? "text-black/80" : "text-muted"
          }`}
        >
          {secondary}
        </span>
      </button>
    </HeaderWithDivider>
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

function shuffleArray<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hue < 60) {
    rPrime = c;
    gPrime = x;
  } else if (hue < 120) {
    rPrime = x;
    gPrime = c;
  } else if (hue < 180) {
    gPrime = c;
    bPrime = x;
  } else if (hue < 240) {
    gPrime = x;
    bPrime = c;
  } else if (hue < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

function pickRandomNameHighlight() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 75;
  const lightness = 82;
  const { r, g, b } = hslToRgb(hue, saturation, lightness);

  return {
    background: `rgb(${r} ${g} ${b})`,
    text: "rgba(0, 0, 0, 0.5)",
  };
}

function NameHighlight({
  children,
  onActivate,
  isActive = false,
}: {
  children: React.ReactNode;
  onActivate?: () => void;
  isActive?: boolean;
}) {
  const defaultStyles = {
    background: "rgba(0, 0, 0, 0.05)",
    text: "rgba(0, 0, 0, 0.5)",
  };
  const [styles, setStyles] = useState(defaultStyles);

  return (
    <button
      type="button"
      onClick={onActivate}
      className="m-0 inline-flex appearance-none items-center gap-1 border-0 bg-transparent p-0 px-0.5 transition-colors duration-220 ease-out"
      style={
        isActive
          ? { backgroundColor: "#000000", color: "#FFFFFF", cursor: "crosshair" }
          : {
              backgroundColor: styles.background,
              color: styles.text,
              cursor: "crosshair",
            }
      }
      onMouseEnter={() => {
        if (isActive) {
          return;
        }
        setStyles(pickRandomNameHighlight());
      }}
      onMouseLeave={() => {
        if (isActive) {
          return;
        }
        setStyles(defaultStyles);
      }}
    >
      <span>{children}</span>
      {isActive ? (
        <span aria-hidden="true" className="text-[24px] leading-none text-white">
          ×
        </span>
      ) : null}
    </button>
  );
}

function BringToTopIcon({
  active,
  disabled = false,
  error = false,
}: {
  active: boolean;
  disabled?: boolean;
  error?: boolean;
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7 15L12 9L17 15H7Z"
        fill={
          error
            ? "#DC2626"
            : disabled
              ? "rgba(0,0,0,0.2)"
              : active
                ? "white"
                : "black"
        }
      />
    </svg>
  );
}

function ShowHideIcon({
  active,
  disabled = false,
  error = false,
}: {
  active: boolean;
  disabled?: boolean;
  error?: boolean;
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="4"
        fill={
          error
            ? "#DC2626"
            : disabled
              ? "rgba(0,0,0,0.2)"
              : active
                ? "white"
                : "black"
        }
      />
    </svg>
  );
}

function TruncateIcon({
  disabled = false,
  error = false,
}: {
  disabled?: boolean;
  error?: boolean;
}) {
  const fill = error
    ? "#DC2626"
    : disabled
      ? "rgba(0,0,0,0.2)"
      : "black";

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M8 14H16" stroke={fill} strokeWidth="2" />
      <path d="M8 10H16" stroke={fill} strokeWidth="2" />
    </svg>
  );
}

type SitePageProps = {
  defaultTab?: PanelTabId | null;
};

export function SitePage({ defaultTab = null }: SitePageProps) {
  const initialTab = defaultTab;
  const [locationKey, setLocationKey] = useState<LocationKey>("waterloo");
  const [clock, setClock] = useState("");
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<PanelTabId | null>(
    initialTab,
  );
  const [displayPanelTab, setDisplayPanelTab] = useState<PanelTabId | null>(
    initialTab,
  );
  const [isSelectorBouncing, setIsSelectorBouncing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [trailSquares, setTrailSquares] = useState<TrailSquare[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [entryPhase, setEntryPhase] = useState<EntryPhase>("closed");
  const [entryDividerRect, setEntryDividerRect] = useState<DividerRect | null>(
    null,
  );
  const [entryDividerTargetTop, setEntryDividerTargetTop] = useState(120);
  const [cursorBadgeMode, setCursorBadgeMode] = useState<CursorBadgeMode>(null);
  const [cursorBadgePosition, setCursorBadgePosition] = useState({ x: 0, y: 0 });
  const [hoveredControl, setHoveredControl] = useState<HoveredControl>(null);
  const [hoveredLocationToggle, setHoveredLocationToggle] = useState(false);
  const [hoveredProfileImage, setHoveredProfileImage] = useState(false);
  const [profileTooltipFlip, setProfileTooltipFlip] = useState(false);
  const [isEntriesHeaderHovered, setIsEntriesHeaderHovered] = useState(false);
  const [sectionPriority, setSectionPriority] = useState<PanelTabId | null>(
    initialTab,
  );
  const [showOnlySelected, setShowOnlySelected] = useState(
    initialTab !== null,
  );
  const [invalidControlFlash, setInvalidControlFlash] = useState<HoveredControl>(
    null,
  );
  const [isTruncateMode, setIsTruncateMode] = useState(false);
  const [expandedInTruncate, setExpandedInTruncate] = useState<Record<string, boolean>>({
    contextIdentity: false,
    contextExternal: false,
    ...Object.fromEntries(workProjects.map((project) => [`work:${project.id}`, false])),
    entries: false,
  });
  const [isProfileWindowOpen, setIsProfileWindowOpen] = useState(false);
  const [isProfileWindowSelected, setIsProfileWindowSelected] = useState(false);
  const [isProfileWindowDragging, setIsProfileWindowDragging] = useState(false);
  const [isProfileWindowResizing, setIsProfileWindowResizing] = useState(false);
  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandle | null>(
    null,
  );
  const [profileWindowPosition, setProfileWindowPosition] = useState<Point | null>(
    null,
  );
  const [profileWindowSize, setProfileWindowSize] = useState({
    width: 520,
    height: Math.round(520 / PROFILE_ASPECT_RATIO),
  });
  const [visibleWorkImageCountByProject, setVisibleWorkImageCountByProject] =
    useState<Record<string, number>>(
      Object.fromEntries(
        workProjects.map((project) => [
          project.id,
          project.images.length > workLoadMoreThreshold
            ? workLoadMoreThreshold
            : project.images.length,
        ]),
      ),
    );
  const [mixedWorkEntriesOrder] = useState(() =>
    shuffleArray([...workProjects.map((project) => `work:${project.id}`), "entries"]),
  );
  const [workImageOrderByProject] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      workProjects.map((project) => [project.id, shuffleArray(project.images)]),
    ),
  );
  const [contextSectionOrder] = useState<("identity" | "external")[]>(() =>
    Math.random() < 0.5 ? ["identity", "external"] : ["external", "identity"],
  );
  const lastTrailTimeRef = useRef(0);
  const lastTrailPointRef = useRef({ x: 0, y: 0 });
  const trailIdRef = useRef(0);
  const selectorBounceTimeoutRef = useRef<number | null>(null);
  const displayClearTimeoutRef = useRef<number | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);
  const entryPhaseTimeoutRef = useRef<number | null>(null);
  const invalidControlFlashTimeoutRef = useRef<number | null>(null);
  const profileWindowRef = useRef<HTMLDivElement | null>(null);
  const profileWindowDragOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const profileWindowResizeStartRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    left: number;
    top: number;
    handle: ResizeHandle;
  } | null>(null);
  const homeEntryDividerRef = useRef<HTMLDivElement | null>(null);
  const homeIdentityDividerRef = useRef<HTMLDivElement | null>(null);
  const entryOverlayHeaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const captureDividerBaseline = () => {
      if (!homeIdentityDividerRef.current) {
        return;
      }
      if (window.scrollY > 8) {
        return;
      }
      const identityRect = homeIdentityDividerRef.current.getBoundingClientRect();
      setEntryDividerTargetTop(Math.max(12, identityRect.top));
    };

    captureDividerBaseline();
    window.addEventListener("resize", captureDividerBaseline);
    return () => {
      window.removeEventListener("resize", captureDividerBaseline);
    };
  }, []);

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
    const spawnTrailSquare = (
      clientX: number,
      clientY: number,
      options?: { color?: string; size?: number; lockedColor?: boolean },
    ) => {
      trailIdRef.current += 1;
      const id = trailIdRef.current;
      const color =
        options?.color ??
        cursorTrailPalette[
          Math.floor(Math.random() * cursorTrailPalette.length)
        ];
      const size = options?.size ?? Math.floor(Math.random() * 5) + 4;

      setTrailSquares((prev) => {
        const next = [
          ...prev,
          {
            id,
            x: clientX - 2,
            y: clientY - 2,
            color,
            size,
            lockedColor: options?.lockedColor ?? false,
          },
        ];
        return next.length > 14 ? next.slice(next.length - 14) : next;
      });

      window.setTimeout(() => {
        setTrailSquares((prev) => prev.filter((square) => square.id !== id));
      }, 700);
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

    const handlePointerDown = (event: PointerEvent) => {
      spawnTrailSquare(event.clientX, event.clientY, {
        color: "#000000",
        size: 8,
        lockedColor: true,
      });
    };

    const recolorInterval = window.setInterval(() => {
      setTrailSquares((prev) =>
        prev.map((square) =>
          square.lockedColor
            ? square
            : {
                ...square,
                color:
                  cursorTrailPalette[
                    Math.floor(Math.random() * cursorTrailPalette.length)
                  ],
              },
        ),
      );
    }, 500);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => {
      window.clearInterval(recolorInterval);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!isProfileWindowOpen) {
      return;
    }

    const handleOutsideSelect = (event: PointerEvent) => {
      if (!profileWindowRef.current) {
        return;
      }
      if (!profileWindowRef.current.contains(event.target as Node)) {
        setIsProfileWindowSelected(false);
      }
    };

    window.addEventListener("pointerdown", handleOutsideSelect);
    return () => {
      window.removeEventListener("pointerdown", handleOutsideSelect);
    };
  }, [isProfileWindowOpen]);

  useEffect(() => {
    if (!isProfileWindowOpen || !isProfileWindowSelected) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" && event.key !== "Delete") {
        return;
      }
      event.preventDefault();
      setIsProfileWindowOpen(false);
      setIsProfileWindowSelected(false);
      setIsProfileWindowDragging(false);
      setIsProfileWindowResizing(false);
      setActiveResizeHandle(null);
      setHoveredProfileImage(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileWindowOpen, isProfileWindowSelected]);

  useEffect(() => {
    if (!isProfileWindowOpen || !hoveredProfileImage) {
      return;
    }

    const timer = window.setInterval(() => {
      setProfileTooltipFlip((prev) => !prev);
    }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, [hoveredProfileImage, isProfileWindowOpen]);

  const activeLocation = locations[locationKey];

  const openProfileWindow = () => {
    if (isProfileWindowOpen) {
      setIsProfileWindowOpen(false);
      setIsProfileWindowSelected(false);
      setIsProfileWindowDragging(false);
      setIsProfileWindowResizing(false);
      setActiveResizeHandle(null);
      setHoveredProfileImage(false);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }
    const cardWidth = Math.min(520, Math.round(window.innerWidth * 0.72));
    const cardHeight = Math.round(cardWidth / PROFILE_ASPECT_RATIO);
    setProfileWindowSize({ width: cardWidth, height: cardHeight });
    setProfileWindowPosition({
      x: Math.max(16, Math.round((window.innerWidth - cardWidth) / 2)),
      y: Math.max(24, Math.round((window.innerHeight - cardHeight) / 2)),
    });
    setIsProfileWindowOpen(true);
    setIsProfileWindowSelected(true);
  };

  const handleProfileWindowPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!isProfileWindowOpen || !profileWindowPosition || isProfileWindowResizing) {
      return;
    }
    if ((event.target as HTMLElement).closest("[data-drag-ignore='true']")) {
      return;
    }

    event.preventDefault();
    setIsProfileWindowSelected(true);
    setIsProfileWindowDragging(true);
    profileWindowDragOffsetRef.current = {
      x: event.clientX - profileWindowPosition.x,
      y: event.clientY - profileWindowPosition.y,
    };

    const handleMove = (moveEvent: PointerEvent) => {
      const maxX = Math.max(16, window.innerWidth - profileWindowSize.width - 16);
      const maxY = Math.max(16, window.innerHeight - profileWindowSize.height - 16);
      setProfileWindowPosition({
        x: Math.min(
          maxX,
          Math.max(16, moveEvent.clientX - profileWindowDragOffsetRef.current.x),
        ),
        y: Math.min(
          maxY,
          Math.max(16, moveEvent.clientY - profileWindowDragOffsetRef.current.y),
        ),
      });
    };

    const handleUp = () => {
      setIsProfileWindowDragging(false);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  const handleProfileResizeStart = (
    handle: ResizeHandle,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!profileWindowPosition) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsProfileWindowSelected(true);
    setIsProfileWindowResizing(true);
    setActiveResizeHandle(handle);

    profileWindowResizeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      width: profileWindowSize.width,
      height: profileWindowSize.height,
      left: profileWindowPosition.x,
      top: profileWindowPosition.y,
      handle,
    };

    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value));

    const handleMove = (moveEvent: PointerEvent) => {
      const start = profileWindowResizeStartRef.current;
      if (!start) {
        return;
      }

      const dx = moveEvent.clientX - start.x;
      const dy = moveEvent.clientY - start.y;
      const h = start.handle;
      const maxWidth = Math.min(PROFILE_MAX_WIDTH, window.innerWidth - 32);
      const minWidth = Math.min(PROFILE_MIN_WIDTH, maxWidth);

      let nextWidth = start.width;
      let nextHeight = start.height;
      let nextLeft = start.left;
      let nextTop = start.top;

      if ((h === "ne" || h === "nw" || h === "se" || h === "sw")) {
        const deltaFromX = h.includes("e") ? dx : -dx;
        const deltaFromY = h.includes("s") ? dy * PROFILE_ASPECT_RATIO : -dy * PROFILE_ASPECT_RATIO;
        const deltaWidth =
          Math.abs(deltaFromX) > Math.abs(deltaFromY) ? deltaFromX : deltaFromY;
        nextWidth = clamp(start.width + deltaWidth, minWidth, maxWidth);
        nextHeight = nextWidth / PROFILE_ASPECT_RATIO;
        if (h.includes("w")) {
          nextLeft = start.left + (start.width - nextWidth);
        }
        if (h.includes("n")) {
          nextTop = start.top + (start.height - nextHeight);
        }
      } else if (h === "e" || h === "w") {
        const deltaWidth = h === "e" ? dx : -dx;
        nextWidth = clamp(start.width + deltaWidth, minWidth, maxWidth);
        nextHeight = nextWidth / PROFILE_ASPECT_RATIO;
        if (h === "w") {
          nextLeft = start.left + (start.width - nextWidth);
        }
        nextTop = start.top - (nextHeight - start.height) / 2;
      } else {
        const deltaHeight = h === "s" ? dy : -dy;
        const rawHeight = start.height + deltaHeight;
        const rawWidth = rawHeight * PROFILE_ASPECT_RATIO;
        nextWidth = clamp(rawWidth, minWidth, maxWidth);
        nextHeight = nextWidth / PROFILE_ASPECT_RATIO;
        if (h === "n") {
          nextTop = start.top + (start.height - nextHeight);
        }
        nextLeft = start.left - (nextWidth - start.width) / 2;
      }

      const margin = 8;
      nextLeft = clamp(nextLeft, margin, window.innerWidth - nextWidth - margin);
      nextTop = clamp(nextTop, margin, window.innerHeight - nextHeight - margin);

      setProfileWindowSize({
        width: Math.round(nextWidth),
        height: Math.round(nextHeight),
      });
      setProfileWindowPosition({
        x: Math.round(nextLeft),
        y: Math.round(nextTop),
      });
    };

    const handleUp = () => {
      setIsProfileWindowResizing(false);
      setActiveResizeHandle(null);
      profileWindowResizeStartRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  const handleLocationToggle = () => {
    setLocationKey((prev) => (prev === "waterloo" ? "calgary" : "waterloo"));
  };

  const togglePanelTab = (tabId: PanelTabId) => {
    setHoveredControl(null);
    setIsSelectorBouncing(false);
    requestAnimationFrame(() => setIsSelectorBouncing(true));
    if (selectorBounceTimeoutRef.current !== null) {
      window.clearTimeout(selectorBounceTimeoutRef.current);
    }
    selectorBounceTimeoutRef.current = window.setTimeout(
      () => setIsSelectorBouncing(false),
      260,
    );
    if (displayClearTimeoutRef.current !== null) {
      window.clearTimeout(displayClearTimeoutRef.current);
      displayClearTimeoutRef.current = null;
    }

    if (activePanelTab === tabId) {
      setActivePanelTab(null);
      setSectionPriority(null);
      setShowOnlySelected(false);
      setIsTruncateMode(false);
      setExpandedInTruncate({
        contextIdentity: false,
        contextExternal: false,
        ...Object.fromEntries(workProjects.map((project) => [`work:${project.id}`, false])),
        entries: false,
      });
      displayClearTimeoutRef.current = window.setTimeout(
        () => setDisplayPanelTab(null),
        320,
      );
      return;
    }

    setDisplayPanelTab(tabId);
    setActivePanelTab(tabId);
  };

  const toggleSectionContent = (sectionKey: string, tab: PanelTabId) => {
    if (truncateModeActive) {
      setExpandedInTruncate((prev) => ({
        ...prev,
        [sectionKey]: !prev[sectionKey],
      }));
      return;
    }
    togglePanelTab(tab);
  };

  useEffect(() => {
    return () => {
      if (selectorBounceTimeoutRef.current !== null) {
        window.clearTimeout(selectorBounceTimeoutRef.current);
      }
      if (displayClearTimeoutRef.current !== null) {
        window.clearTimeout(displayClearTimeoutRef.current);
      }
      if (previewTimeoutRef.current !== null) {
        window.clearTimeout(previewTimeoutRef.current);
      }
      if (entryPhaseTimeoutRef.current !== null) {
        window.clearTimeout(entryPhaseTimeoutRef.current);
      }
      if (invalidControlFlashTimeoutRef.current !== null) {
        window.clearTimeout(invalidControlFlashTimeoutRef.current);
      }
    };
  }, []);

  const openEntry = () => {
    if (entryPhase !== "closed") {
      return;
    }
    setCursorBadgeMode(null);
    if (homeEntryDividerRef.current) {
      const rect = homeEntryDividerRef.current.getBoundingClientRect();
      setEntryDividerRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
    }
    if (entryOverlayHeaderRef.current) {
      const overlayHeaderRect = entryOverlayHeaderRef.current.getBoundingClientRect();
      setEntryDividerTargetTop(Math.max(12, overlayHeaderRect.top));
    }
    setEntryPhase("main-fading-out");
    if (entryPhaseTimeoutRef.current !== null) {
      window.clearTimeout(entryPhaseTimeoutRef.current);
    }
    entryPhaseTimeoutRef.current = window.setTimeout(() => {
      setEntryPhase("entry-header-sliding");
      entryPhaseTimeoutRef.current = window.setTimeout(() => {
        setEntryPhase("entry-visible");
      }, 980);
    }, 360);
  };

  const closeEntry = () => {
    if (entryPhase !== "entry-visible") {
      return;
    }
    setCursorBadgeMode(null);
    setEntryPhase("entry-header-return-prep");
    if (entryPhaseTimeoutRef.current !== null) {
      window.clearTimeout(entryPhaseTimeoutRef.current);
    }
    entryPhaseTimeoutRef.current = window.setTimeout(() => {
      setEntryPhase("entry-header-returning");
      entryPhaseTimeoutRef.current = window.setTimeout(() => {
        setEntryPhase("closed");
        setEntryDividerRect(null);
      }, 980);
    }, 320);
  };

  const reveal = (delayMs: number) => ({
    className: `reveal-on-load transition-[opacity,transform] duration-220 ease-out ${
      isLoaded ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
    }`,
    style: {
      transitionDelay: isLoaded ? `${Math.min(delayMs, 120)}ms` : "0ms",
    },
  });

  const handleWorkImageClick = (src: string) => {
    if (previewTimeoutRef.current !== null) {
      window.clearTimeout(previewTimeoutRef.current);
    }
    setPreviewImage(src);
    previewTimeoutRef.current = window.setTimeout(() => {
      setPreviewImage(null);
    }, 2400);
  };

  const updateCursorBadgePosition = (event: React.MouseEvent<HTMLElement>) => {
    setCursorBadgePosition({ x: event.clientX, y: event.clientY });
  };

  const handleBringSelectedToTop = () => {
    if (!activePanelTab) {
      return;
    }
    setSectionPriority((prev) => (prev === activePanelTab ? null : activePanelTab));
  };

  const isBringToTopActive =
    activePanelTab !== null && sectionPriority === activePanelTab;

  const triggerDisabledControlFeedback = (control: HoveredControl) => {
    if (!control) {
      return;
    }
    setInvalidControlFlash(control);
    if (invalidControlFlashTimeoutRef.current !== null) {
      window.clearTimeout(invalidControlFlashTimeoutRef.current);
    }
    invalidControlFlashTimeoutRef.current = window.setTimeout(() => {
      setInvalidControlFlash(null);
    }, 420);
  };

  const canUseTruncateControl = activePanelTab !== null && showOnlySelected;
  const truncateModeActive = isTruncateMode && canUseTruncateControl;

  const cursorControlLabel =
    !hoveredControl || !activePanelTab
      ? null
      : hoveredControl === "bring"
        ? isBringToTopActive
          ? "RETURN TO DEFAULT"
          : "BRING TO TOP"
        : hoveredControl === "truncate"
          ? canUseTruncateControl
            ? "TRUNCATE"
            : null
        : showOnlySelected
          ? "SHOW ALL"
          : `SHOW ${activePanelTab.toUpperCase()} ONLY`;

  const cursorLocationLabel = hoveredLocationToggle
    ? locationKey === "waterloo"
      ? "SHOW CALGARY"
      : "SHOW WATERLOO"
    : null;
  const cursorProfileImageLabel = hoveredProfileImage
    ? profileTooltipFlip
      ? "DEL/BACKSPACE TO CLOSE"
      : "MAR 29 2026 8:04PM"
    : null;
  const activeCursorBadgeText = cursorControlLabel
    ? cursorControlLabel
    : cursorLocationLabel
      ? cursorLocationLabel
      : cursorProfileImageLabel
        ? cursorProfileImageLabel
        : cursorBadgeMode === "read-more"
          ? "READ MORE"
          : cursorBadgeMode === "close-entry"
            ? "CLOSE ENTRY"
            : "";

  const badgeOffset = 14;
  const estimatedBadgeWidth = Math.max(88, activeCursorBadgeText.length * 7.1 + 18);
  const estimatedBadgeHeight = 26;
  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : Number.POSITIVE_INFINITY;
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : Number.POSITIVE_INFINITY;
  const flipX =
    cursorBadgePosition.x + badgeOffset + estimatedBadgeWidth > viewportWidth - 8;
  const flipY =
    cursorBadgePosition.y + badgeOffset + estimatedBadgeHeight > viewportHeight - 8;

  const getSectionOrder = (group: PanelTabId) => {
    if (group === "context") {
      return 0;
    }
    if (sectionPriority === "work") {
      return group === "work" ? 1 : 2;
    }
    if (sectionPriority === "entries") {
      return group === "entries" ? 1 : 2;
    }
    return group === "work" ? 1 : 2;
  };
  const orderedMixedWorkEntries = (() => {
    if (sectionPriority === "work") {
      return [
        ...mixedWorkEntriesOrder.filter((item) => item.startsWith("work:")),
        ...mixedWorkEntriesOrder.filter((item) => item === "entries"),
      ];
    }
    if (sectionPriority === "entries") {
      return [
        ...mixedWorkEntriesOrder.filter((item) => item === "entries"),
        ...mixedWorkEntriesOrder.filter((item) => item.startsWith("work:")),
      ];
    }
    return mixedWorkEntriesOrder;
  })();
  const visibleMixedWorkEntries = orderedMixedWorkEntries.filter((item) => {
    if (!(showOnlySelected && activePanelTab)) {
      return true;
    }
    if (activePanelTab === "work") {
      return item.startsWith("work:");
    }
    if (activePanelTab === "entries") {
      return item === "entries";
    }
    return false;
  });
  const workProjectById = Object.fromEntries(
    workProjects.map((project) => [project.id, project]),
  );

  const isEntryOverlayVisible =
    entryPhase === "entry-visible" ||
    entryPhase === "entry-header-return-prep" ||
    entryPhase === "entry-header-returning" ||
    entryPhase === "entry-fading-out";
  const isEntryReturning =
    entryPhase === "entry-header-return-prep" ||
    entryPhase === "entry-header-returning";
  const isEntryDividerFloating =
    entryPhase === "main-fading-out" ||
    entryPhase === "entry-header-sliding" ||
    entryPhase === "entry-visible" ||
    entryPhase === "entry-header-return-prep" ||
    entryPhase === "entry-header-returning" ||
    entryPhase === "entry-fading-out";

  return (
    <main className="relative min-h-screen bg-background pb-20 pt-4">
      {cursorControlLabel ||
      cursorLocationLabel ||
      cursorProfileImageLabel ||
      cursorBadgeMode ? (
        <div
          className="pointer-events-none fixed z-[120]"
          style={{
            left: cursorBadgePosition.x + (flipX ? -badgeOffset : badgeOffset),
            top: cursorBadgePosition.y + (flipY ? -badgeOffset : badgeOffset),
            transform: `translate3d(${flipX ? "-100%" : "0"},${flipY ? "-100%" : "0"},0)`,
          }}
        >
          {cursorControlLabel ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              {cursorControlLabel}
            </span>
          ) : cursorLocationLabel ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              {cursorLocationLabel}
            </span>
          ) : cursorProfileImageLabel ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              {cursorProfileImageLabel}
            </span>
          ) : cursorBadgeMode === "read-more" ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              READ MORE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              <span aria-hidden="true" className="text-[11px] leading-none">
                ×
              </span>
              CLOSE ENTRY
            </span>
          )}
        </div>
      ) : null}

      {isProfileWindowOpen && profileWindowPosition ? (
        <div
          ref={profileWindowRef}
          className={`fixed z-[95] transition-[box-shadow,border-color] duration-180 ease-out ${
            isProfileWindowSelected
              ? "border-2 border-[#00A1FF]"
              : "border-2 border-transparent"
          } ${
            isProfileWindowResizing
              ? activeResizeHandle === "nw" || activeResizeHandle === "se"
                ? "cursor-nwse-resize"
                : activeResizeHandle === "ne" || activeResizeHandle === "sw"
                  ? "cursor-nesw-resize"
                  : activeResizeHandle === "n" || activeResizeHandle === "s"
                    ? "cursor-ns-resize"
                    : activeResizeHandle === "e" || activeResizeHandle === "w"
                      ? "cursor-ew-resize"
                      : "cursor-default"
              : isProfileWindowDragging
                ? "cursor-grabbing"
                : "cursor-grab"
          } profile-window-pop`}
          style={{
            left: profileWindowPosition.x,
            top: profileWindowPosition.y,
            width: profileWindowSize.width,
            height: profileWindowSize.height,
          }}
          onPointerDown={handleProfileWindowPointerDown}
          onClick={() => setIsProfileWindowSelected(true)}
        >
          <img
            src="/profile.png"
            alt="Raghav portrait"
            className="block h-full w-full select-none object-cover"
            draggable={false}
            onMouseEnter={(event) => {
              setProfileTooltipFlip(false);
              setHoveredProfileImage(true);
              updateCursorBadgePosition(event);
            }}
            onMouseMove={updateCursorBadgePosition}
            onMouseLeave={() => {
              setHoveredProfileImage(false);
            }}
          />
          {isProfileWindowSelected ? (
            <>
              <div
                data-drag-ignore="true"
                className="absolute -left-1.5 -top-1.5 h-3 w-3 cursor-nwse-resize border-2 border-[#00A1FF] bg-white"
                onPointerDown={(event) => handleProfileResizeStart("nw", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute -right-1.5 -top-1.5 h-3 w-3 cursor-nesw-resize border-2 border-[#00A1FF] bg-white"
                onPointerDown={(event) => handleProfileResizeStart("ne", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute -right-1.5 -bottom-1.5 h-3 w-3 cursor-nwse-resize border-2 border-[#00A1FF] bg-white"
                onPointerDown={(event) => handleProfileResizeStart("se", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute -bottom-1.5 -left-1.5 h-3 w-3 cursor-nesw-resize border-2 border-[#00A1FF] bg-white"
                onPointerDown={(event) => handleProfileResizeStart("sw", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute left-3 right-3 -top-1 h-2 cursor-ns-resize"
                onPointerDown={(event) => handleProfileResizeStart("n", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute left-3 right-3 -bottom-1 h-2 cursor-ns-resize"
                onPointerDown={(event) => handleProfileResizeStart("s", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute -left-1 top-3 bottom-3 w-2 cursor-ew-resize"
                onPointerDown={(event) => handleProfileResizeStart("w", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute -right-1 top-3 bottom-3 w-2 cursor-ew-resize"
                onPointerDown={(event) => handleProfileResizeStart("e", event)}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {entryDividerRect && isEntryDividerFloating ? (
        <div
          className="pointer-events-none fixed z-[86] transition-transform duration-[980ms] ease-[cubic-bezier(0.45,0,0.55,1)]"
          style={{
            top: entryDividerRect.top,
            left: entryDividerRect.left,
            width: entryDividerRect.width,
            transform:
              entryPhase === "entry-header-sliding" ||
              entryPhase === "entry-visible" ||
              entryPhase === "entry-header-return-prep"
                ? `translateY(${entryDividerTargetTop - entryDividerRect.top}px)`
                : "translateY(0px)",
            opacity:
              entryPhase === "entry-visible" || entryPhase === "entry-fading-out"
                ? 0
                : 1,
          }}
        >
          <HeaderWithDivider dividerClassName={isEntryReturning ? "" : "bg-[#FFE500]"}>
            <div className="flex items-center justify-between text-[12px] font-medium tracking-[0.05em] text-black/40">
              <div className="flex items-center gap-2">
                <span
                  className="px-1.5 py-0.5"
                  style={{
                    backgroundColor: isEntryReturning ? "rgba(0,0,0,0.05)" : "#FFE500",
                    color: isEntryReturning ? "rgba(29, 29, 27, 0.42)" : "#000000",
                  }}
                >
                  ENTRIES
                </span>
                <span className="font-medium">{entryTitle}</span>
              </div>
              <span className="font-medium">{entryYear}</span>
            </div>
          </HeaderWithDivider>
        </div>
      ) : null}

      <div
        className={`fixed inset-0 z-[85] overflow-y-auto transition-opacity duration-360 ease-out ${
          isEntryOverlayVisible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        style={{ cursor: entryPhase === "entry-visible" ? "sw-resize" : "auto" }}
        onClick={closeEntry}
        onMouseEnter={(event) => {
          if (entryPhase === "entry-visible") {
            setCursorBadgeMode("close-entry");
            updateCursorBadgePosition(event);
          }
        }}
        onMouseMove={(event) => {
          if (entryPhase === "entry-visible") {
            updateCursorBadgePosition(event);
          }
        }}
        onMouseLeave={() => {
          setCursorBadgeMode(null);
        }}
      >
        <div className="relative min-h-screen">
          <div className="container-frame w-full pb-16 pt-8 md:pt-8">
            <div
              ref={entryOverlayHeaderRef}
              className={`${
                entryPhase === "entry-visible"
                  ? "opacity-100"
                  : "opacity-0"
              }`}
            >
              <HeaderWithDivider dividerClassName={isEntryReturning ? "" : "bg-[#FFE500]"}>
                <div className="flex items-center justify-between text-[12px] font-medium tracking-[0.05em] text-black/40">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-1.5 py-0.5"
                      style={{
                        backgroundColor: isEntryReturning ? "rgba(0,0,0,0.05)" : "#FFE500",
                        color: isEntryReturning ? "rgba(29, 29, 27, 0.42)" : "#000000",
                      }}
                    >
                      ENTRIES
                    </span>
                    <span className="font-medium">{entryTitle}</span>
                  </div>
                  <span className="font-medium">{entryYear}</span>
                </div>
              </HeaderWithDivider>
            </div>
            <div
              className={`mt-2 grid gap-6 md:grid-cols-2 transition-opacity duration-260 ease-out ${
                entryPhase === "entry-visible" ? "opacity-100 delay-140" : "opacity-0"
              }`}
            >
              <div className="text-[16px] leading-[1.5] text-black/80 text-justify">
                {entryContentParagraphs.map((paragraph) => (
                  <p key={paragraph} className="mb-4" style={{ fontFeatureSettings: "'salt' 1" }}>
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="flex items-start justify-start">
                <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-transparent select-none">
                  <span aria-hidden="true" className="text-[11px] leading-none">
                    ×
                  </span>
                  CLOSE ENTRY
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {previewImage ? (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
          <div className="h-[75vh] w-[75vw] overflow-hidden">
            <img
              src={previewImage}
              alt=""
              className="h-full w-full object-contain"
              draggable={false}
            />
          </div>
        </div>
      ) : null}
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

      <div
        className={`container-frame relative z-10 transition-opacity duration-560 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          entryPhase === "closed" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <section className="grid gap-10 min-[940px]:grid-cols-3 xl:gap-20">
          <div
            className={`w-full max-w-[480px] min-[940px]:order-3 ${reveal(0).className}`}
            style={reveal(0).style}
          >
            <div className="flex items-center justify-between text-[12px] uppercase tracking-[0.02em] text-black/40">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-between pr-3 transition-colors hover:text-black/60"
                onClick={handleLocationToggle}
                onMouseEnter={(event) => {
                  setHoveredLocationToggle(true);
                  updateCursorBadgePosition(event);
                }}
                onMouseMove={updateCursorBadgePosition}
                onMouseLeave={() => {
                  setHoveredLocationToggle(false);
                }}
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
                  className="flex h-6 w-6 items-center justify-center border border-black/50 bg-[#F7F7F7] text-[16px] leading-none text-black transition-all duration-150"
                  onClick={() => setIsIntroOpen((prev) => !prev)}
                  aria-label={isIntroOpen ? "Close intro note" : "Open intro note"}
                >
                  <span
                    aria-hidden="true"
                    className={`relative block h-[12px] w-[12px] transition-transform duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isIntroOpen ? "rotate-45" : "rotate-0"
                    }`}
                  >
                    <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-black" />
                    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-black" />
                  </span>
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
                    Ryan Yan
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>

          <div
            className={`w-full max-w-[480px] min-[940px]:order-2 ${reveal(90).className}`}
            style={reveal(90).style}
          >
            <div className="flex items-center justify-between gap-2">
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
                      className={`inline-flex h-6 items-center justify-center gap-1 border-[0.5px] border-black/50 bg-[#F7F7F7] px-2 py-[2px] text-[clamp(11px,0.76vw,12px)] font-medium leading-none transition-[transform,box-shadow,background-color,border-color,color] duration-350 ease-[cubic-bezier(0.22,1.35,0.32,1)] ${
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

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center border transition-colors ${
                    invalidControlFlash === "bring"
                      ? "border-red-600 bg-[#F7F7F7] control-error-wiggle"
                      : activePanelTab
                      ? isBringToTopActive
                        ? "border-black bg-black"
                        : "border-black/50 bg-[#F7F7F7]"
                      : "border-black/50 bg-[#F7F7F7]"
                  }`}
                  onClick={() => {
                    if (!activePanelTab) {
                      triggerDisabledControlFeedback("bring");
                      return;
                    }
                    handleBringSelectedToTop();
                  }}
                  onMouseEnter={(event) => {
                    setHoveredControl("bring");
                    updateCursorBadgePosition(event);
                  }}
                  onMouseMove={updateCursorBadgePosition}
                  onMouseLeave={() => {
                    setHoveredControl(null);
                  }}
                  aria-label="Bring selected section group to top"
                  aria-disabled={!activePanelTab}
                  style={
                    invalidControlFlash === "bring"
                      ? { cursor: "not-allowed" }
                      : activePanelTab
                      ? undefined
                      : {
                          borderColor: "rgba(0, 0, 0, 0.4)",
                          backgroundColor: "#F7F7F7",
                          color: "rgba(0, 0, 0, 0.4)",
                          cursor: "not-allowed",
                        }
                  }
                >
                  <BringToTopIcon
                    active={activePanelTab ? isBringToTopActive : false}
                    disabled={!activePanelTab}
                    error={invalidControlFlash === "bring"}
                  />
                </button>
                <button
                  type="button"
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center border transition-colors ${
                    invalidControlFlash === "show"
                      ? "border-red-600 bg-[#F7F7F7] control-error-wiggle"
                      : activePanelTab
                      ? showOnlySelected
                        ? "border-black bg-black"
                        : "border-black/50 bg-[#F7F7F7]"
                      : "border-black/50 bg-[#F7F7F7]"
                  }`}
                  onClick={() => {
                    if (!activePanelTab) {
                      triggerDisabledControlFeedback("show");
                      return;
                    }
                    setShowOnlySelected((prev) => {
                      const next = !prev;
                      if (!next) {
                        setIsTruncateMode(false);
                        setExpandedInTruncate({
                          contextIdentity: false,
                          contextExternal: false,
                          ...Object.fromEntries(
                            workProjects.map((project) => [`work:${project.id}`, false]),
                          ),
                          entries: false,
                        });
                      }
                      return next;
                    });
                  }}
                  onMouseEnter={(event) => {
                    setHoveredControl("show");
                    updateCursorBadgePosition(event);
                  }}
                  onMouseMove={updateCursorBadgePosition}
                  onMouseLeave={() => {
                    setHoveredControl(null);
                  }}
                  aria-label="Toggle entries-only visibility"
                  aria-disabled={!activePanelTab}
                  style={
                    invalidControlFlash === "show"
                      ? { cursor: "not-allowed" }
                      : activePanelTab
                      ? undefined
                      : {
                          borderColor: "rgba(0, 0, 0, 0.4)",
                          backgroundColor: "#F7F7F7",
                          color: "rgba(0, 0, 0, 0.4)",
                          cursor: "not-allowed",
                        }
                  }
                >
                  <ShowHideIcon
                    active={activePanelTab ? showOnlySelected : false}
                    disabled={!activePanelTab}
                    error={invalidControlFlash === "show"}
                  />
                </button>
                <button
                  type="button"
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center border transition-colors ${
                    invalidControlFlash === "truncate"
                      ? "border-red-600 bg-[#F7F7F7] control-error-wiggle"
                      : "border-black/50 bg-[#F7F7F7]"
                  }`}
                  onClick={() => {
                    if (!canUseTruncateControl) {
                      triggerDisabledControlFeedback("truncate");
                      return;
                    }
                    setIsTruncateMode((prev) => {
                      const next = !prev;
                      if (next) {
                        setExpandedInTruncate({
                          contextIdentity: false,
                          contextExternal: false,
                          ...Object.fromEntries(
                            workProjects.map((project) => [`work:${project.id}`, false]),
                          ),
                          entries: false,
                        });
                      }
                      return next;
                    });
                  }}
                  onMouseEnter={(event) => {
                    setHoveredControl("truncate");
                    updateCursorBadgePosition(event);
                  }}
                  onMouseMove={updateCursorBadgePosition}
                  onMouseLeave={() => {
                    setHoveredControl(null);
                  }}
                  aria-label="Truncate visible section content"
                  aria-disabled={!canUseTruncateControl}
                  style={
                    invalidControlFlash === "truncate"
                      ? { cursor: "not-allowed" }
                      : canUseTruncateControl
                        ? undefined
                        : {
                            borderColor: "rgba(0, 0, 0, 0.4)",
                            backgroundColor: "#F7F7F7",
                            color: "rgba(0, 0, 0, 0.4)",
                            cursor: "not-allowed",
                          }
                  }
                >
                  <TruncateIcon
                    disabled={!canUseTruncateControl}
                    error={invalidControlFlash === "truncate"}
                  />
                </button>
              </div>
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
                  {displayPanelTab ? panelCopyByTab[displayPanelTab] : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[480px] min-[940px]:order-1" aria-hidden="true" />
        </section>

        <div
          className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
            isIntroOpen ? "h-12 md:h-16 xl:h-12" : "h-5 md:h-7 xl:h-5"
          }`}
        />

        <div className="flex flex-col gap-8">
        {!(showOnlySelected && activePanelTab !== "context") ? (
        <div className="flex flex-col" style={{ order: getSectionOrder("context") }}>
          {contextSectionOrder.map((sectionKey, index) =>
            sectionKey === "identity" ? (
              <section
                key="context-identity"
                className={`${index === 0 ? "" : "mt-8"} ${reveal(160).className}`}
                style={reveal(160).style}
              >
                <div ref={homeIdentityDividerRef}>
                  <SectionHeader
                    activeTab={activePanelTab}
                    secondary="IDENTITY"
                    onClick={() => toggleSectionContent("contextIdentity", "context")}
                  />
                </div>

                {!truncateModeActive || expandedInTruncate.contextIdentity ? (
                  <div className="mt-2 grid gap-6 md:grid-cols-2 xl:gap-6">
                    <p
                      className={`max-w-[52rem] ${identityScaleClass} font-medium leading-[1.5] tracking-[-0.015em] text-black/80 text-justify`}
                      style={{ fontFeatureSettings: "'salt' 1" }}
                    >
                      <NameHighlight
                        key={isProfileWindowOpen ? "name-active" : "name-default"}
                        onActivate={openProfileWindow}
                        isActive={isProfileWindowOpen}
                      >
                        Raghav Agarwal
                      </NameHighlight>
                      {identityBodyOne}
                    </p>
                    <p
                      className={`max-w-[52rem] ${identityScaleClass} font-medium leading-[1.5] tracking-[-0.015em] text-black/80 text-justify`}
                      style={{ fontFeatureSettings: "'salt' 1" }}
                    >
                      {identityBodyTwo}
                    </p>
                  </div>
                ) : null}
              </section>
            ) : (
              <section
                key="context-external"
                className={`${index === 0 ? "" : "mt-8"} ${reveal(240).className}`}
                style={reveal(240).style}
              >
                <SectionHeader
                  activeTab={activePanelTab}
                  secondary="EXTERNAL"
                  onClick={() => toggleSectionContent("contextExternal", "context")}
                />

                {!truncateModeActive || expandedInTruncate.contextExternal ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {externalLinks.map((link) => (
                      <a
                        key={link.label}
                        href="#"
                        className={`group inline-flex items-center gap-2 border px-3 py-1.5 ${identityScaleClass} font-medium leading-none whitespace-nowrap ${
                          link.disabled
                            ? "border-black/50 text-black/50"
                            : "border-black/50 text-black transition-[color,border-color,box-shadow,padding-right] duration-320 ease-[cubic-bezier(0.22,1,0.36,1)] hover:pr-4"
                        }`}
                        style={
                          link.disabled
                            ? {
                                color: "rgba(0, 0, 0, 0.4)",
                                borderColor: "rgba(0, 0, 0, 0.4)",
                                boxShadow: "none",
                                cursor: "wait",
                                fontWeight: 400,
                              }
                            : { boxShadow: "none" }
                        }
                        onMouseEnter={(event) => {
                          if (link.disabled) {
                            return;
                          }
                          event.currentTarget.style.color = "#003CFF";
                          event.currentTarget.style.borderColor = "#003CFF";
                          event.currentTarget.style.boxShadow = "2px 2px 0 0 #003CFF";
                        }}
                        onMouseLeave={(event) => {
                          if (link.disabled) {
                            return;
                          }
                          event.currentTarget.style.color = "#000000";
                          event.currentTarget.style.borderColor = "rgba(0,0,0,0.5)";
                          event.currentTarget.style.boxShadow = "none";
                        }}
                        aria-disabled={link.disabled}
                        onClick={(event) => {
                          if (link.disabled) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <span className="text-current transition-colors duration-260">
                          {link.label}
                        </span>
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center shrink-0 transition-transform duration-320 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            link.disabled ? "" : "group-hover:translate-x-1"
                          }`}
                        >
                          <ArrowIcon />
                        </span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </section>
            ),
          )}
        </div>
        ) : null}

        {!(showOnlySelected && activePanelTab === "context") ? (
          <div className="flex flex-col" style={{ order: 1 }}>
            {visibleMixedWorkEntries.map((item, index) => {
              if (item === "entries") {
                const entriesReveal = reveal(340);
                return (
                  <section
                    key="entries"
                    className={`${index === 0 ? "" : "mt-8"} ${entriesReveal.className}`}
                    style={{
                      ...entriesReveal.style,
                      cursor:
                        !truncateModeActive &&
                        entryPhase === "closed" &&
                        cursorBadgeMode === "read-more"
                          ? "nesw-resize"
                          : "pointer",
                    }}
                    onMouseEnter={(event) => {
                      if (
                        !truncateModeActive &&
                        entryPhase === "closed" &&
                        !isEntriesHeaderHovered
                      ) {
                        setCursorBadgeMode("read-more");
                        updateCursorBadgePosition(event);
                      }
                    }}
                    onMouseMove={(event) => {
                      if (
                        !truncateModeActive &&
                        entryPhase === "closed" &&
                        !isEntriesHeaderHovered
                      ) {
                        updateCursorBadgePosition(event);
                      }
                    }}
                    onMouseLeave={() => {
                      if (cursorBadgeMode === "read-more") {
                        setCursorBadgeMode(null);
                      }
                    }}
                    onClick={() => {
                      if (!truncateModeActive && entryPhase === "closed") {
                        openEntry();
                      }
                    }}
                  >
                    <div ref={homeEntryDividerRef}>
                      <HeaderWithDivider
                        className="mb-2"
                        dividerClassName={
                          activePanelTab === "entries" ? "bg-[#FFE500]" : ""
                        }
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between text-[12px] font-medium tracking-[0.05em] text-muted text-left"
                          onMouseEnter={() => {
                            setIsEntriesHeaderHovered(true);
                            if (cursorBadgeMode === "read-more") {
                              setCursorBadgeMode(null);
                            }
                          }}
                          onMouseLeave={() => {
                            setIsEntriesHeaderHovered(false);
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleSectionContent("entries", "entries");
                          }}
                          aria-label="Show entries section"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="px-1.5 py-0.5"
                              style={
                                activePanelTab === "entries"
                                  ? { backgroundColor: "#FFE500", color: "#000000" }
                                  : { backgroundColor: "rgba(0,0,0,0.05)" }
                              }
                            >
                              ENTRIES
                            </span>
                            <span
                              className={`font-medium ${
                                activePanelTab === "entries" ? "text-black/80" : ""
                              }`}
                            >
                              {entryTitle}
                            </span>
                          </div>

                          <span className="font-medium">{entryYear}</span>
                        </button>
                      </HeaderWithDivider>
                    </div>

                    {!truncateModeActive || expandedInTruncate.entries ? (
                      <div className="mt-2 grid gap-6 md:grid-cols-2">
                        <p
                          className="text-[16px] leading-[1.5] text-black/40 text-justify"
                          style={{ fontFeatureSettings: "'salt' 1" }}
                        >
                          {entryExcerpt}
                        </p>
                        <div className="hidden md:block" aria-hidden="true" />
                      </div>
                    ) : null}
                  </section>
                );
              }

              const projectId = item.replace("work:", "");
              const project = workProjectById[projectId];
              if (!project) {
                return null;
              }

              const key = `work:${project.id}`;
              const visibleCount = visibleWorkImageCountByProject[project.id] ?? 0;
              const isExpanded = !truncateModeActive || expandedInTruncate[key];
              const orderedImages = workImageOrderByProject[project.id] ?? project.images;
              const workReveal = reveal(300);

              return (
                <section
                  key={project.id}
                  className={`${index === 0 ? "" : "mt-8"} ${workReveal.className}`}
                  style={workReveal.style}
                >
                  <HeaderWithDivider className="mb-2">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between text-[12px] font-medium tracking-[0.05em] text-muted text-left"
                      onClick={() => toggleSectionContent(key, "work")}
                      aria-label={`Show ${project.title.toLowerCase()} work section`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="px-1.5 py-0.5"
                          style={
                            activePanelTab === "work"
                              ? { backgroundColor: "#FF4FD9", color: "#000000" }
                              : { backgroundColor: "rgba(0,0,0,0.05)" }
                          }
                        >
                          WORK
                        </span>
                        <span
                          className={`font-medium ${
                            activePanelTab === "work" ? "text-black/80" : ""
                          }`}
                        >
                          {project.title}
                        </span>
                      </div>

                      <span className="font-medium">{project.year}</span>
                    </button>
                  </HeaderWithDivider>

                  {isExpanded ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {orderedImages.slice(0, visibleCount).map((src) => (
                        <button
                          key={src}
                          type="button"
                          className="relative w-full cursor-crosshair overflow-hidden bg-black/5 text-left"
                          style={{ cursor: "crosshair" }}
                          onClick={() => handleWorkImageClick(src)}
                          aria-label={`Preview ${project.title.toLowerCase()} work image`}
                        >
                          <img
                            src={src}
                            alt=""
                            className="aspect-[16/9] h-auto w-full cursor-crosshair select-none object-cover"
                            draggable={false}
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {isExpanded &&
                  project.images.length > workLoadMoreThreshold &&
                  visibleCount < project.images.length ? (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        className="bg-black/10 px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black"
                        onClick={() =>
                          setVisibleWorkImageCountByProject((prev) => ({
                            ...prev,
                            [project.id]: Math.min(
                              (prev[project.id] ?? workLoadMoreThreshold) + 2,
                              project.images.length,
                            ),
                          }))
                        }
                      >
                        LOAD MORE
                      </button>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        ) : null}
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return <SitePage />;
}
