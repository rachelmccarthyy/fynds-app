import { describe, it, expect } from "vitest";
import { computeProductKey } from "@/lib/product-key";

describe("computeProductKey — normalisation rules (EC3)", () => {
  // Base product used as the canonical reference for each single-variable case
  const base = {
    title: "Blue Wrap Dress",
    link: "https://nordstrom.com/s/blue-wrap-dress/12345",
  };

  it("www. stripped from domain component — same key with and without www.", () => {
    const withWww = computeProductKey({ ...base, link: "https://www.nordstrom.com/s/blue-wrap-dress/12345" });
    const withoutWww = computeProductKey(base);
    expect(withWww).toBe(withoutWww);
  });

  it("www. stripped from link component — URL.origin includes www. so reconstruction must use normalised domain", () => {
    // This is the case called out in the build review: origin = "https://www.nordstrom.com",
    // so any approach that uses origin+pathname would diverge here.
    const a = computeProductKey({ title: "Blue Wrap Dress", link: "https://www.nordstrom.com/s/blue-wrap-dress/12345" });
    const b = computeProductKey({ title: "Blue Wrap Dress", link: "https://nordstrom.com/s/blue-wrap-dress/12345" });
    expect(a).toBe(b);
  });

  it("domain is case-insensitive — URL spec lowercases hostname", () => {
    const upper = computeProductKey({ ...base, link: "https://Nordstrom.COM/s/blue-wrap-dress/12345" });
    expect(upper).toBe(computeProductKey(base));
  });

  it("#fragment is stripped — same key with and without fragment", () => {
    const withFragment = computeProductKey({ ...base, link: `${base.link}#reviews` });
    expect(withFragment).toBe(computeProductKey(base));
  });

  it("trailing slash is stripped — same key with and without trailing slash", () => {
    const withSlash = computeProductKey({ ...base, link: `${base.link}/` });
    expect(withSlash).toBe(computeProductKey(base));
  });

  it("internal title whitespace collapsed — multiple spaces treated as one", () => {
    const extraSpaces = computeProductKey({ ...base, title: "Blue  Wrap   Dress" });
    expect(extraSpaces).toBe(computeProductKey(base));
  });

  it("query/tracking params stripped — same key regardless of query string", () => {
    const withParams = computeProductKey({
      ...base,
      link: `${base.link}?ref=google&utm_source=serper&color=blue`,
    });
    expect(withParams).toBe(computeProductKey(base));
  });

  it("genuinely different products produce different keys", () => {
    const different = computeProductKey({
      title: "Red Oversized Blazer",
      link: "https://zara.com/en/us/red-oversized-blazer-p87654321.html",
    });
    expect(different).not.toBe(computeProductKey(base));
  });
});
