"use client";

import HoverBlob from "./hover-blob";
import { hapticTick } from "./haptics";
import ListBand from "./list-band";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { workProjects } from "./content";
import MagneticButton from "./magnetic";
import { lockScroll, unlockScroll } from "./scroll-lock";

const subscribeToNothing = () => () => {};

type Hovered = { id: string; src: string };
// `src` is the previewed frame frozen at click time, which the expansion
// animation keeps showing while `hovered` changes underneath.
type OpenState = { id: string; index: number; src: string | null };
// idle → hovering/preview only; expanding → beat, then the preview animates
// out to the carousel slide's rect; reveal → the track fades in underneath
// the preview; open → preview gone, carousel fully live.
type Phase = "idle" | "expanding" | "reveal" | "open";

// The page content fades fully out first (matching the overlay's fade
// duration), THEN the preview expands — slowly ramping up and easing out.


const OPEN_DELAY_MS = 680;
const EXPAND_MS = 850;
const EXPAND_EASE = "cubic-bezier(0.5, 0, 0.1, 1)";
const REVEAL_MS = 320;
// Matches the carousel slides so the expanded preview and the slide resolve
// to the same optimized image URL — no reload blip on the swap.
const IMAGE_SIZES = "(max-width: 760px) 100vw, 75vw";
// The preview box is far smaller than a slide (≤400px wide), so it and its
// warm-up copies request a matching candidate — same URL, so every hover
// is a cache hit, and the files are a fraction of the slide-size ones.
const PREVIEW_SIZES = "(max-width: 760px) 54vw, 50vw";

