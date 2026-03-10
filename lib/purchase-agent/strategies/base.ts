import { Page } from "playwright-core";
import { ShippingAddress, PaymentDetails, OrderItem } from "@/lib/types";

export interface PurchaseResult {
  success: boolean;
  confirmationNumber?: string;
  message: string;
  manualCheckoutUrl?: string;
}

export interface RetailerStrategy {
  name: string;
  canHandle(domain: string): boolean;
  execute(
    page: Page,
    item: OrderItem,
    shipping: ShippingAddress,
    payment: PaymentDetails,
    onStatus: (message: string) => void
  ): Promise<PurchaseResult>;
}
