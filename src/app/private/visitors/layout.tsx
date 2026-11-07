import type { Metadata } from "next";

export const metadata: Metadata = { title: "Visitor log", robots: { index: false, follow: false } };

export default function VisitorLogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
