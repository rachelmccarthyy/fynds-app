"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useSupabaseAuth } from "@/lib/supabase/auth-context";
import { computeProductKey } from "@/lib/product-key";
import { Product, ProductOptions, SavedProduct, StyleProfile } from "./types";

const ONE_HOUR = 60 * 60 * 1000;

interface StoreContextType {
  cart: SavedProduct[];
  favorites: SavedProduct[];
  styleProfile: StyleProfile | null;
  isCartOpen: boolean;
  isFavoritesOpen: boolean;
  addToCart: (product: Product, options?: ProductOptions) => void;
  removeFromCart: (product: Product) => void;
  clearCart: () => void;
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

// Convert a DB profile row to StyleProfile
function dbToProfile(row: Record<string, unknown>): StyleProfile {
  const sizes = row.sizes as Record<string, string> | null;
  const avoidBrands = row.avoid_brands as string[] | null;
  return {
    aesthetic: (row.aesthetic as string) || "",
    budgetRange: (row.budget_range as string) || "",
    sizes: sizes?.default || "",
    shoeSize: (row.shoe_size as string) || "",
    gender: (row.gender as string) || "",
    avoidBrands: avoidBrands?.join(", ") || "",
    notes: (row.notes as string) || "",
  };
}

// Convert a DB saved_item row to SavedProduct
function dbToSavedProduct(row: Record<string, unknown>): SavedProduct {
  const snapshot = row.product_snapshot as Product;
  return {
    ...snapshot,
    savedAt: new Date(row.saved_at as string).getTime(),
    options: (row.options as ProductOptions) || undefined,
  };
}

// Fire-and-forget server sync helpers
function syncSavedItem(
  action: "add" | "remove",
  kind: "favorite" | "cart",
  token: string,
  product?: Product,
  options?: ProductOptions,
  productKey?: string,
  all?: boolean
) {
  if (action === "add" && product) {
    fetch("/api/saved-items", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, product, options }),
    }).catch((err) => console.warn("[fynds:sync] saved-items write failed — item is in localStorage but not on server:", err));
  } else {
    fetch("/api/saved-items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, productKey, all }),
    }).catch((err) => console.warn("[fynds:sync] saved-items delete failed:", err));
  }
}

