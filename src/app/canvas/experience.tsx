"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { workProjects } from "../new/content";
import SiteFooter from "../new/footer-stats";
import InternshipPhotos from "./internship-photos";
import Portrait from "./portrait";
import styles from "./page.module.css";
import storyStyles from "./vercel-story.module.css";
import visitorFooterStyles from "./visitor-footer.module.css";

const work = workProjects.map((project) => ({
  id: project.id,
  slug: project.id === "vercel-2026" ? "vercel" : project.id,
  name: project.title,
  year: project.year,
  images: project.images,
}));

const homeItemLimit = 3;
const writingPlaceholders = [1, 2, 3];
const transitionOutMs = 520;
const transitionPauseMs = 130;

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
      "/photo/tonys-pizza-sf-june-2026/03.webp",
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

type Selection =
  | { kind: "work"; index: number }
  | { kind: "capture"; index: number }
  | { kind: "workAll" }
  | { kind: "captureAll" }
  | { kind: "writingAll" };

function getTitle(selection: Selection) {
  switch (selection.kind) {
    case "work": return work[selection.index].name;
    case "capture": return captures[selection.index].title;
    case "workAll": return "Work";
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

function NewLabel() {
  return <span className={styles.newNote}>new</span>;
}

function CaptureRow({ capture, index, onClick }: { capture: typeof captures[number]; index: number; onClick: () => void }) {
  const pile = [...capture.images, ...capture.images].slice(0, 9);

  function updateCursorDip(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "touch") return;
    const row = event.currentTarget;
    const rect = row.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const photos = row.querySelectorAll<HTMLElement>("[data-pile-photo]");

    photos.forEach((photo, photoIndex) => {
      const photoX = (0.09 + photoIndex * 0.1025) * rect.width;
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
      aria-label={`Open ${capture.title}`}
      onClick={onClick}
      onPointerMove={updateCursorDip}
      onPointerLeave={resetCursorDip}
    >
      <Arrow />
      <span className={styles.captureTitle}>{capture.title}</span>
      <span className={styles.date}>{capture.listDate}</span>
      <span className={styles.capturePile} aria-hidden="true">
        {pile.map((src, photoIndex) => (
          <span
            className={styles.pilePhoto}
            data-pile-photo
            key={`${src}-${photoIndex}`}
            style={{
              "--pile-left": `${9 + photoIndex * 10.25}%`,
              "--pile-tilt": `${pileTilts[(photoIndex + index) % pileTilts.length]}deg`,
              "--pile-shift": `${photoIndex % 2 === 0 ? -8 : 8}px`,
              "--pile-delay": `${photoIndex * 14}ms`,
              "--pile-peek": `${pilePeeks[photoIndex]}px`,
              "--pile-layer": 5 - Math.abs(photoIndex - 4),
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
        <p>I&apos;m incredibly grateful to <a href="https://www.hannahhearth.com/" target="_blank" rel="noopener noreferrer">Hannah Hearth</a>, <a href="https://www.tomjohn.design/" target="_blank" rel="noopener noreferrer">Tom Johnson</a>, <a href="https://johnpham.net/" target="_blank" rel="noopener noreferrer">John Phamous</a>, <a href="https://williambout.me/" target="_blank" rel="noopener noreferrer">William Bout</a>, <a href="https://www.pablostanley.com/" target="_blank" rel="noopener noreferrer">Pablo Stanley</a>, and <a href="https://www.linkedin.com/in/robinhlee/" target="_blank" rel="noopener noreferrer">Robin Lee</a> for their guidance and support throughout the summer.</p>
        <p>A special thank you to <a href="https://x.com/HedyZandi" target="_blank" rel="noopener noreferrer">Hedi Zandi</a> and <a href="https://x.com/allenzhou101?s=11&amp;t=uebh9AA6PXsSfyVK9Am9pA" target="_blank" rel="noopener noreferrer">Allen Zhou</a> on Connect, and <a href="https://www.nmonto.com/" target="_blank" rel="noopener noreferrer">Monto</a> and <a href="https://x.com/fernandorojo" target="_blank" rel="noopener noreferrer">Fernando Rojo</a> on v0, for giving me the opportunity to contribute to something greater.</p>
        <p>And of course, to the incredible group of interns I got to spend the summer with, who made coming to San Francisco and starting my internship journey so much more enjoyable.</p>
        <p>I came into the summer with a fairly established idea of what it meant to be a product designer. I left with a much broader understanding of what the job could look like, and a lot more I wanted to learn.</p>
      </div>
    </article>
  );
}

function DetailContent({ selection }: { selection: Selection }) {
  if (selection.kind === "work" && work[selection.index].id === "vercel-2026") {
    return <VercelStory />;
  }

  if (selection.kind === "workAll" || selection.kind === "captureAll" || selection.kind === "writingAll") return null;

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
  if (/^\/captures\/?$/.test(pathname)) return { kind: "captureAll" };
  const match = pathname.match(/^\/(work|captures)\/([^/]+)\/?$/);
  if (!match) return null;
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
    case "work": return `/work/${work[selection.index].slug}`;
    case "capture": return `/captures/${captures[selection.index].slug}`;
    case "workAll": return "/work";
    case "captureAll": return "/captures";
    case "writingAll": return "/writing";
  }
}

export default function CanvasExperience({ initialPath = "/" }: { initialPath?: string }) {
  const initialSelection = selectionFromPath(initialPath);
  const [selection, setSelection] = useState<Selection | null>(initialSelection);
  const [phase, setPhase] = useState<"home" | "leavingHome" | "detail" | "leavingDetail">(initialSelection ? "detail" : "home");
  const [parentSelection, setParentSelection] = useState<Selection | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function parentFromHistory() {
      const parent = selectionFromPath(window.history.state?.canvasParent ?? "/");
      return parent?.kind === "workAll" || parent?.kind === "captureAll" || parent?.kind === "writingAll" ? parent : null;
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
    const fromList = phase === "detail" && (selection?.kind === "workAll" || selection?.kind === "captureAll" || selection?.kind === "writingAll");
    const parent = fromList ? selection : null;
    setParentSelection(parent);
    window.history.pushState({ ...window.history.state, canvasParent: pathFor(parent) }, "", pathFor(next));
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
    window.history.pushState({ ...window.history.state, canvasParent: "/" }, "", pathFor(next));
    setPhase("leavingDetail");
    transitionTimer.current = setTimeout(() => {
      setSelection(next);
      setParentSelection(null);
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
  const navigationDate = selection?.kind === "capture" ? captures[selection.index].date
    : selection?.kind === "work" ? work[selection.index].year : null;
  const isVercelWork = selection?.kind === "work" && work[selection.index].id === "vercel-2026";

  return (
    <main className={styles.page} data-canvas-site data-home={phase === "home" || phase === "leavingHome" ? "" : undefined}>
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
            {work.slice(0, homeItemLimit).map((project, index) => (
              <button className={`${styles.item} ${styles.listItem} ${styles.hoverItem} ${styles.arrowItem} ${styles.listButton}`} key={project.name} type="button" onClick={() => openDetail({ kind: "work", index })}>
                <Arrow />
                <span className={styles.arrowTitle}>{project.name}</span>
                {project.id === "vercel-2026" ? <NewLabel /> : project.year ? <span className={styles.date}>{project.year}</span> : null}
              </button>
            ))}
            {work.length > homeItemLimit && (
            <button className={`${styles.viewAll} ${styles.listItem} ${styles.hoverItem} ${styles.arrowItem} ${styles.listButton}`} type="button" onClick={() => openDetail({ kind: "workAll" })}>
              <Arrow />
              <span className={styles.arrowTitle}>View all</span>
            </button>
            )}
          </div>

          <div className={styles.group}>
            <div className={styles.section}>Writing</div>
            {writingPlaceholders.slice(0, homeItemLimit).map((placeholder) => (
              <div className={`${styles.item} ${styles.listItem} ${styles.placeholderItem}`} key={placeholder}>
                <span>Placeholder</span>
              </div>
            ))}
            {writingPlaceholders.length > homeItemLimit && (
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
        <div className={visitorFooterStyles.area}>
          <SiteFooter omitFinalPeriod listStyle />
        </div>
      </div>
      </div>
      <div className={`${styles.detail} ${phase === "detail" ? styles.detailActive : ""}`} inert={phase !== "detail"}>
        {selection && (
          <>
            <div className={styles.detailSidebar}>
              <h1 className={styles.detailHeading} aria-label={navigationLabel}>
                <button className={`${styles.detailBackRow} ${styles.arrowItem}`} type="button" onClick={goBack} aria-label={parentSelection ? `Back to ${getTitle(parentSelection)}` : "Back to home"}>
                  <BackArrow />
                  <span className={styles.arrowTitle}>{navigationLabel}</span>
                  {isVercelWork ? <NewLabel /> : navigationDate ? <span className={styles.detailDate}>{navigationDate}</span> : null}
                </button>
              </h1>
              {selection.kind === "workAll" || selection.kind === "captureAll" || selection.kind === "writingAll" ? (
                  <div className={`${styles.detailList} ${styles.navigation}`}>
                    {selection.kind === "workAll" ? work.map((project, index) => (
                      <button className={`${styles.item} ${styles.listItem} ${styles.hoverItem} ${styles.arrowItem} ${styles.listButton}`} key={project.id} type="button" onClick={() => openDetail({ kind: "work", index })}>
                        <Arrow />
                        <span className={styles.arrowTitle}>{project.name}</span>
                        {project.id === "vercel-2026" ? <NewLabel /> : project.year ? <span className={styles.date}>{project.year}</span> : null}
                      </button>
                    )) : selection.kind === "writingAll" ? writingPlaceholders.map((placeholder) => (
                      <div className={`${styles.item} ${styles.listItem} ${styles.placeholderItem}`} key={placeholder}><span>Placeholder</span></div>
                    )) : captures.map((capture, index) => (
                      <CaptureRow capture={capture} index={index} key={capture.title} onClick={() => openDetail({ kind: "capture", index })} />
                    ))}
                  </div>
              ) : null}
            </div>
            {selection.kind !== "workAll" && selection.kind !== "captureAll" && selection.kind !== "writingAll" && (
              <div className={`${styles.detailContent} ${selection.kind === "capture" ? styles.captureContent : ""} ${selection.kind === "work" && work[selection.index].id === "vercel-2026" ? styles.storyContent : ""}`}>
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
