import { Page } from "playwright-core";
import Anthropic from "@anthropic-ai/sdk";
import { ShippingAddress, PaymentDetails, OrderItem } from "@/lib/types";
import { RetailerStrategy, PurchaseResult } from "./base";
import { randomDelay } from "../browser";

const MAX_ITERATIONS = 15;
const CHECKOUT_TIMEOUT = 180_000; // 3 minutes

const TOOLS: Anthropic.Tool[] = [
  {
    name: "click_element",
    description:
      "Click an element on the page by CSS selector or text content. Use for buttons, links, checkboxes.",
    input_schema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: 'CSS selector or text selector like \'text="Add to Cart"\'',
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "fill_input",
    description: "Fill a text input or textarea with a value. Clears existing content first.",
    input_schema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "CSS selector for the input field" },
        value: { type: "string", description: "Value to type into the field" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "select_option",
    description: "Select an option from a <select> dropdown.",
    input_schema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "CSS selector for the select element" },
        value: { type: "string", description: "Option value or visible text to select" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "scroll_page",
    description: "Scroll the page up or down.",
    input_schema: {
      type: "object" as const,
      properties: {
        direction: {
          type: "string",
          enum: ["up", "down"],
          description: "Scroll direction",
        },
        amount: {
          type: "number",
          description: "Pixels to scroll (default 500)",
        },
      },
      required: ["direction"],
    },
  },
  {
    name: "press_key",
    description: "Press a keyboard key (Enter, Tab, Escape, etc.)",
    input_schema: {
      type: "object" as const,
      properties: {
        key: { type: "string", description: "Key to press" },
      },
      required: ["key"],
    },
  },
  {
    name: "report_result",
    description:
      "Report that checkout is complete or that it cannot be completed.",
    input_schema: {
      type: "object" as const,
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        confirmation_number: { type: "string" },
        needs_manual: { type: "boolean" },
      },
      required: ["success", "message"],
    },
  },
];

export class GenericStrategy implements RetailerStrategy {
  name = "Generic (AI-guided)";
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  canHandle(): boolean {
    return true; // fallback for all retailers
  }

  async execute(
    page: Page,
    item: OrderItem,
    shipping: ShippingAddress,
    payment: PaymentDetails,
    onStatus: (message: string) => void
  ): Promise<PurchaseResult> {
    const startTime = Date.now();

    try {
      // Navigate to product page
      onStatus("Navigating to product page...");
      await page.goto(item.product.link, { waitUntil: "domcontentloaded" });
      await randomDelay(1500, 2500);

      const maskedCard = `****${payment.cardNumber.slice(-4)}`;

      const systemPrompt = `You are a purchasing agent automating checkout on a retail website.

Your goal: Purchase "${item.product.title}" from ${item.retailerDomain}.

Customer shipping info:
- Name: ${shipping.fullName}
- Address: ${shipping.addressLine1}${shipping.addressLine2 ? `, ${shipping.addressLine2}` : ""}
- City: ${shipping.city}, ${shipping.state} ${shipping.zipCode}
- Phone: ${shipping.phone}

Payment: Card ending in ${maskedCard}, Exp ${payment.expiryMonth}/${payment.expiryYear}, Name: ${payment.nameOnCard}
(Payment credentials are not provided to this agent. If you reach a payment form, immediately call report_result with success=false, needs_manual=true, and message="Payment step requires manual completion.")

Steps to follow:
1. Find and click "Add to Cart" or "Buy Now" button
2. Navigate to checkout
3. Fill in shipping information
4. Stop at payment — report needs_manual=true
6. Use report_result to indicate success or failure

Important:
- If you see a CAPTCHA, report failure with needs_manual=true
- If asked to sign in/register, try guest checkout first. If not available, report failure.
- Do not attempt to fill payment or card fields — report needs_manual=true at that step.
- Work step by step. After each action, I'll show you the updated page.`;

      const messages: Anthropic.MessageParam[] = [];

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        if (Date.now() - startTime > CHECKOUT_TIMEOUT) {
          return {
            success: false,
            message: "Checkout timed out after 3 minutes.",
            manualCheckoutUrl: page.url(),
          };
        }

        // Capture page state
        const pageContext = await this.getPageContext(page);

        messages.push({
          role: "user",
          content: `Current page state:\nURL: ${page.url()}\nTitle: ${await page.title()}\n\nVisible elements:\n${pageContext}\n\nWhat action should I take next?`,
        });

        const response = await this.client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          tools: TOOLS,
          messages,
        });

        // Process response
        const assistantContent = response.content;
        messages.push({ role: "assistant", content: assistantContent });

