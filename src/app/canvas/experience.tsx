"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { workProjects } from "../new/content";
import SiteFooter from "../new/footer-stats";
import InternshipPhotos from "./internship-photos";
import Portrait from "./portrait";
import styles from "./page.module.css";
import storyStyles from "./vercel-story.module.css";
import lanyardStyles from "./vercel-lanyard.module.css";
import visitorFooterStyles from "./visitor-footer.module.css";

const VercelLanyard = dynamic(() => import("./vercel-lanyard"), {
  ssr: false,
  loading: () => <div className={lanyardStyles.scene} aria-hidden="true"><div className={lanyardStyles.canvas} /></div>,
});

const work = workProjects.map((project) => ({
  id: project.id,
  slug: project.id === "vercel-2026" ? "vercel" : project.id,
  name: project.title,
  year: project.year,
  images: project.images,
}));
const otherWorkIds = new Set([
  "ando", "tembo", "socratica", "context", "prism-collective", "instafleet", "merge-club",
  "on-deck-founders", "crisped", "zero-email", "faktor", "para",
]);
const mainWork = work.map((project, index) => ({ project, index })).filter(({ project }) => !otherWorkIds.has(project.id) && project.id !== "no-category");
const otherWork = work.map((project, index) => ({ project, index })).filter(({ project }) => otherWorkIds.has(project.id));
const allWork = [...mainWork, ...otherWork];

const writing: { id: string; title: string; date: string }[] = [];
const homeItemLimit = 3;
const homeWorkLimit = 4;
const writingPlaceholders = [1, 2, 3];
const transitionOutMs = 520;
const transitionPauseMs = 130;
const themeStorageKey = "canvas-theme";
type Theme = "light" | "dark";

function savedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(themeStorageKey);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function deviceTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const captures = [
  {
    slug: "tonys-pizza-in-sf",
    title: "Tony's pizza for dinner",
    date: "June 29, 2026",
    listDate: "Jun 2026",
    aspectRatio: "4 / 3",
    images: [
      "/photo/tonys-pizza-sf-june-2026/01.webp",
      "/photo/tonys-pizza-sf-june-2026/02.webp",
      "/photo/tonys-pizza-sf-june-2026/04.webp",
      "/photo/tonys-pizza-sf-june-2026/05.webp",
    ],
  },
  {
    slug: "over-the-bridge",
    title: "First-time over the bridge",
    date: "June 20, 2026",
    listDate: "Jun 2026",
    aspectRatio: "16 / 9",
    images: [
      "/photo/over-the-bridge-june-2026/05.webp",
      "/photo/over-the-bridge-june-2026/04.webp",
      "/photo/over-the-bridge-june-2026/03.webp",
      "/photo/over-the-bridge-june-2026/02.webp",
      "/photo/over-the-bridge-june-2026/01.webp",
    ],
  },
  {
    slug: "vancouver",
    title: "A week in Vancouver",
    date: "May 2026",
    listDate: "May 2026",
    aspectRatio: "16 / 9",
    imageAspects: ["4 / 3", "4 / 3", "4 / 3", "4 / 3", "4 / 3", "16 / 9", "16 / 9", "16 / 9", "16 / 9", "16 / 9"],
    images: [
      "/photo/vancouver-may-2026/12.webp",
      "/photo/vancouver-may-2026/11.webp",
      "/photo/vancouver-may-2026/10.webp",
      "/photo/vancouver-may-2026/09.webp",
      "/photo/vancouver-may-2026/07.webp",
      "/photo/vancouver-may-2026/05.webp",
      "/photo/vancouver-may-2026/04.webp",
      "/photo/vancouver-may-2026/03.webp",
      "/photo/vancouver-may-2026/02.webp",
      "/photo/vancouver-may-2026/01.webp",
    ],
  },
] as const;

function captureImageAspect(capture: typeof captures[number], imageIndex: number) {
  return "imageAspects" in capture ? capture.imageAspects[imageIndex] : capture.aspectRatio;
}

const pileTilts = [-8, 5, -4, 7, -6, 4, -7, 6, -3];
const pilePeeks = [9, 14, 19, 23, 27, 23, 19, 14, 9];
const otherWorkPeeks = [9, 13, 17, 21, 24, 27, 27, 24, 21, 17, 13, 9];

type Selection =
  | { kind: "work"; index: number }
  | { kind: "writing"; index: number }
  | { kind: "capture"; index: number }
  | { kind: "workAll" }
  | { kind: "otherWorkAll" }
  | { kind: "captureAll" }
  | { kind: "writingAll" };

function getTitle(selection: Selection) {
  switch (selection.kind) {
    case "work": return work[selection.index].name;
    case "writing": return writing[selection.index].title;
    case "capture": return captures[selection.index].title;
    case "workAll": return "Work";
    case "otherWorkAll": return "Other work";
    case "captureAll": return "Captures";
    case "writingAll": return "Writing";
  }
}

