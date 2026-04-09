import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import localFont from "next/font/local";
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

export const metadata: Metadata = {
  title: "raghav agarwal",
  description:
    "Raghav Agarwal is a designer working across product, brand, and digital interfaces. His practice is shaped by observation, with a focus on micro interactions, emotional friction, and inconsistencies in how people experience interfaces. He believes design should feel clear and intuitive, where the decisions do not require explanation.",
  openGraph: {
    title: "raghav agarwal",
    description:
      "Raghav Agarwal is a designer working across product, brand, and digital interfaces. His practice is shaped by observation, with a focus on micro interactions, emotional friction, and inconsistencies in how people experience interfaces. He believes design should feel clear and intuitive, where the decisions do not require explanation.",
  },
  twitter: {
    title: "raghav agarwal",
    description:
      "Raghav Agarwal is a designer working across product, brand, and digital interfaces. His practice is shaped by observation, with a focus on micro interactions, emotional friction, and inconsistencies in how people experience interfaces. He believes design should feel clear and intuitive, where the decisions do not require explanation.",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${switzer.variable} h-full scroll-smooth antialiased`}>
      <body className="min-h-full">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
      {gaMeasurementId ? <GoogleAnalytics gaId={gaMeasurementId} /> : null}
    </html>
  );
}
