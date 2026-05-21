import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { CheckoutRequest, ItemStatusUpdate } from "@/lib/types";
import { sessionStore } from "@/lib/purchase-agent/session-store";
import { processPurchaseOrder } from "@/lib/purchase-agent";
import { auth } from "@/lib/auth";
import { getClientIp, checkRateLimit, isTrustedOrigin } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  const userId = session?.user?.email;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body: CheckoutRequest = await req.json();

    if (!body.items?.length || !body.shipping || !body.payment) {
      return NextResponse.json(
        { error: "Missing required checkout data" },
        { status: 400 }
      );
    }

    const sessionId = uuidv4();

    // Initialize session with pending items
    const initialItems: ItemStatusUpdate[] = body.items.map((item) => ({
      productLink: item.product.link,
      status: "pending" as const,
      message: "Waiting to process...",
      retailer: item.retailer,
    }));

    sessionStore.create(sessionId, initialItems, userId);

    // Start purchase agent in background (don't await)
    processPurchaseOrder(sessionId, body).catch((err) => {
      console.error("Purchase agent error:", err);
      // Mark remaining items as failed
      const session = sessionStore.get(sessionId);
      if (session) {
        for (const item of session.items) {
          if (
            item.status !== "completed" &&
            item.status !== "failed" &&
            item.status !== "captcha_required"
          ) {
            sessionStore.updateItem(sessionId, {
              ...item,
              status: "failed",
              message: "Unexpected error occurred",
            });
          }
        }
      }
    });

    return NextResponse.json({ sessionId });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
