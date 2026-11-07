import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const VISITOR_COOKIE = "rghv_vid";
export const IGNORE_COOKIE = "rghv_ignore_visitor";
export const ACCESS_COOKIE = "rghv_visitor_log_access";
const LOG_KEY = "visitor-log:v1";
const MAX_EVENTS = 5000;
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export type VisitorEvent = {
  session: string;
  visitor: string;
  kind: "page" | "open" | "duration";
  path: string;
  at: number;
  city: string;
  country: string;
  durationMs?: number;
};

type RedisClient = {
  connect: () => Promise<unknown>;
  zAdd: (key: string, value: { score: number; value: string }) => Promise<unknown>;
  zRemRangeByScore: (key: string, min: number, max: number) => Promise<unknown>;
  zRemRangeByRank: (key: string, start: number, stop: number) => Promise<unknown>;
  zRange: (key: string, start: number, stop: number, options: { REV: true }) => Promise<string[]>;
  zCard: (key: string) => Promise<number>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
};

declare global {
  var __visitorLogRedisPromise: Promise<RedisClient> | undefined;
}

async function redisClient() {
  if (!process.env.REDIS_URL) return null;
  if (!globalThis.__visitorLogRedisPromise) {
    globalThis.__visitorLogRedisPromise = (async () => {
      const { createClient } = await import("redis");
      const client = createClient({ url: process.env.REDIS_URL }) as unknown as RedisClient;
      await client.connect();
      return client;
    })();
  }
  return globalThis.__visitorLogRedisPromise;
}

async function kvCommand(command: (string | number)[]) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Redis command failed: ${response.status}`);
  return (await response.json()) as { result: unknown };
}

export function visitorLogReady() {
  return Boolean(
    process.env.VISITOR_LOG_ACCESS_KEY && process.env.VISITOR_LOG_ACCESS_KEY.length >= 24 &&
      (process.env.REDIS_URL ||
        (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)),
  );
}

// Keep only a short-lived digest of the client IP; never store the raw IP.
export async function visitorLogRateLimited(request: Request, kind: "events" | "auth") {
  const ip = (request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const window = Math.floor(Date.now() / 60_000);
  const digest = createHmac("sha256", process.env.VISITOR_LOG_ACCESS_KEY!)
    .update(`${kind}:${ip}:${window}`).digest("hex").slice(0, 24);
  const key = `visitor-log:rate:${kind}:${digest}`;
  const client = await redisClient();
  let count: number;
  if (client) {
    count = await client.incr(key);
    if (count === 1) await client.expire(key, 120);
  } else {
    const result = await kvCommand(["INCR", key]);
    count = typeof result?.result === "number" ? result.result : 0;
    if (count === 1) await kvCommand(["EXPIRE", key, 120]);
  }
  return count > (kind === "auth" ? 10 : 60);
}

export async function appendVisitorEvent(event: VisitorEvent) {
  const member = `${crypto.randomUUID()}:${JSON.stringify(event)}`;
  const client = await redisClient();
  if (client) {
    await client.zAdd(LOG_KEY, { score: event.at, value: member });
    await client.zRemRangeByScore(LOG_KEY, 0, Date.now() - RETENTION_MS);
    const count = await client.zCard(LOG_KEY);
    if (count > MAX_EVENTS) await client.zRemRangeByRank(LOG_KEY, 0, count - MAX_EVENTS - 1);
    return;
  }
  await kvCommand(["ZADD", LOG_KEY, event.at, member]);
  await kvCommand(["ZREMRANGEBYSCORE", LOG_KEY, 0, Date.now() - RETENTION_MS]);
  const count = await kvCommand(["ZCARD", LOG_KEY]);
  if (typeof count?.result === "number" && count.result > MAX_EVENTS) {
    await kvCommand(["ZREMRANGEBYRANK", LOG_KEY, 0, count.result - MAX_EVENTS - 1]);
  }
}

export async function readVisitorEvents(offset: number, limit = 200) {
  const client = await redisClient();
  let members: string[];
  let total: number;
  if (client) {
    await client.zRemRangeByScore(LOG_KEY, 0, Date.now() - RETENTION_MS);
    [members, total] = await Promise.all([
      client.zRange(LOG_KEY, offset, offset + limit - 1, { REV: true }),
      client.zCard(LOG_KEY),
    ]);
  } else {
    await kvCommand(["ZREMRANGEBYSCORE", LOG_KEY, 0, Date.now() - RETENTION_MS]);
    const [range, count] = await Promise.all([
      kvCommand(["ZREVRANGE", LOG_KEY, offset, offset + limit - 1]),
      kvCommand(["ZCARD", LOG_KEY]),
    ]);
    members = Array.isArray(range?.result) ? (range.result as string[]) : [];
    total = typeof count?.result === "number" ? count.result : 0;
  }
  const events = members.flatMap((member) => {
    try {
      return [JSON.parse(member.slice(member.indexOf(":") + 1)) as VisitorEvent];
    } catch {
      return [];
    }
  });
  return { events, total };
}

function signature(expires: string, secret: string) {
  return createHmac("sha256", secret).update(`visitor-log:${expires}`).digest("hex");
}

export function accessToken(secret: string) {
  const expires = String(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return `${expires}.${signature(expires, secret)}`;
}

export function matchesAccessKey(value: string) {
  const secret = process.env.VISITOR_LOG_ACCESS_KEY;
  if (!secret || secret.length < 24) return false;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(value);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function hasVisitorLogAccess() {
  const secret = process.env.VISITOR_LOG_ACCESS_KEY;
  if (!secret || secret.length < 24) return false;
  const token = (await cookies()).get(ACCESS_COOKIE)?.value ?? "";
  const [expires, supplied] = token.split(".");
  if (!expires || !supplied || Number(expires) < Date.now()) return false;
  const expected = Buffer.from(signature(expires, secret));
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
