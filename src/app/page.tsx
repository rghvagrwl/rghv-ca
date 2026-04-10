"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

const identityBodyOne =
  " is a designer working across product, brand, and digital interfaces. His work is shaped by paying attention to how people actually use things, especially where interactions feel unclear or inconsistent. He focuses on making systems that are simple, intuitive, and easy to move through.";
const identityBodyTwo =
  "Rather than adding complexity, his goal is to reduce it, creating work that feels natural without needing explanation. He draws inspiration from software, the internet, and visual culture, and approaches design as an ongoing process of refinement and iteration. Currently looking for opportunities and work for the summer. Reach out below.";
const educationBody =
  "Currently completing his first year at the University of Waterloo, Honours Global Business and Digital Arts, where he's focusing on design, business, and digital media. He graduated from high school in 2025.";
const experienceBody =
  "Over the last four years, he has taught himself visual and product design through personal projects and client work across startups and teams. Most recently, he interned part-time at PERMANENT© over his 1B study term.";
const ideasBody =
  "Thinking about building a design agency, exploring a new fitness consumer app, and learning motion design and video editing to create cinematic shorts this summer.";
const booksBody =
  "Currently reading Project Hail Mary by Andy Weir, The Almanack of Naval Ravikant, and Colorless by Tsukuru Tazaki.";
const profileBody =
  "I’m 18 years old, born and raised in Calgary, Canada. When I was younger, I wanted to be a scientist, which quickly turned into wanting to be an astronaut and an obsession with space, and eventually wanting to be an artist. During the pandemic, I discovered digital design and started spending more time around things that felt visual or expressive. I got into photography after picking up a camera in 2024, and drawing has been something I’ve been into for as long as I can remember. Music is almost always playing in the background, and I tend to cycle through hip hop, R&B, rap, and indie. My favourite artist is Daniel Caesar, and my favourite film is Spider-Man: Into the Spider-Verse. Most of my time is spent at my desk. Otherwise, I’m probably doomscrolling, at the gym, or out for a walk when the weather is good.";

const externalLinks = [
  { label: "LINKEDIN", href: "https://linkedin.com/in/rghv-agrwl", disabled: false },
  { label: "EMAIL", href: "mailto:rghvagwl@gmail.com", disabled: false },
  { label: "X", href: "https://x.com/raghaav", disabled: false },
  { label: "UNORDINARY", href: "#", disabled: true },
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
type CursorBadgeMode =
  | "read-more"
  | "close-entry"
  | "show-all-time"
  | "show-today"
  | "show-visitor-time"
  | "show-last-visitor-location"
  | null;
type HoveredControl = "bring" | "show" | "truncate" | null;
type TrailSquare = {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  lockedColor?: boolean;
};

const scrambleAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:".split("");
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
const topMarqueeItems = [
  "Built by doing",
  "Start before it makes sense",
  "Clarity through iteration",
  "Nothing here is final",
  "Thinking happens through making",
  "No single entry point",
  "Content reorganizes on reload",
  "Content order is not intentional",
  "This is one of many possible versions",
  "In progress, constantly evolving",
  "MADE IN 2026",
  "This version is not final",
  "( •_•)O*¯`·.¸.·´¯`°Q(•_• )",
  "•͡˘㇁•͡˘",
  "୧༼ಠ益ಠ༽୨",
  "ᕙ(⇀‸↼‶)ᕗ",
  "ʕっ•ᴥ•ʔっ",
  "ヽ(´ー｀)ノ",
  "♪♪ ヽ(ˇ∀ˇ )ゞ",
] as const;
const shuffledTopMarqueeItems = (() => {
  const items = topMarqueeItems.map((item) => item.toUpperCase());
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
})();
const cursorTrailPalette = [
  "#00C8FF",
  "#FF4FD9",
  "#FFD400",
  "#35E85A",
  "#4B68FF",
  "#FF8A00",
];
const fixedBottomWorkProjectId = "no-category";
const mixedContextSectionIds = ["context:education", "context:current"] as const;
const IGNORE_VISITOR_COOKIE_NAME = "rghv_ignore_visitor";
const IGNORE_VISITOR_QUERY_PARAM = "ignoreVisitor";
const ALL_TIME_SINCE_LABEL = "SINCE APR 9, 2026";

function formatRelativeVisitorAge(seenAt: number | null, nowMs: number) {
  if (!seenAt || Number.isNaN(seenAt)) {
    return "UNKNOWN";
  }
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - seenAt) / 1000));
  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}S AGO`;
  }
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}M AGO`;
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}H AGO`;
  }
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}D AGO`;
}

