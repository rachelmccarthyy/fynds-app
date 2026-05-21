import { CheckoutRequest, ItemStatusUpdate } from "../types";
import { sessionStore } from "./session-store";

// Real browser automation requires an explicit opt-in: CHECKOUT_REAL=true.
// Absent, blank, "false", or any other value → mock. Fail-safe by design.
// See PROJECT.md §6 v0.5.1 and §14 EC3.
const REAL_MODE = process.env.CHECKOUT_REAL === "true";
const MAX_RETRIES = 2;
const RETAILER_DELAY = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mockPurchaseOrder(
  sessionId: string,
  request: CheckoutRequest
): Promise<void> {
  const { items, payment } = request;

  for (const item of items) {
    const updateStatus = (
      status: ItemStatusUpdate["status"],
      message: string,
      extra?: Partial<ItemStatusUpdate>
    ) => {
      sessionStore.updateItem(sessionId, {
        productLink: item.product.link,
        status,
        message,
        retailer: item.retailer,
        ...extra,
      });
    };

    const steps: [ItemStatusUpdate["status"], string, number][] = [
      ["navigating", "Navigating to retailer...", 1500],
      ["adding_to_cart", "Adding to cart...", 2000],
      ["filling_shipping", "Entering shipping address...", 2000],
      ["filling_payment", "Entering payment details...", 1500],
      ["confirming", "Confirming order...", 2000],
    ];

    for (const [status, message, wait] of steps) {
      updateStatus(status, message);
      await delay(wait);
    }

    // 80% success, 20% failure for realistic testing
    if (Math.random() > 0.2) {
      const orderNum = `MOCK-${Date.now().toString(36).toUpperCase()}`;
      updateStatus("completed", "Order placed successfully! (mock)", {
        confirmationNumber: orderNum,
        confirmation: {
          orderNumber: orderNum,
          estimatedDelivery: "March 15–18, 2026",
          orderTotal: item.product.price,
          itemDetails: `${item.product.title}${item.options?.size ? ` — Size: ${item.options.size}` : ""}${item.options?.color ? `, Color: ${item.options.color}` : ""}`,
        },
      });
    } else {
      updateStatus("failed", "CAPTCHA detected — complete manually. (mock)", {
        manualCheckoutUrl: item.product.link,
      });
    }

    await delay(1000);
  }

  // Zero out payment data
  payment.cardNumber = "";
  payment.cvv = "";
  payment.expiryMonth = "";
  payment.expiryYear = "";
}

async function realPurchaseOrder(
  sessionId: string,
  request: CheckoutRequest
): Promise<void> {
  // Dynamic imports so Playwright isn't loaded in mock mode
  const { createStealthContext, createPage, randomDelay } = await import("./browser");
  const { getStrategy } = await import("./strategies/registry");

  const { items, shipping, payment } = request;

  // Group items by retailer domain
  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const domain = item.retailerDomain;
    if (!grouped.has(domain)) grouped.set(domain, []);
    grouped.get(domain)!.push(item);
  }

  // Process each retailer sequentially
  for (const [domain, retailerItems] of grouped) {
    const strategy = getStrategy(domain);
    const context = await createStealthContext();

    try {
      for (const item of retailerItems) {
        const updateStatus = (
          status: ItemStatusUpdate["status"],
          message: string,
          extra?: Partial<ItemStatusUpdate>
        ) => {
          sessionStore.updateItem(sessionId, {
            productLink: item.product.link,
            status,
            message,
            retailer: item.retailer,
            ...extra,
          });
        };

        let lastResult = null;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          if (attempt > 0) {
            updateStatus("navigating", `Retry ${attempt}/${MAX_RETRIES}...`);
            await randomDelay(2000, 4000);
          }

          updateStatus("navigating", "Navigating to retailer...");

          const page = await createPage(context);

          try {
            // Set a total timeout for this item
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("Purchase timeout (3 min)")),
                180_000
              )
            );

            const result = await Promise.race([
              strategy.execute(
                page,
                item,
                shipping,
                payment,
                (msg: string) => {
                  let status: ItemStatusUpdate["status"] = "navigating";
                  if (msg.toLowerCase().includes("cart"))
                    status = "adding_to_cart";
                  else if (msg.toLowerCase().includes("shipping"))
                    status = "filling_shipping";
                  else if (msg.toLowerCase().includes("payment"))
                    status = "filling_payment";
                  else if (msg.toLowerCase().includes("confirm"))
                    status = "confirming";
                  updateStatus(status, msg);
                }
              ),
              timeoutPromise,
            ]);

            lastResult = result;
            await page.close();

            if (result.success) {
              updateStatus("completed", result.message, {
                confirmationNumber: result.confirmationNumber,
              });
              break;
            }

            if (result.manualCheckoutUrl) {
              updateStatus(
                result.message.toLowerCase().includes("captcha")
                  ? "captcha_required"
                  : "failed",
                result.message,
                { manualCheckoutUrl: result.manualCheckoutUrl }
              );
              break;
            }

            if (attempt === MAX_RETRIES) {
              updateStatus("failed", result.message, {
                manualCheckoutUrl: result.manualCheckoutUrl,
              });
            }
          } catch (err) {
            await page.close().catch(() => {});
            lastResult = {
              success: false,
              message:
                err instanceof Error ? err.message : "Unknown error",
            };

            if (attempt === MAX_RETRIES) {
              updateStatus("failed", lastResult.message, {
                manualCheckoutUrl: item.product.link,
              });
            }
          }
        }

        await randomDelay(RETAILER_DELAY, RETAILER_DELAY + 1000);
      }
    } finally {
      await context.close();
    }

    await randomDelay(RETAILER_DELAY, RETAILER_DELAY + 2000);
  }

  // Zero out payment data
  payment.cardNumber = "";
  payment.cvv = "";
  payment.expiryMonth = "";
  payment.expiryYear = "";
}

export async function processPurchaseOrder(
  sessionId: string,
  request: CheckoutRequest
): Promise<void> {
  if (REAL_MODE) {
    return realPurchaseOrder(sessionId, request);
  }
  return mockPurchaseOrder(sessionId, request);
}
