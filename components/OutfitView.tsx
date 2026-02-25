"use client";

import { OutfitPieceResult } from "@/lib/types";
import ProductCard from "./ProductCard";

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
}

export default function OutfitView({ pieces }: OutfitViewProps) {
  if (pieces.length === 0) return null;

  return (
    <div className="space-y-6">
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
              {piece.products.map((product) => (
                <div
                  key={`${product.position}-${product.title}`}
                  className="shrink-0 w-40 md:w-auto"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">No products found for this category</p>
          )}
        </div>
      ))}
    </div>
  );
}
