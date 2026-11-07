"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { VisitorEvent } from "../../../lib/visitor-log";
import styles from "./visitors.module.css";

const PAGE_SIZE = 200;
const LIVE_COLUMN_SPACES = " ".repeat(6);
const TIME_COLUMN_WIDTH = 15;
const DETAIL_INDENT = " ".repeat(LIVE_COLUMN_SPACES.length + TIME_COLUMN_WIDTH + 2);
const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit", second: "2-digit",
  hour12: true, timeZoneName: "short",
});

function time(at: number) {
  return timeFormatter.format(at);
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
  if (seconds < 60 * 60) return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s ago`;
  if (seconds < 24 * 60 * 60) return `${Math.floor(seconds / (60 * 60))}h ago`;
  return `${Math.floor(seconds / (24 * 60 * 60))}d ago`;
}

type Group = { id: string; session: string; day: string; visitor: string; city: string; country: string; postalCode?: string; latest: number; events: VisitorEvent[]; activeMs: number };

function locationLabel(group: Group) {
  const city = `${group.city}, ${group.country}`;
  return group.postalCode ? `${group.postalCode}, ${city}` : city;
}

function mapsUrl(group: Group) {
  const query = [
    group.postalCode,
    group.city !== "Unknown" ? group.city : undefined,
    group.country !== "Unknown" ? group.country : undefined,
  ].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

function eventKey(event: VisitorEvent) {
  return `${event.at}:${event.session}:${event.kind}:${event.path}:${event.durationMs ?? ""}`;
}

function SessionAge({ at, asOf, live }: { at: number; asOf: number; live: boolean }) {
  const [clock, setClock] = useState(asOf);
  useEffect(() => {
    if (!live) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") setClock(Date.now());
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [live]);
  return <span className={styles.age}>{timeAgo(at, live ? Math.max(clock, asOf) : asOf)}</span>;
}

export default function VisitorLogPage() {
  const [events, setEvents] = useState<VisitorEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [liveSessions, setLiveSessions] = useState<string[]>([]);
  const [asOf, setAsOf] = useState(0);
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
    const currentSession = new Map<string, Group>();
    for (const event of [...events].reverse()) {
      const day = dateFormatter.format(event.at);
      const id = `${day}:${event.session}`;
      let group = event.kind === "duration" ? currentSession.get(event.session) : byId.get(id);
      if (!group) {
        group = { id, session: event.session, day, visitor: event.visitor, city: event.city, country: event.country,
          postalCode: event.postalCode, latest: event.at, events: [], activeMs: 0 };
        byId.set(id, group);
      }
      if (event.kind !== "duration") {
        group.latest = Math.max(group.latest, event.at);
        currentSession.set(event.session, group);
      }
      group.postalCode ??= event.postalCode;
      group.events.push(event);
      if (event.kind === "duration") group.activeMs += event.durationMs ?? 0;
    }
    return [...byId.values()]
      .filter((group) => group.events.some((event) => event.kind !== "duration"))
      .sort((a, b) => b.latest - a.latest);
  }, [events]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.prompt}>rghv@site:~$</span>{" tail visitor.log"}
        {status === "ready" ? <>{"    "}<span className={styles.summary}>{events.length === total ? `${total} events` : `${events.length} of ${total} events`}</span></> : null}
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
        {"\n\n"}
        {groups.length === 0 ? <span className={styles.muted}>no visits yet</span> : null}
        <div className={styles.list}>
          {groups.map((group, groupIndex) => {
            const live = liveSessions.includes(group.session);
            const map = mapsUrl(group);
            return <section className={styles.group} key={group.id}>
              {groupIndex === 0 || groups[groupIndex - 1].day !== group.day ? <div className={styles.day}>{group.day}</div> : null}
              <div className={styles.sessionLine}>
                <span className={styles.timeBlock}>
                  <span className={live ? styles.livePrefixActive : styles.livePrefix}>
                    {live ? <><span className={styles.live}>Live</span>{"  "}</> : LIVE_COLUMN_SPACES}
                  </span>
                  <time className={styles.sessionTime}>{timeColumn(group.latest)}</time>
                </span>
                <span className={styles.separator}>{"  "}</span>
                {map ?
                  <a className={styles.location} href={map} target="_blank" rel="noopener noreferrer" title="Search this approximate location in Google Maps">
                    {locationLabel(group)}
                  </a> : <span className={styles.location}>{locationLabel(group)}</span>}
                <span className={styles.separator}>{"  "}</span>
                <SessionAge at={group.latest} asOf={asOf} live={live} />
              </div>
              <div className={styles.details}>
                <span className={styles.detailIndent}>{DETAIL_INDENT}</span>
                <span className={styles.sessionId}>#{group.visitor.slice(0, 8)}</span>
                {group.activeMs ? <>{"  "}<span className={styles.active}>{duration(group.activeMs)} active</span></> : null}
              </div>
              {group.events.filter((item) => item.kind !== "duration").map((item, index) =>
                <div className={styles.eventLine} key={`${item.at}-${index}`}>
                  <span className={styles.eventClock}><span className={styles.eventPrefix}>{LIVE_COLUMN_SPACES}</span><time className={styles.eventTime}>{timeColumn(item.at)}</time></span>
                  <span className={styles.separator}>{"  "}</span>
                  <span className={styles.eventDescription}>
                    <span className={styles.action}>{item.kind === "page" ? "visited" : "opened"}</span>{"  "}
                    <span className={styles.path}>{item.path}</span>
                  </span>
                </div>) }
            </section>;
          })}
        </div>
        {events.length < total && events.length < 5000 ?
          <>{"\n"}<button className={styles.more} type="button" disabled={busy} onClick={() => void load(events.length)}>
            {busy ? "loading..." : `[load ${Math.min(PAGE_SIZE, total - events.length)} more]`}
          </button></> : null}
      </> : null}
    </main>
  );
}
