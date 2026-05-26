"use client";

import { useEffect, useCallback } from "react";
import { useSupabaseAuth } from "@/lib/supabase/auth-context";
import { track, setAccessToken, type TrackPayload } from "./track";

/** React hook that pre-binds the current access token to track().
 *  Keeps the module-level token ref in sync with the auth context. */
export function useTrack() {
  const { accessToken } = useSupabaseAuth();

  // Keep the module-level token current so flush paths always have it
  useEffect(() => {
    setAccessToken(accessToken);
  }, [accessToken]);

  return useCallback(
    (event_type: string, properties: Record<string, unknown>, surface?: string) => {
      track({ event_type, properties, surface } satisfies TrackPayload);
    },
    [] // stable ref — token is read from the module-level ref at flush time, not captured here
  );
}