function Arrow() {
  return (
    <span className={styles.arrowSlot} aria-hidden="true">
      <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none">
        <path d="M9.34315 6.34315L15 12L9.34315 17.6569" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function BackArrow() {
  return (
    <span className={styles.arrowSlot} aria-hidden="true">
      <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none">
        <path d="M9.34315 6.34315L15 12L9.34315 17.6569" transform="translate(24 0) scale(-1 1)" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function NewLabel({ detail = false }: { detail?: boolean }) {
  return <span className={styles.newNoteSwap}>
    <span className={styles.newNote} aria-hidden="true">new</span>
    <span className={`${detail ? styles.detailDate : styles.date} ${styles.newYear}`}>2026</span>
  </span>;
}

function PileRow({ title, date, images, index, onClick }: { title: string; date?: string; images: readonly string[]; index: number; onClick: () => void }) {
  const pile = images.length >= 9 ? images.slice(0, 12) : [...images, ...images].slice(0, 9);
  const isOtherWorkPile = pile.length === 12;
  const firstLeft = isOtherWorkPile ? 6 : 9;
  const leftStep = isOtherWorkPile ? 8 : 10.25;

  function updateCursorDip(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "touch") return;
    const row = event.currentTarget;
    const rect = row.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const photos = row.querySelectorAll<HTMLElement>("[data-pile-photo]");

    photos.forEach((photo, photoIndex) => {
      const photoX = ((firstLeft + photoIndex * leftStep) / 100) * rect.width;
      const proximity = Math.max(0, 1 - Math.abs(cursorX - photoX) / (rect.width * 0.24));
      const easedProximity = proximity * proximity * (3 - 2 * proximity);
      photo.style.setProperty("--pile-dip", `${(easedProximity * 9).toFixed(2)}px`);
    });
  }

  function resetCursorDip(event: React.PointerEvent<HTMLButtonElement>) {
    event.currentTarget.querySelectorAll<HTMLElement>("[data-pile-photo]").forEach((photo) => {
      photo.style.removeProperty("--pile-dip");
    });
  }

  return (
    <button
      className={`${styles.item} ${styles.listItem} ${styles.hoverItem} ${styles.arrowItem} ${styles.captureItem}`}
      type="button"
      aria-label={`Open ${title}`}
      onClick={onClick}
      onPointerMove={updateCursorDip}
      onPointerLeave={resetCursorDip}
    >
      <Arrow />
      <span className={styles.captureTitle}>{title}</span>
      {date ? <span className={styles.date}>{date}</span> : null}
      <span className={styles.capturePile} aria-hidden="true">
        {pile.map((src, photoIndex) => (
          <span
            className={styles.pilePhoto}
            data-pile-photo
            key={`${src}-${photoIndex}`}
            style={{
              "--pile-left": `${firstLeft + photoIndex * leftStep}%`,
              "--pile-tilt": `${pileTilts[(photoIndex + index) % pileTilts.length]}deg`,
              "--pile-shift": `${photoIndex % 2 === 0 ? -8 : 8}px`,
              "--pile-delay": `${photoIndex * 14}ms`,
              "--pile-peek": `${isOtherWorkPile ? otherWorkPeeks[photoIndex] : pilePeeks[photoIndex]}px`,
              "--pile-layer": 7 - Math.abs(photoIndex - (pile.length - 1) / 2),
            } as CSSProperties}
          >
            <span className={styles.pilePhotoInner}>
              <Image src={src} alt="" width={92} height={52} sizes="92px" />
            </span>
          </span>
        ))}
      </span>
    </button>
  );
}

function CaptureRow({ capture, index, onClick }: { capture: typeof captures[number]; index: number; onClick: () => void }) {
  return <PileRow title={capture.title} date={capture.listDate} images={capture.images.slice(0, 9)} index={index} onClick={onClick} />;
}

function GalleryImage({ src, alt, first, smooth, naturalSize = false }: { src: string; alt: string; first: boolean; smooth: boolean; naturalSize?: boolean }) {
  const [loadedAspect, setLoadedAspect] = useState<number | null>(null);

  return (
    <div
      className={`${styles.detailImageFrame} ${smooth ? `${styles.smoothImageFrame} ${styles.workImageFrame}` : ""} ${loadedAspect !== null ? styles.imageLoaded : ""}`}
      style={naturalSize && loadedAspect !== null ? { "--capture-aspect": loadedAspect } as CSSProperties : undefined}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 700px) 100vw, 70vw"
        loading={first ? "eager" : "lazy"}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth && naturalHeight) setLoadedAspect(naturalWidth / naturalHeight);
        }}
      />
    </div>
  );
}

function StoryVideo({ src, label }: { src: string; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hideUntilLeave, setHideUntilLeave] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.defaultMuted = true;
    video.muted = true;
    // Explicitly start playback when this story mounts during client navigation.
    void video.play().catch(() => {
      // Keep the play control available if the browser blocks autoplay.
    });
  }, [src]);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      video.pause();
      setHideUntilLeave(false);
      return;
    }

    try {
      await video.play();
      setHideUntilLeave(true);
    } catch {
      setPlaying(false);
    }
  }

  const showControl = !playing || (hovered && !hideUntilLeave);

  return (
    <div className={storyStyles.videoFrame} onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }} onPointerLeave={() => { setHovered(false); setHideUntilLeave(false); }}>
      <div className={storyStyles.videoCrop}>
        <video
          ref={videoRef}
          className={storyStyles.video}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={label}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>
      <button
        className={storyStyles.videoHitArea}
        type="button"
        aria-label={`${playing ? "Pause" : "Play"} ${label}`}
        onClick={togglePlayback}
      >
        <span className={`${storyStyles.videoControl} ${showControl ? storyStyles.videoControlVisible : ""}`}>
          {playing ? (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14 4C14 3.44772 14.4477 3 15 3H17C17.5523 3 18 3.44772 18 4V20C18 20.5523 17.5523 21 17 21H15C14.4477 21 14 20.5523 14 20V4Z" fill="currentColor" />
              <path d="M6 4C6 3.44772 6.44772 3 7 3H9C9.55228 3 10 3.44772 10 4V20C10 20.5523 9.55228 21 9 21H7C6.44772 21 6 20.5523 6 20V4Z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M5.66861 4.75971C5.78724 3.78016 6.80341 3.19506 7.70988 3.58277C8.77068 4.03648 11.151 5.11514 14.1712 6.85887C17.1921 8.60299 19.3167 10.1253 20.2396 10.8169C21.028 11.4077 21.0303 12.5798 20.2411 13.1725C19.3266 13.8591 17.2277 15.3632 14.1701 17.1285C11.1115 18.8944 8.75886 19.9602 7.70749 20.4086C6.80076 20.7952 5.78729 20.209 5.66885 19.2315C5.53051 18.0897 5.27335 15.4968 5.27335 11.9946C5.27335 8.49444 5.53021 5.90255 5.66861 4.75971Z" fill="currentColor" /></svg>
          )}
        </span>
      </button>
    </div>
  );
}

