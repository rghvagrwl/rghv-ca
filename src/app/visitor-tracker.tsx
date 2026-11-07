"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const ENDPOINT = "/api/visitor-log";
const SESSION_KEY = "rghv_visit_session";

function getSession() {
  try {
    const previous = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null") as { id?: string; at?: number } | null;
    const now = Date.now();
    const id = previous?.id && previous.at && now - previous.at < 30 * 60 * 1000
      ? previous.id : crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, at: now }));
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function send(event: { kind: "page" | "open" | "duration" | "heartbeat"; path: string; session: string; durationMs?: number }, beacon = false) {
  const body = JSON.stringify(event);
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch(ENDPOINT, {
    method: "POST", body, credentials: "same-origin", keepalive: beacon,
    headers: { "Content-Type": "application/json" },
  }).catch(() => {});
}

export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/private/") || pathname.startsWith("/debug/")) return;
    const session = getSession();
    let visibleSince = document.visibilityState === "visible" ? performance.now() : 0;
    const duration = () => {
      if (!visibleSince) return;
      const elapsed = performance.now() - visibleSince;
      visibleSince = 0;
      if (elapsed >= 1000) send({ kind: "duration", path: pathname, session, durationMs: Math.round(elapsed) }, true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") duration();
      else visibleSince = performance.now();
    };
    const onClick = (event: MouseEvent) => {
      const marked = (event.target as Element | null)?.closest("[data-visitor-event]");
      const markedLabel = marked?.getAttribute("data-visitor-event");
      if (markedLabel) send({ kind: "open", path: markedLabel.slice(0, 200), session });
      const link = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      try {
        const target = new URL(link.href);
        if (target.origin !== window.location.origin) {
          send({ kind: "open", path: target.hostname || target.protocol.replace(":", ""), session }, true);
        }
      } catch { /* Ignore invalid links. */ }
    };
    send({ kind: "page", path: pathname, session });
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === "visible") send({ kind: "heartbeat", path: pathname, session });
    }, 60_000);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("pagehide", duration);
    return () => {
      window.clearInterval(heartbeat);
      duration();
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("pagehide", duration);
    };
  }, [pathname]);

  return null;
}
