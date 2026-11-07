"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { VisitorEvent } from "../../../lib/visitor-log";
import styles from "./visitors.module.css";

const PAGE_SIZE = 200;
const TIME_COLUMN_WIDTH = 15;
const DETAIL_INDENT = " ".repeat(TIME_COLUMN_WIDTH + 2);
const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Toronto", hour: "numeric", minute: "2-digit", second: "2-digit",
  hour12: true, timeZoneName: "short",
});

function time(at: number) {
  return timeFormatter.format(at).replace(/\b(AM|PM)\b/g, (period) => period.toLowerCase());
}

function timeColumn(at: number) {
  return time(at).padEnd(TIME_COLUMN_WIDTH, " ");
}

function duration(ms: number) {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function timeAgo(at: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 60 * 60) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 24 * 60 * 60) return `${Math.floor(seconds / (60 * 60))}h ago`;
  return `${Math.floor(seconds / (24 * 60 * 60))}d ago`;
}

type Group = { id: string; visitor: string; city: string; country: string; postalCode?: string; start: number; latest: number; events: VisitorEvent[]; activeMs: number };

function locationLabel(group: Group, mode: "location" | "city") {
  const city = `${group.city}, ${group.country}`;
  return mode === "location" && group.postalCode ? `${group.postalCode}, ${city}` : city;
}

