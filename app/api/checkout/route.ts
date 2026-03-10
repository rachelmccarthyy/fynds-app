import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { CheckoutRequest, ItemStatusUpdate } from "@/lib/types";
import { sessionStore } from "@/lib/purchase-agent/session-store";
import { processPurchaseOrder } from "@/lib/purchase-agent";

export async function POST(req: NextRequest) {
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

    sessionStore.create(sessionId, initialItems);

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
