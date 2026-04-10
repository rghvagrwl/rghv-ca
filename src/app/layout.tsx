import type { Metadata } from "next";
import Script from "next/script";
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
const GA_MEASUREMENT_ID = "G-7J753C2G2R";
const siteDescription =
  "Raghav Agarwal is a designer working across product, brand, and digital interfaces.";

export const metadata: Metadata = {
  title: "raghav agarwal",
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
    <html lang="en" className={`${switzer.variable} h-full scroll-smooth antialiased`}>
      <body className="min-h-full">
        {children}
        {isProduction ? <Analytics /> : null}
        {isProduction ? <SpeedInsights /> : null}
        {isProduction ? (
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="lazyOnload"
          />
        ) : null}
        {isProduction ? (
          <Script id="google-analytics" strategy="lazyOnload">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
          </Script>
        ) : null}
      </body>
    </html>
  );
}