function VercelStory() {
  const connectImages = [
    { src: "/vercel/Vercel 3.png", alt: "Forget Workspace dialog in Vercel Connect" },
    { src: "/vercel/Vercel 4.png", alt: "Featured connectors in Vercel Connect" },
  ];
  const v0Images = [
    { src: "/vercel/Vercel 1.png", alt: "The v0 creation screen" },
    { src: "/vercel/Vercel 2.png", alt: "Models for every kind of work in v0" },
    { src: "/vercel/Vercel 5.png", alt: "Turn your ideas into production in v0" },
  ];

  return (
    <article className={storyStyles.story}>
      <div className={storyStyles.prose}>
        <p>This summer, I had the opportunity to spend twelve weeks in San Francisco working as a product design intern at <a href="https://vercel.com/" target="_blank" rel="noopener noreferrer">Vercel</a>.</p>
        <p>It was my first internship, and I spent much of my first few weeks finding my footing. I was getting familiar with the company, understanding how different teams worked together, and learning how design decisions were made and shipped. Coming from years of designing independently, there was a lot I had to get used to.</p>
        <p>I started on <a href="https://vercel.com/connect" target="_blank" rel="noopener noreferrer">Vercel Connect</a>, a product that makes it possible for applications and AI agents to securely access external services. Connect was still in public beta when I joined, and I spent time rethinking parts of the experience for browsing and managing connectors, particularly how configuration, permissions, and usage were communicated.</p>
        <p>It was exciting to see Connect become <a href="https://vercel.com/changelog/vercel-connect-ga" target="_blank" rel="noopener noreferrer">generally available in August</a>, with some of my work contributing to the release.</p>
      </div>

      <div className={storyStyles.mediaGroup}>
        {connectImages.map(({ src, alt }, index) => (
          <figure className={storyStyles.media} key={src}>
            <GalleryImage src={src} alt={alt} first={index === 0} smooth />
          </figure>
        ))}
      </div>

      <hr className={storyStyles.divider} />

      <div className={storyStyles.prose}>
        <p>Later in the summer, I moved over to <a href="https://v0.app" target="_blank" rel="noopener noreferrer">v0</a>, Vercel&apos;s platform to build web apps with AI. I shipped a number of smaller improvements across the application and spent much of my time exploring interactions within the editor, particularly how people navigate between previews, code, and the work being done by agents. It was a really interesting design problem, especially as the product itself was changing so quickly.</p>
      </div>

      <div className={storyStyles.mediaGroup}>
        <figure className={storyStyles.media}>
          <StoryVideo src="/vercel/chat-sidebar-interaction.mp4" label="v0 chat sidebar interaction" />
        </figure>
        {v0Images.slice(0, 2).map(({ src, alt }) => (
          <figure className={storyStyles.media} key={src}>
            <GalleryImage src={src} alt={alt} first={false} smooth />
          </figure>
        ))}
        <figure className={storyStyles.media}>
          <StoryVideo src="/vercel/url.mp4" label="v0 URL interaction" />
        </figure>
        {v0Images.slice(2).map(({ src, alt }) => (
          <figure className={storyStyles.media} key={src}>
            <GalleryImage src={src} alt={alt} first={false} smooth />
          </figure>
        ))}
      </div>

      <hr className={storyStyles.divider} />

      <div className={storyStyles.prose}>
        <p>One of the things I found most surprising was how little time I spent in Figma. I had always thought of product design as a process of exploring ideas on a canvas, refining them into polished mockups, and eventually handing them off to engineers. At Vercel, I found myself working much closer to the actual product, often exploring and implementing ideas directly in code.</p>
        <p>Vercel was also where I opened and shipped my first pull requests. I don&apos;t think many people can say they first learned to use GitHub at Vercel. I learned an enormous amount about working with engineers, navigating a real codebase, and thinking about design beyond the boundaries of a static interface.</p>
        <p>That also explains why the images on this page aren&apos;t particularly elaborate. I don&apos;t have an extensive collection of high-fidelity mockups or perfectly arranged Figma frames from the summer. A lot of the work exists in the products themselves, in interactions that have shipped, and in small details that might not seem particularly impressive in a screenshot. But those are some of the things I learned the most from.</p>
      </div>

      <hr className={`${storyStyles.divider} ${storyStyles.endDivider}`} />
      <InternshipPhotos />
      <div className={storyStyles.closingNote}>
        <p>I&apos;m incredibly grateful to <a href="https://www.hannahhearth.com/" target="_blank" rel="noopener noreferrer">Hannah</a>, <a href="https://www.tomjohn.design/" target="_blank" rel="noopener noreferrer">Tom</a>, <a href="https://johnpham.net/" target="_blank" rel="noopener noreferrer">John</a>, <a href="https://williambout.me/" target="_blank" rel="noopener noreferrer">William</a>, <a href="https://www.pablostanley.com/" target="_blank" rel="noopener noreferrer">Pablo</a>, and <a href="https://www.linkedin.com/in/robinhlee/" target="_blank" rel="noopener noreferrer">Robin</a> for their guidance and support throughout the summer.</p>
        <p>A special thank you to <a href="https://x.com/HedyZandi" target="_blank" rel="noopener noreferrer">Hedi</a> and <a href="https://x.com/allenzhou101?s=11&amp;t=uebh9AA6PXsSfyVK9Am9pA" target="_blank" rel="noopener noreferrer">Allen</a> on Connect, and <a href="https://www.nmonto.com/" target="_blank" rel="noopener noreferrer">Monto</a> and <a href="https://x.com/fernandorojo" target="_blank" rel="noopener noreferrer">Fernando</a> on v0, for giving me the opportunity to contribute to something greater.</p>
        <p>And of course, to the incredible group of interns I got to spend the summer with, who made coming to San Francisco and starting my internship journey so much more enjoyable.</p>
        <p>I came into the summer with a fairly established idea of what it meant to be a product designer. I left with a much broader understanding of what the job could look like, and a lot more I wanted to learn.</p>
      </div>
    </article>
  );
}

const chronoPhotos = [
  { src: "/photo/chrono/DSCF4146.jpg", width: 1800, height: 1200, alt: "A teammate adding stickers during FigBuild" },
  { src: "/photo/chrono/DSCF4157.jpg", width: 1800, height: 1200, alt: "Teammates working together at a laptop" },
  { src: "/photo/chrono/DSCF4189.jpg", width: 1800, height: 1200, alt: "Two teammates beside sketches on a whiteboard" },
  { src: "/photo/chrono/DSCF4175.jpg", width: 1800, height: 1200, displayAspect: "2 / 3", objectPosition: "55% center", alt: "Teammates preparing to film the demo" },
];

