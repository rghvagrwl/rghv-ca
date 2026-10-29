"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import pageStyles from "./page.module.css";
import styles from "./internship-photos.module.css";

const photos = [
  {
    "src": "/photo/vercel-internship/01.webp",
    "width": 1800,
    "height": 1350,
    "alt": "The stage at a Figma conference"
  },
  {
    "src": "/photo/vercel-internship/02.webp",
    "width": 1800,
    "height": 1350,
    "alt": "A sunlit covered walkway"
  },
  {
    "src": "/photo/vercel-internship/03.webp",
    "width": 1800,
    "height": 1013,
    "alt": "Friends at an ocean overlook"
  },
  {
    "src": "/photo/vercel-internship/04.webp",
    "width": 1800,
    "height": 1350,
    "alt": "A Vercel One stop ship billboard"
  },
  {
    "src": "/photo/vercel-internship/05.webp",
    "width": 1800,
    "height": 1350,
    "alt": "San Francisco skyline at dusk"
  },
  {
    "src": "/photo/vercel-internship/06.webp",
    "width": 1350,
    "height": 1800,
    "alt": "An event outside Chase Center"
  },
  {
    "src": "/photo/vercel-internship/07.webp",
    "width": 1350,
    "height": 1800,
    "alt": "Friends playing a video game at the office"
  },
  {
    "src": "/photo/vercel-internship/08.webp",
    "width": 1350,
    "height": 1800,
    "alt": "Watching the sunset above the clouds"
  },
  {
    "src": "/photo/vercel-internship/09.webp",
    "width": 1800,
    "height": 1350,
    "alt": "Sunset over a blanket of clouds"
  },
  {
    "src": "/photo/vercel-internship/10.webp",
    "width": 1800,
    "height": 1350,
    "alt": "Ice cream at Dolores Park"
  },
  {
    "src": "/photo/vercel-internship/11.webp",
    "width": 1800,
    "height": 1013,
    "alt": "Friends hiking above the clouds"
  }
];

export default function InternshipPhotos() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [scrollLocked, setScrollLocked] = useState(false);
  const stackRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const unlockTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function resetTracking() {
    stackRef.current?.querySelectorAll<HTMLElement>("[data-stack-photo]").forEach((photo) => {
      photo.style.removeProperty("--pull-x");
      photo.style.removeProperty("--pull-y");
    });
  }

  function trackPointer(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;

    const button = event.currentTarget;
    const bounds = button.getBoundingClientRect();
    button.querySelectorAll<HTMLElement>("[data-stack-photo]").forEach((photo, index) => {
      // Measure from each photo's hover position without including its magnetic offset.
      const spreadX = index === 0 ? -6 : index === 1 ? 6 : 0;
      const spreadY = index === 2 ? 6 : -4;
      const centerX = bounds.left + photo.offsetLeft + photo.offsetWidth / 2 + spreadX;
      const centerY = bounds.top + photo.offsetTop + photo.offsetHeight / 2 + spreadY;
      const x = Math.max(-1, Math.min(1, (event.clientX - centerX) / (bounds.width / 2)));
      const y = Math.max(-1, Math.min(1, (event.clientY - centerY) / (bounds.height / 2)));
      const strength = [1.2, 1.6, 2][index];
      photo.style.setProperty("--pull-x", `${x * strength}px`);
      photo.style.setProperty("--pull-y", `${y * strength}px`);
    });
  }

  const close = useCallback(() => {
    setOpen(false);
    stackRef.current?.focus({ preventScroll: true });
    if (unlockTimeout.current) clearTimeout(unlockTimeout.current);
    unlockTimeout.current = setTimeout(() => setScrollLocked(false), 820);
  }, []);

  function openGallery() {
    resetTracking();
    if (unlockTimeout.current) clearTimeout(unlockTimeout.current);
    if (overlayRef.current) overlayRef.current.scrollTop = 0;
    setScrollLocked(true);
    setOpen(true);
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => {
      cancelAnimationFrame(frame);
      if (unlockTimeout.current) clearTimeout(unlockTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!scrollLocked) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [scrollLocked]);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  return (
    <>
      <div className={styles.entry}>
        <button
          className={`${styles.stackButton} ${open ? styles.stackButtonOpen : ""}`}
          type="button"
          ref={stackRef}
          aria-label="Open photos from my internship"
          aria-expanded={open}
          aria-controls="internship-photo-gallery"
          onClick={openGallery}
          onPointerMove={trackPointer}
          onPointerLeave={resetTracking}
          onPointerCancel={resetTracking}
        >
          <span className={styles.stack} aria-hidden="true">
            {photos.slice(0, 3).map((photo, index) => (
              <span className={`${styles.stackPhoto} ${styles[`stackPhoto${index + 1}`]}`} key={photo.src} data-stack-photo>
                <Image src={photo.src} alt="" width={68} height={48} sizes="68px" />
              </span>
            ))}
          </span>
        </button>
      </div>

      {mounted && createPortal(
        <div
          id="internship-photo-gallery"
          ref={overlayRef}
          className={`${styles.overlay} ${open ? styles.overlayOpen : ""}`}
          role="dialog"
          aria-modal={open ? true : undefined}
          aria-label="Photos from my internship"
          aria-hidden={!open}
          inert={!open}
          onClick={close}
        >
          <div className={styles.galleryNav} onClick={(event) => event.stopPropagation()}>
            <button
              className={`${pageStyles.detailBackRow} ${pageStyles.arrowItem}`}
              type="button"
              ref={closeRef}
              onClick={close}
              aria-label="Back to Vercel"
            >
              <span className={pageStyles.arrowSlot} aria-hidden="true">
                <svg className={pageStyles.arrowIcon} viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H20M10.0001 17.6568L4.34326 12L10.0001 6.34314" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className={pageStyles.arrowTitle}>Photos from my internship</span>
            </button>
          </div>
          <div className={styles.galleryScroll}>
            <div className={`${pageStyles.gallery} ${pageStyles.captureGallery} ${styles.gallery}`} onClick={(event) => event.stopPropagation()}>
              {photos.map((photo, index) => (
                <figure
                  className={pageStyles.galleryFigure}
                  key={photo.src}
                  style={{
                    "--capture-aspect": `${photo.width} / ${photo.height}`,
                    "--capture-tilt": index % 2 === 0 ? "-0.5deg" : "0.5deg",
                  } as CSSProperties}
                >
                  <span className={pageStyles.detailImageFrame}>
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    sizes="(max-width: 552px) calc(100vw - 40px), 512px"
                    loading={index === 0 && open ? "eager" : "lazy"}
                  />
                  </span>
                </figure>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
