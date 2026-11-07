"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { VisitorEvent } from "../../../lib/visitor-log";
import styles from "./visitors.module.css";

const PAGE_SIZE = 200;

function clock(at: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(at);
}

function duration(ms: number) {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

type Group = { id: string; visitor: string; city: string; country: string; start: number; latest: number; events: VisitorEvent[]; activeMs: number };

export default function VisitorLogPage() {
  const [events, setEvents] = useState<VisitorEvent[]>([]);
  const [total, setTotal] = useState(0);
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
      const data = (await response.json()) as { events: VisitorEvent[]; total: number };
      setEvents((old) => offset ? [...old, ...data.events] : data.events);
      setTotal(data.total);
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
    setStatus("locked");
  }

  const groups = useMemo(() => {
    const byId = new Map<string, Group>();
    for (const event of events) {
      let group = byId.get(event.session);
      if (!group) {
        group = { id: event.session, visitor: event.visitor, city: event.city, country: event.country,
          start: event.at, latest: event.at, events: [], activeMs: 0 };
        byId.set(event.session, group);
      }
      group.start = Math.min(group.start, event.at);
      group.latest = Math.max(group.latest, event.at);
      group.events.push(event);
      if (event.kind === "duration") group.activeMs += event.durationMs ?? 0;
    }
    return [...byId.values()].sort((a, b) => b.latest - a.latest);
  }, [events]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span>RGHV / VISITOR LOG</span>
        {status === "ready" ? <div className={styles.actions}>
          <button type="button" onClick={() => void load()} disabled={busy}>REFRESH</button>
          <button type="button" onClick={() => void lock()}>LOCK</button>
        </div> : null}
      </header>

      {status === "loading" ? <p className={styles.muted}>Loading…</p> : null}
      {status === "locked" ? <section className={styles.gate}>
        <p>PRIVATE ACCESS</p>
        <form onSubmit={unlock}>
          <label htmlFor="access-key">Access key</label>
          <div className={styles.formRow}>
            <input id="access-key" type="password" value={key} onChange={(event) => setKey(event.target.value)} autoComplete="current-password" autoFocus />
            <button type="submit" disabled={busy || !key}>ENTER ↗</button>
          </div>
        </form>
        {message ? <p role="alert" className={styles.error}>{message}</p> : null}
      </section> : null}
      {status === "unconfigured" ? <p className={styles.error}>Set VISITOR_LOG_ACCESS_KEY and connect the existing Redis database to enable this log.</p> : null}
      {status === "error" ? <div><p className={styles.error}>{message}</p><button type="button" onClick={() => void load()}>RETRY</button></div> : null}

      {status === "ready" ? <>
        <p className={styles.summary}>{total} EVENTS · {groups.length} SESSIONS SHOWN · MOST RECENT FIRST</p>
        {groups.length === 0 ? <p className={styles.muted}>No visits recorded yet.</p> : null}
        <div className={styles.list}>
          {groups.map((group) => <section className={styles.session} key={group.id}>
            <div className={styles.sessionTop}>
              <span className={styles.location}>{group.city}, {group.country}</span>
              <span>{clock(group.start)}</span>
            </div>
            <p className={styles.meta}>VISITOR {group.visitor.slice(0, 8)} · ACTIVE {group.activeMs ? duration(group.activeMs) : "—"}</p>
            <ul>
              {[...group.events].reverse().filter((item) => item.kind !== "duration").map((item, index) =>
                <li key={`${item.at}-${index}`}>
                  <time>{new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(item.at)}</time>
                  <span>{item.kind === "page" ? "visited" : "opened"} <strong>{item.path}</strong></span>
                </li>) }
            </ul>
          </section>)}
        </div>
        {events.length < total && events.length < 5000 ?
          <button className={styles.more} type="button" disabled={busy} onClick={() => void load(events.length)}>
            {busy ? "LOADING…" : `LOAD ${Math.min(PAGE_SIZE, total - events.length)} MORE ↓`}
          </button> : null}
        <p className={styles.foot}>Approximate city · active time counts visible tab time · stored for up to 90 days / 5,000 events</p>
      </> : null}
    </main>
  );
}
