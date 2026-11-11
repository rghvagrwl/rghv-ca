import type { Metadata } from "next";
import localFont from "next/font/local";
import SiteTelemetry from "./site-telemetry";
import { visitorLogReady } from "../lib/visitor-log";
import "./globals.css";

const switzer = localFont({
  variable: "--font-switzer",
  src: [
    {
      path: "../../public/fonts/switzer/Switzer-Variable.woff2",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "../../public/fonts/switzer/Switzer-VariableItalic.woff2",
      style: "italic",
      weight: "100 900",
    },
  ],
  display: "swap",
});
const siteDescription =
  "Raghav Agarwal is a designer working across product, brand, and digital interfaces.";

export const metadata: Metadata = {
  metadataBase: new URL("https://rghv.ca"),
  title: "Raghav Agarwal",
  description: siteDescription,
  openGraph: {
    title: "raghav agarwal",
    description: siteDescription,
  },
  twitter: {
    title: "raghav agarwal",
    description: siteDescription,
    card: "summary_large_image",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <html lang="en" className={`${switzer.variable} h-full scroll-smooth antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: 'try { const theme = localStorage.getItem("canvas-theme"); if (theme === "light" || theme === "dark") document.documentElement.dataset.canvasTheme = theme; } catch {}' }} />
      </head>
      <body className="min-h-full">
        {children}
        {isProduction ? <SiteTelemetry trackVisits={visitorLogReady()} /> : null}
      </body>
    </html>
  );
}
