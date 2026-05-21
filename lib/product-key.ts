import type { Product } from "@/lib/types";

/**
 * Deterministic product identity key: djb2a hash of "domain|normalised_title|link_sans_query".
 * Must produce the same value on both client and server for the same product.
 * Used as the PK in the products table and FK in saved_items.
 */
export function computeProductKey(product: Pick<Product, "title" | "link">): string {
  try {
    const domain = new URL(product.link).hostname.replace(/^www\./, "");
    const title = product.title.toLowerCase().trim();
    const link = product.link.split("?")[0];
    return djb2a(`${domain}|${title}|${link}`);
  } catch {
    return djb2a(product.title.toLowerCase().trim());
  }
}

function djb2a(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
