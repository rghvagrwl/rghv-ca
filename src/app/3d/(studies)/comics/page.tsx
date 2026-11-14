import type { Viewport } from "next";
import { socialMetadata } from "../../../../lib/social-metadata";
import ComicsScene from "./scene";

export const metadata = socialMetadata("comics");

export const viewport: Viewport = { viewportFit: "cover" };

export default function ComicsPage() {
  return <ComicsScene />;
}
