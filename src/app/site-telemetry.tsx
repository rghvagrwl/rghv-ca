"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { usePathname } from "next/navigation";
import Script from "next/script";
import VisitorTracker from "./visitor-tracker";

const GA_MEASUREMENT_ID = "G-7J753C2G2R";

export default function SiteTelemetry({ trackVisits }: { trackVisits: boolean }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/private/")) return null;

  return (
    <>
      {trackVisits ? <VisitorTracker /> : null}
      <Analytics />
      <SpeedInsights />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
