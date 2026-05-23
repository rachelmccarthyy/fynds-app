import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

interface ServerEventData {
  event_type: string;
  user_id?: string | null;
  anon_id?: string | null;
  session_id?: string | null;
  platform?: string | null;
  surface?: string | null;
  properties: Record<string, unknown>;
}

/**
 * Inserts a server-origin event directly via service role.
 * Always call inside an after() block — never awaited in the critical path.
 * Swallows errors: a logging failure must never surface to the user.
 */
export async function trackServer(event: ServerEventData): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("events")
    .insert({
      event_type: event.event_type,
      user_id:    event.user_id  ?? null,
      anon_id:    event.anon_id  ?? null,
      session_id: event.session_id ?? "server",
      platform:   event.platform   ?? "desktop_web",
      surface:    event.surface    ?? null,
      app_version: "0.5.3",
      schema_version: 1,
      properties: event.properties,
      // ts intentionally omitted — DB default now() is the server stamp
    });
  if (error) {
    console.error(`[fynds:trackServer] ${event.event_type} insert failed:`, error.message);
  }
}