function ChronoStory() {
  const images = work.find((project) => project.id === "chrono")!.images;

  return (
    <article className={storyStyles.story}>
      <div className={storyStyles.prose}>
        <p>Chrono is a time-journaling concept we designed over 48 hours for <a href="https://figbuild2026.devpost.com/" target="_blank" rel="noopener noreferrer">FigBuild 2026</a>, a weekend-long design hackathon where we ended up placing 2nd.</p>
        <p>We started by exploring how strangely we experience time. Some days feel like they last forever, while entire weeks seem to disappear. We became interested in chronosensation, the idea of how we subjectively perceive time, and how we could design something that helps people become more conscious of that relationship.</p>
      </div>

      <div className={storyStyles.mediaGroup}>
        {images.map((src, index) => (
          <figure className={storyStyles.media} key={src}>
            <GalleryImage src={src} alt={`Chrono design image ${index + 1}`} first={index === 0} smooth />
          </figure>
        ))}
      </div>

      <div className={`${storyStyles.prose} ${storyStyles.afterMedia}`}>
        <p>The result was Chrono, a journaling experience built around reflecting on how time is spent and how it feels. We spent the weekend researching, designing, and putting together a presentation to communicate the idea.</p>
        <p>You can also <a href="https://youtu.be/RY0h6cki00c?si=pNRiZzswBXBAWtp9" target="_blank" rel="noopener noreferrer">watch the demo video we submitted</a> for a closer look at the concept and how it works.</p>
        <p>It was a really fun weekend getting to build something from scratch with friends, especially without overthinking it too much. I&apos;m happy with what we managed to make in just 48 hours.</p>
      </div>

      <hr className={`${storyStyles.divider} ${storyStyles.endDivider}`} />
      <InternshipPhotos photos={chronoPhotos} title="Photos from FigBuild" backLabel="Chrono" galleryId="chrono-photo-gallery" />
      <div className={storyStyles.closingNote}>
        <p>Huge thanks to my teammates <a href="https://www.mateotannahill.com/" target="_blank" rel="noopener noreferrer">Mateo</a>, <a href="https://www.linkedin.com/in/michaelyen2323/" target="_blank" rel="noopener noreferrer">Michael</a>, and <a href="https://www.linkedin.com/in/sprsh/" target="_blank" rel="noopener noreferrer">Sparsh</a> for making this such a fun project to work on.</p>
      </div>
    </article>
  );
}

function MinimumStory() {
  const images = work.find((project) => project.id === "minimum")!.images;
  const brandingImages = images.slice(0, 2);
  const interfaceImages = images.slice(2);

  return (
    <article className={storyStyles.story}>
      <div className={storyStyles.prose}>
        <p>Minimum was a cloud infrastructure startup I worked on with three friends throughout high school. We wanted to make deploying and managing cloud infrastructure simpler, with the longer-term ambition of making infrastructure increasingly autonomous.</p>
        <p>I was the sole designer, knowing almost nothing about cloud infrastructure. I didn&apos;t really understand how deployments worked, what went into running an application, or why developers needed half the tools we were trying to build. I was learning everything as I went, often asking my teammates to explain technical concepts before I could even begin thinking about how to design for them.</p>
        <p>Looking back, I think that was one of the best things about working on Minimum. I had to develop an understanding of the technology rather than just designing interfaces around things I already knew. It forced me to think about how complicated systems could be made approachable without taking away the control and flexibility that developers needed.</p>
      </div>

      <div className={storyStyles.mediaGroup}>
        {brandingImages.map((src, index) => (
          <figure className={storyStyles.media} key={src}>
            <GalleryImage src={src} alt={`Minimum branding image ${index + 1}`} first={index === 0} smooth />
          </figure>
        ))}
      </div>

      <div className={`${storyStyles.prose} ${storyStyles.storySection}`}>
        <h2>Experimenting with the interface</h2>
        <p>Minimum was probably one of the most important projects in shaping how I design today. We were ambitious, and I was young enough that I didn&apos;t feel particularly constrained by how things were supposed to look or work.</p>
        <p>I pushed the interface in all sorts of directions, sometimes to an extreme. I spent countless hours experimenting with navigation, layouts, interactions, and different ways of representing infrastructure. I wasn&apos;t particularly interested in making another conventional cloud dashboard. I wanted to question whether the conventions of existing developer tools were even the right ones to follow.</p>
        <p>Not every experiment was good. Some were probably unnecessarily complicated, and others prioritized looking interesting over being useful. But I think having that freedom to break conventions, make mistakes, and figure out why something did or didn&apos;t work was incredibly valuable.</p>
      </div>

      <div className={storyStyles.mediaGroup}>
        {interfaceImages.map((src, index) => (
          <figure className={storyStyles.media} key={src}>
            <GalleryImage src={src} alt={src === "/minimum/build-interface-framed.png" ? "Minimum frontend build interface with deployment logs" : `Minimum interface exploration ${index + 1}`} first={false} smooth />
          </figure>
        ))}
      </div>

      <div className={`${storyStyles.prose} ${storyStyles.afterMedia}`}>
        <p>Below, you can see my first dashboard design alongside early iterations from 2022. The difference from that to the final work is pretty dramatic, and you can see just how much I evolved over the course of the project. It&apos;s a fun reminder of how much you can learn by simply making things over and over again.</p>
      </div>

      <div className={storyStyles.mediaGroup}>
        <figure className={storyStyles.media}>
          <span className={storyStyles.screenshotFrame}>
            <Image src="/minimum/first-dashboard-design-detail.png" alt="Early Minimum dashboard iterations and feedback on a Figma canvas" width={3024} height={1822} sizes="(max-width: 700px) 100vw, 70vw" />
          </span>
        </figure>
        <figure className={storyStyles.media}>
          <span className={storyStyles.screenshotFrame}>
            <Image src="/minimum/later-dashboard-design.png" alt="A later Minimum dashboard showing projects and filters" width={3456} height={2234} sizes="(max-width: 700px) 100vw, 70vw" />
          </span>
        </figure>
      </div>

      <div className={`${storyStyles.prose} ${storyStyles.storySection}`}>
        <h2>A little ahead of ourselves</h2>
        <p>One of our bigger ambitions with Minimum was the idea of autonomous infrastructure. We imagined a world where developers wouldn&apos;t have to spend so much time configuring, monitoring, and maintaining their infrastructure. Instead, software could increasingly handle those responsibilities on its own, identifying problems, making adjustments, and keeping things running.</p>
        <p>This was before everyone started describing software as agentic, which makes it funny to look back on now. A lot of what we were imagining feels closely related to the direction that companies like Vercel are exploring today, especially around making infrastructure something developers have to think about less and less.</p>
        <p>Obviously, we never got close to realizing the full vision, but I still think it&apos;s pretty cool that we were thinking about these problems so early.</p>
      </div>

      <div className={`${storyStyles.prose} ${storyStyles.storySection}`}>
        <h2>Building with friends on the internet</h2>
        <p>One of my favourite things about Minimum was how we worked together. We all met through Discord, and despite spending so much time building together, we barely ever got on calls.</p>
        <p>I remember spending hours in Figma with <a href="https://x.com/dhrtzg" target="_blank" rel="noopener noreferrer">Dylan</a>, moving things around, sharing ideas, and trying completely different directions, all without ever having spoken to each other. Almost everything happened through Discord messages. It was a pretty unconventional way of working, but somehow it worked for us.</p>
      </div>

      <figure className={`${storyStyles.media} ${storyStyles.singleMedia}`}>
        <span className={storyStyles.screenshotFrame}>
          <Image src="/minimum/discord-march-2024.png" alt="March 2024 Discord conversation about Minimum's future" width={3024} height={1834} sizes="(max-width: 700px) 100vw, 70vw" />
        </span>
      </figure>

      <div className={`${storyStyles.prose} ${storyStyles.afterMedia}`}>
        <p>Looking back at these conversations, it&apos;s kind of crazy how ambitious we were for a bunch of kids in high school. We were talking about building a company that could be worth billions, working on it full-time, and spending years turning it into something real. Meanwhile, I was still going to school every morning and spending my afternoons and evenings on Discord.</p>
        <p>I think those hours after school shaped a lot of who I am today, both as a designer and as a person. I got to surround myself with people who were just as excited about building things as I was, despite us living completely different lives in different places. We took our ideas seriously, even when they were probably a little ridiculous, and I think there&apos;s something really valuable about that kind of ambition at such a young age.</p>
        <p>Eventually, Minimum came to an end. We were all getting busier with school and our own lives, and the reality of graduating and figuring out our futures started to set in. It became harder to give the project the time and attention it deserved, and we slowly moved on to other things.</p>
      </div>

      <div className={storyStyles.mediaGroup}>
        <figure className={storyStyles.media}>
          <span className={storyStyles.screenshotFrame}>
            <Image src="/minimum/minimum-final-website.png" alt="Minimum website with the cloud platform introduction and build logs" width={2880} height={1620} sizes="(max-width: 700px) 100vw, 70vw" />
          </span>
        </figure>
        <figure className={storyStyles.media}>
          <span className={storyStyles.screenshotFrame}>
            <Image src="/minimum/discord-october-2025.png" alt="October 2025 Discord message saying rip minimum" width={3024} height={1832} sizes="(max-width: 700px) 100vw, 70vw" />
          </span>
        </figure>
      </div>

      <div className={`${storyStyles.prose} ${storyStyles.afterMedia}`}>
        <p>Although Minimum never became the company we imagined, I&apos;m incredibly glad we worked on it. It gave me a place to experiment without worrying too much about getting everything right, develop my taste, and learn how to think through complicated product problems.</p>
        <p>I don&apos;t think I&apos;d be the designer I am today without this project.</p>
      </div>
    </article>
  );
}