        // Find tool use in response
        const toolUseBlock = assistantContent.find(
          (block) => block.type === "tool_use"
        );

        if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
          // No tool call, check if there's text indicating completion
          continue;
        }

        const toolName = toolUseBlock.name;
        const toolInput = toolUseBlock.input as Record<string, unknown>;
        const toolId = toolUseBlock.id;

        // Handle report_result
        if (toolName === "report_result") {
          const input = toolInput as {
            success: boolean;
            message: string;
            confirmation_number?: string;
            needs_manual?: boolean;
          };

          return {
            success: input.success,
            confirmationNumber: input.confirmation_number,
            message: input.message,
            manualCheckoutUrl: input.needs_manual ? page.url() : undefined,
          };
        }

        // Execute the tool action
        const result = await this.executeAction(page, toolName, toolInput);
        onStatus(this.getStatusMessage(toolName));
        await randomDelay(1000, 2000);

        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolId,
              content: result,
            },
          ],
        });
      }

      return {
        success: false,
        message: "Reached maximum iterations without completing checkout.",
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

  private async getPageContext(page: Page): Promise<string> {
    return page.evaluate(() => {
      const elements: string[] = [];

      // Get all interactive elements
      const interactiveSelectors = 'a, button, input, select, textarea, [role="button"], [onclick]';
      const els = document.querySelectorAll(interactiveSelectors);

      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // Only include visible elements
        if (rect.width === 0 || rect.height === 0) return;
        if (rect.top > window.innerHeight * 2) return;

        const tag = el.tagName.toLowerCase();
        const text = (el.textContent || "").trim().slice(0, 80);
        const type = el.getAttribute("type") || "";
        const name = el.getAttribute("name") || "";
        const id = el.getAttribute("id") || "";
        const placeholder = el.getAttribute("placeholder") || "";
        const value = (el as HTMLInputElement).value || "";
        const href = el.getAttribute("href") || "";

        let desc = `<${tag}`;
        if (id) desc += ` id="${id}"`;
        if (name) desc += ` name="${name}"`;
        if (type) desc += ` type="${type}"`;
        if (placeholder) desc += ` placeholder="${placeholder}"`;
        if (href && href.length < 100) desc += ` href="${href}"`;
        desc += `>`;
        if (text && text.length < 80) desc += text;
        if (value) desc += ` [value="${value.slice(0, 30)}"]`;
        desc += `</${tag}>`;

        elements.push(desc);
      });

      // Also get prominent text (headings, prices)
      const headings = document.querySelectorAll("h1, h2, h3, [class*='price'], [class*='total']");
      headings.forEach((h) => {
        const text = (h.textContent || "").trim().slice(0, 100);
        if (text) elements.push(`[${h.tagName}] ${text}`);
      });

      return elements.slice(0, 100).join("\n");
    });
  }

  private async executeAction(
    page: Page,
    action: string,
    input: Record<string, unknown>
  ): Promise<string> {
    try {
      switch (action) {
        case "click_element": {
          const sel = input.selector as string;
          if (sel.startsWith('text="')) {
            const text = sel.slice(6, -1);
            await page.getByText(text, { exact: false }).first().click();
          } else {
            await page.locator(sel).first().click();
          }
          await randomDelay(500, 1000);
          return "Clicked successfully. Page may have updated.";
        }
        case "fill_input": {
          const el = page.locator(input.selector as string).first();
          await el.clear();
          await el.fill(input.value as string);
          await randomDelay(200, 400);
          return `Filled "${input.selector}" with value.`;
        }
        case "select_option": {
          await page
            .locator(input.selector as string)
            .first()
            .selectOption(input.value as string);
          return `Selected "${input.value}" in dropdown.`;
        }
        case "scroll_page": {
          const amount = (input.amount as number) || 500;
          const dir = input.direction === "up" ? -amount : amount;
          await page.evaluate((d) => window.scrollBy(0, d), dir);
          return `Scrolled ${input.direction} by ${amount}px.`;
        }
        case "press_key": {
          await page.keyboard.press(input.key as string);
          return `Pressed ${input.key}.`;
        }
        default:
          return `Unknown action: ${action}`;
      }
    } catch (err) {
      return `Action failed: ${err instanceof Error ? err.message : "Unknown error"}`;
    }
  }

  private getStatusMessage(action: string): string {
    switch (action) {
      case "click_element":
        return "Clicking element...";
      case "fill_input":
        return "Filling in information...";
      case "select_option":
        return "Selecting option...";
      case "scroll_page":
        return "Scrolling page...";
      case "press_key":
        return "Pressing key...";
      default:
        return "Processing...";
    }
  }
}
