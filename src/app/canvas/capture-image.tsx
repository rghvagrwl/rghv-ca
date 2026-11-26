import { captureImages } from "../../lib/captures";

// These responsive files are encoded at import time, bypassing /_next/image.
export default function CaptureImage({ id, thumbnail = false, first = false }: {
  id: string;
  thumbnail?: boolean;
  first?: boolean;
}) {
  const image = captureImages[id];
  const sources = thumbnail ? image.sources.slice(0, 1) : image.sources.slice(1);
  const fallback = sources[sources.length - 1];
  const displayedWidth = Math.min(512, 512 * image.width / image.height);
  const viewportFraction = Math.min(1, image.width / image.height);

  // Native srcSet serves exactly the prepared sizes; Next's optimizer adds no value here.
  /* eslint-disable @next/next/no-img-element */
  return <img
    src={fallback.src}
    srcSet={sources.map(({ src, width }) => `${src} ${width}w`).join(", ")}
    sizes={thumbnail ? "92px" : `(max-width: 552px) calc((100vw - 40px) * ${viewportFraction}), ${displayedWidth}px`}
    width={image.width}
    height={image.height}
    alt={thumbnail ? "" : image.alt}
    loading={first ? "eager" : "lazy"}
    fetchPriority={first ? "high" : undefined}
    decoding="async"
    draggable={false}
    style={thumbnail ? undefined : { position: "absolute", inset: 0, width: "100%", height: "100%" }}
  />;
}