function UnordinaryStory() {
  const images = work.find((project) => project.id === "unordinary")!.images;
  const identityImages = images.slice(0, 2);
  const discoveryImages = [images[7], images[2]];
  const detailImages = [images[5], images[6], images[3], images[4]];

  return (
    <article className={storyStyles.story}>
      <div className={storyStyles.prose}>
        <p>After <a href="/work/minimum">our last project</a> came to an end, <a href="https://x.com/dhrtzg" target="_blank" rel="noopener noreferrer">Dylan</a> and I found ourselves looking for something new to work on. Around the same time, <a href="https://x.com/read_cv" target="_blank" rel="noopener noreferrer">Read.cv</a>, a platform we both really admired, had announced it was shutting down after being acquired by Perplexity.</p>
        <p>For those unfamiliar, Read.cv was a professional network for creatives. It gave designers, engineers, and other interesting people a place to share their work, discover others, and find opportunities. Unlike traditional professional networks like LinkedIn, it felt much more personal and thoughtful. It celebrated the work people made rather than just their job titles.</p>
        <p>We loved what Read.cv represented, and seeing it disappear felt like a real loss for the creative community. So we decided to try building something that could carry some of those values forward.</p>
      </div>

      <div className={storyStyles.mediaGroup}>
        {identityImages.map((src, index) => (
          <figure className={storyStyles.media} key={src}>
            <GalleryImage src={src} alt={index === 0 ? "Unordinary wordmark on a colorful background" : "Unordinary identity with colorful geometric symbols"} first={index === 0} smooth />
          </figure>
        ))}
      </div>

      <hr className={storyStyles.divider} />

      <div className={storyStyles.prose}>
        <h2>Making something of our own</h2>
        <p>That&apos;s how Unordinary started. We wanted to build a place where people could showcase their work, discover interesting people, and find opportunities, but we also wanted to put our own spin on the experience.</p>
        <p>While Read.cv was a big inspiration, we weren&apos;t interested in simply recreating it. We wanted to push the design further, rethink how profiles and work could be presented, and make the whole experience feel a little more expressive and enjoyable to use.</p>
      </div>

      <div className={storyStyles.mediaGroup}>
        {discoveryImages.map((src, index) => (
          <figure className={storyStyles.media} key={src}>
            <GalleryImage src={src} alt={index === 0 ? "Unordinary landing page inviting people to create a profile" : "Unordinary discovery page showing creative work and profiles"} first={false} smooth />
          </figure>
        ))}
      </div>

      <div className={`${storyStyles.prose} ${storyStyles.afterMedia}`}>
        <p>A lot of my time went into experimenting with the interface, from profiles and navigation to the smaller interactions that made the product feel more considered. I wanted Unordinary to feel like something people would genuinely enjoy spending time on, rather than another professional platform they felt obligated to use.</p>
      </div>

      <div className={storyStyles.mediaGroup}>
        {detailImages.map((src, index) => (
          <figure className={storyStyles.media} key={src}>
            <GalleryImage src={src} alt={["Unordinary experience editor", "Unordinary account settings", "Unordinary jobs page", "Unordinary job listing form"][index]} first={false} smooth />
          </figure>
        ))}
      </div>

      <hr className={storyStyles.divider} />

      <div className={storyStyles.prose}>
        <h2>A month of building</h2>
        <p>Most of Unordinary came together in roughly a month-long sprint. We spent a lot of time designing, building, changing our minds, and trying to get as much of the product working as we could.</p>
        <p>It was a really fun project to work on, especially coming out of something as long-running as Minimum. There was something refreshing about starting with a relatively clear idea and seeing how far we could take it in such a short period of time.</p>
        <p>You can actually visit <a href="https://www.unordinary.app/" target="_blank" rel="noopener noreferrer">Unordinary</a> today, although we never really launched it publicly. There are probably plenty of gaps in the product, unfinished ideas, and things I&apos;d approach differently now.</p>
        <p>Still, I&apos;m really happy with what we made. I think there&apos;s something special about building a product simply because you wish it existed. We weren&apos;t trying to reinvent professional networking or build the next big company. We just missed something we loved and wanted to see what our own version of it could look like.</p>
      </div>
    </article>
  );
}

