import { socialMetadata } from "../../../../lib/social-metadata";
import { notFound } from "next/navigation";
import CanvasExperience from "../../experience";

import { captures } from "../../../../lib/captures";

export const dynamicParams = false;

export function generateStaticParams() {
  return captures.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return socialMetadata(`capture-${slug}`);
}

export default async function CaptureDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!captures.some((capture) => capture.slug === slug)) notFound();
  return <CanvasExperience initialPath={`/captures/${slug}`} />;
}
