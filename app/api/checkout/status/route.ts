import { NextRequest } from "next/server";
import { sessionStore } from "@/lib/purchase-agent/session-store";
import { getRequestUser } from "@/lib/supabase/server";
import { getClientIp, checkRateLimit, isTrustedOrigin } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return new Response("Forbidden", { status: 403 });
  }

  const reqUser = await getRequestUser(req); // checks Bearer header then ?token= param
  const userId = reqUser?.id; // stable auth.users.id UUID
  if (!userId) {
    return new Response("Authentication required", { status: 401 });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip, 10, 60_000)) {
    return new Response("Too many requests", { status: 429 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return new Response("Missing sessionId", { status: 400 });
  }

  const checkoutSession = sessionStore.get(sessionId);
  if (!checkoutSession) {
    return new Response("Session not found", { status: 404 });
  }

  if (!sessionStore.isOwner(sessionId, userId)) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(checkoutSession)}\n\n`)
      );

      const unsubscribe = sessionStore.subscribe(sessionId, (status) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(status)}\n\n`)
          );

          if (
            status.overallStatus === "completed" ||
            status.overallStatus === "failed" ||
            status.overallStatus === "partial"
          ) {
            setTimeout(() => {
              try {
                controller.close();
              } catch {
                // already closed
              }
              setTimeout(() => sessionStore.cleanup(sessionId), 5 * 60 * 1000);
            }, 1000);
          }
        } catch {
          unsubscribe();
        }
      });

      req.signal.addEventListener("abort", () => {
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
