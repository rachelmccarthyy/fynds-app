"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSupabaseAuth } from "@/lib/supabase/auth-context";
import { useStore } from "@/lib/store-context";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { user, isPermanentUser, signInWithGoogle, handleSignOut } = useSupabaseAuth();
  const { cart, favorites, setIsCartOpen, setIsFavoritesOpen, clearStore } = useStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const avatar = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email) as string | undefined;
  const email = user?.email;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        isLanding ? "bg-transparent" : "bg-white border-b border-gray-100"
      }`}
    >
      <div className="flex items-center justify-between px-5 md:px-10 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={isLanding ? "/fynds-logo-white.png" : "/fynds-logo-black.png"}
            alt="Fynds"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span
            className={`font-semibold text-lg ${
              isLanding ? "text-white" : "text-fg"
            }`}
          >
            Fynds
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {isLanding ? (
            <Link
              href="/shop"
              className="text-sm font-medium text-white hover:text-pink transition-colors duration-200"
            >
              Start Shopping →
            </Link>
          ) : (
            <>
              {/* Favorites button */}
              <button
                onClick={() => setIsFavoritesOpen(true)}
                className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Open favorites"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#111"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {favorites.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-pink text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {favorites.length}
                  </span>
                )}
              </button>

              {/* Cart button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Open cart"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#111"
                  strokeWidth="2"
                >
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                {cart.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-pink text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>

              {/* Auth section */}
              {isPermanentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {avatar ? (
                      <Image
                        src={avatar}
                        alt={displayName || "User"}
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 bg-pink text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {displayName?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </button>
                  {showUserMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                        <div className="px-3 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-fg truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-muted truncate">{email}</p>
                        </div>
                        <button
                          onClick={() => {
                            clearStore();
                            handleSignOut();
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-gray-50 transition-colors"
                        >
                          Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="text-xs font-medium text-fg hover:text-pink transition-colors px-3 py-1.5 border border-gray-200 rounded-lg hover:border-pink/30"
                >
                  Sign in
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
