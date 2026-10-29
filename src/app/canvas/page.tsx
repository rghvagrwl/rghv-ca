import type { Metadata } from "next";
import CanvasExperience from "./experience";

export const metadata: Metadata = {
  title: "Raghav Agarwal",
  description: "A designer and student from Calgary, Canada.",
};

export default function CanvasPage() {
  return <CanvasExperience />;
}
