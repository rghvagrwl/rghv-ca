import type { Metadata, Viewport } from "next";
import Shell from "./shell";

// Lock the frame on phones: no pinch-zooming out of the layout, safe-area
// aware, and the browser chrome matches the page colour.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // dark parked: restore the per-scheme array when dark mode returns.
  themeColor: "#f0f0f0",
};

export const metadata: Metadata = {
  title: "raghav agarwal",
  description:
    "Raghav Agarwal is a designer working across product, brand, and digital interfaces.",
};

export default function NewLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Shell>{children}</Shell>
  );
}