export default function WorkIndex() {
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setWarm(true), 2500);
    return () => window.clearTimeout(id);
  }, []);
  const [open, setOpen] = useState<OpenState | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  // One random frame per project, fixed for the visit — picked shortly after
  // mount (so render stays pure) and prefetched, making every hover a cache
  // hit.
  const [previewSrcById, setPreviewSrcById] = useState<Map<
    string,
    string
  > | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const timersRef = useRef<number[]>([]);
  const handleRowEnterRef = useRef<(id: string, images: string[]) => void>(
    () => {},
  );
  const releaseRef = useRef<() => void>(() => {});

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPreviewSrcById(
        new Map(
          workProjects.map((project) => [
            project.id,
            project.images[Math.floor(Math.random() * project.images.length)],
          ]),
        ),
      );
    }, 500);
    return () => window.clearTimeout(id);
  }, []);

  // The preview and the carousel are position: fixed, but .nv-page animates a
  // transform, which makes it a containing block for fixed descendants. Portal
  // them to the body so they resolve against the viewport instead. The portal
  // can only run on the client.
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  const openProject = open
    ? workProjects.find((project) => project.id === open.id) ?? null
    : null;

  // Touch gesture bookkeeping: a QUICK, still tap is a genuine click and
  // opens directly; anything that travelled is a drag — those open via
  // release (the blob's synthetic, untrusted click), never via the
  // trailing native click.
  const touchGestureRef = useRef({
    touch: false,
    x: 0,
    y: 0,
    at: 0,
    moved: 0,
  });
  const lastPointerTouchRef = useRef(false);

  const handleRowEnter = useCallback(
    (id: string, images: string[]) => {
      setHovered((previous) =>
        previous?.id === id
          ? previous
          : { id, src: previewSrcById?.get(id) ?? images[0] },
      );
    },
    [previewSrcById],
  );

  // Open the carousel on the frame being previewed, so the preview expands
  // into it seamlessly. A click landing MID-GLIDE (hover state still
  // catching up to the captured row) must never lose the scale-up:
  // resolve the frame this row would preview and fly with that — the
  // expansion happens every time, with the right image.
  const handleOpen = useCallback(
    (id: string, images: string[]) => {
      const src =
        hovered?.id === id
          ? hovered.src
          : previewSrcById?.get(id) ?? images[0];
      const index = Math.max(0, images.indexOf(src));
      setHovered({ id, src });
      setOpen({ id, index, src });
      setPhase("expanding");
    },
    [hovered, previewSrcById],
  );

  // Called by the carousel once its active slide is laid out. Sequence: hold
  // a beat while the backdrop blurs in, expand the preview onto the slide's
  // rect, fade the track in underneath, and only then let go of the preview —
  // after the slide's own image has actually loaded.
  const handleCarouselReady = useCallback(
    (target: DOMRect, slideImage: HTMLImageElement | null) => {
      const node = previewRef.current;
      const from = node?.getBoundingClientRect();

      // No measurable preview (mobile hides it) — skip the animation.
      if (!node || !from || from.width < 10) {
        setPhase("open");
        return;
      }

      node.style.transition = "none";
      node.style.top = `${from.top}px`;
      node.style.left = `${from.left}px`;
      node.style.width = `${from.width}px`;
      node.style.height = `${from.height}px`;
      node.style.transform = "none";
      node.style.zIndex = "70"; // above the carousel while it expands
      void node.offsetWidth;

      later(() => {
        node.style.transition = `top ${EXPAND_MS}ms ${EXPAND_EASE}, left ${EXPAND_MS}ms ${EXPAND_EASE}, width ${EXPAND_MS}ms ${EXPAND_EASE}, height ${EXPAND_MS}ms ${EXPAND_EASE}`;
        node.style.top = `${target.top}px`;
        node.style.left = `${target.left}px`;
        node.style.width = `${target.width}px`;
        node.style.height = `${target.height}px`;
      }, OPEN_DELAY_MS);

      later(() => {
        let handed = false;
        const finish = () => {
          if (handed) return;
          handed = true;
          setPhase("reveal");
          later(() => {
            setPhase("open");
            node.removeAttribute("style");
          }, REVEAL_MS);
        };
        // Hand over only once the slide's pixels are DECODED, not merely
        // fetched — the swap under the preview must be invisible.
        const handOver = () => {
          if (slideImage?.decode) {
            slideImage
              .decode()
              .catch(() => {})
              .then(finish);
          } else {
            finish();
          }
        };

        if (!slideImage || slideImage.complete) {
          handOver();
        } else {
          slideImage.addEventListener("load", handOver, { once: true });
          later(finish, 1200); // fallback if the load event never fires
        }
      }, OPEN_DELAY_MS + EXPAND_MS + 30);
    },
    [later],
  );

  // Where the pointer is right now — so a close can hand straight back to
  // whatever row it is still resting on.
  const pointerRef = useRef({ x: -1, y: -1 });
  useEffect(() => {
    const remember = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", remember);
    return () => window.removeEventListener("pointermove", remember);
  }, []);

  const [closing, setClosing] = useState(false);
  const handleClose = useCallback(() => {
    clearTimers();
    (document.activeElement as HTMLElement | null)?.blur?.();
    // Closed mid-flight (before the carousel ever opened): freeze the
    // expanding preview exactly where it is and blur it out in place —
    // the same exhale the list preview uses — never a snap or a return
    // flight.
    const node = previewRef.current;
    if (node && node.getAttribute("style")) {
      const rect = node.getBoundingClientRect();
      node.style.transition = "none";
      node.style.top = `${rect.top}px`;
      node.style.left = `${rect.left}px`;
      node.style.width = `${rect.width}px`;
      node.style.height = `${rect.height}px`;
      void node.offsetWidth;
      node.style.transition = "opacity 380ms ease, filter 380ms ease";
      node.style.opacity = "0";
      node.style.filter = "blur(14px)";
    }
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      // Strip the flight styles with transitions OFF: top/left snap home
      // together with transform. Removing them live lets the class
      // transition animate transform from "none" to the centring
      // translate(-50%,-50%) — the image would glide in from a corner.
      const preview = previewRef.current;
      if (preview) {
        // Hold the preview hidden through the reset: the hidden classes
        // have not committed yet, so clearing styles now would paint one
        // fully-visible frame. The inline shroud lifts a couple frames
        // later and the handback then blur-fades in from nothing.
        preview.setAttribute(
          "style",
          "transition: none; opacity: 0; filter: blur(16px)",
        );
        requestAnimationFrame(() =>
          requestAnimationFrame(() => preview.removeAttribute("style")),
        );
      }
      setOpen(null);
      setPhase("idle");
      setHovered(null);
      // If the cursor never left its row, the preview picks straight back
      // up — the carousel reads as having receded into it.
      window.setTimeout(() => {
        // Touch has no resting hover — never resurrect the preview there.
        if (window.matchMedia("(pointer: coarse)").matches) return;
        // Desktop waits for the page to breathe back in first, so the
        // preview never floats over a still-blurred stage.
        const { x, y } = pointerRef.current;
        const row = document
          .elementFromPoint(x, y)
          ?.closest(".nv-work-row");
        row?.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            clientX: x,
            clientY: y,
          }),
        );
      }, 700);
    }, 560);
  }, [clearTimers]);

  useEffect(() => {
    handleRowEnterRef.current = handleRowEnter;
    releaseRef.current = () => {
      if (open === null) setHovered(null);
    };
  }, [handleRowEnter, open]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onCapture = (event: Event) => {
      const row = (event.target as Element).closest?.(".nv-work-row");
      const id = row?.getAttribute("data-project");
      const project = workProjects.find((candidate) => candidate.id === id);
      if (project) handleRowEnterRef.current(project.id, project.images);
    };
    const onRelease = () => {
      releaseRef.current();
    };
    list.addEventListener("nv-blobcapture", onCapture);
    list.addEventListener("nv-blobrelease", onRelease);
    return () => {
      list.removeEventListener("nv-blobcapture", onCapture);
      list.removeEventListener("nv-blobrelease", onRelease);
    };
  }, []);

  const previewSrc =
    phase === "expanding" || phase === "reveal"
      ? open?.src ?? null
      : hovered?.src ?? null;

  // The last shown frame lingers through the fade-out — unmounting the image
  // the instant hover ends would make the exit look like a hard cut.
  const [lingerSrc, setLingerSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!previewSrc) return;
    const id = window.setTimeout(() => setLingerSrc(previewSrc), 0);
    return () => window.clearTimeout(id);
  }, [previewSrc]);
  const shownSrc = previewSrc ?? lingerSrc;
  // Never show a STALE frame: a single <img> keeps the old project's bitmap
  // on screen until the new one arrives, which read as the wrong preview
  // (and flew the wrong image into the carousel). The preview is keyed by
  // src, so each frame is its own element, and it only becomes visible
  // once that frame has loaded — a cached frame loads within the same
  // frame, so warmed hovers stay instant.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const frameReady = shownSrc !== null && loadedSrc === shownSrc;
  const previewVisible =
    phase === "expanding" ||
    phase === "reveal" ||
    (hovered !== null && open === null && frameReady);

  return (
    <div className="nv-page">
      <div className="nv-col" data-col="2">
        <ListBand>
        <ul
          ref={listRef}
          onPointerDownCapture={(event) => {
            lastPointerTouchRef.current = event.pointerType === "touch";
            touchGestureRef.current = {
              touch: event.pointerType === "touch",
              x: event.clientX,
              y: event.clientY,
              at: performance.now(),
              moved: 0,
            };
          }}
          onPointerMoveCapture={(event) => {
            const gesture = touchGestureRef.current;
            if (!gesture.touch) return;
            gesture.moved += Math.hypot(
              event.clientX - gesture.x,
              event.clientY - gesture.y,
            );
            gesture.x = event.clientX;
            gesture.y = event.clientY;
          }}
          className="nv-work-list"
          data-cursor-hide
          data-hovering={hovered !== null && open === null}
          onMouseLeave={() => open === null && setHovered(null)}
        >
          <HoverBlob glass rows=".nv-work-row" />
          {workProjects.map((project) => (
            <li key={project.id}>
              <button
                className="nv-work-row"
                data-cursor-pad="7"
                data-cursor-target
                data-project={project.id}
                onClick={(event) => {
                  if (
                    lastPointerTouchRef.current &&
                    event.nativeEvent.isTrusted
                  ) {
                    const gesture = touchGestureRef.current;
                    const quickTap =
                      gesture.moved < 12 &&
                      performance.now() - gesture.at < 400;
                    if (!quickTap) return;
                  }
                  handleOpen(project.id, project.images);
                }}
                onFocus={() => {
                  // Tap-focus must not summon the preview on touch.
                  if (lastPointerTouchRef.current) return;
                  handleRowEnter(project.id, project.images);
                }}
                onBlur={() => open === null && setHovered(null)}
                type="button"
              >
                <span className="nv-work-title">{project.title}</span>
                <span className="nv-work-year">{project.year ?? "—"}</span>
              </button>
            </li>
          ))}
        </ul>
        </ListBand>
      </div>

      {mounted
        ? createPortal(
            <>
              {/* One random frame from the hovered project, centred over the
                  main column. On click this node itself animates out to the
                  carousel slide's rect. */}
              <div
                className="nv-hover-preview"
                data-visible={previewVisible}
                ref={previewRef}
              >
                {shownSrc ? (
                  <Image
                    alt=""
                    height={1620}
                    key={shownSrc}
                    onLoad={() => setLoadedSrc(shownSrc)}
                    priority={false}
                    sizes={PREVIEW_SIZES}
                    src={shownSrc}
                    width={2880}
                  />
                ) : null}
              </div>

              {/* Hidden warm-up copies of every project's preview frame —
                  deferred past first paint so they never fight the page's
                  own images for bandwidth. */}
              {warm && previewSrcById ? (
                <div aria-hidden="true" className="nv-lightbox-prefetch">
                  {workProjects.map((project) => (
                    <Image
                      alt=""
                      height={1620}
                      key={project.id}
                      loading="eager"
                      sizes={PREVIEW_SIZES}
                      src={previewSrcById.get(project.id) ?? project.images[0]}
                      width={2880}
                    />
                  ))}
                </div>
              ) : null}

              {openProject && open ? (
                <Carousel
                  closing={closing}
                  entering={
                    phase === "expanding" ||
                    (closing && phase !== "open")
                  }
                  ready={phase === "open"}
                  images={openProject.images}
                  initialIndex={open.index}
                  onClose={handleClose}
                  onReady={handleCarouselReady}
                  title={openProject.title}
                />
              ) : null}
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

function Carousel({
  closing,
  entering,
  ready,
  images,
  initialIndex,
  onClose,
  onReady,
  title,
}: {
  closing: boolean;
  entering: boolean;
  ready: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
  onReady: (rect: DOMRect, slideImage: HTMLImageElement | null) => void;
  title: string;
}) {
  const total = images.length;
  // The strip is the image set repeated: the viewer always sits inside the
  // middle copy and gets re-centred there after every settle, so the carousel
  // loops without ever hitting an end. Small sets get more copies for runway.
  const copies = Math.max(3, Math.ceil(10 / total));
  const mid = Math.floor(copies / 2);

  const slides = useMemo(
    () =>
      Array.from({ length: copies * total }, (_, index) => ({
        key: index,
        src: images[index % total],
      })),
    [copies, images, total],
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // Mobile zoom state: which img is blown up, its pan offset, and how far
  // the finger travelled (to tell a pan from a tap). Imperative — panning
  // must never re-render.
  const zoomRef = useRef<{
    el: HTMLImageElement;
    x: number;
    y: number;
    scale: number;
    panning: boolean;
    lastX: number;
    lastY: number;
    moved: number;
  } | null>(null);
  const absRef = useRef(mid * total + initialIndex);
  // Stepping is driven by an explicit target index — never by the observed
  // nearest slide, which lags mid-animation and made clicks feel dead.
  const targetRef = useRef(mid * total + initialIndex);
  const animatingRef = useRef(false);
  const [active, setActive] = useState(initialIndex % total);
  const settleTimerRef = useRef<number | null>(null);
  const readyRef = useRef(false);

  const glideRafRef = useRef(0);
  const scrollToChild = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const track = trackRef.current;
      if (!track) return;
      const clamped = Math.max(0, Math.min(index, track.children.length - 1));
      const child = track.children[clamped] as HTMLElement | undefined;
      if (!child) return;
      const left =
        child.offsetLeft - (track.clientWidth - child.offsetWidth) / 2;
      cancelAnimationFrame(glideRafRef.current);
      if (behavior !== "smooth") {
        animatingRef.current = false;
        track.scrollTo({ left, behavior });
        return;
      }
      // A slower, gentler glide than native smooth scrolling: our own
      // eased tween, restartable mid-flight for rapid steps.
      animatingRef.current = true;
      const from = track.scrollLeft;
      const started = performance.now();
      const DURATION = 780;
      const ease = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const tick = () => {
        const progress = Math.min(
          1,
          (performance.now() - started) / DURATION,
        );
        track.scrollLeft = from + (left - from) * ease(progress);
        if (progress < 1) {
          glideRafRef.current = requestAnimationFrame(tick);
        }
      };
      glideRafRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  // Every step moves exactly one slide from the last REQUESTED position, so
  // rapid clicks accumulate and none are swallowed.
  const step = useCallback(
    (direction: number) => {
      const track = trackRef.current;
      if (!track) return;
      // Infinite runway: if the next target would leave the middle copy,
      // shift a full copy-width FIRST (instant and invisible — the strip
      // is periodic). Rapid stepping can outrun the settle-time
      // normalize, and without this it piles into the strip's end and
      // hits a wall.
      const firstChild = track.children[0] as HTMLElement | undefined;
      const copyStart = track.children[total] as HTMLElement | undefined;
      const copyWidth =
        firstChild && copyStart
          ? copyStart.offsetLeft - firstChild.offsetLeft
          : 0;
      let next = targetRef.current + direction;
      if (copyWidth > 0) {
        while (next >= (mid + 1) * total) {
          track.scrollLeft -= copyWidth;
          next -= total;
        }
        while (next < mid * total) {
          track.scrollLeft += copyWidth;
          next += total;
        }
      }
      targetRef.current = Math.max(
        0,
        Math.min(next, track.children.length - 1),
      );
      scrollToChild(targetRef.current);
    },
    [mid, scrollToChild, total],
  );

  // Teleport back into the middle copy once scrolling settles (the strip is
  // periodic, so shifting by one copy-width is invisible), then — since
  // there's no CSS snap to fight with — gently centre the nearest slide if
  // free scrolling left it off-centre.
  const normalize = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    // Never correct mid-flight — that is what caused the late re-centre
    // hop. The ongoing scroll keeps re-arming the settle timer, so this
    // simply runs again once the glide has actually finished.
    if (animatingRef.current) return;
    if (fingerRef.current) return; // never teleport under a live touch
    const first = track.children[0] as HTMLElement | undefined;
    const next = track.children[total] as HTMLElement | undefined;
    if (!first || !next) return;
    const copyWidth = next.offsetLeft - first.offsetLeft;

    while (absRef.current >= (mid + 1) * total) {
      track.scrollLeft -= copyWidth;
      absRef.current -= total;
    }
    while (absRef.current < mid * total) {
      track.scrollLeft += copyWidth;
      absRef.current += total;
    }
    targetRef.current = absRef.current;

    // On touch devices scroll-snap owns the centring; a programmatic
    // smooth-scroll here fought the native gesture and read as a glitch.
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const child = track.children[absRef.current] as HTMLElement | undefined;
    if (child) {
      const target =
        child.offsetLeft - (track.clientWidth - child.offsetWidth) / 2;
      if (Math.abs(track.scrollLeft - target) > 2) {
        track.scrollTo({ left: target, behavior: "smooth" });
      }
    }
  }, [mid, total]);

  const unclipSlide = useCallback((el: HTMLImageElement) => {
    // The slide clips blur spill; a zoomed or dragged photo must ride
    // OVER the frame, never zoom inside a letterboxed window.
    const slide = el.closest(".nv-carousel-slide") as HTMLElement | null;
    if (slide) {
      slide.style.overflow = "visible";
      slide.style.zIndex = "6";
    }
    el.style.clipPath = "none";
    el.style.zIndex = "5";
    el.style.position = "relative";
    // Own compositor layer: without it the moving, blurred photo left
    // stale ghost tiles behind in the masked track.
    el.style.willChange = "transform, filter";
  }, []);

  const reclipSlide = useCallback((el: HTMLImageElement) => {
    const slide = el.closest(".nv-carousel-slide") as HTMLElement | null;
    if (slide) {
      slide.style.overflow = "";
      slide.style.zIndex = "";
    }
    el.style.clipPath = "";
    el.style.zIndex = "";
    el.style.position = "";
    el.style.willChange = "";
  }, []);

  const unzoom = useCallback(() => {
    const zoom = zoomRef.current;
    if (!zoom) return;
    zoom.el.style.transition = "transform 260ms ease";
    zoom.el.style.transform = "";
    const cleared = zoom.el;
    window.setTimeout(() => {
      cleared.style.transition = "";
      reclipSlide(cleared);
    }, 280);
    if (trackRef.current) trackRef.current.style.touchAction = "";
    zoomRef.current = null;
  }, [reclipSlide]);

  // Mobile: tap the image to zoom in and drag to look around; tap the
  // image again to zoom back out; tap anywhere OUTSIDE the image to
  // dismiss the carousel.
  const handleRootClick = useCallback(
    (event: React.MouseEvent) => {
      if (!window.matchMedia("(pointer: coarse)").matches) return;
      const target = event.target as HTMLElement;
      if (target.closest(".nv-carousel-close, .nv-reader-close")) return;
      if (target.tagName === "IMG" && target.closest(".nv-carousel-slide")) {
        const zoom = zoomRef.current;
        if (zoom && zoom.moved > 8) {
          zoom.moved = 0; // that was a pan, not a tap
          return;
        }
        if (zoom) {
          unzoom();
          return;
        }
        const el = target as HTMLImageElement;
        unclipSlide(el);
        // Zoom INTO the tapped spot: keep that point stationary under the
        // finger while the rest of the image grows around it.
        const SCALE = 2.2;
        const box = el.getBoundingClientRect();
        const px = event.clientX - (box.left + box.width / 2);
        const py = event.clientY - (box.top + box.height / 2);
        const maxX = (el.offsetWidth * (SCALE - 1)) / 2;
        const maxY = (el.offsetHeight * (SCALE - 1)) / 2;
        const zx = Math.max(-maxX, Math.min(maxX, -px * (SCALE - 1)));
        const zy = Math.max(-maxY, Math.min(maxY, -py * (SCALE - 1)));
        el.style.transition = "transform 260ms ease";
        el.style.transform = `translate(${zx}px, ${zy}px) scale(${SCALE})`;
        window.setTimeout(() => {
          el.style.transition = "";
        }, 280);
        zoomRef.current = {
          el,
          x: zx,
          y: zy,
          scale: 2.2,
          panning: false,
          lastX: 0,
          lastY: 0,
          moved: 0,
        };
        // While zoomed, the strip must not scroll — drags pan the image.
        if (trackRef.current) trackRef.current.style.touchAction = "none";
        return;
      }
      onClose();
    },
    [onClose, unclipSlide, unzoom],
  );

  // Touch gestures on the strip: one finger pans a ZOOMED image; on an
  // unzoomed image a DOWNWARD drag picks the photo up — released with
  // intent it flies out carrying the finger's own velocity, blurring away
  // as the carousel closes. A hesitant drag springs back.
  const fingerRef = useRef(false);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let drag: {
      el: HTMLImageElement;
      startX: number;
      startY: number;
      dx: number;
      dy: number;
      lastX: number;
      lastY: number;
      lastT: number;
      vx: number;
      vy: number;
      active: boolean;
      armed?: boolean;
    } | null = null;

    const setDragFade = (progress: number) => {
      const value = progress <= 0 ? null : progress.toFixed(3);
      const targets = [root, document.body];
      for (const el of targets) {
        if (value === null) {
          el.style.removeProperty("--nv-dragfade");
          el.removeAttribute("data-dragfade");
        } else {
          el.style.setProperty("--nv-dragfade", value);
          el.setAttribute("data-dragfade", "");
        }
      }
    };

    const settleBack = (el: HTMLImageElement) => {
      el.style.transition =
        "transform 280ms cubic-bezier(0.2, 0.7, 0.3, 1), filter 280ms ease";
      el.style.transform = "";
      el.style.filter = "";
      setDragFade(0);
      el.closest(".nv-carousel-slide")?.removeAttribute("data-dragging");
      window.setTimeout(() => {
        el.style.transition = "";
        reclipSlide(el);
      }, 300);
    };

    const down = (event: PointerEvent) => {
      if (event.pointerType === "touch") fingerRef.current = true;
      const zoom = zoomRef.current;
      if (zoom && event.target === zoom.el) {
        zoom.panning = true;
        zoom.lastX = event.clientX;
        zoom.lastY = event.clientY;
        zoom.moved = 0;
        zoom.el.setPointerCapture?.(event.pointerId);
        return;
      }
      const target = event.target as HTMLElement;
      if (
        event.pointerType === "touch" &&
        !zoom &&
        target.tagName === "IMG" &&
        target.closest(".nv-carousel-slide")
      ) {
        drag = {
          el: target as HTMLImageElement,
          startX: event.clientX,
          startY: event.clientY,
          dx: 0,
          dy: 0,
          lastX: event.clientX,
          lastY: event.clientY,
          lastT: event.timeStamp,
          vx: 0,
          vy: 0,
          active: false,
        };
      }
    };
    const move = (event: PointerEvent) => {
      const zoom = zoomRef.current;
      if (zoom && zoom.panning) {
        const dx = event.clientX - zoom.lastX;
        const dy = event.clientY - zoom.lastY;
        zoom.lastX = event.clientX;
        zoom.lastY = event.clientY;
        zoom.moved += Math.abs(dx) + Math.abs(dy);
        const maxX = (zoom.el.offsetWidth * (zoom.scale - 1)) / 2;
        const maxY = (zoom.el.offsetHeight * (zoom.scale - 1)) / 2;
        zoom.x = Math.max(-maxX, Math.min(maxX, zoom.x + dx));
        zoom.y = Math.max(-maxY, Math.min(maxY, zoom.y + dy));
        zoom.el.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`;
        return;
      }
      if (!drag) return;
      const dxTotal = event.clientX - drag.startX;
      const dyTotal = event.clientY - drag.startY;
      if (!drag.active) {
        // Vertical-dominant gestures belong to us (the track owns
        // horizontal); once engaged the photo follows the finger freely
        // in EVERY direction, iOS-style.
        if (Math.abs(dyTotal) < 12 || Math.abs(dyTotal) <= Math.abs(dxTotal)) {
          return;
        }
        drag.active = true;
        unclipSlide(drag.el);
        drag.el.closest(".nv-carousel-slide")?.setAttribute(
          "data-dragging",
          "",
        );
      }
      const dt = Math.max(8, event.timeStamp - drag.lastT);
      drag.vx = (event.clientX - drag.lastX) / dt;
      drag.vy = (event.clientY - drag.lastY) / dt;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.lastT = event.timeStamp;
      drag.dx = dxTotal;
      drag.dy = dyTotal;
      const dist = Math.hypot(drag.dx, drag.dy);
      if (dist > 110 && !drag.armed) {
        drag.armed = true;
        hapticTick(); // past the point of no return — releasing closes
      } else if (dist <= 100 && drag.armed) {
        drag.armed = false;
      }
      const squeeze = Math.max(0.88, 1 - dist / 1500);
      // The further you carry it, the more the carousel dissolves and the
      // page behind breathes back into focus — continuous, frame by
      // frame, no transitions fighting the finger.
      const progress = Math.min(1, dist / 300);
      setDragFade(progress);
      drag.el.style.filter = `blur(${(progress * 3).toFixed(2)}px)`;
      drag.el.style.transform = `translate(${drag.dx}px, ${drag.dy}px) scale(${squeeze})`;
    };
    const up = () => {
      fingerRef.current = false;
      const zoom = zoomRef.current;
      if (zoom) zoom.panning = false;
      if (!drag) return;
      const flung = drag;
      drag = null;
      if (!flung.active) return;
      const dist = Math.hypot(flung.dx, flung.dy);
      const speed = Math.hypot(flung.vx, flung.vy);
      if (dist > 110 || (speed > 0.55 && dist > 48)) {
        // Fly out ALONG the finger's own velocity vector, blurring away
        // FROM the blur it already carries — no restart bump.
        const nx = speed > 0.05 ? flung.vx / speed : 0;
        const ny = speed > 0.05 ? flung.vy / speed : 1;
        const carry = Math.min(620, Math.max(220, speed * 340));
        const squeeze = Math.max(0.88, 1 - dist / 1500);
        const startBlur = Math.min(1, dist / 300) * 3;
        setDragFade(0);
        flung.el.animate(
          [
            {
              transform: `translate(${flung.dx}px, ${flung.dy}px) scale(${squeeze})`,
              opacity: 1,
              filter: `blur(${startBlur.toFixed(2)}px)`,
            },
            {
              transform: `translate(${flung.dx + nx * carry}px, ${flung.dy + ny * carry}px) scale(0.86)`,
              opacity: 0,
              filter: "blur(12px)",
            },
          ],
          {
            duration: 360,
            easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
            fill: "forwards",
          },
        );
        onClose();
      } else {
        settleBack(flung.el);
      }
    };
    const cancel = () => {
      fingerRef.current = false;
      const zoom = zoomRef.current;
      if (zoom) zoom.panning = false;
      if (drag?.active) settleBack(drag.el);
      drag = null;
    };
    root.addEventListener("pointerdown", down);
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerup", up);
    root.addEventListener("pointercancel", cancel);
    return () => {
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerup", up);
      root.removeEventListener("pointercancel", cancel);
    };
  }, [onClose, reclipSlide, unclipSlide]);

  // Start centred on the previewed frame, then report that slide's rect and
  // image so the preview can expand exactly onto it. Slide sizes are pure
  // CSS, so the layout is valid before any image loads.
  useEffect(() => {
    scrollToChild(mid * total + initialIndex, "auto");
    if (readyRef.current) return;
    readyRef.current = true;

    const track = trackRef.current;
    const child = track?.children[mid * total + initialIndex];
    if (child instanceof HTMLElement) {
      onReady(child.getBoundingClientRect(), child.querySelector("img"));
    }
  }, [initialIndex, mid, onReady, scrollToChild, total]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (!ready) return; // stepping unlocks only once fully open
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };

    document.addEventListener("keydown", onKeyDown);
    lockScroll();
    document.body.setAttribute("data-overlay", "");

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
      document.body.removeAttribute("data-overlay");
    };
  }, [onClose, ready, step]);

  // Vertical wheel input drives horizontal scroll. Listens on the root since
  // the tap zones sit above the track; needs a non-passive listener, so it
  // can't be a React onWheel prop.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onWheel = (event: WheelEvent) => {
      const track = trackRef.current;
      if (!track || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      animatingRef.current = false;
      track.scrollLeft += event.deltaY;
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(
    () => () => {
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }
    },
    [],
  );

  // Whichever slide is nearest the viewport centre is the active one. The
  // same pass drives the edge shader: each slide gets --edge (0 centre → 1 at
  // the viewport edge) and --edir (which side it's leaving on), consumed by
  // compositor-only CSS.
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const half = track.clientWidth / 2;
    const centre = track.scrollLeft + half;
    let nearest = 0;
    let smallest = Infinity;

    Array.from(track.children).forEach((child, index) => {
      const slide = child as HTMLElement;
      const offset = slide.offsetLeft + slide.offsetWidth / 2 - centre;
      const distance = Math.abs(offset);
      if (distance < smallest) {
        smallest = distance;
        nearest = index;
      }

    });

    if (animatingRef.current) {
      if (nearest === targetRef.current && smallest < 4) {
        animatingRef.current = false;
      }
    } else {
      targetRef.current = nearest;
    }

    absRef.current = nearest;
    setActive(nearest % total);

    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = window.setTimeout(normalize, 160);
  }, [normalize, total]);

  return (
    <div
      aria-label={title}
      aria-modal="true"
      className="nv-carousel"
      data-closing={closing || undefined}
      data-entering={entering}
      data-ready={ready}
      onClick={handleRootClick}
      ref={rootRef}
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
        <MagneticButton className="nv-carousel-close" onClick={onClose}>
          Close
        </MagneticButton>
      </div>

      <div className="nv-carousel-track" onScroll={handleScroll} ref={trackRef}>
        {slides.map((slide) => {
          const nearInitial =
            Math.abs(slide.key - (mid * total + initialIndex)) <= 1;
          const inMiddleCopy = Math.floor(slide.key / total) === mid;
          return (
            <div
              className="nv-carousel-slide"
              data-hero={
                slide.key === mid * total + initialIndex ? "" : undefined
              }
              key={slide.key}
            >
              <Image
                alt={`${title}, ${(slide.key % total) + 1} of ${total}`}
                draggable={false}
                height={1620}
                loading={
                  nearInitial ? undefined : inMiddleCopy ? "eager" : "lazy"
                }
                priority={nearInitial}
                sizes={IMAGE_SIZES}
                src={slide.src}
                width={2880}
              />
            </div>
          );
        })}
      </div>

      {/* Progressive edge blur: stationary backdrop bands the slides pass
          under — heavy at the very edge, clearing toward the centre. */}
      <div aria-hidden="true" className="nv-carousel-blur" data-side="left" />
      <div aria-hidden="true" className="nv-carousel-blur" data-side="right" />

      {/* Stagnant position markers — one short tick per image, the active one
          darker. Not interactive. */}
      <div aria-hidden="true" className="nv-carousel-ticks">
        {images.map((src, index) => (
          <span data-active={index === active} key={src} />
        ))}
      </div>

      {/* Tap zones: left half steps back, right half steps forward. Native
          resize cursors instead of the site cursor. */}
      <button
        aria-label="Previous image"
        className="nv-carousel-zone"
        data-side="left"
        onClick={() => ready && step(-1)}
        tabIndex={-1}
        type="button"
      />
      <button
        aria-label="Next image"
        className="nv-carousel-zone"
        data-side="right"
        onClick={() => ready && step(1)}
        tabIndex={-1}
        type="button"
      />
    </div>
  );
}
