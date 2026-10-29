import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CanvasExperience from "../../experience";

const articleTitles: Record<string, string> = {
  "notes-on-design": "Notes on design",
};

export function generateStaticParams() {
  return Object.keys(articleTitles).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = articleTitles[slug];
  return { title: title ? `${title} — Raghav Agarwal` : "Writing — Raghav Agarwal" };
}

export default async function WritingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!articleTitles[slug]) notFound();
  return <CanvasExperience initialPath={`/writing/${slug}`} />;
}
