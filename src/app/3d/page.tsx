import type { Metadata } from "next";
import CanvasExperience from "../canvas/experience";

const title = "3D";
const description = "Interactive studies of everyday objects by Raghav Agarwal.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { card: "summary_large_image", title, description },
};

export default function StudiesIndex() {
  return <CanvasExperience initialPath="/3d" />;
}
