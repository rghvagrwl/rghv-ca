import albums from "./captures.json";
import imageManifest from "./capture-images.json";

export type CaptureImageAsset = {
  width: number;
  height: number;
  alt: string;
  sources: { src: string; width: number; bytes: number }[];
};

export const captureImages: Record<string, CaptureImageAsset> = imageManifest;

export const captures = albums;

export function captureImageAspect(capture: typeof captures[number], index: number) {
  const image = captureImages[capture.images[index]];
  return `${image.width} / ${image.height}`;
}