function DetailContent({ selection }: { selection: Selection }) {
  if (selection.kind === "writing") return null;
  if (selection.kind === "work" && work[selection.index].id === "vercel-2026") {
    return <VercelStory />;
  }
  if (selection.kind === "work" && work[selection.index].id === "chrono") {
    return <ChronoStory />;
  }
  if (selection.kind === "work" && work[selection.index].id === "minimum") {
    return <MinimumStory />;
  }
  if (selection.kind === "work" && work[selection.index].id === "unordinary") {
    return <UnordinaryStory />;
  }

  if (selection.kind === "workAll" || selection.kind === "otherWorkAll" || selection.kind === "captureAll" || selection.kind === "writingAll") return null;

  const images: readonly string[] = selection.kind === "work"
    ? work[selection.index].images
    : captures[selection.index].images;

  return (
    <div className={`${styles.gallery} ${selection.kind === "capture" ? styles.captureGallery : ""}`}>
      {images.map((src, index) => (
        <figure
          className={styles.galleryFigure}
          key={src}
          style={selection.kind === "capture" ? {
            "--capture-tilt": (selection.index + index) % 2 === 0 ? "-0.5deg" : "0.5deg",
            "--capture-aspect": captureImageAspect(captures[selection.index], index),
          } as CSSProperties : undefined}
        >
          <GalleryImage src={src} alt={`${getTitle(selection)} image ${index + 1}`} first={index === 0} smooth={selection.kind === "work"} naturalSize={selection.kind === "capture"} />
        </figure>
      ))}
    </div>
  );
}

function selectionFromPath(pathname: string): Selection | null {
  if (/^\/writing\/?$/.test(pathname)) return { kind: "writingAll" };
  if (/^\/work\/?$/.test(pathname)) return { kind: "workAll" };
  if (/^\/work\/other-work\/?$/.test(pathname)) return { kind: "otherWorkAll" };
  if (/^\/captures\/?$/.test(pathname)) return { kind: "captureAll" };
  const match = pathname.match(/^\/(writing|work|captures)\/([^/]+)\/?$/);
  if (!match) return null;
  if (match[1] === "writing") {
    const index = writing.findIndex((article) => article.id === match[2]);
    return index < 0 ? null : { kind: "writing", index };
  }
  if (match[1] === "work") {
    const index = work.findIndex((project) => project.slug === match[2] || project.id === match[2]);
    return index < 0 ? null : { kind: "work", index };
  }
  const index = captures.findIndex((capture) => capture.slug === match[2]);
  return index < 0 ? null : { kind: "capture", index };
}

function pathFor(selection: Selection | null) {
  if (!selection) return "/";
  switch (selection.kind) {
    case "writing": return `/writing/${writing[selection.index].id}`;
    case "work": return `/work/${work[selection.index].slug}`;
    case "capture": return `/captures/${captures[selection.index].slug}`;
    case "workAll": return "/work";
    case "otherWorkAll": return "/work/other-work";
    case "captureAll": return "/captures";
    case "writingAll": return "/writing";
  }
}