function syncProfile(profile: StyleProfile, token: string) {
  fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(profile),
  }).catch((err) => console.warn("[fynds:sync] profile write failed — profile is in localStorage but not on server:", err));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { isPermanentUser, user, accessToken } = useSupabaseAuth();
  const userId = user?.id ?? null;
  const isSignedIn = isPermanentUser; // prune localStorage for anon users; not for permanent

  const [cart, setCart] = useState<SavedProduct[]>([]);
  const [favorites, setFavorites] = useState<SavedProduct[]>([]);
  const [styleProfile, setStyleProfileState] = useState<StyleProfile | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Track which userId we have already pulled server state for
  const lastHydratedForRef = useRef<string | null>(null);

  // Step 1: load from localStorage immediately (instant UI, works offline)
  useEffect(() => {
    setCart(loadFromStorage("fynds-cart", []));
    setFavorites(loadFromStorage("fynds-favorites", []));
    setStyleProfileState(loadFromStorage("fynds-profile", null));
    setHydrated(true);
  }, []);

  // Step 2: hydrate from Supabase once per user session (server is source of truth)
  useEffect(() => {
    if (!accessToken || !userId || lastHydratedForRef.current === userId) return;
    lastHydratedForRef.current = userId;

    Promise.all([
      fetch("/api/profile", { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch("/api/saved-items", { headers: { Authorization: `Bearer ${accessToken}` } }),
    ])
      .then(async ([profileRes, itemsRes]) => {
        if (profileRes.ok) {
          const { profile } = await profileRes.json();
          if (profile) {
            const sp = dbToProfile(profile);
            setStyleProfileState(sp);
            localStorage.setItem("fynds-profile", JSON.stringify(sp));
          }
        }
        if (itemsRes.ok) {
          const { items } = await itemsRes.json();
          const serverFavorites = (items as Record<string, unknown>[])
            .filter((i) => i.kind === "favorite")
            .map(dbToSavedProduct);
          const serverCart = (items as Record<string, unknown>[])
            .filter((i) => i.kind === "cart")
            .map(dbToSavedProduct);

          // Merge: local items absent from server had a failed sync — keep them and re-sync.
          // Server wins for any item present on both sides.
          const serverFavLinks = new Set(serverFavorites.map((p) => p.link));
          const serverCartLinks = new Set(serverCart.map((p) => p.link));
          const localFavs = loadFromStorage<SavedProduct[]>("fynds-favorites", []);
          const localCart = loadFromStorage<SavedProduct[]>("fynds-cart", []);
          const recoveredFavs = localFavs.filter((p) => !serverFavLinks.has(p.link));
          const recoveredCart = localCart.filter((p) => !serverCartLinks.has(p.link));

          // Re-sync recovered items
          recoveredFavs.forEach((p) => syncSavedItem("add", "favorite", accessToken, p));
          recoveredCart.forEach((p) => syncSavedItem("add", "cart", accessToken, p, p.options));

          const mergedFavs = [...serverFavorites, ...recoveredFavs];
          const mergedCart = [...serverCart, ...recoveredCart];
          setFavorites(mergedFavs);
          setCart(mergedCart);
          localStorage.setItem("fynds-favorites", JSON.stringify(mergedFavs));
          localStorage.setItem("fynds-cart", JSON.stringify(mergedCart));
        }
      })
      .catch(console.error);
  }, [accessToken, userId]);

  // Prune expired items for anonymous (non-permanent) users
  useEffect(() => {
    if (!hydrated || isSignedIn) return;
    setCart((prev) => { const p = pruneExpired(prev); return p.length !== prev.length ? p : prev; });
    setFavorites((prev) => { const p = pruneExpired(prev); return p.length !== prev.length ? p : prev; });
    const interval = setInterval(() => {
      setCart((prev) => { const p = pruneExpired(prev); return p.length !== prev.length ? p : prev; });
      setFavorites((prev) => { const p = pruneExpired(prev); return p.length !== prev.length ? p : prev; });
    }, 60_000);
    return () => clearInterval(interval);
  }, [hydrated, isSignedIn]);

  // Persist to localStorage on every change (cache layer)
  useEffect(() => { if (hydrated) localStorage.setItem("fynds-cart", JSON.stringify(cart)); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("fynds-favorites", JSON.stringify(favorites)); }, [favorites, hydrated]);
  useEffect(() => { if (hydrated && styleProfile) localStorage.setItem("fynds-profile", JSON.stringify(styleProfile)); }, [styleProfile, hydrated]);

  const addToCart = useCallback((product: Product, options?: ProductOptions) => {
    setCart((prev) => {
      if (prev.some((p) => p.link === product.link)) return prev;
      return [...prev, { ...product, savedAt: Date.now(), options }];
    });
    if (accessToken) syncSavedItem("add", "cart", accessToken, product, options);
  }, [accessToken]);

  const removeFromCart = useCallback((product: Product) => {
    setCart((prev) => prev.filter((p) => p.link !== product.link));
    if (accessToken) syncSavedItem("remove", "cart", accessToken, undefined, undefined, computeProductKey(product));
  }, [accessToken]);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem("fynds-cart");
    if (accessToken) syncSavedItem("remove", "cart", accessToken, undefined, undefined, undefined, true);
  }, [accessToken]);

  const toggleFavorite = useCallback((product: Product) => {
    setFavorites((prev) => {
      const exists = prev.some((p) => p.link === product.link);
      if (exists) {
        if (accessToken) syncSavedItem("remove", "favorite", accessToken, undefined, undefined, computeProductKey(product));
        return prev.filter((p) => p.link !== product.link);
      }
      if (accessToken) syncSavedItem("add", "favorite", accessToken, product);
      return [...prev, { ...product, savedAt: Date.now() }];
    });
  }, [accessToken]);

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
    if (accessToken) syncProfile(profile, accessToken);
  }, [accessToken]);

  const updateStyleField = useCallback(
    (field: keyof StyleProfile, value: string) => {
      setStyleProfileState((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, [field]: value };
        if (accessToken) syncProfile(updated, accessToken);
        return updated;
      });
    },
    [accessToken]
  );

  const clearStyleProfile = useCallback(() => {
    setStyleProfileState(null);
    localStorage.removeItem("fynds-profile");
    if (accessToken) {
      fetch("/api/profile", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(console.error);
    }
  }, [accessToken]);

  const clearStore = useCallback(() => {
    setCart([]);
    setFavorites([]);
    setIsCartOpen(false);
    setIsFavoritesOpen(false);
    localStorage.removeItem("fynds-cart");
    localStorage.removeItem("fynds-favorites");
    // Server data intentionally preserved on sign-out — available on next sign-in
  }, []);

  return (
    <StoreContext.Provider
      value={{
        cart, favorites, styleProfile,
        isCartOpen, isFavoritesOpen,
        addToCart, removeFromCart, clearCart,
        toggleFavorite, isInCart, isFavorite,
        setIsCartOpen, setIsFavoritesOpen,
        setStyleProfile, updateStyleField, clearStyleProfile, clearStore,
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
