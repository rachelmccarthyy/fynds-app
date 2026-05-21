"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface SupabaseAuthState {
  user: User | null;
  session: Session | null;
  /** true for both anonymous and permanent (Google-linked) users */
  isSignedIn: boolean;
  /** true once a Google identity has been linked */
  isPermanentUser: boolean;
  /** Bearer token to send in Authorization headers to API routes */
  accessToken: string | null;
  signInWithGoogle: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthState | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Ref tracks the previous user for anon→permanent merge detection without stale closure
  const prevUserRef = useRef<User | null>(null);

  useEffect(() => {
    // Detect identity_already_exists from a linkIdentity redirect.
    // This happens when a returning user (who previously signed in with Google, then signed out)
    // clicks "Sign in" again: the new anon session tries linkIdentity, Supabase rejects it and
    // redirects back with ?error_code=identity_already_exists. We strip the error params and
    // retry with signInWithOAuth so they sign into their existing permanent account.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("error_code") === "identity_already_exists") {
        url.searchParams.delete("error");
        url.searchParams.delete("error_code");
        url.searchParams.delete("error_description");
        window.history.replaceState({}, "", url.toString());
        console.log("[fynds:auth] identity_already_exists — retrying as returning user via signInWithOAuth");
        supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${url.origin}${url.pathname}` },
        });
        return; // skip normal session init; OAuth redirect takes over
      }
    }

    // Restore existing session or create an anonymous one on first visit
    supabase.auth
      .getSession()
      .then(async ({ data: { session: existing }, error: sessionErr }) => {
        if (sessionErr) {
          console.error("[fynds:auth] getSession failed:", sessionErr.message, sessionErr);
          return;
        }
        if (existing) {
          prevUserRef.current = existing.user;
          setSession(existing);
          setUser(existing.user);
          console.log("[fynds:auth] session restored", {
            user_id: existing.user.id,
            is_anonymous: existing.user.is_anonymous,
          });
        } else {
          console.log("[fynds:auth] no session — calling signInAnonymously...");
          const { data, error: anonErr } = await supabase.auth.signInAnonymously();
          if (anonErr) {
            console.error("[fynds:auth] signInAnonymously failed:", anonErr.message, anonErr);
            return;
          }
          prevUserRef.current = data.user ?? null;
          setSession(data.session);
          setUser(data.user ?? null);
          console.log("[fynds:auth] anonymous session created", {
            user_id: data.user?.id,
          });
        }
      })
      .catch((err) =>
        console.error("[fynds:auth] unexpected auth init error:", err)
      );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      const prevUser = prevUserRef.current;
      prevUserRef.current = newSession?.user ?? null;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      console.log("[fynds:auth] state change", {
        event,
        user_id: newSession?.user?.id ?? null,
        is_anonymous: newSession?.user?.is_anonymous ?? null,
        prev_user_id: prevUser?.id ?? null,
        prev_is_anonymous: prevUser?.is_anonymous ?? null,
      });

      // Anon → permanent transition: v0.5.3 will write to the events table.
      // Note: after OAuth redirect the page reloads fresh, so prevUser is null here;
      // identity_merge is detected by comparing user_id from before vs after the redirect
      // (both should be the same UUID — that's the carry-over guarantee).
      if (
        event === "USER_UPDATED" &&
        prevUser?.is_anonymous === true &&
        newSession?.user?.is_anonymous === false
      ) {
        console.log("[fynds:auth] identity_merge (same-session)", {
          anon_id: prevUser.id,
          user_id: newSession.user.id,
          ids_match: prevUser.id === newSession.user.id,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // Capture current path at click time so the user returns to where they were.
    // window.location.origin is the environment origin (prod or preview) — never hardcoded.
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;

    if (user?.is_anonymous) {
      // Link Google to the existing anonymous user — user_id is preserved, no data migration
      await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo },
      });
    } else {
      // Returning user signing back in after sign-out
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
    }
  }, [user]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    // A new anonymous session is created on the next getSession() call (next mount/reload)
  }, []);

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        session,
        isSignedIn: !!user,
        isPermanentUser: !!user && user.is_anonymous === false,
        accessToken: session?.access_token ?? null,
        signInWithGoogle,
        handleSignOut,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth(): SupabaseAuthState {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx)
    throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  return ctx;
}
