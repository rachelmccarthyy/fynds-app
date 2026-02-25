"use client";

import { Product } from "@/lib/types";
import { useStore } from "@/lib/store-context";
import Image from "next/image";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, removeFromCart, toggleFavorite, isInCart, isFavorite } =
    useStore();

  const inCart = isInCart(product);
  const favorited = isFavorite(product);

  return (
    <div className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md hover:scale-[1.02] transition-all duration-200">
      {/* Image — clicks open product link */}
      <a
        href={product.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-square bg-surface"
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

      {/* Heart button — top-right of image */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(product);
        }}
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform z-10"
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      >
        {favorited ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="#FF1D6C"
            stroke="#FF1D6C"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        )}
      </button>

      {/* Product info */}
      <div className="p-3">
        <h3 className="text-xs font-medium text-fg line-clamp-2 leading-snug">
          {product.title}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-pink">
            {product.price}
          </span>
          <span className="text-[10px] text-muted truncate ml-2 max-w-[80px]">
            {product.source}
          </span>
        </div>

        {/* Add to Cart button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (inCart) {
              removeFromCart(product);
            } else {
              addToCart(product);
            }
          }}
          className={`mt-2 w-full text-xs font-medium py-1.5 rounded-lg transition-all duration-200 ${
            inCart
              ? "bg-pink/10 text-pink border border-pink/20"
              : "bg-gray-50 text-fg hover:bg-pink hover:text-white border border-gray-100"
          }`}
        >
          {inCart ? (
            <span className="flex items-center justify-center gap-1">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              In Cart
            </span>
          ) : (
            "Add to Cart"
          )}
        </button>
      </div>
    </div>
  );
}
