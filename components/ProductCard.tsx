"use client";

import { useState, useRef, useEffect } from "react";
import { Product } from "@/lib/types";
import { useStore } from "@/lib/store-context";
import { useTrack } from "@/lib/analytics/use-track";
import Image from "next/image";

interface ProductCardProps {
  product: Product;
  queryId?: string;
  position?: number;
}

interface VariantOption {
  label: string;
  values: string[];
}

interface ProductOptions {
  sizes: string[];
  colors: string[];
  other: VariantOption[];
}

function parsePrice(price: string): number | null {
  const n = parseFloat(price.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill={i < full ? "#f59e0b" : i === full && half ? "url(#half)" : "#e5e7eb"}
          stroke="none"
        >
          {i === full && half && (
            <defs>
              <linearGradient id="half">
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#e5e7eb" />
              </linearGradient>
            </defs>
          )}
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function formatRatingCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  return count.toString();
}

export default function ProductCard({ product, queryId, position }: ProductCardProps) {
  const { addToCart, removeFromCart, toggleFavorite, isInCart, isFavorite } =
    useStore();
  const trackEvent = useTrack();

  const inCart = isInCart(product);
  const favorited = isFavorite(product);
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productOptions, setProductOptions] = useState<ProductOptions | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedOther, setSelectedOther] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showOptions) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showOptions]);

  const fetchOptions = async () => {
    setLoading(true);
    setShowOptions(true);
    try {
      const res = await fetch("/api/product-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: product.link,
          title: product.title,
          source: product.source,
        }),
      });
      const data = await res.json();
      setProductOptions(data);
    } catch {
      setProductOptions({ sizes: [], colors: [], other: [] });
    }
    setLoading(false);
  };

  const handleAddToCart = () => {
    const notes = Object.entries(selectedOther)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");

    const options =
      selectedSize || selectedColor || notes
        ? {
            size: selectedSize || undefined,
            color: selectedColor || undefined,
            notes: notes || undefined,
          }
        : undefined;
    addToCart(product, options);
    setShowOptions(false);
    setSelectedSize("");
    setSelectedColor("");
    setSelectedOther({});
    setProductOptions(null);
  };

  const handleToggleFavorite = () => {
    const wasFavorited = favorited;
    toggleFavorite(product);
    trackEvent(
      wasFavorited ? "product_unsave" : "product_save",
      {
        product_key: product.product_key ?? null,
        query_id: queryId ?? null,
        position: position ?? null,
      },
      "grid"
    );
  };

  const handleBuyClick = () => {
    trackEvent(
      "buy_clicked",
      {
        product_key: product.product_key ?? null,
        retailer: product.source,
        price_at_event: parsePrice(product.price),
        has_affiliate: false,
        query_id: queryId ?? null,
      },
      "grid"
    );
  };

  const handleDismiss = () => {
    trackEvent(
      "product_dismiss",
      {
        product_key: product.product_key ?? null,
        query_id: queryId ?? null,
      },
      "grid"
    );
    setDismissed(true);
  };

  if (dismissed) return null;

  const hasOptions =
    productOptions &&
    (productOptions.sizes.length > 0 ||
      productOptions.colors.length > 0 ||
      productOptions.other.length > 0);

  return (
    <div className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md hover:scale-[1.02] transition-all duration-200">
      {/* Image */}
      <a
        href={product.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-square bg-surface"
        onClick={handleBuyClick}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-contain p-2"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs">
            No image
          </div>
        )}
      </a>

      {/* Heart button — top right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggleFavorite();
        }}
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform z-10"
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={favorited ? "#FF1D6C" : "none"}
          stroke={favorited ? "#FF1D6C" : "#9ca3af"}
          strokeWidth="2"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      {/* Dismiss button — top left */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label="Not for me"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Product info */}
      <div className="p-3">
        <h3 className="text-xs font-medium text-fg line-clamp-2 leading-snug">
          {product.title}
        </h3>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-1 mt-1.5">
            <StarRating rating={product.rating} />
            <span className="text-[10px] text-muted">
              {product.rating}
              {product.ratingCount ? ` (${formatRatingCount(product.ratingCount)})` : ""}
            </span>
          </div>
        )}

        {/* Price + Source */}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-pink">{product.price}</span>
          <span className="text-[10px] text-muted truncate ml-2 max-w-[80px]">{product.source}</span>
        </div>

        {/* Delivery */}
        {product.delivery && (
          <p className="text-[10px] text-green-600 mt-1">{product.delivery}</p>
        )}

        {/* Add to Cart */}
        <div className="relative mt-2">
          {inCart ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFromCart(product);
              }}
              className="w-full text-xs font-medium py-1.5 rounded-lg transition-all duration-200 bg-pink/10 text-pink border border-pink/20"
            >
              <span className="flex items-center justify-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                In Cart
              </span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchOptions();
              }}
              className="w-full text-xs font-medium py-1.5 rounded-lg transition-all duration-200 bg-gray-50 text-fg hover:bg-pink hover:text-white border border-gray-100"
            >
              Add to Cart
            </button>
          )}

          {/* Options popover */}
          {showOptions && (
            <div
              ref={popoverRef}
              className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-30 max-h-[320px] overflow-y-auto"
            >
              {loading ? (
                <div className="flex items-center justify-center py-4 gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-pink border-t-transparent animate-spin" />
                  <span className="text-[11px] text-muted">Loading options...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Sizes */}
                  {productOptions && productOptions.sizes.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-fg mb-1.5">Size</p>
                      <div className="flex flex-wrap gap-1">
                        {productOptions.sizes.map((s) => (
                          <button
                            key={s}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSize(selectedSize === s ? "" : s);
                            }}
                            className={`px-2 py-1 text-[10px] rounded-md border transition-all ${
                              selectedSize === s
                                ? "bg-pink text-white border-pink"
                                : "bg-white text-fg border-gray-200 hover:border-pink"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Colors */}
                  {productOptions && productOptions.colors.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-fg mb-1.5">Color</p>
                      <div className="flex flex-wrap gap-1">
                        {productOptions.colors.map((c) => (
                          <button
                            key={c}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedColor(selectedColor === c ? "" : c);
                            }}
                            className={`px-2 py-1 text-[10px] rounded-md border transition-all ${
                              selectedColor === c
                                ? "bg-pink text-white border-pink"
                                : "bg-white text-fg border-gray-200 hover:border-pink"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other options */}
                  {productOptions?.other?.map((opt) => (
                    <div key={opt.label}>
                      <p className="text-[10px] font-semibold text-fg mb-1.5">{opt.label}</p>
                      <div className="flex flex-wrap gap-1">
                        {opt.values.map((v) => (
                          <button
                            key={v}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOther((prev) => ({
                                ...prev,
                                [opt.label]: prev[opt.label] === v ? "" : v,
                              }));
                            }}
                            className={`px-2 py-1 text-[10px] rounded-md border transition-all ${
                              selectedOther[opt.label] === v
                                ? "bg-pink text-white border-pink"
                                : "bg-white text-fg border-gray-200 hover:border-pink"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* No options found message */}
                  {!hasOptions && (
                    <p className="text-[10px] text-muted text-center py-1">
                      No variant options found — add directly
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOptions(false);
                        setProductOptions(null);
                      }}
                      className="flex-1 text-[10px] font-medium py-1.5 text-muted hover:text-fg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart();
                      }}
                      className="flex-1 text-[10px] font-semibold py-1.5 bg-pink text-white rounded-lg hover:bg-pink-dark transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
