import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit, isTrustedOrigin, _clearStore } from "../lib/rate-limit";

// Minimal request-like object — satisfies the RequestLike interface without
// importing NextRequest, so this file runs in a plain Node environment.
function makeReq(
  origin: string | null,
  host?: string | null
): { headers: { get: (k: string) => string | null } } {
  return {
    headers: {
      get: (key: string) => {
        if (key === "origin") return origin;
        if (key === "host") return host ?? null;
        return null;
      },
    },
  };
}

// ---------------------------------------------------------------------------
// checkRateLimit
// ---------------------------------------------------------------------------

describe("checkRateLimit", () => {
  beforeEach(() => {
    _clearStore();
  });

  it("allows requests within the limit", () => {
    expect(checkRateLimit("1.2.3.4", 3, 60_000)).toBe(true);
    expect(checkRateLimit("1.2.3.4", 3, 60_000)).toBe(true);
    expect(checkRateLimit("1.2.3.4", 3, 60_000)).toBe(true);
  });

  it("blocks the request that exceeds the limit", () => {
    checkRateLimit("1.2.3.4", 3, 60_000);
    checkRateLimit("1.2.3.4", 3, 60_000);
    checkRateLimit("1.2.3.4", 3, 60_000);
    expect(checkRateLimit("1.2.3.4", 3, 60_000)).toBe(false);
  });

  it("continues to block subsequent requests once the limit is hit", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("1.2.3.4", 3, 60_000);
    expect(checkRateLimit("1.2.3.4", 3, 60_000)).toBe(false);
    expect(checkRateLimit("1.2.3.4", 3, 60_000)).toBe(false);
  });

  it("resets after the window expires", async () => {
    checkRateLimit("1.2.3.4", 1, 50); // 50 ms window
    await new Promise((r) => setTimeout(r, 70));
    expect(checkRateLimit("1.2.3.4", 1, 50)).toBe(true);
  });

  it("tracks different IPs independently", () => {
    checkRateLimit("1.1.1.1", 1, 60_000);
    expect(checkRateLimit("1.1.1.1", 1, 60_000)).toBe(false); // 1.1.1.1 exhausted
    expect(checkRateLimit("2.2.2.2", 1, 60_000)).toBe(true);  // 2.2.2.2 unaffected
  });

  it("a limit of 1 allows exactly one request", () => {
    expect(checkRateLimit("5.5.5.5", 1, 60_000)).toBe(true);
    expect(checkRateLimit("5.5.5.5", 1, 60_000)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isTrustedOrigin
// ---------------------------------------------------------------------------

describe("isTrustedOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("trusts requests with no Origin header (same-origin or non-browser caller)", () => {
    expect(isTrustedOrigin(makeReq(null))).toBe(true);
  });

  it("trusts localhost:3003 (default dev port)", () => {
    expect(isTrustedOrigin(makeReq("http://localhost:3003"))).toBe(true);
  });

  it("trusts localhost:3000 (production start port)", () => {
    expect(isTrustedOrigin(makeReq("http://localhost:3000"))).toBe(true);
  });

  it("trusts the production origin set via APP_URL", () => {
    vi.stubEnv("APP_URL", "https://fynds.ai");
    expect(isTrustedOrigin(makeReq("https://fynds.ai"))).toBe(true);
  });

  it("trusts APP_URL even when it includes a path (extracts scheme+host only)", () => {
    vi.stubEnv("APP_URL", "https://fynds.ai/some/path");
    expect(isTrustedOrigin(makeReq("https://fynds.ai"))).toBe(true);
  });

  it("blocks an unknown cross-origin caller", () => {
    expect(isTrustedOrigin(makeReq("https://evil.com"))).toBe(false);
  });

  it("blocks a caller whose origin shares a prefix but is not an exact match", () => {
    vi.stubEnv("APP_URL", "https://fynds.ai");
    // Must not match on prefix — exact scheme://host comparison only
    expect(isTrustedOrigin(makeReq("https://fynds.ai.evil.com"))).toBe(false);
  });

  it("blocks an http variant when the allowlist entry is https", () => {
    vi.stubEnv("APP_URL", "https://fynds.ai");
    expect(isTrustedOrigin(makeReq("http://fynds.ai"))).toBe(false);
  });

  it("trusts a Vercel preview origin whose host matches the request Host header", () => {
    const previewHost = "fynds-app-abc123-rachelmccarthyy.vercel.app";
    expect(
      isTrustedOrigin(makeReq(`https://${previewHost}`, previewHost))
    ).toBe(true);
  });

  it("blocks a Vercel preview origin that does not match the request Host header", () => {
    const actualHost = "fynds-app-abc123-rachelmccarthyy.vercel.app";
    expect(
      isTrustedOrigin(makeReq("https://fynds-app-evil.vercel.app", actualHost))
    ).toBe(false);
  });
});