const workProjects = [
  {
    id: "unordinary",
    title: "UNORDINARY",
    year: "2024",
    images: [
      "/unordinary/Unordinary 1.webp",
      "/unordinary/Unordinary 2.webp",
      "/unordinary/Unordinary 3.webp",
      "/unordinary/Unordinary 4.webp",
      "/unordinary/Unordinary 5.webp",
      "/unordinary/Unordinary 6.webp",
      "/unordinary/Unordinary 7.webp",
      "/unordinary/Unordinary 8.webp",
    ],
  },
  {
    id: "minimum",
    title: "MINIMUM",
    year: "2022",
    images: [
      "/minimum/Minimum 1.webp",
      "/minimum/Minimum 2.webp",
      "/minimum/Minimum 3.webp",
      "/minimum/Minimum 4.webp",
      "/minimum/Minimum 5.webp",
      "/minimum/Minimum 6.webp",
    ],
  },
  {
    id: "chrono",
    title: "CHRONO",
    year: "2026",
    images: ["/chrono/Chrono 1.webp", "/chrono/Chrono 2.webp"],
  },
  {
    id: "context",
    title: "CONTEXT",
    year: "2025",
    images: [
      "/context/Context 1.webp",
      "/context/Context 2.webp",
      "/context/Context 3.webp",
      "/context/Context 4.webp",
      "/context/Context 5.webp",
      "/context/Context 6.webp",
    ],
  },
  {
    id: "crisped",
    title: "CRISPED",
    year: "2024",
    images: [
      "/crisped/Crisped 1.webp",
      "/crisped/Crisped 2.webp",
      "/crisped/Crisped 3.webp",
    ],
  },
  {
    id: "faktor",
    title: "FAKTOR",
    year: "2022",
    images: ["/faktor/Name.webp", "/faktor/Name-1.webp", "/faktor/Name-2.webp"],
  },
  {
    id: "instafleet",
    title: "INSTAFLEET",
    year: "2025",
    images: [
      "/instafleet/Instafleet 1.webp",
      "/instafleet/Instafleet 2.webp",
      "/instafleet/Instafleet 3.webp",
    ],
  },
  {
    id: "merge-club",
    title: "MERGE CLUB",
    year: "2025",
    images: [
      "/merge club/Merge 1.webp",
      "/merge club/Merge 2.webp",
      "/merge club/Merge 3.webp",
      "/merge club/Merge 4.webp",
    ],
  },
  {
    id: "on-deck-founders",
    title: "ON DECK FOUNDERS",
    year: "2025",
    images: [
      "/on deck founders/ODF 1.webp",
      "/on deck founders/ODF 2.webp",
      "/on deck founders/ODF 3.webp",
      "/on deck founders/ODF 4.webp",
    ],
  },
  {
    id: "para",
    title: "PARA",
    year: "2022",
    images: ["/para/Para 1.webp", "/para/Para 2.webp"],
  },
  {
    id: "prism-collective",
    title: "PRISM COLLECTIVE",
    year: "2025",
    images: ["/prism collective/Prism 1.webp", "/prism collective/Prism 2.webp"],
  },
  {
    id: "socratica",
    title: "SOCRATICA",
    year: "2026",
    images: ["/socratica/Socratica 1.webp", "/socratica/Socratica 2.webp"],
  },
  {
    id: "zero-email",
    title: "ZERO EMAIL",
    year: "2024",
    images: ["/zero email/Zero 1.webp", "/zero email/Zero 2.webp"],
  },
  {
    id: "no-category",
    title: "NO CATEGORY",
    images: [
      "/uncategorized/Human 1.webp",
      "/uncategorized/Other 1.webp",
      "/uncategorized/Other 2.webp",
      "/uncategorized/Other 3.webp",
      "/uncategorized/Other 4.webp",
      "/uncategorized/Other 5.webp",
      "/uncategorized/Verse 1.webp",
      "/uncategorized/Verse 2.webp",
    ],
  },
] as const;
const workLoadMoreThreshold = 3;
const workLoadMoreThresholdMobile = 3;
const entriesData = [
  {
    id: "living-without-regrets",
    title: "LIVING WITHOUT REGRETS",
    year: "2025",
    excerpt:
      "A few months ago, a friend and I were walking home from the gym when he asked me what my biggest regrets were. It caught me off guard, but I answered honestly. I told him I wished I had tried harder academically in high school, and that maybe I should have taken a more traditional path.",
    paragraphs: [
  "A few months ago, a friend and I were walking home from the gym when he asked me what my biggest regrets were. It caught me off guard, but I answered honestly.",
  "I told him I wished I had tried harder academically in high school. That maybe I should have taken a more traditional path. I regretted saying no to certain opportunities. I regretted hesitating when I should have leaned in.",
  "He shared some of his own. Different details, same feeling. But he ended with something simple.",
  "I don’t think it’s good to regret anything.",
  "It sounded unrealistic. Of course there are things to regret.",
  "But maybe that’s the point.",
  "The decisions I regret were made based on who I was at the time. My confidence, my fears, my understanding of risk. It’s easy to say I should have known better, but I only know better because it happened.",
  "Regret assumes there was a cleaner path. A better decision. A more optimal version of events. Maybe there was.",
  "But that clarity only exists in hindsight.",
  "You can look back and see what you missed. The risks you didn’t take. The options you didn’t choose. Everything feels obvious now, but it wasn’t obvious then.",
  "You made decisions with the perspective you had. Your priorities, your insecurities, your understanding of the world. Expecting your past self to think like you do now doesn’t make sense. The growth came from going through it.",
  "The relationship that didn’t last shapes how you understand people. The path that felt uncertain gives you a perspective you wouldn’t trade. The opportunities you turned down clarify what actually matters to you.",
  "None of it is neutral. It leaves something behind.",
  "Regret assumes a different choice would have led to a better outcome. Maybe it would have. But it also would have led to a different version of you. And there’s no guarantee that version would feel more right than the one you are now.",
  "I’ve started to think of my past less as a series of right and wrong decisions, and more as a sequence of necessary ones. Not perfect, not always efficient, but necessary.",
  "The clarity I have now wasn’t available to me then. It had to be earned.",
  "Living without regret doesn’t mean everything worked out. It means recognizing that even the missteps carried something with them. They sharpened your standards. They revealed what you value. They expanded your limits.",
  "You don’t need to rewrite your past to feel at peace with it.",
  "You just need to recognize that it built you.",
  "If it shapes how you move today, then it wasn’t wasted.",
    ],
  },
  {
    id: "on-perception-and-value",
    title: "ELITISM",
    year: "2025",
    excerpt:
      "Early on, I started to notice how quickly people form impressions of each other. Conversations often felt like quiet evaluations. Small pieces of information would shift the tone. The energy of an interaction could change almost instantly, sometimes without anything being said directly. It felt transactional. Like the value of the interaction had already been decided.",
    paragraphs: [
      "Early on, I started to notice how quickly people form impressions of each other. Conversations often felt like quiet evaluations. Small pieces of information would shift the tone. The energy of an interaction could change almost instantly, sometimes without anything being said directly. It felt transactional. Like the value of the interaction had already been decided.",
      "Over time, it became clear how often people tie their identity to what they do. Not just as something they’re pursuing, but as something that defines their worth. And naturally, that lens extends outward, shaping how they see others. At first, it got to me. It was hard not to internalize it, to question whether I was being perceived a certain way for a reason. Whether there was something I was missing. But that way of seeing things didn’t feel complete.",
      "I don’t think most of this comes from a bad place. If anything, it reflects the environments people come from. Years of pressure, competition, and reinforcement around certain paths being more valuable than others. It makes sense that people begin to see the world through that lens. In a way, it’s learned.",
      "There were also moments where the tone of an interaction would shift again. More interest, more engagement, depending on what someone thought they understood about you. That stood out to me. Not in a way that made me resent it, but in a way that made me more aware of what was actually driving the interaction.",
      "Over time, I stopped taking it personally. It became less about how I was being perceived, and more about what it revealed. Not something to judge, but something to recognize.",
      "I also don’t think people stay fixed in that mindset. The way someone understands value, status, or identity at one point in their life is shaped by where they are. That changes. The friendships that lasted felt different from the start. They weren’t based on evaluation or what someone represented. There was no need to qualify yourself first. Just people talking to people.",
      "Looking back, I’m glad I experienced it early. It gave me a clearer sense of what kind of interactions I value, and what kind of people I want to be around. Not defined by status, but just grounded in who they are.",
    ],
  },
  {
    id: "term-1a",
    title: "TERM 1A",
    year: "2025",
    excerpt:
      "At first, it was easy to gain an ego. Being around ambitious people, doing things on your own, feeling like you’re building momentum. But at the same time, it’s just as easy to get humbled. There’s such a wide range of talent and ability that it balances out quickly.",
    paragraphs: [
      "At first, it was easy to gain an ego. Being around ambitious people, doing things on your own, feeling like you’re building momentum. But at the same time, it’s just as easy to get humbled. There’s such a wide range of talent and ability that it balances out quickly.",
      "I think I learned how to sit somewhere in between. Staying grounded in what I believe in, while still being confident in what I can do.",
      "I also stopped judging people as much. Everyone is moving at a different pace, figuring out different things. Not everyone is at the same place, and that became more obvious the longer I was there.",
      "At some point, I started to lose my sense of identity a bit. Being in a program I didn’t fully resonate with, while being surrounded by people in completely different paths, made me question where I fit. It messed with me more than I expected. But over time, I realized that identity doesn’t have to come from school. It’s easy to let it define you, but it doesn’t have to. You can build something outside of it, alongside it.",
      "Being away from home also made me realize how much I value the people I grew up around. It’s easy to take those relationships for granted when they’re always there. But distance changes that. It takes effort to stay in touch, to call, to keep those connections strong. I started to appreciate my family more. Calling my parents every day became something I valued, not something I felt obligated to do. The same goes for friends back home. It’s harder to maintain those relationships, but it also makes you realize which ones matter.",
      "Another thing I kept coming back to was time. There’s more of it than it feels like in the moment. It’s easy to get stuck thinking about what you could have done differently, or trying to plan everything out. But that just takes away from actually doing anything. You can overestimate what you can do in a year, and underestimate what you can do in five. What matters more is what you do day to day.",
      "Ambition started to feel less fixed too. It’s not something constant. It changes depending on where you are, what you’re exposed to, and what you start to care about. I think I’m still figuring out what it means to me.",
      "One thing that became clearer is that there are good people everywhere. And it doesn’t take long to recognize who you want to be around. First impressions aren’t everything, but they do tell you something. The people I’ve kept around are the ones that feel genuine. No pressure, no need to prove anything. Just normal conversations.",
      "I don’t think I have everything figured out. But I feel less pressure to. There’s time to figure it out.",
    ],
  },
  {
    id: "start",
    title: "START",
    year: "2026",
    excerpt:
      "I just got back from San Francisco and this is something I don’t want to forget. Being there and meeting people around my age who were already building things made something really clear. It wasn’t that they had everything figured out or that their ideas were perfect. Most of it was still rough. But they had started.",
    paragraphs: [
      "I just got back from San Francisco and this is something I don’t want to forget. Being there and meeting people around my age who were already building things made something really clear. It wasn’t that they had everything figured out or that their ideas were perfect. Most of it was still rough. But they had started.",
      "Before this, I spent a lot of time thinking. Planning things out, trying to make sure everything made sense before I began. I told myself I was being intentional, but most of the time it was just hesitation.",
      "Seeing it up close made the gap obvious. It wasn’t intelligence or access or experience. It was a willingness to act without needing everything to be clear first. The people who were moving weren’t overanalyzing every step. They were just doing, and figuring it out as they went.",
      "I don’t want to forget how obvious that felt. Overthinking doesn’t move anything forward. It just keeps you in the same place, convincing yourself you’re making progress when you’re not. Weeks can pass like that.",
      "There isn’t a perfect moment where everything aligns. There’s just a point where you decide to begin. Even if it’s unclear. Even if it’s rough. Just start.",
    ],
  },
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
  strokeCycleActive = false,
  secondary,
  onClick,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}: {
  activeTab: PanelTabId | null;
  strokeCycleActive?: boolean;
  secondary: string;
  onClick?: () => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseMove?: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave?: () => void;
}) {
  const isContextActive = activeTab === "context";
  const contextColor =
    panelTabs.find((tab) => tab.id === "context")?.color ?? "#5EE7FF";

  return (
    <HeaderWithDivider>
      <button
        type="button"
        className="inline-flex w-fit self-start cursor-crosshair items-center gap-3 text-left"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        aria-label={`Show context ${secondary.toLowerCase()} section`}
      >
        <span
          className={`cursor-crosshair px-1.5 py-0.5 text-[12px] font-medium tracking-[0.05em] ${
            strokeCycleActive ? "section-chip-stroke-cycle" : ""
          }`}
          style={
            {
              ...(isContextActive
                ? { backgroundColor: contextColor, color: "#000000" }
                : { backgroundColor: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.4)" }),
            }
          }
        >
          CONTEXT
        </span>
        <span
          className={`cursor-crosshair text-[12px] font-medium tracking-[0.05em] ${
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

function buildMixedContentOrderWithEntrySpacing(
  workItemIds: string[],
  entryItemIds: string[],
) {
  const shuffledWorkIds = shuffleArray(workItemIds);
  const shuffledEntryIds = shuffleArray(entryItemIds);
  const slotCount = shuffledWorkIds.length + 1;
  const slotIndices = shuffleArray(
    Array.from({ length: slotCount }, (_, index) => index),
  );
  const selectedSlots = slotIndices
    .slice(0, Math.min(shuffledEntryIds.length, slotCount))
    .sort((a, b) => a - b);

  const entryBySlot = new Map<number, string>();
  selectedSlots.forEach((slotIndex, entryIndex) => {
    entryBySlot.set(slotIndex, shuffledEntryIds[entryIndex]);
  });

  const mixedOrder: string[] = [];
  for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
    const entryId = entryBySlot.get(slotIndex);
    if (entryId) {
      mixedOrder.push(entryId);
    }
    if (slotIndex < shuffledWorkIds.length) {
      mixedOrder.push(shuffledWorkIds[slotIndex]);
    }
  }
  return mixedOrder;
}

function insertItemsAtRandomPositions(baseItems: string[], itemsToInsert: string[]) {
  const nextItems = [...baseItems];
  shuffleArray(itemsToInsert).forEach((item) => {
    const insertAt = Math.floor(Math.random() * (nextItems.length + 1));
    nextItems.splice(insertAt, 0, item);
  });
  return nextItems;
}

function buildMixedOrderWithContextSections(
  workItemIds: string[],
  entryItemIds: string[],
  contextItemIds: string[],
) {
  const mixedWorkAndEntries = buildMixedContentOrderWithEntrySpacing(
    workItemIds,
    entryItemIds,
  );
  return insertItemsAtRandomPositions(mixedWorkAndEntries, contextItemIds);
}

function BringToTopIcon({
  active,
  disabled = false,
  inactive = false,
  error = false,
}: {
  active: boolean;
  disabled?: boolean;
  inactive?: boolean;
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
                : inactive
                  ? "rgba(0,0,0,0.8)"
                  : "rgba(0,0,0,0.8)"
        }
      />
    </svg>
  );
}

function ShowHideIcon({
  active,
  disabled = false,
  inactive = false,
  error = false,
}: {
  active: boolean;
  disabled?: boolean;
  inactive?: boolean;
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
                : inactive
                  ? "rgba(0,0,0,0.8)"
                  : "rgba(0,0,0,0.8)"
        }
      />
    </svg>
  );
}

function TruncateIcon({
  disabled = false,
  inactive = false,
  error = false,
}: {
  disabled?: boolean;
  inactive?: boolean;
  error?: boolean;
}) {
  const fill = error
    ? "#DC2626"
    : disabled
      ? "rgba(0,0,0,0.2)"
      : inactive
        ? "rgba(0,0,0,0.8)"
        : "rgba(0,0,0,0.8)";

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

function TrailModeIcon() {
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
        d="M9 16H7M13 16H11M17 16H15M9 12H7M13 12H11M17 12H15M7 8H9H11H13H15H17M7 10H9H11M7 14H9H11M13 10H15M15 14H13"
        stroke="rgba(0,0,0,0.8)"
        strokeWidth="2"
      />
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
  const [isLoaded] = useState(true);
  const [trailSquares, setTrailSquares] = useState<TrailSquare[]>([]);
  const [isTrailBoosted, setIsTrailBoosted] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [cursorBadgeMode, setCursorBadgeMode] = useState<CursorBadgeMode>(null);
  const [cursorBadgePosition, setCursorBadgePosition] = useState({ x: 0, y: 0 });
  const [hoveredControl, setHoveredControl] = useState<HoveredControl>(null);
  const [hoveredDividerTab, setHoveredDividerTab] = useState<PanelTabId | null>(null);
  const [hoveredSelectorTab, setHoveredSelectorTab] = useState<PanelTabId | null>(
    null,
  );
  const [autoHoverSelectorTab, setAutoHoverSelectorTab] =
    useState<PanelTabId | null>(null);
  const [isSelectorGroupHovered, setIsSelectorGroupHovered] = useState(false);
  const [hoveredLocationToggle, setHoveredLocationToggle] = useState(false);
  const [hoveredTrailToggle, setHoveredTrailToggle] = useState(false);
  const [hoveredOutboundLink, setHoveredOutboundLink] = useState(false);
  const [cursorButtonTiltDeg, setCursorButtonTiltDeg] = useState(0);
  const [hoveredIntroToggle, setHoveredIntroToggle] = useState(false);
  const [displayedLocationCode, setDisplayedLocationCode] = useState<string>(
    locations[locationKey].code,
  );
  const [displayedLocationCity, setDisplayedLocationCity] = useState<string>(
    locations[locationKey].city,
  );
  const [isLocationScrambling, setIsLocationScrambling] = useState(false);
  const [scrambledClock, setScrambledClock] = useState("");
  const [strokeCycleStep] = useState(-1);
  const [footerDateLabel, setFooterDateLabel] = useState("DATE");
  const [lastVisitorLabel, setLastVisitorLabel] = useState("UNKNOWN, UNKNOWN COUNTRY");
  const [lastVisitorSeenAt, setLastVisitorSeenAt] = useState<number | null>(null);
  const [lastVisitorMode, setLastVisitorMode] = useState<"from" | "was">("from");
  const [relativeNowMs, setRelativeNowMs] = useState(() => Date.now());
  const [displayedLastVisitorHeading, setDisplayedLastVisitorHeading] =
    useState("LAST VISITOR FROM");
  const [displayedLastVisitorValue, setDisplayedLastVisitorValue] = useState(
    "UNKNOWN, UNKNOWN COUNTRY",
  );
  const [visitorsToday, setVisitorsToday] = useState(0);
  const [visitorsAllTime, setVisitorsAllTime] = useState(0);
  const [animatedVisitorCount, setAnimatedVisitorCount] = useState(0);
  const [isFooterInView, setIsFooterInView] = useState(false);
  const [displayedFooterDateLabel, setDisplayedFooterDateLabel] = useState("DATE");
  const [displayedVisitorModeLabel, setDisplayedVisitorModeLabel] =
    useState("VISITORS TODAY");
  const [visitorCountMode, setVisitorCountMode] = useState<"today" | "all-time">(
    "today",
  );
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
  const [invalidSelectorFlash, setInvalidSelectorFlash] = useState<PanelTabId | null>(
    null,
  );
  const [centerPopupText, setCenterPopupText] = useState<string | null>(null);
  const [pressedSelectorTabId, setPressedSelectorTabId] = useState<PanelTabId | null>(
    null,
  );
  const [invalidExternalLinkFlash, setInvalidExternalLinkFlash] = useState<
    string | null
  >(null);
  const [isTruncateMode, setIsTruncateMode] = useState(false);
  const [expandedInTruncate, setExpandedInTruncate] = useState<Record<string, boolean>>({
    contextIdentity: false,
    contextEducation: false,
    contextExperience: false,
    contextIdeas: false,
    contextBooks: false,
    contextExternal: false,
    contextProfile: false,
    ...Object.fromEntries(workProjects.map((project) => [`work:${project.id}`, false])),
    ...Object.fromEntries(entriesData.map((entry) => [`entry:${entry.id}`, false])),
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
  const [mixedWorkEntriesOrder, setMixedWorkEntriesOrder] = useState(() => [
    ...workProjects
      .filter((project) => project.id !== fixedBottomWorkProjectId)
      .map((project) => `work:${project.id}`),
    ...entriesData.map((entry) => `entry:${entry.id}`),
    ...mixedContextSectionIds,
  ]);
  const [workImageOrderByProject, setWorkImageOrderByProject] = useState<
    Record<string, string[]>
  >(() =>
    Object.fromEntries(workProjects.map((project) => [project.id, [...project.images]])),
  );
  const [contextSectionOrder, setContextSectionOrder] = useState<
    ("identity" | "external")[]
  >(["identity", "external"]);
  const lastTrailTimeRef = useRef(0);
  const lastTrailPointRef = useRef({ x: 0, y: 0 });
  const trailIdRef = useRef(0);
  const trailHueRef = useRef(0);
  const selectorBounceTimeoutRef = useRef<number | null>(null);
  const displayClearTimeoutRef = useRef<number | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);
  const invalidControlFlashTimeoutRef = useRef<number | null>(null);
  const invalidSelectorFlashTimeoutRef = useRef<number | null>(null);
  const invalidExternalLinkFlashTimeoutRef = useRef<number | null>(null);
  const centerPopupTimeoutRef = useRef<number | null>(null);
  const profileWindowRef = useRef<HTMLDivElement | null>(null);
  const orderedDividerStrokeKeysRef = useRef<string[]>([]);
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
  const profileGestureFrameRef = useRef<number | null>(null);
  const profilePendingPositionRef = useRef<Point | null>(null);
  const profilePendingResizeRef = useRef<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);
  const entryHeaderRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const homeIdentityDividerRef = useRef<HTMLDivElement | null>(null);
  const homeSectionsStartRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const hasStartedSelectorCycleRef = useRef(false);
  const hasInitializedLocationScrambleRef = useRef(false);
  const hasInitializedFooterDateScrambleRef = useRef(false);
  const hasInitializedVisitorModeScrambleRef = useRef(false);
  const hasInitializedLastVisitorScrambleRef = useRef(false);
  const previousLastVisitorModeRef = useRef<"from" | "was">("from");

  const closeProfileWindow = () => {
    setIsProfileWindowOpen(false);
    setIsProfileWindowSelected(false);
    setIsProfileWindowDragging(false);
    setIsProfileWindowResizing(false);
    setActiveResizeHandle(null);
    setHoveredProfileImage(false);
  };

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
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    const ignoreVisitorParam = url.searchParams.get(IGNORE_VISITOR_QUERY_PARAM);
    if (ignoreVisitorParam !== "1" && ignoreVisitorParam !== "0") {
      return;
    }

    const maxAge = 60 * 60 * 24 * 365 * 5;
    if (ignoreVisitorParam === "1") {
      document.cookie = `${IGNORE_VISITOR_COOKIE_NAME}=1; path=/; max-age=${maxAge}; samesite=lax`;
    } else {
      document.cookie = `${IGNORE_VISITOR_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
    }

    url.searchParams.delete(IGNORE_VISITOR_QUERY_PARAM);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let isMounted = true;
    const timer = window.setTimeout(async () => {
      const now = new Date();
      const dateLabel = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
        .format(now)
        .toUpperCase();
      if (isMounted) {
        setFooterDateLabel(dateLabel);
      }

      let city = "UNKNOWN";
      let country = "UNKNOWN COUNTRY";
      let nextVisitorsToday = 0;
      let nextVisitorsAllTime = 0;
      let nextLastVisitorLabel = "UNKNOWN, UNKNOWN COUNTRY";
      let nextLastVisitorSeenAt: number | null = null;
      try {
        const response = await fetch("/api/footer-stats", { cache: "no-store" });
        if (response.ok) {
          const footerStats = (await response.json()) as {
            city?: string | null;
            country?: string | null;
            lastVisitorLabel?: string | null;
            lastVisitorSeenAt?: number | null;
            visitorsToday?: number | null;
            visitorsAllTime?: number | null;
          };
          if (footerStats.city) {
            city = footerStats.city;
          }
          if (footerStats.country) {
            country = footerStats.country;
          }
          if (footerStats.lastVisitorLabel) {
            nextLastVisitorLabel = footerStats.lastVisitorLabel;
          }
          if (typeof footerStats.lastVisitorSeenAt === "number") {
            nextLastVisitorSeenAt = footerStats.lastVisitorSeenAt;
          }
          if (typeof footerStats.visitorsToday === "number") {
            nextVisitorsToday = footerStats.visitorsToday;
          }
          if (typeof footerStats.visitorsAllTime === "number") {
            nextVisitorsAllTime = footerStats.visitorsAllTime;
          }
        }
      } catch {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
        const cityPart = timeZone.includes("/") ? timeZone.split("/").pop() ?? "UNKNOWN" : "UNKNOWN";
        city = cityPart.replace(/_/g, " ").toUpperCase();
      }

      const currentVisitorLabel = `${city}, ${country}`;
      if (isMounted) {
        setLastVisitorLabel(
          nextLastVisitorLabel === "UNKNOWN, UNKNOWN COUNTRY"
            ? currentVisitorLabel
            : nextLastVisitorLabel,
        );
        setLastVisitorSeenAt(nextLastVisitorSeenAt);
        setVisitorsToday(nextVisitorsToday);
        setVisitorsAllTime(nextVisitorsAllTime);
      }
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRelativeNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const resetEntryOverlayState = () => {
      setExpandedEntryId(null);
      setCursorBadgeMode(null);
      setIsEntriesHeaderHovered(false);
    };

    const handleHistoryOrPageRestore = () => {
      window.setTimeout(resetEntryOverlayState, 0);
    };

    window.addEventListener("popstate", handleHistoryOrPageRestore);
    window.addEventListener("pageshow", handleHistoryOrPageRestore);

    return () => {
      window.removeEventListener("popstate", handleHistoryOrPageRestore);
      window.removeEventListener("pageshow", handleHistoryOrPageRestore);
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!window.matchMedia("(max-width: 767px)").matches) {
        return;
      }
      setVisibleWorkImageCountByProject(
        Object.fromEntries(
          workProjects.map((project) => [
            project.id,
            project.images.length > workLoadMoreThresholdMobile
              ? workLoadMoreThresholdMobile
              : project.images.length,
          ]),
        ),
      );
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMixedWorkEntriesOrder(
        buildMixedOrderWithContextSections(
          workProjects
            .filter((project) => project.id !== fixedBottomWorkProjectId)
            .map((project) => `work:${project.id}`),
          entriesData.map((entry) => `entry:${entry.id}`),
          [...mixedContextSectionIds],
        ),
      );
      setWorkImageOrderByProject(
        Object.fromEntries(
          workProjects.map((project) => [project.id, shuffleArray(project.images)]),
        ),
      );
      setContextSectionOrder(["identity", "external"]);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const spawnTrailSquare = (
      clientX: number,
      clientY: number,
      options?: {
        color?: string;
        size?: number;
        lockedColor?: boolean;
        lifetimeMs?: number;
      },
    ) => {
      trailIdRef.current += 1;
      const id = trailIdRef.current;
      if (isTrailBoosted) {
        trailHueRef.current = (trailHueRef.current + 18) % 360;
      }
      const color = options?.color
        ? options.color
        : isTrailBoosted
          ? `hsl(${trailHueRef.current} 100% 58%)`
          : cursorTrailPalette[
              Math.floor(Math.random() * cursorTrailPalette.length)
            ];
      const size = options?.size
        ? options.size
        : isTrailBoosted
          ? Math.floor(Math.random() * 7) + 5
          : Math.floor(Math.random() * 5) + 4;

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
        const maxSquares = isTrailBoosted ? 56 : 11;
        return next.length > maxSquares ? next.slice(next.length - maxSquares) : next;
      });

      window.setTimeout(() => {
        setTrailSquares((prev) => prev.filter((square) => square.id !== id));
      }, options?.lifetimeMs ?? (isTrailBoosted ? 1400 : 650));
    };

    const handlePointerMove = (event: PointerEvent) => {
      const now = performance.now();
      const dx = event.clientX - lastTrailPointRef.current.x;
      const dy = event.clientY - lastTrailPointRef.current.y;
      const movedEnough = Math.hypot(dx, dy) > (isTrailBoosted ? 7 : 20);
      const cooledDown = now - lastTrailTimeRef.current > (isTrailBoosted ? 22 : 92);
      const shouldSpawn = Math.random() < (isTrailBoosted ? 0.92 : 0.34);

      if (movedEnough && cooledDown && shouldSpawn) {
        spawnTrailSquare(event.clientX, event.clientY);
        if (Math.random() < (isTrailBoosted ? 0.72 : 0.08)) {
          spawnTrailSquare(
            event.clientX + (Math.random() < 0.5 ? -8 : 8),
            event.clientY + (Math.random() < 0.5 ? -8 : 8),
          );
        }
        if (isTrailBoosted && Math.random() < 0.46) {
          spawnTrailSquare(
            event.clientX + (Math.random() < 0.5 ? -12 : 12),
            event.clientY + (Math.random() < 0.5 ? -12 : 12),
          );
        }
        lastTrailTimeRef.current = now;
        lastTrailPointRef.current.x = event.clientX;
        lastTrailPointRef.current.y = event.clientY;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (isTrailBoosted) {
        const spacing = 9;
        for (let row = -1; row <= 1; row += 1) {
          for (let column = -1; column <= 1; column += 1) {
            spawnTrailSquare(
              event.clientX + column * spacing,
              event.clientY + row * spacing,
              {
                color: `hsl(${Math.floor(Math.random() * 360)} 100% 58%)`,
                size: Math.floor(Math.random() * 7) + 4,
                lockedColor: true,
                lifetimeMs: 1600,
              },
            );
          }
        }
        return;
      }

      spawnTrailSquare(event.clientX, event.clientY, {
        color: "#000000",
        size: isTrailBoosted ? 9 : 8,
        lockedColor: true,
      });
    };

    const recolorInterval = !isTrailBoosted
      ? window.setInterval(() => {
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
        }, 1000)
      : null;

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => {
      if (recolorInterval) {
        window.clearInterval(recolorInterval);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isTrailBoosted]);

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
      closeProfileWindow();
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
    }, 1500);

    return () => {
      window.clearInterval(timer);
    };
  }, [hoveredProfileImage, isProfileWindowOpen]);

  const activeLocation = locations[locationKey];

  const openProfileWindow = () => {
    if (isProfileWindowOpen) {
      closeProfileWindow();
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
    event.currentTarget.setPointerCapture(event.pointerId);

    const handleMove = (moveEvent: PointerEvent) => {
      const maxX = Math.max(16, window.innerWidth - profileWindowSize.width - 16);
      const maxY = Math.max(16, window.innerHeight - profileWindowSize.height - 16);
      profilePendingPositionRef.current = {
        x: Math.min(
          maxX,
          Math.max(16, moveEvent.clientX - profileWindowDragOffsetRef.current.x),
        ),
        y: Math.min(
          maxY,
          Math.max(16, moveEvent.clientY - profileWindowDragOffsetRef.current.y),
        ),
      };

      if (profileGestureFrameRef.current !== null) {
        return;
      }
      profileGestureFrameRef.current = window.requestAnimationFrame(() => {
        profileGestureFrameRef.current = null;
        if (profilePendingPositionRef.current) {
          setProfileWindowPosition(profilePendingPositionRef.current);
        }
      });
    };

    const handleUp = () => {
      setIsProfileWindowDragging(false);
      if (profileGestureFrameRef.current !== null) {
        window.cancelAnimationFrame(profileGestureFrameRef.current);
        profileGestureFrameRef.current = null;
      }
      if (profilePendingPositionRef.current) {
        setProfileWindowPosition(profilePendingPositionRef.current);
        profilePendingPositionRef.current = null;
      }
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
    event.currentTarget.setPointerCapture(event.pointerId);

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

      profilePendingResizeRef.current = {
        width: Math.round(nextWidth),
        height: Math.round(nextHeight),
        x: Math.round(nextLeft),
        y: Math.round(nextTop),
      };

      if (profileGestureFrameRef.current !== null) {
        return;
      }
      profileGestureFrameRef.current = window.requestAnimationFrame(() => {
        profileGestureFrameRef.current = null;
        if (!profilePendingResizeRef.current) {
          return;
        }
        setProfileWindowSize({
          width: profilePendingResizeRef.current.width,
          height: profilePendingResizeRef.current.height,
        });
        setProfileWindowPosition({
          x: profilePendingResizeRef.current.x,
          y: profilePendingResizeRef.current.y,
        });
      });
    };

    const handleUp = () => {
      setIsProfileWindowResizing(false);
      setActiveResizeHandle(null);
      profileWindowResizeStartRef.current = null;
      if (profileGestureFrameRef.current !== null) {
        window.cancelAnimationFrame(profileGestureFrameRef.current);
        profileGestureFrameRef.current = null;
      }
      if (profilePendingResizeRef.current) {
        setProfileWindowSize({
          width: profilePendingResizeRef.current.width,
          height: profilePendingResizeRef.current.height,
        });
        setProfileWindowPosition({
          x: profilePendingResizeRef.current.x,
          y: profilePendingResizeRef.current.y,
        });
        profilePendingResizeRef.current = null;
      }
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  const handleLocationToggle = () => {
    setLocationKey((prev) => {
      const next = prev === "waterloo" ? "calgary" : "waterloo";
      showCenterPopup(
        next === "waterloo" ? "SHOWING WATERLOO TIME" : "SHOWING CALGARY TIME",
      );
      return next;
    });
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
        contextEducation: false,
        contextExperience: false,
        contextIdeas: false,
        contextBooks: false,
        contextExternal: false,
        contextProfile: false,
        ...Object.fromEntries(workProjects.map((project) => [`work:${project.id}`, false])),
        ...Object.fromEntries(entriesData.map((entry) => [`entry:${entry.id}`, false])),
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

  const showCenterPopup = (message: string) => {
    setCenterPopupText(message);
    if (centerPopupTimeoutRef.current !== null) {
      window.clearTimeout(centerPopupTimeoutRef.current);
    }
    centerPopupTimeoutRef.current = window.setTimeout(() => {
      setCenterPopupText(null);
    }, 1500);
  };
  const getSectionHighlightPopupText = (tab: PanelTabId) =>
    activePanelTab === tab
      ? "HIGHLIGHT REMOVED"
      : `HIGHLIGHTING ${tab.toUpperCase()}`;

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
    if (!isLoaded || isSelectorGroupHovered || hoveredSelectorTab !== null) {
      return;
    }

    let cycleStepInterval: number | null = null;
    let nextCycleTimeout: number | null = null;

    const getRandomCycleDelay = () => 7000 + Math.floor(Math.random() * 3001);

    const runCycle = () => {
      let nextIndex = 0;
      setAutoHoverSelectorTab(panelTabs[nextIndex]?.id ?? null);

      cycleStepInterval = window.setInterval(() => {
        nextIndex += 1;
        if (nextIndex >= panelTabs.length) {
          if (cycleStepInterval !== null) {
            window.clearInterval(cycleStepInterval);
            cycleStepInterval = null;
          }
          setAutoHoverSelectorTab(null);
          nextCycleTimeout = window.setTimeout(runCycle, getRandomCycleDelay());
          return;
        }
        setAutoHoverSelectorTab(panelTabs[nextIndex]?.id ?? null);
      }, 620);
    };

    const initialDelay = hasStartedSelectorCycleRef.current ? getRandomCycleDelay() : 3000;
    hasStartedSelectorCycleRef.current = true;
    nextCycleTimeout = window.setTimeout(runCycle, initialDelay);

    return () => {
      if (nextCycleTimeout !== null) {
        window.clearTimeout(nextCycleTimeout);
      }
      if (cycleStepInterval !== null) {
        window.clearInterval(cycleStepInterval);
      }
    };
  }, [hoveredSelectorTab, isLoaded, isSelectorGroupHovered]);

  useEffect(() => {
    if (typeof window === "undefined" || !footerRef.current) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsFooterInView(true);
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(footerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isFooterInView) {
      return;
    }
    const targetCount = visitorCountMode === "today" ? visitorsToday : visitorsAllTime;
    let rafId = 0;
    if (targetCount <= 0) {
      rafId = window.requestAnimationFrame(() => {
        setAnimatedVisitorCount(0);
      });
      return () => {
        window.cancelAnimationFrame(rafId);
      };
    }

    rafId = window.requestAnimationFrame(() => {
      setAnimatedVisitorCount(0);
    });
    const durationMs = 820;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setAnimatedVisitorCount(Math.round(targetCount * eased));
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isFooterInView, visitorCountMode, visitorsToday, visitorsAllTime]);

  useEffect(() => {
    return () => {
      if (centerPopupTimeoutRef.current !== null) {
        window.clearTimeout(centerPopupTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (profileGestureFrameRef.current !== null) {
        window.cancelAnimationFrame(profileGestureFrameRef.current);
      }
      if (selectorBounceTimeoutRef.current !== null) {
        window.clearTimeout(selectorBounceTimeoutRef.current);
      }
      if (displayClearTimeoutRef.current !== null) {
        window.clearTimeout(displayClearTimeoutRef.current);
      }
      if (previewTimeoutRef.current !== null) {
        window.clearTimeout(previewTimeoutRef.current);
      }
      if (invalidControlFlashTimeoutRef.current !== null) {
        window.clearTimeout(invalidControlFlashTimeoutRef.current);
      }
      if (invalidSelectorFlashTimeoutRef.current !== null) {
        window.clearTimeout(invalidSelectorFlashTimeoutRef.current);
      }
      if (invalidExternalLinkFlashTimeoutRef.current !== null) {
        window.clearTimeout(invalidExternalLinkFlashTimeoutRef.current);
      }
    };
  }, []);

  const openEntry = (entryId: string) => {
    setExpandedEntryId(entryId);
    setCursorBadgeMode(null);
  };

  const closeEntry = () => {
    if (!expandedEntryId) {
      return;
    }
    setExpandedEntryId(null);
    setCursorBadgeMode(null);
  };

  const reveal = (delayMs: number) => ({
    className: `reveal-on-load transition-[opacity,transform] duration-220 ease-out ${
      isLoaded ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
    }`,
    style: {
      transitionDelay: isLoaded ? `${280 + delayMs}ms` : "0ms",
    },
  });

  const handleWorkImageClick = (src: string) => {
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
      return;
    }
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
  const isEntryControlLockActive = false;

  const cursorControlLabel =
    !hoveredControl || !activePanelTab
      ? null
      : hoveredControl === "bring"
        ? isBringToTopActive
          ? "RETURN TO DEFAULT"
          : "BRING TO TOP"
        : hoveredControl === "truncate"
          ? canUseTruncateControl
            ? truncateModeActive
              ? "EXTEND"
              : "TRUNCATE"
            : null
        : showOnlySelected
          ? "SHOW ALL"
          : `SHOW ${activePanelTab.toUpperCase()} ONLY`;

  const cursorLocationLabel = hoveredLocationToggle
    ? locationKey === "waterloo"
      ? "SHOW CALGARY"
      : "SHOW WATERLOO"
    : null;
  const getSectionHoverCursorLabel = (tab: PanelTabId) =>
    activePanelTab === tab ? "REMOVE HIGHLIGHT" : `HIGHLIGHT ${tab.toUpperCase()}`;
  const cursorDividerLabel = hoveredDividerTab
    ? getSectionHoverCursorLabel(hoveredDividerTab)
    : null;
  const cursorSelectorLabel = hoveredSelectorTab
    ? getSectionHoverCursorLabel(hoveredSelectorTab)
    : null;
  const cursorOutboundLinkLabel = hoveredOutboundLink ? "OPEN IN NEW TAB" : null;
  const cursorProfileImageLabel = hoveredProfileImage
    ? profileTooltipFlip
      ? "DEL/BACKSPACE TO CLOSE"
      : "MAR 29 2026 8:04PM"
    : null;
  const cursorTrailModeLabel = hoveredTrailToggle ? "SWITCH CURSOR MODE" : null;
  const cursorIntroLabel = hoveredIntroToggle ? "SITE INFO" : null;
  const activeCursorBadgeText = cursorControlLabel
    ? cursorControlLabel
      : cursorLocationLabel
        ? cursorLocationLabel
      : cursorDividerLabel
        ? cursorDividerLabel
      : cursorSelectorLabel
        ? cursorSelectorLabel
      : cursorOutboundLinkLabel
        ? cursorOutboundLinkLabel
      : cursorTrailModeLabel
        ? cursorTrailModeLabel
        : cursorIntroLabel
          ? cursorIntroLabel
        : cursorProfileImageLabel
        ? cursorProfileImageLabel
        : cursorBadgeMode === "read-more"
          ? "READ MORE"
          : cursorBadgeMode === "close-entry"
            ? "CLOSE ENTRY"
            : cursorBadgeMode === "show-all-time"
              ? "SHOW ALL-TIME"
              : cursorBadgeMode === "show-today"
                ? "SHOW TODAY"
                : cursorBadgeMode === "show-visitor-time"
                  ? "SHOW VISITOR TIME"
                  : cursorBadgeMode === "show-last-visitor-location"
                    ? "SHOW LAST VISITOR LOCATION"
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
    if (sectionPriority === "context") {
      return group === "context" ? 0 : 1;
    }
    if (sectionPriority === "work" || sectionPriority === "entries") {
      return group === "context" ? 2 : 1;
    }
    return group === "context" ? 0 : 1;
  };
  const orderedMixedWorkEntries = (() => {
    if (sectionPriority === "context") {
      return [
        ...mixedWorkEntriesOrder.filter((item) => item.startsWith("context:")),
        ...mixedWorkEntriesOrder.filter((item) => item.startsWith("work:")),
        ...mixedWorkEntriesOrder.filter((item) => item.startsWith("entry:")),
      ];
    }
    if (sectionPriority === "work") {
      return [
        ...mixedWorkEntriesOrder.filter((item) => item.startsWith("work:")),
        ...mixedWorkEntriesOrder.filter((item) => item.startsWith("entry:")),
        ...mixedWorkEntriesOrder.filter((item) => item.startsWith("context:")),
      ];
    }
    if (sectionPriority === "entries") {
      return [
        ...mixedWorkEntriesOrder.filter((item) => item.startsWith("entry:")),
        ...mixedWorkEntriesOrder.filter((item) => item.startsWith("work:")),
        ...mixedWorkEntriesOrder.filter((item) => item.startsWith("context:")),
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
      return item.startsWith("entry:");
    }
    if (activePanelTab === "context") {
      return item.startsWith("context:");
    }
    return false;
  });
  const shouldShowFixedBottomWork =
    !showOnlySelected || activePanelTab === null || activePanelTab === "work";
  const visibleOrderedContentItems = useMemo(
    () =>
      shouldShowFixedBottomWork
        ? [...visibleMixedWorkEntries, `work:${fixedBottomWorkProjectId}`]
        : visibleMixedWorkEntries,
    [shouldShowFixedBottomWork, visibleMixedWorkEntries],
  );
  const orderedDividerStrokeKeys = useMemo(() => {
    const keys: string[] = ["context:identity", "context:external"];

    visibleOrderedContentItems.forEach((item) => {
      if (item.startsWith("entry:") || item.startsWith("work:")) {
        keys.push(item);
        return;
      }
      if (item === "context:education") {
        keys.push("context:education", "context:experience");
        return;
      }
      if (item === "context:current") {
        keys.push("context:ideas", "context:books");
      }
    });

    keys.push("context:profile");
    return keys;
  }, [visibleOrderedContentItems]);
  useEffect(() => {
    orderedDividerStrokeKeysRef.current = orderedDividerStrokeKeys;
  }, [orderedDividerStrokeKeys]);

  const activeStrokeCycleKeys = useMemo(() => {
    if (!orderedDividerStrokeKeys.length || strokeCycleStep < 0) {
      return [];
    }
    return [orderedDividerStrokeKeys[strokeCycleStep % orderedDividerStrokeKeys.length]];
  }, [orderedDividerStrokeKeys, strokeCycleStep]);

  const workProjectById = Object.fromEntries(
    workProjects.map((project) => [project.id, project]),
  );
  const entryById = Object.fromEntries(entriesData.map((entry) => [entry.id, entry]));
  const activeVisitorCountTarget =
    visitorCountMode === "today" ? visitorsToday : visitorsAllTime;
  const visitorModeLabelTarget =
    visitorCountMode === "today"
      ? activeVisitorCountTarget === 1
        ? "VISITOR TODAY"
        : "VISITORS TODAY"
      : activeVisitorCountTarget === 1
        ? "VISITOR ALL-TIME"
        : "VISITORS ALL-TIME";
  const lastVisitorRelativeLabel = useMemo(
    () => formatRelativeVisitorAge(lastVisitorSeenAt, relativeNowMs),
    [lastVisitorSeenAt, relativeNowMs],
  );
  const lastVisitorHeadingTarget =
    lastVisitorMode === "from" ? "LAST VISITOR FROM" : "LAST VISIT WAS";
  const lastVisitorValueTarget =
    lastVisitorMode === "from" ? lastVisitorLabel : lastVisitorRelativeLabel;
  const startScramble = (
    target: string,
    setValue: (value: string) => void,
    options?: { stepMs?: number; steps?: number },
  ) => {
    const steps = options?.steps ?? 11;
    const stepMs = options?.stepMs ?? 30;
    let frame = 0;
    const intervalId = window.setInterval(() => {
      frame += 1;
      const revealed = Math.floor((frame / steps) * target.length);
      const scrambled = [...target]
        .map((character, index) => {
          if (character === " ") {
            return " ";
          }
          if (character === "," || character === "." || character === "-") {
            return character;
          }
          if (index < revealed) {
            return character;
          }
          return scrambleAlphabet[Math.floor(Math.random() * scrambleAlphabet.length)];
        })
        .join("");
      setValue(scrambled);
      if (frame >= steps) {
        window.clearInterval(intervalId);
        setValue(target);
      }
    }, stepMs);
    return intervalId;
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const targetCode = activeLocation.code;
    const targetCity = activeLocation.city;
    const targetClock = new Intl.DateTimeFormat("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: activeLocation.timeZone,
    }).format(new Date());

    if (!hasInitializedLocationScrambleRef.current) {
      hasInitializedLocationScrambleRef.current = true;
      const initialFrame = window.requestAnimationFrame(() => {
        setDisplayedLocationCode(targetCode);
        setDisplayedLocationCity(targetCity);
        setScrambledClock(targetClock);
      });
      return () => {
        window.cancelAnimationFrame(initialFrame);
      };
    }

    const startFrame = window.requestAnimationFrame(() => {
      setIsLocationScrambling(true);
    });
    const codeInterval = startScramble(targetCode, setDisplayedLocationCode, {
      stepMs: 24,
      steps: 10,
    });
    const cityInterval = startScramble(targetCity, setDisplayedLocationCity, {
      stepMs: 24,
      steps: 11,
    });
    const timeInterval = startScramble(targetClock, setScrambledClock, {
      stepMs: 22,
      steps: 9,
    });
    const endTimeout = window.setTimeout(() => {
      setIsLocationScrambling(false);
    }, 320);

    return () => {
      window.cancelAnimationFrame(startFrame);
      window.clearInterval(codeInterval);
      window.clearInterval(cityInterval);
      window.clearInterval(timeInterval);
      window.clearTimeout(endTimeout);
    };
  }, [activeLocation.code, activeLocation.city, activeLocation.timeZone]);

  const footerDateTargetLabel =
    visitorCountMode === "today" ? footerDateLabel : ALL_TIME_SINCE_LABEL;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!hasInitializedFooterDateScrambleRef.current) {
      hasInitializedFooterDateScrambleRef.current = true;
      const initialFrame = window.requestAnimationFrame(() => {
        setDisplayedFooterDateLabel(footerDateTargetLabel);
      });
      return () => {
        window.cancelAnimationFrame(initialFrame);
      };
    }
    const intervalId = startScramble(footerDateTargetLabel, setDisplayedFooterDateLabel, {
      stepMs: 30,
      steps: 12,
    });
    return () => {
      window.clearInterval(intervalId);
    };
  }, [footerDateTargetLabel]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!hasInitializedVisitorModeScrambleRef.current) {
      hasInitializedVisitorModeScrambleRef.current = true;
      const initialFrame = window.requestAnimationFrame(() => {
        setDisplayedVisitorModeLabel(visitorModeLabelTarget);
      });
      return () => {
        window.cancelAnimationFrame(initialFrame);
      };
    }
    const intervalId = startScramble(visitorModeLabelTarget, setDisplayedVisitorModeLabel, {
      stepMs: 26,
      steps: 11,
    });
    return () => {
      window.clearInterval(intervalId);
    };
  }, [visitorModeLabelTarget]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!hasInitializedLastVisitorScrambleRef.current) {
      hasInitializedLastVisitorScrambleRef.current = true;
      previousLastVisitorModeRef.current = lastVisitorMode;
      const initialFrame = window.requestAnimationFrame(() => {
        setDisplayedLastVisitorHeading(lastVisitorHeadingTarget);
        setDisplayedLastVisitorValue(lastVisitorValueTarget);
      });
      return () => {
        window.cancelAnimationFrame(initialFrame);
      };
    }

    const modeChanged = previousLastVisitorModeRef.current !== lastVisitorMode;
    previousLastVisitorModeRef.current = lastVisitorMode;

    if (!modeChanged) {
      const frame = window.requestAnimationFrame(() => {
        setDisplayedLastVisitorHeading(lastVisitorHeadingTarget);
        setDisplayedLastVisitorValue(lastVisitorValueTarget);
      });
      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    const headingInterval = startScramble(
      lastVisitorHeadingTarget,
      setDisplayedLastVisitorHeading,
      { stepMs: 24, steps: 11 },
    );
    const valueInterval = startScramble(lastVisitorValueTarget, setDisplayedLastVisitorValue, {
      stepMs: 24,
      steps: 11,
    });
    return () => {
      window.clearInterval(headingInterval);
      window.clearInterval(valueInterval);
    };
  }, [lastVisitorHeadingTarget, lastVisitorMode, lastVisitorValueTarget]);

  return (
    <main className="relative flex min-h-screen flex-col bg-background pb-6 pt-4">
      <div className="-mt-4 mb-4 w-full overflow-hidden bg-black/5 py-1 text-[10px] text-black/40">
        <div className="top-news-marquee-track">
          {[0, 1].map((copyIndex) => (
            <div
              key={copyIndex}
              className="top-news-marquee-list"
              aria-hidden={copyIndex === 1}
            >
              {shuffledTopMarqueeItems.map((item) => (
                <span
                  key={`${copyIndex}-${item}`}
                  className="whitespace-nowrap tracking-[0.11em]"
                >
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      {cursorControlLabel ||
      cursorLocationLabel ||
      cursorDividerLabel ||
      cursorSelectorLabel ||
      cursorOutboundLinkLabel ||
      cursorTrailModeLabel ||
      cursorIntroLabel ||
      cursorProfileImageLabel ||
      cursorBadgeMode ? (
        <div
          className="pointer-events-none fixed z-[120] hidden md:block"
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
          ) : cursorDividerLabel ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              {cursorDividerLabel}
            </span>
          ) : cursorSelectorLabel ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              {cursorSelectorLabel}
            </span>
          ) : cursorOutboundLinkLabel ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              {cursorOutboundLinkLabel}
            </span>
          ) : cursorTrailModeLabel ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              {cursorTrailModeLabel}
            </span>
          ) : cursorIntroLabel ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              {cursorIntroLabel}
            </span>
          ) : cursorProfileImageLabel ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              {cursorProfileImageLabel}
            </span>
          ) : cursorBadgeMode === "read-more" ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              READ MORE
            </span>
          ) : cursorBadgeMode === "close-entry" ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              CLOSE ENTRY
            </span>
          ) : cursorBadgeMode === "show-all-time" ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              SHOW ALL-TIME
            </span>
          ) : cursorBadgeMode === "show-today" ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              SHOW TODAY
            </span>
          ) : cursorBadgeMode === "show-visitor-time" ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              SHOW VISITOR TIME
            </span>
          ) : cursorBadgeMode === "show-last-visitor-location" ? (
            <span className="inline-flex items-center whitespace-nowrap bg-[#DEDEDE] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black">
              SHOW LAST VISITOR LOCATION
            </span>
          ) : null}
        </div>
      ) : null}

      {centerPopupText ? (
        <div className="pointer-events-none fixed inset-0 z-[125] flex items-center justify-center">
          <span className="inline-flex items-center whitespace-nowrap bg-black px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-white">
            {centerPopupText}
          </span>
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
          }`}
          style={{
            left: profileWindowPosition.x,
            top: profileWindowPosition.y,
            width: profileWindowSize.width,
            height: profileWindowSize.height,
            touchAction: "none",
            willChange: "left, top, width, height",
          }}
          onPointerDown={handleProfileWindowPointerDown}
          onClick={() => setIsProfileWindowSelected(true)}
        >
          <button
            type="button"
            className={`absolute -top-6 left-0 right-0 overflow-hidden text-ellipsis whitespace-nowrap text-left text-[14px] font-medium leading-none cursor-crosshair ${
              isProfileWindowSelected ? "text-[#00A1FF]" : "text-black/40"
            }`}
            onClick={() => setIsProfileWindowSelected(true)}
            aria-label="Select profile image window"
          >
            RAGHAV ON BAKER BEACH, SAN FRANCISCO
          </button>
          <Image
            src="/profile.webp"
            alt="Raghav portrait"
            fill
            sizes="(max-width: 768px) 80vw, 520px"
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
                className="absolute -left-1 -top-1 h-4 w-4 cursor-nwse-resize border-2 border-[#00A1FF] bg-white md:h-3 md:w-3"
                onPointerDown={(event) => handleProfileResizeStart("nw", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute -right-1 -top-1 h-4 w-4 cursor-nesw-resize border-2 border-[#00A1FF] bg-white md:h-3 md:w-3"
                onPointerDown={(event) => handleProfileResizeStart("ne", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute -right-1 -bottom-1 h-4 w-4 cursor-nwse-resize border-2 border-[#00A1FF] bg-white md:h-3 md:w-3"
                onPointerDown={(event) => handleProfileResizeStart("se", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute -bottom-1 -left-1 h-4 w-4 cursor-nesw-resize border-2 border-[#00A1FF] bg-white md:h-3 md:w-3"
                onPointerDown={(event) => handleProfileResizeStart("sw", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute left-3 right-3 -top-1 h-3 cursor-ns-resize md:h-2"
                onPointerDown={(event) => handleProfileResizeStart("n", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute left-3 right-3 -bottom-1 h-3 cursor-ns-resize md:h-2"
                onPointerDown={(event) => handleProfileResizeStart("s", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute -left-1 top-3 bottom-3 w-3 cursor-ew-resize md:w-2"
                onPointerDown={(event) => handleProfileResizeStart("w", event)}
              />
              <div
                data-drag-ignore="true"
                className="absolute -right-1 top-3 bottom-3 w-3 cursor-ew-resize md:w-2"
                onPointerDown={(event) => handleProfileResizeStart("e", event)}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {previewImage ? (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
          <div className="relative h-[75vh] w-[75vw] overflow-hidden">
            <Image
              src={previewImage}
              alt=""
              fill
              sizes="75vw"
              className="h-full w-full object-contain"
              draggable={false}
            />
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none fixed inset-0 z-[110]">
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

      <div className="container-frame relative z-10 flex flex-1 flex-col">
        <section className="grid gap-6 min-[940px]:grid-cols-3 xl:gap-20">
          <div
            className={`w-full max-w-[480px] min-[940px]:order-3 ${reveal(0).className}`}
            style={reveal(0).style}
          >
            <div className="flex items-center justify-between text-[12px] uppercase tracking-[0.02em] text-black/80">
              <button
                type="button"
                className="navbar-click location-switch-click inline-flex flex-1 cursor-crosshair items-center justify-between pr-3 transition-colors hover:text-black/60"
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
                <span className="location-switch-content inline-flex cursor-crosshair items-center gap-2">
                  <span className="inline-block w-[44px] cursor-crosshair text-left">
                    {displayedLocationCode}
                  </span>
                  <span className="inline-block w-[90px] cursor-crosshair text-left">
                    {displayedLocationCity}
                  </span>
                  <span className="inline-block w-[68px] cursor-crosshair text-left font-sans">
                    {isLocationScrambling ? scrambledClock : clock}
                  </span>
                </span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={`navbar-click cursor-button-click inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center border-[0.5px] transition-colors md:h-6 md:w-6 ${
                    isTrailBoosted
                      ? "trail-mode-button-active border-black/80"
                      : "border-black/20 bg-[#F7F7F7]"
                  }`}
                  style={
                    {
                      "--cursor-click-tilt": `${cursorButtonTiltDeg}deg`,
                    } as CSSProperties
                  }
                  onPointerDown={() => {
                    setCursorButtonTiltDeg(Math.random() * 10 - 5);
                  }}
                  onClick={() => {
                    setIsTrailBoosted((prev) => {
                      const next = !prev;
                      showCenterPopup(next ? "RAINBOW CURSOR ON" : "RAINBOW CURSOR OFF");
                      return next;
                    });
                  }}
                  onMouseEnter={(event) => {
                    setHoveredTrailToggle(true);
                    updateCursorBadgePosition(event);
                  }}
                  onMouseMove={updateCursorBadgePosition}
                  onMouseLeave={() => {
                    setHoveredTrailToggle(false);
                  }}
                  aria-label="Toggle boosted cursor trail mode"
                >
                  <TrailModeIcon />
                </button>
                <button
                  type="button"
                  className="navbar-click flex h-[26px] w-[26px] items-center justify-center border-[0.5px] border-black/20 bg-[#F7F7F7] text-[16px] leading-none text-black transition-all duration-150 md:h-6 md:w-6"
                  onClick={() => setIsIntroOpen((prev) => !prev)}
                  onMouseEnter={(event) => {
                    setHoveredIntroToggle(true);
                    updateCursorBadgePosition(event);
                  }}
                  onMouseMove={updateCursorBadgePosition}
                  onMouseLeave={() => {
                    setHoveredIntroToggle(false);
                  }}
                  aria-label={isIntroOpen ? "Close intro note" : "Open intro note"}
                >
                  <span
                    aria-hidden="true"
                    className={`relative block h-[12px] w-[12px] transition-transform duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isIntroOpen ? "rotate-45" : "rotate-0"
                    }`}
                  >
                    <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-black/80" />
                    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-black/80" />
                  </span>
                </button>
              </div>
            </div>

            <div
              className={`grid transition-[grid-template-rows,margin-top] duration-520 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isIntroOpen ? "mt-2 grid-rows-[1fr] delay-0" : "mt-0 grid-rows-[0fr] delay-260"
              }`}
            >
              <div
                className={`min-h-0 transition-opacity duration-260 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                  isIntroOpen ? "opacity-100 delay-320" : "opacity-0 delay-0"
                }`}
              >
                <p className="text-[12px] leading-[1.5] text-black/80 text-justify">
                  The idea for this version of the website began in March of
                  2026, then was paused due to a lack of creative vision. It
                  was revisited a few weeks later following a shift in
                  perspective, with a focus on building and committing rather
                  than waiting for the &ldquo;perfect moment&rdquo;. The site
                  was developed using tools and technologies that were not fully
                  understood, treating the process as a way of thinking through
                  making.
                </p>

                <p className="mt-2 text-[12px] leading-[1.5] text-black/80 text-justify">
                  Inspired by the works of{" "}
                  <a
                    href="https://adamho.com"
                    className="credit-name-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={(event) => {
                      setHoveredOutboundLink(true);
                      updateCursorBadgePosition(event);
                    }}
                    onMouseMove={updateCursorBadgePosition}
                    onMouseLeave={() => setHoveredOutboundLink(false)}
                  >
                    Adam Ho
                  </a>
                  ,{" "}
                  <a
                    href="https://frankchimero.com"
                    className="credit-name-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={(event) => {
                      setHoveredOutboundLink(true);
                      updateCursorBadgePosition(event);
                    }}
                    onMouseMove={updateCursorBadgePosition}
                    onMouseLeave={() => setHoveredOutboundLink(false)}
                  >
                    Frank Chimero
                  </a>
                  ,{" "}
                  <a
                    href="https://benji.org"
                    className="credit-name-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={(event) => {
                      setHoveredOutboundLink(true);
                      updateCursorBadgePosition(event);
                    }}
                    onMouseMove={updateCursorBadgePosition}
                    onMouseLeave={() => setHoveredOutboundLink(false)}
                  >
                    Benji Taylor
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://ryanyan.ca"
                    className="credit-name-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={(event) => {
                      setHoveredOutboundLink(true);
                      updateCursorBadgePosition(event);
                    }}
                    onMouseMove={updateCursorBadgePosition}
                    onMouseLeave={() => setHoveredOutboundLink(false)}
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
              <div
                className="flex flex-wrap items-center gap-1.5"
                onMouseEnter={() => {
                  setIsSelectorGroupHovered(true);
                  setAutoHoverSelectorTab(null);
                }}
                onMouseMove={() => {
                  if (!isSelectorGroupHovered) {
                    setIsSelectorGroupHovered(true);
                  }
                }}
                onMouseLeave={() => {
                  setIsSelectorGroupHovered(false);
                  setHoveredSelectorTab(null);
                }}
              >
                {panelTabs.map((tab, index) => {
                  const isSelected = activePanelTab === tab.id;
                  const isHoverPreview =
                    hoveredSelectorTab === tab.id || autoHoverSelectorTab === tab.id;
                  const isAutoCyclePreview =
                    hoveredSelectorTab === null && autoHoverSelectorTab === tab.id;
                  const isIdleCycleActive = autoHoverSelectorTab !== null;
                  const hasAnySelected = activePanelTab !== null;
                  const isPressed = pressedSelectorTabId === tab.id;
                  const scaleValue = (isSelected ? 1.01 : 1) * (isPressed ? 0.985 : 1);
                  const sideShift =
                    hasAnySelected && !isSelected ? (index === 0 ? -1 : index === 2 ? 1 : 0) : 0;

                  return (
                    <div
                      key={tab.id}
                      style={{
                        opacity: isLoaded ? 1 : 0,
                        transform: isLoaded
                          ? "translateY(0px) scale(1)"
                          : "translateY(7px) scale(0.96)",
                        transitionProperty: "opacity, transform",
                        transitionDuration: "360ms, 560ms",
                        transitionTimingFunction:
                          "ease-out, cubic-bezier(0.22,1.22,0.36,1)",
                        transitionDelay: isLoaded ? `${40 + index * 85}ms` : "0ms",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                        if (isEntryControlLockActive) {
                          setInvalidSelectorFlash(tab.id);
                          if (invalidSelectorFlashTimeoutRef.current !== null) {
                            window.clearTimeout(invalidSelectorFlashTimeoutRef.current);
                          }
                          invalidSelectorFlashTimeoutRef.current = window.setTimeout(
                            () => setInvalidSelectorFlash(null),
                            420,
                          );
                          return;
                        }
                        showCenterPopup(getSectionHighlightPopupText(tab.id));
                        togglePanelTab(tab.id);
                      }}
                        className={`navbar-click inline-flex h-[26px] items-center justify-center gap-1 border-[0.5px] border-black/50 bg-[#F7F7F7] px-2.5 py-[2px] text-[clamp(11px,0.76vw,12px)] font-medium leading-none transition-[transform,box-shadow,background-color,border-color,color] duration-350 ease-[cubic-bezier(0.22,1.35,0.32,1)] md:h-6 md:px-2 ${
                          isSelectorBouncing ? "selector-jolt" : ""
                        } ${isAutoCyclePreview ? "selector-auto-bob" : ""} ${
                          invalidSelectorFlash === tab.id ? "control-error-wiggle" : ""
                        }`}
                        onPointerDown={() => setPressedSelectorTabId(tab.id)}
                        onPointerUp={() =>
                          setPressedSelectorTabId((prev) => (prev === tab.id ? null : prev))
                        }
                        onPointerCancel={() =>
                          setPressedSelectorTabId((prev) => (prev === tab.id ? null : prev))
                        }
                        style={
                          isSelected
                            ? {
                                backgroundColor: tab.color,
                                borderColor: "#000000",
                                color: "#000000",
                                boxShadow: isHoverPreview
                                  ? isAutoCyclePreview
                                    ? `1px 1px 0 0 ${tab.color}`
                                    : "1px 1px 0 0 #000000"
                                  : "none",
                                transform: `translateX(0px) scale(${scaleValue})`,
                                cursor: isEntryControlLockActive ? "not-allowed" : "crosshair",
                              }
                            : {
                                borderColor: isHoverPreview ? "#000000" : "rgba(0,0,0,0.5)",
                                color: "rgb(0,0,0)",
                                boxShadow: isHoverPreview
                                  ? isAutoCyclePreview
                                    ? `1px 1px 0 0 ${tab.color}`
                                    : "1px 1px 0 0 #000000"
                                  : "none",
                                transform: `translateX(${sideShift}px) scale(${scaleValue})`,
                                cursor: isEntryControlLockActive ? "not-allowed" : "crosshair",
                              }
                        }
                        onMouseEnter={(event) => {
                          setHoveredSelectorTab(tab.id);
                          setAutoHoverSelectorTab(null);
                          updateCursorBadgePosition(event);
                        }}
                        onMouseMove={(event) => {
                          if (!isSelectorGroupHovered) {
                            setIsSelectorGroupHovered(true);
                          }
                          updateCursorBadgePosition(event);
                        }}
                        onMouseLeave={() => {
                          setHoveredSelectorTab((prev) =>
                            prev === tab.id ? null : prev,
                          );
                          setPressedSelectorTabId((prev) =>
                            prev === tab.id ? null : prev,
                          );
                        }}
                      >
                        {isSelected ? (
                          <span
                            aria-hidden="true"
                            className="inline-block h-[5px] w-[5px]"
                            style={{
                              backgroundColor: isIdleCycleActive ? tab.color : "#000000",
                            }}
                          />
                        ) : null}
                        <span>{tab.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={`navbar-click inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center border-[0.5px] transition-colors md:h-6 md:w-6 ${
                    invalidControlFlash === "bring"
                      ? "border-red-600 bg-[#F7F7F7] control-error-wiggle"
                      : isEntryControlLockActive
                      ? "border-black/20 bg-[#F7F7F7]"
                      : activePanelTab
                      ? isBringToTopActive
                        ? "border-black bg-black"
                        : "border-black/20 bg-[#F7F7F7]"
                      : "border-black/20 bg-[#F7F7F7]"
                  }`}
                  onClick={() => {
                    if (isEntryControlLockActive) {
                      triggerDisabledControlFeedback("bring");
                      showCenterPopup("SELECT A SECTION");
                      return;
                    }
                    if (!activePanelTab) {
                      triggerDisabledControlFeedback("bring");
                      showCenterPopup("SELECT A SECTION");
                      return;
                    }
                    handleBringSelectedToTop();
                    showCenterPopup(`DISPLAYING ${activePanelTab.toUpperCase()} AT TOP`);
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
                  aria-disabled={!activePanelTab || isEntryControlLockActive}
                  style={
                    invalidControlFlash === "bring"
                      ? { cursor: "not-allowed" }
                      : isEntryControlLockActive
                      ? {
                          borderColor: "rgba(0, 0, 0, 0.2)",
                          backgroundColor: "#F7F7F7",
                          color: "rgba(0, 0, 0, 0.2)",
                          cursor: "not-allowed",
                        }
                      : activePanelTab
                      ? undefined
                      : {
                          borderColor: "rgba(0, 0, 0, 0.2)",
                          backgroundColor: "#F7F7F7",
                          color: "rgba(0, 0, 0, 0.2)",
                          cursor: "not-allowed",
                        }
                  }
                >
                  <BringToTopIcon
                    active={activePanelTab ? isBringToTopActive : false}
                    disabled={!activePanelTab || isEntryControlLockActive}
                    inactive={activePanelTab ? !isBringToTopActive : false}
                    error={invalidControlFlash === "bring"}
                  />
                </button>
                <button
                  type="button"
                  className={`navbar-click inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center border-[0.5px] transition-colors md:h-6 md:w-6 ${
                    invalidControlFlash === "show"
                      ? "border-red-600 bg-[#F7F7F7] control-error-wiggle"
                      : isEntryControlLockActive
                      ? "border-black/20 bg-[#F7F7F7]"
                      : activePanelTab
                      ? showOnlySelected
                        ? "border-black bg-black"
                        : "border-black/20 bg-[#F7F7F7]"
                      : "border-black/20 bg-[#F7F7F7]"
                  }`}
                  onClick={() => {
                    if (isEntryControlLockActive) {
                      triggerDisabledControlFeedback("show");
                      showCenterPopup("SELECT A SECTION");
                      return;
                    }
                    if (!activePanelTab) {
                      triggerDisabledControlFeedback("show");
                      showCenterPopup("SELECT A SECTION");
                      return;
                    }
                    showCenterPopup(!showOnlySelected ? "HIDING ALL CONTENT" : "SHOWING ALL CONTENT");
                    setShowOnlySelected((prev) => {
                      const next = !prev;
                      if (!next) {
                        setIsTruncateMode(false);
                        setExpandedInTruncate({
                          contextIdentity: false,
                          contextEducation: false,
                          contextExperience: false,
                          contextIdeas: false,
                          contextBooks: false,
                          contextExternal: false,
                          contextProfile: false,
                          ...Object.fromEntries(
                            workProjects.map((project) => [`work:${project.id}`, false]),
                          ),
                          ...Object.fromEntries(
                            entriesData.map((entry) => [`entry:${entry.id}`, false]),
                          ),
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
                  aria-disabled={!activePanelTab || isEntryControlLockActive}
                  style={
                    invalidControlFlash === "show"
                      ? { cursor: "not-allowed" }
                      : isEntryControlLockActive
                      ? {
                          borderColor: "rgba(0, 0, 0, 0.2)",
                          backgroundColor: "#F7F7F7",
                          color: "rgba(0, 0, 0, 0.2)",
                          cursor: "not-allowed",
                        }
                      : activePanelTab
                      ? undefined
                      : {
                          borderColor: "rgba(0, 0, 0, 0.2)",
                          backgroundColor: "#F7F7F7",
                          color: "rgba(0, 0, 0, 0.2)",
                          cursor: "not-allowed",
                        }
                  }
                >
                  <ShowHideIcon
                    active={activePanelTab ? showOnlySelected : false}
                    disabled={!activePanelTab || isEntryControlLockActive}
                    inactive={activePanelTab ? !showOnlySelected : false}
                    error={invalidControlFlash === "show"}
                  />
                </button>
                <button
                  type="button"
                  className={`navbar-click inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center border-[0.5px] transition-colors md:h-6 md:w-6 ${
                    invalidControlFlash === "truncate"
                      ? "border-red-600 bg-[#F7F7F7] control-error-wiggle"
                      : isEntryControlLockActive
                      ? "border-black/20 bg-[#F7F7F7]"
                      : "border-black/20 bg-[#F7F7F7]"
                  }`}
                  onClick={() => {
                    if (isEntryControlLockActive) {
                      triggerDisabledControlFeedback("truncate");
                      showCenterPopup("SELECT A SECTION");
                      return;
                    }
                    if (!canUseTruncateControl) {
                      triggerDisabledControlFeedback("truncate");
                      showCenterPopup("SELECT A SECTION");
                      return;
                    }
                    setIsTruncateMode((prev) => {
                      const next = !prev;
                      showCenterPopup(
                        next
                          ? `TRUNCATING ${activePanelTab ? activePanelTab.toUpperCase() : "CONTENT"}`
                          : "SHOWING ALL CONTENT",
                      );
                      if (next) {
                        setExpandedInTruncate({
                          contextIdentity: false,
                          contextEducation: false,
                          contextExperience: false,
                          contextIdeas: false,
                          contextBooks: false,
                          contextExternal: false,
                          contextProfile: false,
                          ...Object.fromEntries(
                            workProjects.map((project) => [`work:${project.id}`, false]),
                          ),
                          ...Object.fromEntries(
                            entriesData.map((entry) => [`entry:${entry.id}`, false]),
                          ),
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
                  aria-disabled={!canUseTruncateControl || isEntryControlLockActive}
                  style={
                    invalidControlFlash === "truncate"
                      ? { cursor: "not-allowed" }
                      : isEntryControlLockActive
                        ? {
                            borderColor: "rgba(0, 0, 0, 0.2)",
                            backgroundColor: "#F7F7F7",
                            color: "rgba(0, 0, 0, 0.2)",
                            cursor: "not-allowed",
                          }
                      : canUseTruncateControl
                        ? undefined
                        : {
                            borderColor: "rgba(0, 0, 0, 0.2)",
                            backgroundColor: "#F7F7F7",
                            color: "rgba(0, 0, 0, 0.2)",
                            cursor: "not-allowed",
                          }
                  }
                >
                  <TruncateIcon
                    disabled={!canUseTruncateControl || isEntryControlLockActive}
                    inactive={canUseTruncateControl && !isEntryControlLockActive}
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
                <p className="text-[12px] leading-[1.5] text-black/80 text-justify">
                  {displayPanelTab ? panelCopyByTab[displayPanelTab] : ""}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`w-full max-w-[480px] min-[940px]:order-1 ${reveal(180).className}`}
            style={reveal(180).style}
          >
            <div className="h-[26px] md:h-6" aria-hidden="true" />
          </div>
        </section>

        <div
          className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
            isIntroOpen ? "h-12 md:h-16 xl:h-12" : "h-5 md:h-7 xl:h-5"
          }`}
        />

        <div ref={homeSectionsStartRef} />
        <div className="flex flex-col gap-6 transition-opacity duration-560 ease-[cubic-bezier(0.22,1,0.36,1)] opacity-100">
        {!(showOnlySelected && activePanelTab !== "context") ? (
        <div className="flex flex-col" style={{ order: getSectionOrder("context") }}>
          {contextSectionOrder.map((sectionKey, index) =>
            sectionKey === "identity" ? (
              <section
                key="context-identity"
                className={`${index === 0 ? "" : "mt-6"} ${reveal(160).className}`}
                style={reveal(160).style}
              >
                <div ref={homeIdentityDividerRef}>
                  <SectionHeader
                    activeTab={activePanelTab}
                    strokeCycleActive={activeStrokeCycleKeys.includes("context:identity")}
                    secondary="IDENTITY"
                    onMouseEnter={(event) => {
                      setHoveredDividerTab("context");
                      updateCursorBadgePosition(event);
                    }}
                    onMouseMove={updateCursorBadgePosition}
                    onMouseLeave={() => setHoveredDividerTab(null)}
                    onClick={() => {
                      showCenterPopup(getSectionHighlightPopupText("context"));
                      toggleSectionContent("contextIdentity", "context");
                    }}
                  />
                </div>

                {!truncateModeActive || expandedInTruncate.contextIdentity ? (
                  <div className="mt-2 columns-1 gap-6 md:columns-2 xl:gap-6">
                    <p
                      className="max-w-[52rem] text-[16px] leading-[1.5] text-black/80 text-justify whitespace-pre-line"
                      style={{ fontFeatureSettings: "'salt' 1" }}
                    >
                      <button
                        type="button"
                        onClick={openProfileWindow}
                        className={`raghav-link m-0 inline-block appearance-none border-0 bg-transparent p-0 cursor-crosshair ${
                          isProfileWindowOpen ? "raghav-link-active" : ""
                        }`}
                      >
                        <span
                          className={`whitespace-nowrap ${
                            isProfileWindowOpen ? "text-[#00A1FF]" : ""
                          }`}
                        >
                          Raghav
                        </span>
                        <span
                          aria-hidden="true"
                          className={`inline-flex overflow-hidden align-middle leading-none transition-[max-width,opacity,margin-left,transform] duration-240 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            isProfileWindowOpen
                              ? "ml-1 max-w-[24px] translate-x-0 opacity-100"
                              : "ml-0 max-w-0 -translate-x-1 opacity-0"
                          }`}
                        >
                          <span
                            className={`text-[16px] leading-none ${
                              isProfileWindowOpen ? "text-[#00A1FF]" : "text-black/80"
                            }`}
                          >
                            ×
                          </span>
                        </span>
                      </button>
                      {identityBodyOne}
                      {" "}
                      {identityBodyTwo}
                    </p>
                  </div>
                ) : null}
              </section>
            ) : (
              <section
                key="context-external"
                className={`${index === 0 ? "" : "mt-6"} ${reveal(240).className}`}
                style={reveal(240).style}
              >
                <SectionHeader
                  activeTab={activePanelTab}
                  strokeCycleActive={activeStrokeCycleKeys.includes("context:external")}
                  secondary="EXTERNAL"
                  onMouseEnter={(event) => {
                    setHoveredDividerTab("context");
                    updateCursorBadgePosition(event);
                  }}
                  onMouseMove={updateCursorBadgePosition}
                  onMouseLeave={() => setHoveredDividerTab(null)}
                  onClick={() => {
                    showCenterPopup(getSectionHighlightPopupText("context"));
                    toggleSectionContent("contextExternal", "context");
                  }}
                />

                {!truncateModeActive || expandedInTruncate.contextExternal ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {externalLinks.map((link) => (
                      (() => {
                        const isLinkFlash = invalidExternalLinkFlash === link.label;
                        return (
                      <a
                        key={link.label}
                        href={link.href}
                        className={`group inline-flex h-[26px] items-center gap-2 border-[0.5px] px-2 py-[3px] text-[16px] font-medium leading-none whitespace-nowrap ${
                          link.disabled
                            ? "border-black/20 text-black/20"
                            : "border-black/50 text-black transition-[color,border-color,box-shadow,padding-right] duration-320 ease-[cubic-bezier(0.22,1,0.36,1)] hover:pr-4 hover:cursor-alias"
                        } ${isLinkFlash ? "control-error-wiggle" : ""}`}
                        style={
                          link.disabled
                            ? isLinkFlash
                              ? {
                                  color: "#DC2626",
                                  borderColor: "#DC2626",
                                  boxShadow: "none",
                                  cursor: "wait",
                                  fontWeight: 400,
                                }
                              : {
                                  color: "rgba(0, 0, 0, 0.2)",
                                  borderColor: "rgba(0, 0, 0, 0.2)",
                                  boxShadow: "none",
                                  cursor: "wait",
                                  fontWeight: 400,
                                }
                            : { boxShadow: "none" }
                        }
                        onMouseEnter={(event) => {
                          if (link.disabled) {
                            setHoveredOutboundLink(false);
                            return;
                          }
                          setHoveredOutboundLink(true);
                          updateCursorBadgePosition(event);
                          event.currentTarget.style.cursor = "alias";
                          event.currentTarget.style.color = "#003CFF";
                          event.currentTarget.style.borderColor = "#003CFF";
                          event.currentTarget.style.boxShadow = "2px 2px 0 0 #003CFF";
                        }}
                        onMouseMove={(event) => {
                          if (link.disabled) {
                            return;
                          }
                          updateCursorBadgePosition(event);
                        }}
                        onMouseLeave={(event) => {
                          setHoveredOutboundLink(false);
                          if (link.disabled) {
                            return;
                          }
                          event.currentTarget.style.cursor = "";
                          event.currentTarget.style.color = "#000000";
                          event.currentTarget.style.borderColor = "rgba(0,0,0,0.5)";
                          event.currentTarget.style.boxShadow = "none";
                        }}
                        aria-disabled={link.disabled}
                        target={link.disabled ? undefined : "_blank"}
                        rel={link.disabled ? undefined : "noopener noreferrer"}
                        onClick={(event) => {
                          if (link.disabled) {
                            setHoveredOutboundLink(false);
                            event.preventDefault();
                            if (link.label === "UNORDINARY") {
                              showCenterPopup("BUILDING...");
                            }
                            setInvalidExternalLinkFlash(link.label);
                            if (invalidExternalLinkFlashTimeoutRef.current !== null) {
                              window.clearTimeout(invalidExternalLinkFlashTimeoutRef.current);
                            }
                            invalidExternalLinkFlashTimeoutRef.current = window.setTimeout(
                              () => setInvalidExternalLinkFlash(null),
                              420,
                            );
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
                        );
                      })()
                    ))}
                  </div>
                ) : null}
              </section>
            ),
          )}
        </div>
        ) : null}

          <div className="flex flex-col" style={{ order: 1 }}>
            {visibleOrderedContentItems.map((item, index) => {
              if (item.startsWith("entry:")) {
                const entryId = item.replace("entry:", "");
                const entry = entryById[entryId];
                if (!entry) {
                  return null;
                }
                const entryKey = `entry:${entry.id}`;
                const isEntryExpanded = expandedEntryId === entry.id;
                const additionalParagraphs =
                  entry.paragraphs[0]?.trim() === entry.excerpt.trim()
                    ? entry.paragraphs.slice(1)
                    : entry.paragraphs;
                const entriesReveal = reveal(340);
                return (
                  <section
                    key={entry.id}
                    className={`${index === 0 ? "" : "mt-6"} ${entriesReveal.className}`}
                    style={{
                      ...entriesReveal.style,
                      cursor:
                        !truncateModeActive &&
                        expandedEntryId !== entry.id &&
                        cursorBadgeMode === "read-more"
                          ? "nesw-resize"
                          : !truncateModeActive &&
                              expandedEntryId === entry.id &&
                              cursorBadgeMode === "close-entry"
                            ? "sw-resize"
                          : "default",
                    }}
                    onMouseEnter={(event) => {
                      const headerNode = entryHeaderRefs.current[entry.id];
                      const inHeaderZone = headerNode
                        ? event.clientY <= headerNode.getBoundingClientRect().bottom
                        : false;
                      if (inHeaderZone) {
                        if (
                          cursorBadgeMode === "read-more" ||
                          cursorBadgeMode === "close-entry"
                        ) {
                          setCursorBadgeMode(null);
                        }
                        return;
                      }
                      if (!truncateModeActive && !isEntriesHeaderHovered) {
                        if (expandedEntryId === entry.id) {
                          setCursorBadgeMode("close-entry");
                          updateCursorBadgePosition(event);
                          return;
                        }
                        if (expandedEntryId !== entry.id) {
                          setCursorBadgeMode("read-more");
                          updateCursorBadgePosition(event);
                        }
                      }
                    }}
                    onMouseMove={(event) => {
                      const headerNode = entryHeaderRefs.current[entry.id];
                      const inHeaderZone = headerNode
                        ? event.clientY <= headerNode.getBoundingClientRect().bottom
                        : false;
                      if (inHeaderZone) {
                        if (
                          cursorBadgeMode === "read-more" ||
                          cursorBadgeMode === "close-entry"
                        ) {
                          setCursorBadgeMode(null);
                        }
                        return;
                      }
                      if (!truncateModeActive && !isEntriesHeaderHovered) {
                        if (expandedEntryId === entry.id) {
                          setCursorBadgeMode("close-entry");
                          updateCursorBadgePosition(event);
                          return;
                        }
                        if (expandedEntryId !== entry.id) {
                          setCursorBadgeMode("read-more");
                          updateCursorBadgePosition(event);
                        }
                      }
                    }}
                    onMouseLeave={() => {
                      if (
                        cursorBadgeMode === "read-more" ||
                        cursorBadgeMode === "close-entry"
                      ) {
                        setCursorBadgeMode(null);
                      }
                    }}
                    onClick={() => {
                      if (truncateModeActive) {
                        return;
                      }
                      if (expandedEntryId === entry.id) {
                        closeEntry();
                        return;
                      }
                      openEntry(entry.id);
                    }}
                  >
                    <div
                      ref={(node) => {
                        entryHeaderRefs.current[entry.id] = node;
                      }}
                    >
                      <HeaderWithDivider
                        className="mb-2"
                        dividerClassName={
                          activePanelTab === "entries" ? "bg-[#FFE500]" : ""
                        }
                      >
                        <div className="flex items-center justify-between text-[12px] font-medium tracking-[0.05em] text-muted">
                          <button
                            type="button"
                            className="inline-flex cursor-crosshair items-center gap-2 text-left"
                            onMouseEnter={(event) => {
                              setIsEntriesHeaderHovered(true);
                              if (
                                cursorBadgeMode === "read-more" ||
                                cursorBadgeMode === "close-entry"
                              ) {
                                setCursorBadgeMode(null);
                              }
                              setHoveredDividerTab("entries");
                              updateCursorBadgePosition(event);
                            }}
                            onMouseMove={updateCursorBadgePosition}
                            onMouseLeave={() => {
                              setHoveredDividerTab(null);
                              setIsEntriesHeaderHovered(false);
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              showCenterPopup(getSectionHighlightPopupText("entries"));
                              toggleSectionContent(entryKey, "entries");
                            }}
                            aria-label="Show entries section"
                          >
                            <span
                              className={`cursor-crosshair px-1.5 py-0.5 ${
                                activeStrokeCycleKeys.includes(`entry:${entry.id}`)
                                  ? "section-chip-stroke-cycle"
                                  : ""
                              }`}
                              style={
                                {
                                  ...(activePanelTab === "entries"
                                    ? { backgroundColor: "#FFE500", color: "#000000" }
                                    : { backgroundColor: "rgba(0,0,0,0.05)" }),
                                  ...(activeStrokeCycleKeys.includes(`entry:${entry.id}`)
                                    ? ({ "--section-shadow-color": "#FFE500" } as CSSProperties)
                                    : null),
                                }
                              }
                            >
                              ENTRIES
                            </span>
                            <span
                              className={`cursor-crosshair font-medium ${
                                activePanelTab === "entries" ? "text-black/80" : ""
                              }`}
                            >
                              {entry.title}
                            </span>
                          </button>
                          <span className="font-medium">{entry.year}</span>
                        </div>
                      </HeaderWithDivider>
                    </div>

                    {!truncateModeActive || expandedInTruncate[entryKey] ? (
                      <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                          <p
                            className="min-h-0 overflow-hidden text-[16px] leading-[1.5] text-black/80 text-justify whitespace-pre-line"
                            style={{
                              fontFeatureSettings: "'salt' 1",
                              ...(isEntryExpanded
                                ? {}
                                : {
                                    display: "-webkit-box",
                                    WebkitLineClamp: 5,
                                    WebkitBoxOrient: "vertical",
                                  }),
                            }}
                          >
                            {entry.excerpt}
                          </p>

                          <div
                            className={`overflow-hidden transition-[max-height,margin-top] duration-520 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                              isEntryExpanded && additionalParagraphs.length > 0
                                ? "mt-2"
                                : "mt-0"
                            }`}
                            style={{
                              maxHeight:
                                isEntryExpanded && additionalParagraphs.length > 0
                                  ? "1400px"
                                  : "0px",
                            }}
                          >
                            <div
                              className={`text-[16px] leading-[1.5] text-black/80 text-justify whitespace-pre-line transition-[opacity,transform] duration-360 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                isEntryExpanded && additionalParagraphs.length > 0
                                  ? "translate-y-0 opacity-100 delay-420"
                                  : "translate-y-1 opacity-0 delay-0"
                              }`}
                            >
                              {additionalParagraphs.map((paragraph, paragraphIndex) => (
                                <p
                                  key={`${entry.id}-${paragraphIndex}`}
                                  className="mb-4"
                                  style={{ fontFeatureSettings: "'salt' 1" }}
                                >
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start justify-start">
                          <button
                            type="button"
                            className="border-[0.5px] border-black/20 bg-[#F7F7F7] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black/80"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (isEntryExpanded) {
                                closeEntry();
                              } else {
                                openEntry(entry.id);
                              }
                            }}
                          >
                            {isEntryExpanded ? "CLOSE ENTRY" : "READ MORE"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </section>
                );
              }

              if (item === "context:education") {
                const contextEducationReveal = reveal(220);
                return (
                  <section
                    key="context-education"
                    className={`${index === 0 ? "" : "mt-6"} ${contextEducationReveal.className}`}
                    style={contextEducationReveal.style}
                  >
                    <div className="grid gap-6 md:grid-cols-2 xl:gap-6">
                      <div>
                        <SectionHeader
                          activeTab={activePanelTab}
                          strokeCycleActive={activeStrokeCycleKeys.includes("context:education")}
                          secondary="EDUCATION"
                          onMouseEnter={(event) => {
                            setHoveredDividerTab("context");
                            updateCursorBadgePosition(event);
                          }}
                          onMouseMove={updateCursorBadgePosition}
                          onMouseLeave={() => setHoveredDividerTab(null)}
                          onClick={() => {
                            showCenterPopup(getSectionHighlightPopupText("context"));
                            toggleSectionContent("contextEducation", "context");
                          }}
                        />

                        {!truncateModeActive || expandedInTruncate.contextEducation ? (
                          <p
                            className="mt-2 max-w-[52rem] text-[16px] leading-[1.5] text-black/80 text-justify whitespace-pre-line"
                            style={{ fontFeatureSettings: "'salt' 1" }}
                          >
                            {educationBody}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <SectionHeader
                          activeTab={activePanelTab}
                          strokeCycleActive={activeStrokeCycleKeys.includes("context:experience")}
                          secondary="EXPERIENCE"
                          onMouseEnter={(event) => {
                            setHoveredDividerTab("context");
                            updateCursorBadgePosition(event);
                          }}
                          onMouseMove={updateCursorBadgePosition}
                          onMouseLeave={() => setHoveredDividerTab(null)}
                          onClick={() => {
                            showCenterPopup(getSectionHighlightPopupText("context"));
                            toggleSectionContent("contextExperience", "context");
                          }}
                        />

                        {!truncateModeActive || expandedInTruncate.contextExperience ? (
                          <p
                            className="mt-2 max-w-[52rem] text-[16px] leading-[1.5] text-black/80 text-justify whitespace-pre-line"
                            style={{ fontFeatureSettings: "'salt' 1" }}
                          >
                            {experienceBody}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </section>
                );
              }

              if (item === "context:current") {
                const contextCurrentReveal = reveal(230);
                return (
                  <section
                    key="context-current"
                    className={`${index === 0 ? "" : "mt-6"} ${contextCurrentReveal.className}`}
                    style={contextCurrentReveal.style}
                  >
                    <div className="grid gap-6 md:grid-cols-2 xl:gap-6">
                      <div>
                        <SectionHeader
                          activeTab={activePanelTab}
                          strokeCycleActive={activeStrokeCycleKeys.includes("context:ideas")}
                          secondary="IDEAS"
                          onMouseEnter={(event) => {
                            setHoveredDividerTab("context");
                            updateCursorBadgePosition(event);
                          }}
                          onMouseMove={updateCursorBadgePosition}
                          onMouseLeave={() => setHoveredDividerTab(null)}
                          onClick={() => {
                            showCenterPopup(getSectionHighlightPopupText("context"));
                            toggleSectionContent("contextIdeas", "context");
                          }}
                        />

                        {!truncateModeActive || expandedInTruncate.contextIdeas ? (
                          <p
                            className="mt-2 max-w-[52rem] text-[16px] leading-[1.5] text-black/80 text-justify whitespace-pre-line"
                            style={{ fontFeatureSettings: "'salt' 1" }}
                          >
                            {ideasBody}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <SectionHeader
                          activeTab={activePanelTab}
                          strokeCycleActive={activeStrokeCycleKeys.includes("context:books")}
                          secondary="BOOKS"
                          onMouseEnter={(event) => {
                            setHoveredDividerTab("context");
                            updateCursorBadgePosition(event);
                          }}
                          onMouseMove={updateCursorBadgePosition}
                          onMouseLeave={() => setHoveredDividerTab(null)}
                          onClick={() => {
                            showCenterPopup(getSectionHighlightPopupText("context"));
                            toggleSectionContent("contextBooks", "context");
                          }}
                        />

                        {!truncateModeActive || expandedInTruncate.contextBooks ? (
                          <p
                            className="mt-2 max-w-[52rem] text-[16px] leading-[1.5] text-black/80 text-justify whitespace-pre-line"
                            style={{ fontFeatureSettings: "'salt' 1" }}
                          >
                            {booksBody}
                          </p>
                        ) : null}
                      </div>
                    </div>
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
                  className={`${index === 0 ? "" : "mt-6"} ${workReveal.className}`}
                  style={workReveal.style}
                >
                  <HeaderWithDivider className="mb-2">
                    <div className="flex items-center justify-between text-[12px] font-medium tracking-[0.05em] text-muted">
                      <button
                        type="button"
                        className="inline-flex cursor-crosshair items-center gap-2 text-left"
                        onMouseEnter={(event) => {
                          setHoveredDividerTab("work");
                          updateCursorBadgePosition(event);
                        }}
                        onMouseMove={updateCursorBadgePosition}
                        onMouseLeave={() => setHoveredDividerTab(null)}
                        onClick={() => {
                          showCenterPopup(getSectionHighlightPopupText("work"));
                          toggleSectionContent(key, "work");
                        }}
                        aria-label={`Show ${project.title.toLowerCase()} work section`}
                      >
                        <span
                          className={`cursor-crosshair px-1.5 py-0.5 ${
                            activeStrokeCycleKeys.includes(`work:${project.id}`)
                              ? "section-chip-stroke-cycle"
                              : ""
                          }`}
                          style={
                            {
                              ...(activePanelTab === "work"
                                ? { backgroundColor: "#FF4FD9", color: "#000000" }
                                : { backgroundColor: "rgba(0,0,0,0.05)" }),
                              ...(activeStrokeCycleKeys.includes(`work:${project.id}`)
                                ? ({ "--section-shadow-color": "#FF4FD9" } as CSSProperties)
                                : null),
                            }
                          }
                        >
                          WORK
                        </span>
                        <span
                          className={`cursor-crosshair font-medium ${
                            activePanelTab === "work" ? "text-black/80" : ""
                          }`}
                        >
                          {project.title}
                        </span>
                      </button>
                      <span className="font-medium">
                        {"year" in project && project.year ? project.year : ""}
                      </span>
                    </div>
                  </HeaderWithDivider>

                  {isExpanded ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {orderedImages.slice(0, visibleCount).map((src) => (
                        <button
                          key={src}
                          type="button"
                          className="no-save-media relative aspect-[16/9] w-full cursor-crosshair overflow-hidden bg-black/5 text-left"
                          style={{ cursor: "crosshair" }}
                          onClick={() => handleWorkImageClick(src)}
                          onContextMenu={(event) => {
                            event.preventDefault();
                          }}
                          onDragStart={(event) => {
                            event.preventDefault();
                          }}
                          aria-label={`Preview ${project.title.toLowerCase()} work image`}
                        >
                          <Image
                            src={src}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="no-save-media cursor-crosshair select-none object-cover"
                            draggable={false}
                            onContextMenu={(event) => {
                              event.preventDefault();
                            }}
                            onDragStart={(event) => {
                              event.preventDefault();
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {isExpanded && visibleCount < project.images.length ? (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        className="border-[0.5px] border-black/20 bg-[#F7F7F7] px-2 py-1 text-[10px] font-medium tracking-[0.05em] text-black/80"
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

        </div>

        {!(showOnlySelected && activePanelTab !== "context") ? (
          <section
            className={`mt-6 ${reveal(300).className}`}
            style={{
              ...reveal(300).style,
              order: sectionPriority === "context" ? 0 : 999,
            }}
          >
            <SectionHeader
              activeTab={activePanelTab}
              strokeCycleActive={activeStrokeCycleKeys.includes("context:profile")}
              secondary="PROFILE"
              onMouseEnter={(event) => {
                setHoveredDividerTab("context");
                updateCursorBadgePosition(event);
              }}
              onMouseMove={updateCursorBadgePosition}
              onMouseLeave={() => setHoveredDividerTab(null)}
              onClick={() => {
                showCenterPopup(getSectionHighlightPopupText("context"));
                toggleSectionContent("contextProfile", "context");
              }}
            />

            {!truncateModeActive || expandedInTruncate.contextProfile ? (
              <div className="mt-2 columns-1 gap-6 md:columns-2 xl:gap-6">
                <p
                  className="max-w-[52rem] text-[16px] leading-[1.5] text-black/80 text-justify whitespace-pre-line"
                  style={{ fontFeatureSettings: "'salt' 1" }}
                >
                  {profileBody}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        <div
          ref={footerRef}
          className="ui-wide-letter-spacing order-last mt-6 border-t border-black/10 pt-2 text-[12px] leading-[1.5] text-black/80"
        >
          <div className="grid gap-6 min-[940px]:grid-cols-3 xl:gap-20">
          <button
            type="button"
            className="flex cursor-crosshair items-center justify-between text-left transition-colors hover:text-black/60"
            style={{ cursor: "crosshair" }}
            onMouseEnter={(event) => {
              updateCursorBadgePosition(event);
              setCursorBadgeMode(
                lastVisitorMode === "from"
                  ? "show-visitor-time"
                  : "show-last-visitor-location",
              );
            }}
            onMouseMove={updateCursorBadgePosition}
            onMouseLeave={() => {
              setCursorBadgeMode((prev) =>
                prev === "show-visitor-time" || prev === "show-last-visitor-location"
                  ? null
                  : prev,
              );
            }}
            onClick={() => {
              setLastVisitorMode((prev) => {
                const next = prev === "from" ? "was" : "from";
                setCursorBadgeMode(
                  next === "was"
                    ? "show-last-visitor-location"
                    : "show-visitor-time",
                );
                showCenterPopup(
                  next === "was"
                    ? "SHOWING LAST VISITOR TIME"
                    : "SHOWING LAST VISITOR LOCATION",
                );
                return next;
              });
            }}
            aria-label={
              lastVisitorMode === "from"
                ? "Show when the last visitor was here"
                : "Show where the last visitor was from"
            }
          >
            <span>{displayedLastVisitorHeading}</span>
            <span>{displayedLastVisitorValue}</span>
          </button>
          <div className="flex items-center justify-center text-center" />
          <button
            type="button"
            className="flex cursor-crosshair items-center justify-between transition-colors hover:text-black/60"
            style={{ cursor: "crosshair" }}
            onMouseEnter={(event) => {
              updateCursorBadgePosition(event);
              setCursorBadgeMode(
                visitorCountMode === "today" ? "show-all-time" : "show-today",
              );
            }}
            onMouseMove={updateCursorBadgePosition}
            onMouseLeave={() => {
              setCursorBadgeMode((prev) =>
                prev === "show-all-time" || prev === "show-today" ? null : prev,
              );
            }}
            onClick={() => {
              setVisitorCountMode((prev) => {
                const nextMode = prev === "today" ? "all-time" : "today";
                setCursorBadgeMode(
                  nextMode === "today" ? "show-all-time" : "show-today",
                );
                showCenterPopup(
                  nextMode === "all-time"
                    ? "SHOWING ALL-TIME VISITORS"
                    : "SHOWING TODAY'S VISITORS",
                );
                return nextMode;
              });
            }}
            aria-label={
              visitorCountMode === "today"
                ? "Show all-time visitors"
                : "Show visitors today"
            }
          >
            <span>{displayedFooterDateLabel}</span>
            <span>
              {animatedVisitorCount} {displayedVisitorModeLabel}
            </span>
          </button>
          </div>
        </div>
      </div>
      {isProfileWindowOpen && profileWindowPosition ? (
        <button
          type="button"
          className="fixed left-1/2 z-[115] inline-flex h-[26px] -translate-x-1/2 items-center justify-center border-[0.5px] border-black bg-[#00A1FF] px-2.5 text-[clamp(11px,0.76vw,12px)] font-medium leading-none text-white md:hidden"
          style={{
            left: profileWindowPosition.x + profileWindowSize.width / 2,
            top: profileWindowPosition.y + profileWindowSize.height + 8,
          }}
          onClick={closeProfileWindow}
          aria-label="Delete profile photo window"
        >
          DELETE PHOTO
        </button>
      ) : null}
    </main>
  );
}

export default function Home() {
  return <SitePage />;
}
