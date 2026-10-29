import { socialMetadata } from "../../../../lib/social-metadata";
import { notFound } from "next/navigation";
import CanvasExperience from "../../experience";

const captureSlugs = ["tonys-pizza-in-sf", "over-the-bridge", "vancouver"];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return socialMetadata(`capture-${slug}`);
}

export default async function CaptureDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!captureSlugs.includes(slug)) notFound();
  return <CanvasExperience initialPath={`/captures/${slug}`} />;
}
