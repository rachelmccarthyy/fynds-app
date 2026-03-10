import { NextRequest } from "next/server";
import { sessionStore } from "@/lib/purchase-agent/session-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return new Response("Missing sessionId", { status: 400 });
  }

  const session = sessionStore.get(sessionId);
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(session)}\n\n`)
      );

      // Subscribe to updates
      const unsubscribe = sessionStore.subscribe(sessionId, (status) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(status)}\n\n`)
          );

          // Close stream when order is done
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
              // Clean up session after 5 minutes
              setTimeout(() => sessionStore.cleanup(sessionId), 5 * 60 * 1000);
            }, 1000);
          }
        } catch {
          unsubscribe();
        }
      });

      // Clean up on client disconnect
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
