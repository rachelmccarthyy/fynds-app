import { Page } from "playwright-core";
import { ShippingAddress, PaymentDetails, OrderItem } from "@/lib/types";
import { RetailerStrategy, PurchaseResult } from "./base";
import { humanType, randomDelay, dismissCookieConsent } from "../browser";

export class AmazonStrategy implements RetailerStrategy {
  name = "Amazon";

  canHandle(domain: string): boolean {
    return domain.includes("amazon.com") || domain.includes("amazon.co");
  }

  async execute(
    page: Page,
    item: OrderItem,
    shipping: ShippingAddress,
    payment: PaymentDetails,
    onStatus: (message: string) => void
  ): Promise<PurchaseResult> {
    try {
      // Navigate to product
      onStatus("Navigating to product page...");
      await page.goto(item.product.link, { waitUntil: "domcontentloaded" });
      await randomDelay(1000, 2000);
      await dismissCookieConsent(page);

      // Check for CAPTCHA
      if (await this.detectCaptcha(page)) {
        return {
          success: false,
          message: "CAPTCHA detected. Please complete purchase manually.",
          manualCheckoutUrl: item.product.link,
        };
      }

      // Click "Buy Now" or "Add to Cart"
      onStatus("Adding to cart...");
      const buyNow = page.locator("#buy-now-button");
      const addToCart = page.locator("#add-to-cart-button");

      if (await buyNow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await buyNow.click();
      } else if (
        await addToCart.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        await addToCart.click();
        await randomDelay(1000, 2000);

        // Navigate to checkout
        const proceedToCheckout = page.locator(
          '#sc-buy-box-ptc-button, [name="proceedToRetailCheckout"], a:has-text("Proceed to checkout")'
        );
        if (
          await proceedToCheckout
            .first()
            .isVisible({ timeout: 5000 })
            .catch(() => false)
        ) {
          await proceedToCheckout.first().click();
        } else {
          await page.goto("https://www.amazon.com/gp/buy/spc/handlers/display.html", {
            waitUntil: "domcontentloaded",
          });
        }
      } else {
        return {
          success: false,
          message: "Could not find Add to Cart or Buy Now button.",
          manualCheckoutUrl: item.product.link,
        };
      }

      await randomDelay(2000, 3000);

      // Check for sign-in page
      if (page.url().includes("signin") || page.url().includes("ap/signin")) {
        return {
          success: false,
          message:
            "Amazon requires sign-in. Please sign in and complete purchase manually.",
          manualCheckoutUrl: page.url(),
        };
      }

      // Check for CAPTCHA again
      if (await this.detectCaptcha(page)) {
        return {
          success: false,
          message: "CAPTCHA detected during checkout.",
          manualCheckoutUrl: page.url(),
        };
      }

      // Fill shipping address
      onStatus("Entering shipping address...");
      await this.fillShipping(page, shipping);
      await randomDelay(1500, 2500);

      // Fill payment
      onStatus("Entering payment details...");
      await this.fillPayment(page, payment);
      await randomDelay(1500, 2500);

      // Confirm order
      onStatus("Confirming order...");
      const placeOrder = page.locator(
        '#submitOrderButtonId input, #placeYourOrder input, [name="placeYourOrder1"]'
      );
      if (
        await placeOrder
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
      ) {
        await placeOrder.first().click();
        await randomDelay(3000, 5000);

        // Check for confirmation
        const confirmation = await page
          .locator(
            'h1:has-text("Thank you"), h1:has-text("Order placed"), #thank-you-page'
          )
          .isVisible({ timeout: 10000 })
          .catch(() => false);

        if (confirmation) {
          const orderNum = await page
            .locator('[class*="order-id"], [class*="orderNumber"]')
            .textContent()
            .catch(() => null);

          return {
            success: true,
            confirmationNumber: orderNum?.trim() || undefined,
            message: "Order placed successfully on Amazon!",
          };
        }
      }

      return {
        success: false,
        message: "Could not confirm order placement.",
        manualCheckoutUrl: page.url(),
      };
    } catch (err) {
      return {
        success: false,
        message: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        manualCheckoutUrl: item.product.link,
      };
    }
  }

  private async detectCaptcha(page: Page): Promise<boolean> {
    const captchaSelectors = [
      "#captchacharacters",
      'img[src*="captcha"]',
      ".a-box-inner h4:has-text('robot')",
      'form[action*="validateCaptcha"]',
    ];

    for (const sel of captchaSelectors) {
      if (
        await page
          .locator(sel)
          .isVisible({ timeout: 1000 })
          .catch(() => false)
      ) {
        return true;
      }
    }
    return false;
  }

  private async fillShipping(
    page: Page,
    shipping: ShippingAddress
  ): Promise<void> {
    const fields: [string, string][] = [
      ['#address-ui-widgets-enterAddressFullName, [name="enterAddressFullName"]', shipping.fullName],
      ['#address-ui-widgets-enterAddressLine1, [name="enterAddressLine1"]', shipping.addressLine1],
      ['#address-ui-widgets-enterAddressCity, [name="enterAddressCity"]', shipping.city],
      ['#address-ui-widgets-enterAddressPostalCode, [name="enterAddressPostalCode"]', shipping.zipCode],
      ['#address-ui-widgets-enterAddressPhoneNumber, [name="enterAddressPhoneNumber"]', shipping.phone],
    ];

    for (const [selector, value] of fields) {
      try {
        const el = page.locator(selector).first();
        if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
          await el.clear();
          await humanType(page, selector, value);
          await randomDelay(300, 600);
        }
      } catch {
        // field not found, continue
      }
    }

    // Address line 2
    if (shipping.addressLine2) {
      try {
        const line2 = page
          .locator(
            '#address-ui-widgets-enterAddressLine2, [name="enterAddressLine2"]'
          )
          .first();
        if (await line2.isVisible({ timeout: 2000 }).catch(() => false)) {
          await line2.clear();
          await humanType(
            page,
            '#address-ui-widgets-enterAddressLine2, [name="enterAddressLine2"]',
            shipping.addressLine2
          );
        }
      } catch {
        // optional field
      }
    }

    // State dropdown
    try {
      const stateSelect = page
        .locator(
          '#address-ui-widgets-enterAddressStateOrRegion, [name="enterAddressStateOrRegion"]'
        )
        .first();
      if (await stateSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await stateSelect.selectOption(shipping.state);
      }
    } catch {
      // try typing state
    }
  }

  private async fillPayment(
    page: Page,
    payment: PaymentDetails
  ): Promise<void> {
    const cardFields: [string, string][] = [
      ['[name="addCreditCardNumber"], #addCreditCardNumber', payment.cardNumber],
      ['[name="addCreditCardVerificationNumber"], #addCreditCardVerificationNumber', payment.cvv],
    ];

    for (const [selector, value] of cardFields) {
      try {
        const el = page.locator(selector).first();
        if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
          await el.clear();
          await humanType(page, selector, value);
          await randomDelay(300, 600);
        }
      } catch {
        // field not found
      }
    }

    // Expiry month/year dropdowns
    try {
      const monthSel = page
        .locator('[name="addCreditCardExpirationMonth"]')
        .first();
      const yearSel = page
        .locator('[name="addCreditCardExpirationYear"]')
        .first();

      if (await monthSel.isVisible({ timeout: 2000 }).catch(() => false)) {
        await monthSel.selectOption(payment.expiryMonth);
      }
      if (await yearSel.isVisible({ timeout: 2000 }).catch(() => false)) {
        await yearSel.selectOption(`20${payment.expiryYear}`);
      }
    } catch {
      // dropdowns not found
    }
  }
}
