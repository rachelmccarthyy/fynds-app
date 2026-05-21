"use client";

import { useStore } from "@/lib/store-context";
import { useCheckout } from "@/lib/checkout-context";
import { useSupabaseAuth } from "@/lib/supabase/auth-context";
import Image from "next/image";

export default function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart } = useStore();
  const { startCheckout } = useCheckout();
  const { isPermanentUser, signInWithGoogle } = useSupabaseAuth();

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-50"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-fg">
            My Cart ({cart.length} {cart.length === 1 ? "item" : "items"})
          </h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1 hover:bg-gray-50 rounded-lg transition-colors"
            aria-label="Close cart"
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
          {cart.length === 0 ? (
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
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <p className="text-sm">No items in your cart yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {cart.map((product) => (
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
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-semibold text-pink">
                        {product.price}
                      </p>
                      <span className="text-[9px] text-muted bg-surface px-1.5 py-0.5 rounded">
                        {product.source}
                      </span>
                    </div>
                    {/* Rating */}
                    {product.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] text-amber-600 font-medium">
                          {"★".repeat(Math.round(product.rating))}{"☆".repeat(5 - Math.round(product.rating))}
                        </span>
                        <span className="text-[9px] text-muted">
                          {product.rating}{product.ratingCount ? ` (${product.ratingCount > 1000 ? `${(product.ratingCount / 1000).toFixed(1)}k` : product.ratingCount})` : ""}
                        </span>
                      </div>
                    )}
                    {/* User-selected options */}
                    {product.options && (product.options.size || product.options.color || product.options.notes) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {product.options.size && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-pink/10 text-pink rounded font-medium">
                            Size: {product.options.size}
                          </span>
                        )}
                        {product.options.color && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-pink/10 text-pink rounded font-medium">
                            Color: {product.options.color}
                          </span>
                        )}
                        {product.options.notes && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-surface rounded text-muted font-medium">
                            {product.options.notes}
                          </span>
                        )}
                      </div>
                    )}
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
                        onClick={() => removeFromCart(product)}
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

        {/* Checkout button */}
        {cart.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100">
            {isPermanentUser ? (
              <button
                onClick={startCheckout}
                className="w-full py-3 bg-pink text-white text-sm font-semibold rounded-xl hover:bg-pink-dark transition-colors"
              >
                Checkout with Fynds
              </button>
            ) : (
              <p className="text-xs text-center text-muted">
                <button
                  onClick={signInWithGoogle}
                  className="text-pink hover:underline font-medium"
                >
                  Sign in
                </button>{" "}
                to checkout with Fynds
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
