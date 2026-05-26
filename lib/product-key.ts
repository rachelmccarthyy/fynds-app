import type { Product } from "@/lib/types";

/**
 * Deterministic product identity key: djb2a hash of "domain|normalised_title|link_sans_query".
 * Must produce the same value on both client and server for the same product.
 * Used as the PK in the products table and FK in saved_items.
 *
 * Normalisation rules (all must hold for EC3):
 *   - domain: www. stripped, already lowercased by URL spec
 *   - title: lowercased, leading/trailing whitespace trimmed, internal runs collapsed to single space
 *   - link: reconstructed as protocol://normalized-domain/pathname (strips www., query params,
 *     fragment, and trailing slash in one pass — using pathname avoids origin including www.)
 */
export function computeProductKey(product: Pick<Product, "title" | "link">): string {
  try {
    const parsed = new URL(product.link);
    const domain = parsed.hostname.replace(/^www\./, "");
    const title = product.title.toLowerCase().trim().replace(/\s+/g, " ");
    // Reconstruct link using normalised domain so www./no-www variants produce identical strings.
    // pathname excludes query string and fragment by spec; trailing slash stripped for consistency.
    const link = `${parsed.protocol}//${domain}${parsed.pathname}`.replace(/\/$/, "");
    return djb2a(`${domain}|${title}|${link}`);
  } catch {
    return djb2a(product.title.toLowerCase().trim().replace(/\s+/g, " "));
  }
}

function djb2a(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
