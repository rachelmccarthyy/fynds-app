"use client";

import { useEffect, useRef } from "react";
import { OutfitPieceResult } from "@/lib/types";
import { useTrack } from "@/lib/analytics/use-track";
import ProductCard from "./ProductCard";

// Shared with ProductGrid — one impression per result_set_id, globally
const emittedImpressions = new Set<string>();

const CATEGORY_EMOJI: Record<string, string> = {
  dress: "👗",
  top: "👚",
  pants: "👖",
  skirt: "👗",
  shoes: "👠",
  bag: "👜",
  jewelry: "💍",
  jacket: "🧥",
  coat: "🧥",
  hat: "🎩",
  sunglasses: "🕶️",
  watch: "⌚",
  scarf: "🧣",
};

function getEmoji(category: string): string {
  const key = category.toLowerCase();
  return CATEGORY_EMOJI[key] || "✨";
}

interface OutfitViewProps {
  pieces: OutfitPieceResult[];
  queryId?: string;
  resultSetId?: string;
}

export default function OutfitView({ pieces, queryId, resultSetId }: OutfitViewProps) {
  const trackEvent = useTrack();
  const containerRef = useRef<HTMLDivElement>(null);

  // Flatten all outfit piece products for the impression items array.
  // v0.5.3 logs "outfit shown" via results_impression with is_outfit: true;
  // outfit_impression / outfit_piece_action are not in the minimal subset —
  // outfit engagement is not computable yet, only "outfit shown" is logged.
  useEffect(() => {
    if (!resultSetId || emittedImpressions.has(resultSetId)) return;
    if (!containerRef.current || pieces.length === 0) return;

    const el = containerRef.current;
    let position = 0;
    const items = pieces.flatMap((piece) =>
      piece.products.map((p) => ({
        product_key: p.product_key ?? null,
        position: ++position,
      }))
    );
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !emittedImpressions.has(resultSetId)) {
          emittedImpressions.add(resultSetId);
          trackEvent(
            "results_impression",
            {
              query_id: queryId ?? null,
              result_set_id: resultSetId,
              is_outfit: true,
              items,
            },
            "outfit"
          );
          observer.disconnect();
        }
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [resultSetId, queryId, pieces, trackEvent]);

  if (pieces.length === 0) return null;

  let globalPosition = 0;

  return (
    <div ref={containerRef} className="space-y-6">
      {pieces.map((piece) => (
        <div key={piece.category}>
          {/* Category header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getEmoji(piece.category)}</span>
            <h3 className="text-sm font-semibold text-fg">
              The {piece.category}
            </h3>
          </div>

          {/* Styling note */}
          <p className="text-xs text-muted mb-3 italic">
            {piece.styling_note}
          </p>

          {/* Products — horizontal scroll on mobile, grid on desktop */}
          {piece.products.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible scrollbar-hide">
              {piece.products.map((product) => {
                globalPosition++;
                return (
                  <div
                    key={`${product.position}-${product.title}`}
                    className="shrink-0 w-40 md:w-auto"
                  >
                    <ProductCard
                      product={product}
                      queryId={queryId}
                      position={globalPosition}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted">No products found for this category</p>
          )}
        </div>
      ))}
    </div>
  );
}
