"use client";

import { useEffect, useRef } from "react";
import { Product } from "@/lib/types";
import { useTrack } from "@/lib/analytics/use-track";
import ProductCard from "./ProductCard";

// Module-level dedup: one impression per result_set_id across all renders
// (dual mobile/desktop, StrictMode double-mount, re-renders from save/dismiss).
const emittedImpressions = new Set<string>();

interface ProductGridProps {
  products: Product[];
  queryId?: string;
  resultSetId?: string;
  isOutfit: boolean;
}

export default function ProductGrid({
  products,
  queryId,
  resultSetId,
  isOutfit,
}: ProductGridProps) {
  const trackEvent = useTrack();
  const gridRef = useRef<HTMLDivElement>(null);

  // Re-arm the observer when resultSetId changes (new query on persistent desktop sidebar).
  // Fires once per resultSetId when the grid enters the viewport; module-level Set
  // guards against the dual-render and StrictMode cases.
  useEffect(() => {
    if (!resultSetId || emittedImpressions.has(resultSetId)) return;
    if (!gridRef.current || products.length === 0) return;

    const el = gridRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !emittedImpressions.has(resultSetId)) {
          emittedImpressions.add(resultSetId);
          trackEvent(
            "results_impression",
            {
              query_id: queryId ?? null,
              result_set_id: resultSetId,
              is_outfit: isOutfit,
              items: products.map((p, i) => ({
                product_key: p.product_key ?? null,
                position: i + 1,
              })),
            },
            "grid"
          );
          observer.disconnect();
        }
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [resultSetId, queryId, products, isOutfit, trackEvent]);

  if (products.length === 0) return null;

  return (
    <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {products.map((product, index) => (
        <ProductCard
          key={`${product.position}-${product.title}`}
          product={product}
          queryId={queryId}
          position={index + 1}
        />
      ))}
    </div>
  );
}
