"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import pageStyles from "./page.module.css";
import styles from "./internship-photos.module.css";

const photos = [
  { src: "/photo/hill-pink-sky.webp", width: 2000, height: 1125, alt: "Two people on a hill at sunset" },
  { src: "/photo/cafe-window.webp", width: 2000, height: 1333, alt: "Friends sitting by a cafe window" },
  { src: "/photo/silhouette-sunset.webp", width: 2000, height: 1500, alt: "A silhouette against a sunset" },
  { src: "/photo/bay-bridge-pier.webp", width: 2000, height: 1500, alt: "A view from the pier toward the Bay Bridge" },
  { src: "/photo/city-hall-dusk.webp", width: 2000, height: 1127, alt: "City Hall at dusk" },
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
    stackRef.current?.style.removeProperty("--stack-x");
    stackRef.current?.style.removeProperty("--stack-y");
  }

  function trackPointer(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;

    const button = event.currentTarget;
    const bounds = button.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    button.style.setProperty("--stack-x", `${x * 3}px`);
    button.style.setProperty("--stack-y", `${y * 3}px`);
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
              <span className={`${styles.stackPhoto} ${styles[`stackPhoto${index + 1}`]}`} key={photo.src}>
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
            <div className={styles.gallery} onClick={(event) => event.stopPropagation()}>
              {photos.map((photo, index) => (
                <figure className={styles.photo} key={photo.src}>
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    sizes="(max-width: 760px) calc(100vw - 40px), 720px"
                    loading={index === 0 && open ? "eager" : "lazy"}
                  />
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
