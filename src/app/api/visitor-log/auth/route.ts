import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, accessToken, matchesAccessKey, visitorLogRateLimited, visitorLogReady } from "../../../../lib/visitor-log";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!visitorLogReady()) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    if (await visitorLogRateLimited(request, "auth")) {
      return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429, headers: { "Cache-Control": "no-store" } });
    }
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
  let input: { key?: string };
  try {
    input = (await request.json()) as { key?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof input.key !== "string" || !matchesAccessKey(input.key)) {
    return NextResponse.json({ error: "Invalid access key" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(ACCESS_COOKIE, accessToken(process.env.VISITOR_LOG_ACCESS_KEY!), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict",
    path: "/", maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.delete(ACCESS_COOKIE);
  return response;
}
