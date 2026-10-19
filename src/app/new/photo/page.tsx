"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { photos } from "../content";
import { triplet } from "../sound";

// One quiet stream of photos. Clicking anywhere in the stream — an image
// or the gaps between them — toggles the whole column between the reading
// measure and a near-full-screen one, every image scaling in unison.
// On touch, tapping an IMAGE instead dives right into it (2.6x, panning
// in every direction with the finger); tapping again zooms back out.

export default function PhotoPage() {
  const [expanded, setExpanded] = useState(false);
  const handleFlowClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    triplet();
    // Zoom RELATIVE to the click: whichever photo you clicked (or the one
    // nearest a gap click) holds its place on screen while the whole
    // column breathes — the scroll tracks it through the transition.
    const flow = event.currentTarget as HTMLElement;
    let anchor = target.closest(".nv-photo") as HTMLElement | null;
    if (!anchor) {
      let bestD = Infinity;
      for (const photo of flow.querySelectorAll<HTMLElement>(".nv-photo")) {
        const rect = photo.getBoundingClientRect();
        const d = Math.abs(event.clientY - (rect.top + rect.height / 2));
        if (d < bestD) {
          bestD = d;
          anchor = photo;
        }
      }
    }
    if (anchor) {
      const anchorEl = anchor;
      const holdTop = anchorEl.getBoundingClientRect().top;
      const main = document.querySelector(".nv-main");
      const useMain =
        main !== null && getComputedStyle(main).overflowY === "auto";
      const started = performance.now();
      // The anchor loop yields INSTANTLY to the user: any wheel or touch
      // scroll during the resize cancels the tracking — never fight the
      // reader for the scrollbar.
      let ceded = false;
      const cede = () => {
        ceded = true;
        window.removeEventListener("wheel", cede);
        window.removeEventListener("touchmove", cede);
      };
      window.addEventListener("wheel", cede, { passive: true });
      window.addEventListener("touchmove", cede, { passive: true });
      const track = () => {
        if (ceded) return;
        const drift = anchorEl.getBoundingClientRect().top - holdTop;
        if (Math.abs(drift) > 0.5) {
          if (useMain && main) main.scrollTop += drift;
          else window.scrollBy(0, drift);
        }
        if (performance.now() - started < 920) {
          requestAnimationFrame(track);
        } else {
          cede();
        }
      };
      requestAnimationFrame(track);
    }
    setExpanded((value) => !value);
  };


  return (
    <div className="nv-page" data-photo-expanded={expanded}>
      <div className="nv-col" data-col="1">
        {/* Gaps count: the whole flow is the click surface. */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
        <div
          className="nv-photo-flow"
          onClick={handleFlowClick}
        >
          {photos.map((photo, index) => (
            <button className="nv-photo" key={photo.src} type="button">
              <Image
                alt={photo.caption ?? ""}
                height={photo.height}
                loading={index < 6 ? "eager" : undefined}
                onLoad={(event) =>
                  event.currentTarget.setAttribute("data-loaded", "true")
                }
                priority={index < 3}
                sizes="(max-width: 760px) 92vw, 94vw"
                src={photo.src}
                style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                width={photo.width}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
