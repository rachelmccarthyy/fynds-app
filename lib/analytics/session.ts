"use client";

const ANON_ID_KEY    = "fynds-anon-id";
const SESSION_ID_KEY = "fynds-session-id";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Stable device UUID — persisted in localStorage, survives tab closes and sign-outs.
 *  Orthogonal to Supabase user identity; never set to user.id. */
export function getAnonId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return generateUUID();
  }
}

/** Per-tab session UUID — persisted in sessionStorage, new on each tab open. */
export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = generateUUID();
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return generateUUID();
  }
}

/** Rotate session: clear the old id so getSessionId() generates a fresh UUID
 *  in the shared sessionStorage slot. All callers (tracker, impressions, saves)
 *  read from the same slot — rotation is visible to everyone. */
export function rotateSession(): string {
  if (typeof window === "undefined") return "server";
  try {
    sessionStorage.removeItem(SESSION_ID_KEY);
    return getSessionId();
  } catch {
    return generateUUID();
  }
}

/** Pointer-based platform detection — unaffected by window resize unlike innerWidth. */
export function getPlatform(): "mobile_web" | "desktop_web" {
  if (typeof window === "undefined") return "desktop_web";
  try {
    return window.matchMedia("(pointer: coarse)").matches
      ? "mobile_web"
      : "desktop_web";
  } catch {
    return "desktop_web";
  }
}
