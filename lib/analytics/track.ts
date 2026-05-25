"use client";

import { getAnonId, getSessionId, getPlatform } from "./session";

const FLUSH_SIZE    = 20;
const FLUSH_INTERVAL_MS = 30_000;

export interface TrackPayload {
  event_type: string;
  properties: Record<string, unknown>;
  surface?: string;
}

interface EnvelopedEvent {
  event_type: string;
  anon_id: string;
  session_id: string;
  platform: string;
  app_version: string;
  surface: string | null;
  schema_version: number;
  properties: Record<string, unknown>;
}

let buffer: EnvelopedEvent[] = [];
let accessTokenRef: string | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;

/** Called by use-track.ts whenever the auth token changes. */
export function setAccessToken(token: string | null): void {
  accessTokenRef = token;
}

function buildEnvelope(payload: TrackPayload): EnvelopedEvent {
  return {
    event_type:     payload.event_type,
    anon_id:        getAnonId(),
    session_id:     getSessionId(),
    platform:       getPlatform(),
    app_version:    "0.5.3",
    surface:        payload.surface ?? null,
    schema_version: 1,
    properties:     payload.properties,
  };
}

function flushWithBeacon(events: EnvelopedEvent[]): boolean {
  if (typeof navigator === "undefined") return false;
  const body = JSON.stringify({ events, token: accessTokenRef ?? null });
  if (navigator.sendBeacon) {
    return navigator.sendBeacon(
      "/api/events",
      new Blob([body], { type: "application/json" })
    );
  }
  // keepalive fallback for browsers without sendBeacon
  try {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

function flushWithFetch(events: EnvelopedEvent[]): void {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessTokenRef) headers["Authorization"] = `Bearer ${accessTokenRef}`;
  fetch("/api/events", {
    method: "POST",
    headers,
    body: JSON.stringify({ events, token: null }),
  }).catch(() => {}); // fire-and-forget; no error_event on failure (no recursion)
}

function flush(isUnload = false): void {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0, buffer.length);
  if (isUnload) {
    flushWithBeacon(batch);
  } else {
    flushWithFetch(batch);
  }
}

function ensureListeners(): void {
  if (typeof window === "undefined") return;
  // Unload flush — sendBeacon handles tab-close / navigation
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
  // Periodic flush — catches crash/OOM cases on mobile where unload never fires
  if (!flushTimer) {
    flushTimer = setInterval(() => flush(false), FLUSH_INTERVAL_MS);
  }
}

let listenersAttached = false;

/** Enqueue a client-origin event. Call sites use use-track.ts to pre-bind the token. */
export function track(payload: TrackPayload): void {
  if (typeof window === "undefined") return; // no-op during SSR
  if (!listenersAttached) {
    listenersAttached = true;
    ensureListeners();
  }
  buffer.push(buildEnvelope(payload));
  if (buffer.length >= FLUSH_SIZE) flush(false);
}

/** Immediately flush the buffer via fetch (not beacon). Used by SessionTracker
 *  to transmit session_end before rotating the session id — ensures the event
 *  isn't stuck in the buffer with a stale ts if the tab closes during idle. */
export function flushNow(): void {
  flush(false);
}
