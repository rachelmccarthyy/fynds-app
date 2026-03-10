"use client";

import { useCheckout } from "@/lib/checkout-context";
import Image from "next/image";

export default function ConfirmOrder() {
  const { items, shipping, payment, setStep, submitOrder } = useCheckout();

  if (!shipping || !payment) return null;

  const maskedCard = `**** **** **** ${payment.cardNumber.slice(-4)}`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h2 className="text-lg font-semibold text-fg mb-4">Confirm Order</h2>

        {/* Items summary */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Items ({items.length})
          </h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.product.link} className="flex items-center gap-3 p-2 bg-surface rounded-lg">
                <div className="shrink-0 w-10 h-10 relative bg-white rounded overflow-hidden">
                  {item.product.imageUrl && (
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.title}
                      fill
                      className="object-contain p-0.5"
                      sizes="40px"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-fg line-clamp-1">{item.product.title}</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] text-muted">{item.retailerDomain}</p>
                    {item.options?.size && (
                      <span className="text-[8px] px-1 py-0.5 bg-pink/10 text-pink rounded font-medium">
                        {item.options.size}
                      </span>
                    )}
                    {item.options?.color && (
                      <span className="text-[8px] px-1 py-0.5 bg-pink/10 text-pink rounded font-medium">
                        {item.options.color}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs font-semibold text-pink shrink-0">{item.product.price}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Shipping</h3>
            <button onClick={() => setStep("shipping")} className="text-[10px] text-pink hover:underline">
              Edit
            </button>
          </div>
          <div className="p-3 bg-surface rounded-lg text-xs text-fg leading-relaxed">
            <p className="font-medium">{shipping.fullName}</p>
            <p>{shipping.email}</p>
            <p>{shipping.addressLine1}</p>
            {shipping.addressLine2 && <p>{shipping.addressLine2}</p>}
            <p>{shipping.city}, {shipping.state} {shipping.zipCode}</p>
            <p>{shipping.phone}</p>
          </div>
        </div>

        {/* Payment */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Payment</h3>
            <button onClick={() => setStep("payment")} className="text-[10px] text-pink hover:underline">
              Edit
            </button>
          </div>
          <div className="p-3 bg-surface rounded-lg text-xs text-fg">
            <p className="font-medium">{payment.nameOnCard}</p>
            <p className="font-mono">{maskedCard}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
        <button
          onClick={() => setStep("payment")}
          className="px-5 py-3 text-sm font-medium text-muted hover:text-fg transition-colors"
        >
          Back
        </button>
        <button
          onClick={submitOrder}
          className="flex-1 py-3 bg-pink text-white text-sm font-semibold rounded-xl hover:bg-pink-dark transition-colors"
        >
          Place Order
        </button>
      </div>
    </div>
  );
}
