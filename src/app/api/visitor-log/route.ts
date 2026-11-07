import { NextRequest, NextResponse } from "next/server";
import {
  appendVisitorEvent,
  hasVisitorLogAccess,
  IGNORE_COOKIE,
  readVisitorEvents,
  VISITOR_COOKIE,
  visitorLogReady,
  type VisitorEvent,
} from "../../../lib/visitor-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const botPattern = /\b(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|twitterbot|linkedinbot|slackbot|embedly)\b/i;

function privateResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: NextRequest) {
  if (!visitorLogReady()) return privateResponse({ error: "Visitor log is not configured" }, 503);
  if (!(await hasVisitorLogAccess())) return privateResponse({ error: "Unauthorized" }, 401);
  const rawOffset = Number(request.nextUrl.searchParams.get("offset") ?? "0");
  const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 5000) : 0;
  try {
    return privateResponse(await readVisitorEvents(offset));
  } catch {
    return privateResponse({ error: "Could not read visitor log" }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!visitorLogReady()) return new Response(null, { status: 204 });
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return new Response(null, { status: 403 });
  if (request.cookies.get(IGNORE_COOKIE)?.value === "1" ||
      request.cookies.has("rghv_visitor_log_access") ||
      botPattern.test(request.headers.get("user-agent") ?? "")) {
    return new Response(null, { status: 204 });
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }
  const { kind, path, session, durationMs } = input;
  if ((kind !== "page" && kind !== "open" && kind !== "duration") ||
      typeof path !== "string" || path.length < 1 || path.length > 200 ||
      typeof session !== "string" || !/^[a-f0-9-]{36}$/.test(session) ||
      (kind === "duration" && (typeof durationMs !== "number" || !Number.isFinite(durationMs)))) {
    return new Response(null, { status: 400 });
  }
  if (kind !== "open" && (!path.startsWith("/") || path.startsWith("//"))) {
    return new Response(null, { status: 400 });
  }
  if (path.startsWith("/private/") || path.startsWith("/debug/") || path.startsWith("/api/")) {
    return new Response(null, { status: 204 });
  }

  const suppliedVisitor = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitor = suppliedVisitor && /^[a-f0-9-]{36}$/.test(suppliedVisitor)
    ? suppliedVisitor : crypto.randomUUID();
  const rawCity = request.headers.get("x-vercel-ip-city") ?? "";
  let city = rawCity;
  try { city = decodeURIComponent(rawCity); } catch { /* Keep undecoded city. */ }
  city = city.trim().slice(0, 80) || "Unknown";
  const country = (request.headers.get("x-vercel-ip-country") ?? "").trim().slice(0, 2) || "Unknown";
  if (city.toUpperCase() === "MADIUN" && country.toUpperCase() === "ID") {
    return new Response(null, { status: 204 });
  }
  const event: VisitorEvent = {
    session,
    visitor,
    kind,
    path,
    at: Date.now(),
    city,
    country,
    ...(kind === "duration" ? { durationMs: Math.min(Math.max(durationMs as number, 0), 60 * 60 * 1000) } : {}),
  };
  try {
    await appendVisitorEvent(event);
  } catch {
    return new Response(null, { status: 503 });
  }
  const response = new NextResponse(null, { status: 204 });
  if (visitor !== suppliedVisitor) {
    response.cookies.set(VISITOR_COOKIE, visitor, {
      path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
