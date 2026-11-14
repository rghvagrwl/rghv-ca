import type { Metadata } from "next";
import previews from "./social-previews.json";

export function socialMetadata(key: string): Metadata {
  const preview = previews[key as keyof typeof previews] ?? previews.home;
  const image = typeof preview.image === "string"
    ? { url: preview.image, width: 1200, height: 630, alt: preview.title }
    : preview.image;
  const twitterImage = "twitterImage" in preview ? { ...image, ...preview.twitterImage } : image;
  return {
    title: preview.title,
    description: preview.description,
    openGraph: { title: preview.title, description: preview.description, type: "website", siteName: "Raghav Agarwal", images: [image] },
    twitter: { card: "summary_large_image", title: preview.title, description: preview.description, images: [twitterImage] },
  };
}
