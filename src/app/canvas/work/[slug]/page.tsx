import { socialMetadata } from "../../../../lib/social-metadata";
import { notFound, permanentRedirect } from "next/navigation";
import { workProjects } from "../../../new/content";
import CanvasExperience from "../../experience";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return socialMetadata(`work-${slug === "vercel-2026" ? "vercel" : slug}`);
}

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "vercel-2026") permanentRedirect("/work/vercel");
  if (slug === "vercel") return <CanvasExperience initialPath="/work/vercel" />;
  if (!workProjects.some((project) => project.id === slug)) notFound();
  return <CanvasExperience initialPath={`/work/${slug}`} />;
}
