"use client";

import { useState } from "react";
import { useCheckout } from "@/lib/checkout-context";
import { PaymentDetails } from "@/lib/types";

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export default function PaymentForm() {
  const { setPayment, setStep } = useCheckout();
  const [cardDisplay, setCardDisplay] = useState("");
  const [expiryDisplay, setExpiryDisplay] = useState("");
  const [form, setForm] = useState({
    cardNumber: "",
    cvv: "",
    nameOnCard: "",
  });
  const [useSameAsShipping, setUseSameAsShipping] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const cardDigits = form.cardNumber.replace(/\D/g, "");
    if (cardDigits.length < 13 || cardDigits.length > 19)
      errs.cardNumber = "Invalid card number";
    if (!form.nameOnCard.trim()) errs.nameOnCard = "Required";
    const expiryDigits = expiryDisplay.replace(/\D/g, "");
    if (expiryDigits.length !== 4) errs.expiry = "Invalid expiry";
    else {
      const month = parseInt(expiryDigits.slice(0, 2));
      if (month < 1 || month > 12) errs.expiry = "Invalid month";
    }
    if (!/^\d{3,4}$/.test(form.cvv)) errs.cvv = "Invalid CVV";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const expiryDigits = expiryDisplay.replace(/\D/g, "");
    const payment: PaymentDetails = {
      cardNumber: form.cardNumber.replace(/\D/g, ""),
      expiryMonth: expiryDigits.slice(0, 2),
      expiryYear: expiryDigits.slice(2),
      cvv: form.cvv,
      nameOnCard: form.nameOnCard,
      useSameAsShipping,
    };
    setPayment(payment);
    setStep("confirm");
  };

  const inputClass = (field: string) =>
    `w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors ${
      errors[field]
        ? "border-red-400 focus:border-red-500"
        : "border-gray-200 focus:border-pink"
    }`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h2 className="text-lg font-semibold text-fg mb-1">Payment Details</h2>
        <p className="text-[11px] text-muted mb-4">
          Your card info is held in memory only for this session and never stored.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted mb-1 block">Name on Card</label>
            <input
              className={inputClass("nameOnCard")}
              value={form.nameOnCard}
              onChange={(e) => updateField("nameOnCard", e.target.value)}
              placeholder="Jane Doe"
            />
            {errors.nameOnCard && <p className="text-[10px] text-red-500 mt-0.5">{errors.nameOnCard}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted mb-1 block">Card Number</label>
            <input
              className={inputClass("cardNumber")}
              value={cardDisplay}
              onChange={(e) => {
                const formatted = formatCardNumber(e.target.value);
                setCardDisplay(formatted);
                updateField("cardNumber", formatted);
              }}
              placeholder="4242 4242 4242 4242"
              inputMode="numeric"
            />
            {errors.cardNumber && <p className="text-[10px] text-red-500 mt-0.5">{errors.cardNumber}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Expiry</label>
              <input
                className={inputClass("expiry")}
                value={expiryDisplay}
                onChange={(e) => {
                  const formatted = formatExpiry(e.target.value);
                  setExpiryDisplay(formatted);
                  if (errors.expiry) setErrors((prev) => ({ ...prev, expiry: "" }));
                }}
                placeholder="MM/YY"
                inputMode="numeric"
              />
              {errors.expiry && <p className="text-[10px] text-red-500 mt-0.5">{errors.expiry}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">CVV</label>
              <input
                className={inputClass("cvv")}
                value={form.cvv}
                onChange={(e) => updateField("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="123"
                inputMode="numeric"
                type="password"
              />
              {errors.cvv && <p className="text-[10px] text-red-500 mt-0.5">{errors.cvv}</p>}
            </div>
          </div>

          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useSameAsShipping}
              onChange={(e) => setUseSameAsShipping(e.target.checked)}
              className="accent-pink"
            />
            <span className="text-xs text-muted">Use shipping address as billing address</span>
          </label>
        </div>

        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-[11px] text-green-800 font-medium">
              Encrypted &amp; never persisted
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
        <button
          onClick={() => setStep("shipping")}
          className="px-5 py-3 text-sm font-medium text-muted hover:text-fg transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 py-3 bg-pink text-white text-sm font-semibold rounded-xl hover:bg-pink-dark transition-colors"
        >
          Review Order
        </button>
      </div>
    </div>
  );
}
