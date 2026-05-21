// No next/server import here — using a structural interface so this module
// is importable in plain Node test environments without a Next.js resolver.

interface RequestLike {
  headers: {
    get(key: string): string | null;
  };
}

interface RateEntry {
  count: number;
  resetAt: number;
}

// Module-level store: persists for the lifetime of the Node process.
// Known gap on Vercel serverless (multiple instances). Replace with Upstash
// Redis before public launch (see PROJECT.md §6 tech-debt note).
const store = new Map<string, RateEntry>();

export function getClientIp(req: RequestLike): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

/** Returns true if the request is within the rate limit, false if it should be blocked. */
export function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/** For testing only — clears the in-memory rate limit store between test cases. */
export function _clearStore(): void {
  store.clear();
}

function extractOrigin(url: string): string | null {
  try {
    const { protocol, host } = new URL(url);
    return `${protocol}//${host}`;
  } catch {
    return null;
  }
}

/**
 * Returns true for same-origin requests (browsers omit Origin on same-origin requests
 * in some contexts) and for requests whose Origin matches the app's allowlist.
 * Returns false for cross-origin callers not in the allowlist.
 *
 * Allowlist is built lazily (at call time) so NEXTAUTH_URL can be stubbed in tests.
 * Same-host check covers Vercel preview deployments whose URLs aren't known at build time.
 */
export function isTrustedOrigin(req: RequestLike): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin or non-browser caller; rate limit handles volume

  const allowed = [
    process.env.NEXTAUTH_URL,
    "http://localhost:3003",
    "http://localhost:3000",
  ]
    .filter(Boolean)
    .map((u) => extractOrigin(u as string))
    .filter(Boolean) as string[];

  // Trust the deployment's own host — covers Vercel preview URLs that aren't
  // known until deploy time. Origin must be https://<host> exactly.
  const host = req.headers.get("host");
  if (host) allowed.push(`https://${host}`);

  return allowed.includes(origin);
}
