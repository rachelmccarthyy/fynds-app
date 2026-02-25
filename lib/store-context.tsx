"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { Product, SavedProduct, StyleProfile } from "./types";

const ONE_HOUR = 60 * 60 * 1000;

interface StoreContextType {
  cart: SavedProduct[];
  favorites: SavedProduct[];
  styleProfile: StyleProfile | null;
  isCartOpen: boolean;
  isFavoritesOpen: boolean;
  addToCart: (product: Product) => void;
  removeFromCart: (product: Product) => void;
  toggleFavorite: (product: Product) => void;
  isInCart: (product: Product) => boolean;
  isFavorite: (product: Product) => boolean;
  setIsCartOpen: (open: boolean) => void;
  setIsFavoritesOpen: (open: boolean) => void;
  setStyleProfile: (profile: StyleProfile) => void;
  updateStyleField: (field: keyof StyleProfile, value: string) => void;
  clearStyleProfile: () => void;
  clearStore: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function pruneExpired(items: SavedProduct[]): SavedProduct[] {
  const cutoff = Date.now() - ONE_HOUR;
  return items.filter((item) => item.savedAt > cutoff);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;

  const [cart, setCart] = useState<SavedProduct[]>([]);
  const [favorites, setFavorites] = useState<SavedProduct[]>([]);
  const [styleProfile, setStyleProfileState] = useState<StyleProfile | null>(
    null
  );
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setCart(loadFromStorage("fynds-cart", []));
    setFavorites(loadFromStorage("fynds-favorites", []));
    setStyleProfileState(loadFromStorage("fynds-profile", null));
    setHydrated(true);
  }, []);

  // Prune expired items for guest users on load and every minute
  useEffect(() => {
    if (!hydrated || isSignedIn) return;

    // Prune immediately on load
    setCart((prev) => {
      const pruned = pruneExpired(prev);
      return pruned.length !== prev.length ? pruned : prev;
    });
    setFavorites((prev) => {
      const pruned = pruneExpired(prev);
      return pruned.length !== prev.length ? pruned : prev;
    });

    // Check every minute for newly expired items
    const interval = setInterval(() => {
      setCart((prev) => {
        const pruned = pruneExpired(prev);
        return pruned.length !== prev.length ? pruned : prev;
      });
      setFavorites((prev) => {
        const pruned = pruneExpired(prev);
        return pruned.length !== prev.length ? pruned : prev;
      });
    }, 60_000);

    return () => clearInterval(interval);
  }, [hydrated, isSignedIn]);

  // Persist to localStorage on changes (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("fynds-cart", JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("fynds-favorites", JSON.stringify(favorites));
  }, [favorites, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (styleProfile) {
      localStorage.setItem("fynds-profile", JSON.stringify(styleProfile));
    }
  }, [styleProfile, hydrated]);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      if (prev.some((p) => p.link === product.link)) return prev;
      return [...prev, { ...product, savedAt: Date.now() }];
    });
  }, []);

  const removeFromCart = useCallback((product: Product) => {
    setCart((prev) => prev.filter((p) => p.link !== product.link));
  }, []);

  const toggleFavorite = useCallback((product: Product) => {
    setFavorites((prev) => {
      const exists = prev.some((p) => p.link === product.link);
      if (exists) return prev.filter((p) => p.link !== product.link);
      return [...prev, { ...product, savedAt: Date.now() }];
    });
  }, []);

  const isInCart = useCallback(
    (product: Product) => cart.some((p) => p.link === product.link),
    [cart]
  );

  const isFavorite = useCallback(
    (product: Product) => favorites.some((p) => p.link === product.link),
    [favorites]
  );

  const setStyleProfile = useCallback((profile: StyleProfile) => {
    setStyleProfileState(profile);
  }, []);

  const updateStyleField = useCallback(
    (field: keyof StyleProfile, value: string) => {
      setStyleProfileState((prev) => {
        if (!prev) return prev;
        return { ...prev, [field]: value };
      });
    },
    []
  );

  const clearStyleProfile = useCallback(() => {
    setStyleProfileState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("fynds-profile");
    }
  }, []);

  const clearStore = useCallback(() => {
    setCart([]);
    setFavorites([]);
    setIsCartOpen(false);
    setIsFavoritesOpen(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("fynds-cart");
      localStorage.removeItem("fynds-favorites");
    }
  }, []);

  return (
    <StoreContext.Provider
      value={{
        cart,
        favorites,
        styleProfile,
        isCartOpen,
        isFavoritesOpen,
        addToCart,
        removeFromCart,
        toggleFavorite,
        isInCart,
        isFavorite,
        setIsCartOpen,
        setIsFavoritesOpen,
        setStyleProfile,
        updateStyleField,
        clearStyleProfile,
        clearStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}
