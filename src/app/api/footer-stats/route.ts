import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VISITOR_COOKIE_NAME = "rghv_vid";
const IGNORE_VISITOR_COOKIE_NAME = "rghv_ignore_visitor";
const LAST_VISITOR_KEY = "footer:last-visitor";
const ALL_TIME_VISITORS_KEY = "footer:visitors:all-time";
const DAY_SECONDS = 60 * 60 * 24;
const regionDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });

function decodeLegacyText(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolveCountryLabel(countryCode: string) {
  const code = countryCode.trim().toUpperCase();
  if (!code) {
    return "UNKNOWN COUNTRY";
  }
  if (code === "US") {
    return "USA";
  }
  if (code === "GB") {
    return "UK";
  }
  if (code === "AE") {
    return "UAE";
  }
  const countryName = regionDisplayNames.of(code);
  if (!countryName) {
    return "UNKNOWN COUNTRY";
  }
  const uppercaseCountryName = countryName.toUpperCase();
  if (uppercaseCountryName === "UNITED STATES") {
    return "USA";
  }
  if (uppercaseCountryName === "UNITED KINGDOM") {
    return "UK";
  }
  if (uppercaseCountryName === "UNITED ARAB EMIRATES") {
    return "UAE";
  }
  return uppercaseCountryName;
}

function normalizeCountryText(country: string) {
  const normalized = decodeLegacyText(country).trim().toUpperCase();
  if (!normalized) {
    return "UNKNOWN COUNTRY";
  }
  if (normalized === "UNITED STATES" || normalized === "US") {
    return "USA";
  }
  if (normalized === "UNITED KINGDOM" || normalized === "UK" || normalized === "GB") {
    return "UK";
  }
  if (
    normalized === "UNITED ARAB EMIRATES" ||
    normalized === "UAE" ||
    normalized === "AE"
  ) {
    return "UAE";
  }
  return normalized;
}

function normalizeVisitorLabel(rawLabel: string) {
  const decoded = decodeLegacyText(rawLabel).trim();
  if (!decoded) {
    return "UNKNOWN, UNKNOWN COUNTRY";
  }
  const [rawCity = "UNKNOWN", ...countryParts] = decoded.split(",");
  const city = decodeLegacyText(rawCity).trim().toUpperCase() || "UNKNOWN";
  const countryJoined = countryParts.join(",").trim();
  const country = normalizeCountryText(countryJoined || "UNKNOWN COUNTRY");
  return `${city}, ${country}`;
}

type LastVisitorRecord = {
  label: string;
  seenAt: number | null;
};

function parseLastVisitorRecord(rawValue: string): LastVisitorRecord {
  const decoded = decodeLegacyText(rawValue).trim();
  if (!decoded) {
    return { label: "UNKNOWN, UNKNOWN COUNTRY", seenAt: null };
  }

  try {
    const parsed = JSON.parse(decoded) as {
      label?: unknown;
      seenAt?: unknown;
      timestamp?: unknown;
    };
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.label === "string" &&
      parsed.label.trim().length > 0
    ) {
      const seenAtCandidate =
        typeof parsed.seenAt === "number"
          ? parsed.seenAt
          : typeof parsed.timestamp === "number"
            ? parsed.timestamp
            : null;
      return {
        label: normalizeVisitorLabel(parsed.label),
        seenAt: seenAtCandidate,
      };
    }
  } catch {
    // Legacy plain-text format (city + country only).
  }

  return {
    label: normalizeVisitorLabel(decoded),
    seenAt: null,
  };
}

function serializeLastVisitorRecord(label: string, seenAt: number) {
  return JSON.stringify({ label, seenAt });
}

function getTodayKeyInToronto() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function kvRequest(path: string, init?: RequestInit) {
  const baseUrl = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!baseUrl || !token) {
    return null;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<{ result?: unknown }>;
}

type RedisClient = {
  connect: () => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<unknown>;
  sAdd: (key: string, member: string) => Promise<number>;
  sCard: (key: string) => Promise<number>;
  sMembers: (key: string) => Promise<string[]>;
  expire: (key: string, seconds: number) => Promise<number>;
};

declare global {
  var __rghvRedisClientPromise: Promise<RedisClient> | undefined;
}

async function getRedisClient() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  if (!globalThis.__rghvRedisClientPromise) {
    globalThis.__rghvRedisClientPromise = (async () => {
      const { createClient } = await import("redis");
      const client = createClient({ url: redisUrl }) as unknown as RedisClient;
      await client.connect();
      return client;
    })();
  }

  return globalThis.__rghvRedisClientPromise;
}

