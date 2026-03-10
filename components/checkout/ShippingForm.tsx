"use client";

import { useState } from "react";
import { useCheckout } from "@/lib/checkout-context";
import { ShippingAddress } from "@/lib/types";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export default function ShippingForm() {
  const { setShipping, setStep, shipping } = useCheckout();
  const [form, setForm] = useState<ShippingAddress>(
    shipping || {
      fullName: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "US",
      phone: "",
    }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});

  const update = (field: keyof ShippingAddress, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof ShippingAddress, string>> = {};
    if (!form.fullName.trim()) errs.fullName = "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email";
    if (!form.addressLine1.trim()) errs.addressLine1 = "Required";
    if (!form.city.trim()) errs.city = "Required";
    if (!form.state) errs.state = "Required";
    if (!/^\d{5}(-\d{4})?$/.test(form.zipCode)) errs.zipCode = "Invalid ZIP";
    if (!/^\d{10,11}$/.test(form.phone.replace(/\D/g, "")))
      errs.phone = "Invalid phone";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setShipping(form);
    setStep("payment");
  };

  const inputClass = (field: keyof ShippingAddress) =>
    `w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors ${
      errors[field]
        ? "border-red-400 focus:border-red-500"
        : "border-gray-200 focus:border-pink"
    }`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h2 className="text-lg font-semibold text-fg mb-4">Shipping Address</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted mb-1 block">Full Name</label>
            <input
              className={inputClass("fullName")}
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              placeholder="Jane Doe"
            />
            {errors.fullName && <p className="text-[10px] text-red-500 mt-0.5">{errors.fullName}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted mb-1 block">Email</label>
            <input
              className={inputClass("email")}
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="jane@example.com"
              type="email"
            />
            {errors.email && <p className="text-[10px] text-red-500 mt-0.5">{errors.email}</p>}
            <p className="text-[9px] text-muted mt-0.5">Retailers will send order confirmations to this email</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted mb-1 block">Address Line 1</label>
            <input
              className={inputClass("addressLine1")}
              value={form.addressLine1}
              onChange={(e) => update("addressLine1", e.target.value)}
              placeholder="123 Main St"
            />
            {errors.addressLine1 && <p className="text-[10px] text-red-500 mt-0.5">{errors.addressLine1}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted mb-1 block">Address Line 2 (optional)</label>
            <input
              className={inputClass("addressLine2")}
              value={form.addressLine2 || ""}
              onChange={(e) => update("addressLine2", e.target.value)}
              placeholder="Apt 4B"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">City</label>
              <input
                className={inputClass("city")}
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="New York"
              />
              {errors.city && <p className="text-[10px] text-red-500 mt-0.5">{errors.city}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">State</label>
              <select
                className={inputClass("state")}
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
              >
                <option value="">Select</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.state && <p className="text-[10px] text-red-500 mt-0.5">{errors.state}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">ZIP Code</label>
              <input
                className={inputClass("zipCode")}
                value={form.zipCode}
                onChange={(e) => update("zipCode", e.target.value)}
                placeholder="10001"
              />
              {errors.zipCode && <p className="text-[10px] text-red-500 mt-0.5">{errors.zipCode}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Phone</label>
              <input
                className={inputClass("phone")}
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
              {errors.phone && <p className="text-[10px] text-red-500 mt-0.5">{errors.phone}</p>}
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
        <button
          onClick={() => setStep("cart_review")}
          className="px-5 py-3 text-sm font-medium text-muted hover:text-fg transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 py-3 bg-pink text-white text-sm font-semibold rounded-xl hover:bg-pink-dark transition-colors"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  );
}
