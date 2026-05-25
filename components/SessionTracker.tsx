"use client";

import { Component, useEffect, useRef, type ReactNode } from "react";
import { useTrack } from "@/lib/analytics/use-track";
import { getSessionId, rotateSession } from "@/lib/analytics/session";
import { flushNow, track } from "@/lib/analytics/track";

// Idle boundary: 30 minutes of no interaction ends the session and rotates the id.
// A 35-min silent read gets split into two sessions — deliberate tradeoff, not a
// magic number. Chosen to match GA4's default session timeout.
const IDLE_MS = 30 * 60 * 1000;
const SESSION_STARTED_KEY = "fynds-session-started";

const ACTIVITY_EVENTS = ["mousemove", "keydown", "touchstart", "scroll", "click"] as const;

function SessionTrackerInner() {
  const trackFn = useTrack();
  const trackRef = useRef(trackFn);
  useEffect(() => { trackRef.current = trackFn; }, [trackFn]);

  const startMsRef   = useRef(0);
  const endedRef     = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function emitEnd() {
      if (endedRef.current) return;
      endedRef.current = true;
      trackRef.current("session_end", { duration_ms: Date.now() - startMsRef.current });
      flushNow();
    }

    function emitStart() {
      const sid = getSessionId();
      startMsRef.current = Date.now();
      endedRef.current = false;
      sessionStorage.setItem(SESSION_STARTED_KEY, "1");
      trackRef.current("session_start", { session_id: sid });
    }

    function resetIdle() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        emitEnd();
        sessionStorage.removeItem(SESSION_STARTED_KEY);
        rotateSession();
        emitStart();
        resetIdle();
      }, IDLE_MS);
    }

    // session_start: once per session_id.
    // sessionStorage persists across StrictMode double-mount — prevents double-emit.
    // Cleared on session rotation so the new session gets its own start.
    if (!sessionStorage.getItem(SESSION_STARTED_KEY)) {
      emitStart();
    } else {
      startMsRef.current = Date.now();
    }

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, resetIdle, { passive: true })
    );
    resetIdle();

    // pagehide = best-effort final session_end, deduped.
    // The event goes into the buffer then the track.ts pagehide listener
    // (registered later) beacon-flushes it.
    const onPageHide = () => emitEnd();
    window.addEventListener("pagehide", onPageHide);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetIdle));
      window.removeEventListener("pagehide", onPageHide);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/** Isolates analytics from app state — a render-time throw here
 *  can't take down StoreContext or CheckoutContext. */
export class AnalyticsErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.error("[fynds:analytics] error boundary caught:", err);
    track({
      event_type: "error_event",
      properties: {
        scope: "analytics",
        class: err.name || "Error",
      },
    });
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

export default function SessionTracker() {
  return (
    <AnalyticsErrorBoundary>
      <SessionTrackerInner />
    </AnalyticsErrorBoundary>
  );
}