export async function GET() {
  const requestHeaders = await headers();
  const city = decodeLegacyText(requestHeaders.get("x-vercel-ip-city") ?? "")
    .trim()
    .toUpperCase() || "UNKNOWN";
  const countryCode = requestHeaders.get("x-vercel-ip-country")?.trim().toUpperCase() || "";
  const country = resolveCountryLabel(countryCode);
  const currentVisitorLabel = normalizeVisitorLabel(`${city}, ${country}`);
  const todayKey = getTodayKeyInToronto();
  const todayVisitorsKey = `footer:visitors:${todayKey}`;

  const cookieStore = await cookies();
  const isIgnoredVisitor = cookieStore.get(IGNORE_VISITOR_COOKIE_NAME)?.value === "1";
  let visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
  let shouldSetCookie = false;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    shouldSetCookie = true;
  }

  let visitorsToday: number | null = null;
  let visitorsAllTime: number | null = null;
  let lastVisitorLabel = isIgnoredVisitor ? "UNKNOWN, UNKNOWN COUNTRY" : currentVisitorLabel;
  let lastVisitorSeenAt: number | null = null;

  const redisClient = await getRedisClient();
  if (redisClient) {
    const previousLastVisitor = await redisClient.get(LAST_VISITOR_KEY);
    if (previousLastVisitor) {
      const previousRecord = parseLastVisitorRecord(previousLastVisitor);
      lastVisitorLabel = previousRecord.label;
      lastVisitorSeenAt = previousRecord.seenAt;
    }

    if (!isIgnoredVisitor) {
      await redisClient.set(
        LAST_VISITOR_KEY,
        serializeLastVisitorRecord(currentVisitorLabel, Date.now()),
      );
      await redisClient.sAdd(todayVisitorsKey, visitorId);
      await redisClient.sAdd(ALL_TIME_VISITORS_KEY, visitorId);
      await redisClient.expire(todayVisitorsKey, DAY_SECONDS * 3);
    }

    visitorsToday = await redisClient.sCard(todayVisitorsKey);
    visitorsAllTime = await redisClient.sCard(ALL_TIME_VISITORS_KEY);

    // Backfill all-time from today's set if all-time tracking started later.
    if (!isIgnoredVisitor && visitorsAllTime < visitorsToday) {
      const todayMembers = await redisClient.sMembers(todayVisitorsKey);
      for (const member of todayMembers) {
        await redisClient.sAdd(ALL_TIME_VISITORS_KEY, member);
      }
      visitorsAllTime = await redisClient.sCard(ALL_TIME_VISITORS_KEY);
    }
  } else {
    const previousLastVisitor = await kvRequest(`/get/${encodeURIComponent(LAST_VISITOR_KEY)}`);
    if (typeof previousLastVisitor?.result === "string" && previousLastVisitor.result.length > 0) {
      const previousRecord = parseLastVisitorRecord(previousLastVisitor.result);
      lastVisitorLabel = previousRecord.label;
      lastVisitorSeenAt = previousRecord.seenAt;
    }

    if (!isIgnoredVisitor) {
      await kvRequest(
        `/set/${encodeURIComponent(LAST_VISITOR_KEY)}/${encodeURIComponent(
          serializeLastVisitorRecord(currentVisitorLabel, Date.now()),
        )}`,
        {
          method: "POST",
        },
      );

      await kvRequest(
        `/sadd/${encodeURIComponent(todayVisitorsKey)}/${encodeURIComponent(visitorId)}`,
        { method: "POST" },
      );
      await kvRequest(
        `/sadd/${encodeURIComponent(ALL_TIME_VISITORS_KEY)}/${encodeURIComponent(visitorId)}`,
        { method: "POST" },
      );
    }

    const todayCountResult = await kvRequest(`/scard/${encodeURIComponent(todayVisitorsKey)}`);
    if (typeof todayCountResult?.result === "number") {
      visitorsToday = todayCountResult.result;
    }
    const allTimeCountResult = await kvRequest(
      `/scard/${encodeURIComponent(ALL_TIME_VISITORS_KEY)}`,
    );
    if (typeof allTimeCountResult?.result === "number") {
      visitorsAllTime = allTimeCountResult.result;
    }
  }

  const response = NextResponse.json({
    city: isIgnoredVisitor ? "UNKNOWN" : city,
    country: isIgnoredVisitor ? "UNKNOWN COUNTRY" : country,
    lastVisitorLabel,
    lastVisitorSeenAt,
    visitorsToday,
    visitorsAllTime,
  });

  if (shouldSetCookie) {
    response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}
