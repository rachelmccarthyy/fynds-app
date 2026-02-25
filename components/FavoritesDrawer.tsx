"use client";

import { useStore } from "@/lib/store-context";
import Image from "next/image";

export default function FavoritesDrawer() {
  const { favorites, isFavoritesOpen, setIsFavoritesOpen, toggleFavorite } =
    useStore();

  if (!isFavoritesOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-50"
        onClick={() => setIsFavoritesOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-fg">
            My Favorites ({favorites.length}{" "}
            {favorites.length === 1 ? "item" : "items"})
          </h2>
          <button
            onClick={() => setIsFavoritesOpen(false)}
            className="p-1 hover:bg-gray-50 rounded-lg transition-colors"
            aria-label="Close favorites"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#111"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mb-3 opacity-40"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <p className="text-sm">No favorites yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {favorites.map((product) => (
                <div key={product.link} className="flex gap-3 p-4">
                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 w-16 h-16 relative bg-surface rounded-lg overflow-hidden"
                  >
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        className="object-contain p-1"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-[10px]">
                        No img
                      </div>
                    )}
                  </a>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-medium text-fg line-clamp-2 leading-snug">
                      {product.title}
                    </h3>
                    <p className="text-sm font-semibold text-pink mt-1">
                      {product.price}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <a
                        href={product.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-medium text-pink hover:underline"
                      >
                        Visit Store
                      </a>
                      <span className="text-gray-200">|</span>
                      <button
                        onClick={() => toggleFavorite(product)}
                        className="text-[10px] font-medium text-muted hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