export default function CanvasExperience({ initialPath = "/" }: { initialPath?: string }) {
  const initialSelection = selectionFromPath(initialPath);
  const [selection, setSelection] = useState<Selection | null>(initialSelection);
  const [phase, setPhase] = useState<"home" | "leavingHome" | "detail" | "leavingDetail">(initialSelection ? "detail" : "home");
  const [parentSelection, setParentSelection] = useState<Selection | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef<HTMLElement>(null);
  const themeRef = useRef<Theme | null>(null);
  const themeTimer = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      const preference = savedTheme();
      const next = preference ?? deviceTheme();
      themeRef.current = next;
      setTheme(next);
      if (preference) document.documentElement.dataset.canvasTheme = preference;
      else delete document.documentElement.dataset.canvasTheme;
    };
    syncTheme();
    media.addEventListener("change", syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      media.removeEventListener("change", syncTheme);
      window.removeEventListener("storage", syncTheme);
      if (themeTimer.current) window.clearTimeout(themeTimer.current);
    };
  }, []);

  function toggleTheme() {
    const next: Theme = (themeRef.current ?? deviceTheme()) === "dark" ? "light" : "dark";
    themeRef.current = next;
    const page = pageRef.current;
    if (page && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      page.classList.add(styles.themeChanging);
      if (themeTimer.current) window.clearTimeout(themeTimer.current);
      themeTimer.current = window.setTimeout(() => {
        page.classList.remove(styles.themeChanging);
        themeTimer.current = null;
      }, 200);
    }
    document.documentElement.dataset.canvasTheme = next;
    setTheme(next);
    try { window.localStorage.setItem(themeStorageKey, next); } catch { /* Keep the in-page choice. */ }
  }

  useEffect(() => {
    function parentFromHistory() {
      const parent = selectionFromPath(window.history.state?.canvasParent ?? "/");
      return parent?.kind === "workAll" || parent?.kind === "otherWorkAll" || parent?.kind === "captureAll" || parent?.kind === "writingAll" ? parent : null;
    }
    function syncFromHistory() {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      const next = selectionFromPath(window.location.pathname);
      setSelection(next);
      setParentSelection(parentFromHistory());
      setPhase(next ? "detail" : "home");
    }
    const initialSync = window.requestAnimationFrame(() => {
      setParentSelection(parentFromHistory());
    });
    window.addEventListener("popstate", syncFromHistory);
    return () => {
      window.cancelAnimationFrame(initialSync);
      window.removeEventListener("popstate", syncFromHistory);
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, []);

  function openDetail(next: Selection) {
    if (phase !== "home" && phase !== "detail") return;
    const fromList = phase === "detail" && (selection?.kind === "workAll" || selection?.kind === "otherWorkAll" || selection?.kind === "captureAll" || selection?.kind === "writingAll");
    const parent = fromList ? selection : null;
    setParentSelection(parent);
    window.history.pushState({ canvasParent: pathFor(parent) }, "", pathFor(next));
    setPhase(phase === "home" ? "leavingHome" : "leavingDetail");
    transitionTimer.current = setTimeout(() => {
      setSelection(next);
      setPhase("detail");
      window.scrollTo({ top: 0, behavior: "instant" });
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : transitionOutMs + transitionPauseMs);
  }

  const goBack = useCallback(() => {
    if (phase !== "detail") return;
    const next = parentSelection;
    window.history.pushState({ canvasParent: next?.kind === "otherWorkAll" ? "/work" : "/" }, "", pathFor(next));
    setPhase("leavingDetail");
    transitionTimer.current = setTimeout(() => {
      setSelection(next);
      setParentSelection(next?.kind === "otherWorkAll" ? { kind: "workAll" } : null);
      setPhase(next ? "detail" : "home");
      window.scrollTo({ top: 0, behavior: "instant" });
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : transitionOutMs + transitionPauseMs);
  }, [phase, parentSelection]);

  useEffect(() => {
    if (phase !== "detail") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) goBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, goBack]);

  const navigationLabel = selection ? getTitle(selection) : "Raghav Agarwal";
  const navigationDate = selection?.kind === "writing" ? writing[selection.index].date : selection?.kind === "capture" ? captures[selection.index].date
    : selection?.kind === "work" ? work[selection.index].year : null;
  const isVercelWork = selection?.kind === "work" && work[selection.index].id === "vercel-2026";

  return (
    <main ref={pageRef} className={styles.page} data-canvas-site data-theme={theme ?? undefined} data-home={phase === "home" || phase === "leavingHome" ? "" : undefined}>
      <div className={styles.stage}>
      <div className={`${styles.home} ${phase !== "home" ? styles.homeInactive : ""}`} inert={phase !== "home"}>
      <div className={styles.column}>
        <div className={styles.introduction}>
          <Portrait />
          <p className={`${styles.bio} ${styles.name}`}>Raghav Agarwal</p>
          <p className={styles.bio}>
            I&apos;m 18 years old and born in Calgary, Canada.
          </p>
          <p className={styles.bio}>
            I&apos;m a designer who began learning design independently through the internet four years ago. I&apos;m also a student at the University of Waterloo studying Global Business and Digital Arts, where I&apos;m starting my second year.
          </p>
          <p className={styles.bio}>
            I&apos;m currently looking for new opportunities. You can reach out on{" "}
            <a className={styles.bioLink} href="https://linkedin.com/in/rghv-agrwl" target="_blank" rel="noopener noreferrer">Linkedin</a>,{" "}
            <a className={styles.bioLink} href="https://x.com/varksed" target="_blank" rel="noopener noreferrer">X</a>, or by{" "}
            <a className={styles.bioLink} href="mailto:rghvagwl@gmail.com">Email</a>.
          </p>
        </div>

        <div className={styles.navigation}>
          <div className={styles.group}>
            <div className={styles.section}>Work</div>
            {mainWork.slice(0, homeWorkLimit).map(({ project, index }) => (
              <button className={`${styles.item} ${styles.listItem} ${styles.hoverItem} ${styles.arrowItem} ${styles.listButton}`} key={project.name} type="button" onClick={() => openDetail({ kind: "work", index })}>
                <Arrow />
                <span className={styles.arrowTitle}>{project.name}</span>
                {project.id === "vercel-2026" ? <NewLabel /> : project.year ? <span className={styles.date}>{project.year}</span> : null}
              </button>
            ))}
            {allWork.length > homeWorkLimit && (
            <button className={`${styles.viewAll} ${styles.listItem} ${styles.hoverItem} ${styles.arrowItem} ${styles.listButton}`} type="button" onClick={() => openDetail({ kind: "workAll" })}>
              <Arrow />
              <span className={styles.arrowTitle}>View all</span>
            </button>
            )}
          </div>

          <div className={styles.group}>
            <div className={styles.section}>Writing</div>
            {writing.slice(0, homeItemLimit).map((article, index) => (
              <button className={`${styles.item} ${styles.listItem} ${styles.hoverItem} ${styles.arrowItem} ${styles.listButton}`} key={article.id} type="button" onClick={() => openDetail({ kind: "writing", index })}>
                <Arrow /><span className={styles.arrowTitle}>{article.title}</span><span className={styles.date}>{article.date}</span>
              </button>
            ))}
            {writingPlaceholders.slice(0, Math.max(0, homeItemLimit - writing.length)).map((placeholder) => (
              <div className={`${styles.item} ${styles.listItem} ${styles.placeholderItem}`} key={placeholder}>
                <span>Placeholder</span>
              </div>
            ))}
            {writing.length > homeItemLimit && (
            <button className={`${styles.viewAll} ${styles.listItem} ${styles.hoverItem} ${styles.arrowItem} ${styles.listButton}`} type="button" onClick={() => openDetail({ kind: "writingAll" })}>
              <Arrow /><span className={styles.arrowTitle}>View all</span>
            </button>
            )}
          </div>

          <div className={styles.group}>
            <div className={styles.section}>Captures</div>
            {captures.slice(0, homeItemLimit).map((capture, index) => (
              <CaptureRow capture={capture} index={index} key={capture.title} onClick={() => openDetail({ kind: "capture", index })} />
            ))}
            {captures.length > homeItemLimit && (
            <button className={`${styles.viewAll} ${styles.listItem} ${styles.hoverItem} ${styles.arrowItem} ${styles.listButton}`} type="button" onClick={() => openDetail({ kind: "captureAll" })}>
              <Arrow /><span className={styles.arrowTitle}>View all</span>
            </button>
            )}
          </div>
        </div>
        <div className={`${visitorFooterStyles.area} ${visitorFooterStyles.controls}`}>
          <button className={visitorFooterStyles.themeButton} type="button"
            onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={theme === "dark"}>
            <span className={`${visitorFooterStyles.themeIcon} ${theme === "dark" ? visitorFooterStyles.themeIconVisible : ""}`} aria-hidden="true">
              <svg viewBox="0 -960 960 960" fill="currentColor"><path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM80-440q-17 0-28.5-11.5T40-480q0-17 11.5-28.5T80-520h80q17 0 28.5 11.5T200-480q0 17-11.5 28.5T160-440H80Zm720 0q-17 0-28.5-11.5T760-480q0-17 11.5-28.5T800-520h80q17 0 28.5 11.5T920-480q0 17-11.5 28.5T880-440h-80ZM480-760q-17 0-28.5-11.5T440-800v-80q0-17 11.5-28.5T480-920q17 0 28.5 11.5T520-880v80q0 17-11.5 28.5T480-760Zm0 720q-17 0-28.5-11.5T440-80v-80q0-17 11.5-28.5T480-200q17 0 28.5 11.5T520-160v80q0 17-11.5 28.5T480-40ZM226-678l-43-42q-12-11-11.5-28t11.5-29q12-12 29-12t28 12l42 43q11 12 11 28t-11 28q-11 12-27.5 11.5T226-678Zm494 495-42-43q-11-12-11-28.5t11-27.5q11-12 27.5-11.5T734-282l43 42q12 11 11.5 28T777-183q-12 12-29 12t-28-12Zm-42-495q-12-11-11.5-27.5T678-734l42-43q11-12 28-11.5t29 11.5q12 12 12 29t-12 28l-43 42q-12 11-28 11t-28-11ZM183-183q-12-12-12-29t12-28l43-42q12-11 28.5-11t27.5 11q12 11 11.5 27.5T282-226l-42 43q-11 12-28 11.5T183-183Zm297-297Z"/></svg>
            </span>
            <span className={`${visitorFooterStyles.themeIcon} ${theme === "light" ? visitorFooterStyles.themeIconVisible : ""}`} aria-hidden="true">
              <svg viewBox="0 -960 960 960" fill="currentColor"><path d="M480-120q-151 0-255.5-104.5T120-480q0-138 90-239.5T440-838q13-2 23 3.5t16 14.5q6 9 6.5 21t-7.5 23q-17 26-25.5 55t-8.5 61q0 90 63 153t153 63q31 0 61.5-9t54.5-25q11-7 22.5-6.5T819-479q10 5 15.5 15t3.5 24q-14 138-117.5 229T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z"/></svg>
            </span>
          </button>
          <SiteFooter omitFinalPeriod listStyle />
        </div>
      </div>
      </div>
      <div className={`${styles.detail} ${phase === "detail" ? styles.detailActive : ""}`} inert={phase !== "detail"}>
        {selection && (
          <>
            <div className={`${styles.detailSidebar} ${selection.kind === "writing" ? styles.writingSidebar : ""}`}>
              <h1 className={styles.detailHeading} aria-label={navigationLabel}>
                <button className={`${styles.detailBackRow} ${styles.arrowItem}`} type="button" onClick={goBack} aria-label={parentSelection ? `Back to ${getTitle(parentSelection)}` : "Back to home"}>
                  <BackArrow />
                  <span className={styles.arrowTitle}>{navigationLabel}</span>
                  {isVercelWork ? <NewLabel detail /> : navigationDate ? <span className={styles.detailDate}>{navigationDate}</span> : null}
                </button>
              </h1>
              {isVercelWork ? <VercelLanyard /> : null}
              {selection.kind === "workAll" || selection.kind === "otherWorkAll" || selection.kind === "captureAll" || selection.kind === "writingAll" ? (
                  <div className={`${styles.detailList} ${styles.navigation}`}>
                    {selection.kind === "workAll" ? allWork.map(({ project, index }) => (
                      <button className={`${styles.item} ${styles.listItem} ${styles.hoverItem} ${styles.arrowItem} ${styles.listButton}`} key={project.id} type="button" onClick={() => openDetail({ kind: "work", index })}>
                        <Arrow />
                        <span className={styles.arrowTitle}>{project.name}</span>
                        {project.id === "vercel-2026" ? <NewLabel /> : project.year ? <span className={styles.date}>{project.year}</span> : null}
                      </button>
                    ))
                    : selection.kind === "otherWorkAll" ? otherWork.map(({ project, index }) => (
                      <button className={`${styles.item} ${styles.listItem} ${styles.hoverItem} ${styles.arrowItem} ${styles.listButton}`} key={project.id} type="button" onClick={() => openDetail({ kind: "work", index })}>
                        <Arrow />
                        <span className={styles.arrowTitle}>{project.name}</span>
                        {project.year ? <span className={styles.date}>{project.year}</span> : null}
                      </button>
                    )) : selection.kind === "writingAll" ? writing.map((article, index) => (
                      <button className={`${styles.item} ${styles.listItem} ${styles.hoverItem} ${styles.arrowItem} ${styles.listButton}`} key={article.id} type="button" onClick={() => openDetail({ kind: "writing", index })}><Arrow /><span className={styles.arrowTitle}>{article.title}</span><span className={styles.date}>{article.date}</span></button>
                    )) : captures.map((capture, index) => (
                      <CaptureRow capture={capture} index={index} key={capture.title} onClick={() => openDetail({ kind: "capture", index })} />
                    ))}
                  </div>
              ) : null}
            </div>
            {selection.kind !== "workAll" && selection.kind !== "otherWorkAll" && selection.kind !== "captureAll" && selection.kind !== "writingAll" && (
              <div className={`${styles.detailContent} ${selection.kind === "writing" ? styles.writingContent : ""} ${selection.kind === "capture" ? styles.captureContent : ""} ${selection.kind === "work" && ["vercel-2026", "chrono", "minimum", "unordinary"].includes(work[selection.index].id) ? styles.storyContent : ""}`}>
                <DetailContent selection={selection} />
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </main>
  );
}