function mapsUrl(group: Group, mode: "location" | "city") {
  const query = [
    mode === "location" ? group.postalCode : undefined,
    group.city !== "Unknown" ? group.city : undefined,
    group.country !== "Unknown" ? group.country : undefined,
  ].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

function eventKey(event: VisitorEvent) {
  return `${event.at}:${event.session}:${event.kind}:${event.path}:${event.durationMs ?? ""}`;
}

export default function VisitorLogPage() {
  const [events, setEvents] = useState<VisitorEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [asOf, setAsOf] = useState(0);
  const [liveSessions, setLiveSessions] = useState<string[]>([]);
  const [locationMode, setLocationMode] = useState<"location" | "city">("location");
  const [status, setStatus] = useState<"loading" | "locked" | "ready" | "error" | "unconfigured">("loading");
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (offset = 0) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/visitor-log?offset=${offset}`, { cache: "no-store" });
      if (response.status === 401) { setStatus("locked"); return; }
      if (response.status === 503) { setStatus("unconfigured"); return; }
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { events: VisitorEvent[]; total: number; liveSessions: string[] };
      setEvents((old) => {
        if (offset) return [...old, ...data.events];
        if (old.length <= PAGE_SIZE) return data.events;
        const latest = new Set(data.events.map(eventKey));
        return [...data.events, ...old.filter((event) => !latest.has(eventKey(event)))].slice(0, 5000);
      });
      setTotal(data.total);
      setAsOf(Date.now());
      setLiveSessions(data.liveSessions ?? []);
      setStatus("ready");
      setMessage("");
    } catch {
      setStatus("error");
      setMessage("Could not load the log. Try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (status !== "ready") return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [load, status]);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/visitor-log/auth", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }),
      });
      if (response.status === 429) { setMessage("Too many attempts. Try again in a minute."); return; }
      if (!response.ok) { setMessage("That access key did not work."); return; }
      setKey("");
      await load();
    } catch { setMessage("Could not connect. Try again."); }
    finally { setBusy(false); }
  }

  async function lock() {
    await fetch("/api/visitor-log/auth", { method: "DELETE" });
    setEvents([]);
    setLiveSessions([]);
    setStatus("locked");
  }

  const groups = useMemo(() => {
    const byId = new Map<string, Group>();
    for (const event of events) {
      let group = byId.get(event.session);
      if (!group) {
        group = { id: event.session, visitor: event.visitor, city: event.city, country: event.country, postalCode: event.postalCode,
          start: event.at, latest: event.at, events: [], activeMs: 0 };
        byId.set(event.session, group);
      }
      group.start = Math.min(group.start, event.at);
      group.latest = Math.max(group.latest, event.at);
      group.postalCode ??= event.postalCode;
      group.events.push(event);
      if (event.kind === "duration") group.activeMs += event.durationMs ?? 0;
    }
    return [...byId.values()].sort((a, b) => b.latest - a.latest);
  }, [events]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.prompt}>rghv@site:~$</span>{" tail visitor.log"}
        {status === "ready" ? <>{"\n"}
          <button type="button" onClick={() => void load()} disabled={busy}>[refresh]</button>{"\n"}
          <button type="button" onClick={() => void lock()}>[sign out]</button>
        </> : null}
      </header>

      {status === "loading" ? <p className={styles.muted}>loading...</p> : null}
      {status === "locked" ? <section className={styles.gate}>
        <p className={styles.muted}>private access</p>
        <form onSubmit={unlock}>
          <label htmlFor="access-key">access key:</label>
          <div className={styles.formRow}>
            <input id="access-key" type="password" value={key} onChange={(event) => setKey(event.target.value)} autoComplete="current-password" autoFocus />
            <button type="submit" disabled={busy || !key}>[enter]</button>
          </div>
        </form>
        {message ? <p role="alert" className={styles.error}>{message}</p> : null}
      </section> : null}
      {status === "unconfigured" ? <p className={styles.error}>Set VISITOR_LOG_ACCESS_KEY and connect the existing Redis database to enable this log.</p> : null}
      {status === "error" ? <div><p className={styles.error}>{message}</p><button type="button" onClick={() => void load()}>[retry]</button></div> : null}

      {status === "ready" ? <>
        {"\n\n"}<span className={liveSessions.length ? styles.now : styles.muted}>
          {liveSessions.length ? `${liveSessions.length} visitor${liveSessions.length === 1 ? "" : "s"} now` : "No visitors now"}
        </span>{"\n"}
        <span className={styles.summary}>{events.length === total ? `${total} events` : `${events.length} of ${total} events`}</span>{"\n"}
        <span className={styles.switcher} role="group" aria-label="Location display">
          <button type="button" className={locationMode === "location" ? styles.selected : undefined} aria-pressed={locationMode === "location"} onClick={() => setLocationMode("location")}>location</button>
          {" / "}
          <button type="button" className={locationMode === "city" ? styles.selected : undefined} aria-pressed={locationMode === "city"} onClick={() => setLocationMode("city")}>city</button>
        </span>{"\n\n"}
        {groups.length === 0 ? <span className={styles.muted}>no visits yet</span> : null}
        <span className={styles.list}>
          {groups.map((group, groupIndex) => <span key={group.id}>
            {groupIndex > 0 ? "\n" : null}
            <time className={styles.sessionTime}>{timeColumn(group.latest)}</time>{"  ~ "}
            {mapsUrl(group, locationMode) ?
              <a className={styles.location} href={mapsUrl(group, locationMode) ?? undefined} target="_blank" rel="noopener noreferrer" title="Search this approximate location in Google Maps">
                {locationLabel(group, locationMode)}
              </a> : <span className={styles.location}>{locationLabel(group, locationMode)}</span>}{"\n"}
            {DETAIL_INDENT}<span className={styles.age}>{timeAgo(group.latest, asOf)}</span>
            {group.activeMs ? <>{"  "}<span className={styles.active}>{duration(group.activeMs)} active</span></> : null}
            {"  "}<span className={styles.sessionDate}>{dateFormatter.format(group.latest)}</span>{"  "}
            <span className={styles.sessionId}>#{group.visitor.slice(0, 8)}</span>
            {liveSessions.includes(group.id) ? <>{"  "}<span className={styles.live}>live</span></> : null}
            {"\n"}
            {[...group.events].reverse().filter((item) => item.kind !== "duration").map((item, index) =>
              <span key={`${item.at}-${index}`}>
                <time className={styles.eventTime}>{timeColumn(item.at)}</time>{"  > "}
                <span className={styles.action}>{item.kind === "page" ? "visited" : "opened "}</span>{"  "}
                <span className={styles.path}>{item.path}</span>{"\n"}
              </span>) }
          </span>)}
        </span>
        {events.length < total && events.length < 5000 ?
          <>{"\n"}<button className={styles.more} type="button" disabled={busy} onClick={() => void load(events.length)}>
            {busy ? "loading..." : `[load ${Math.min(PAGE_SIZE, total - events.length)} more]`}
          </button></> : null}
      </> : null}
    </main>
  );
}
