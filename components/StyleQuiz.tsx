"use client";

import { useState } from "react";
import { StyleProfile } from "@/lib/types";
import { useStore } from "@/lib/store-context";

const STEPS = ["Gender", "Aesthetic", "Budget", "Size"] as const;

const AESTHETICS = [
  "Minimalist",
  "Boho",
  "Streetwear",
  "Classic",
  "Trendy",
  "Romantic",
];
const BUDGETS = ["Under $50", "$50–$150", "$150+"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const GENDERS = ["Women", "Men", "Unisex"];

export default function StyleQuiz() {
  const { setStyleProfile } = useStore();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<StyleProfile>>({
    gender: "",
    aesthetic: "",
    budgetRange: "",
    sizes: "",
    shoeSize: "",
    avoidBrands: "",
    notes: "",
  });

  const handleSelect = (field: keyof StyleProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finishQuiz({ ...profile, [field]: value });
    }
  };

  const handleSkip = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finishQuiz(profile);
    }
  };

  const finishQuiz = (p: Partial<StyleProfile>) => {
    setStyleProfile({
      gender: p.gender || "",
      aesthetic: p.aesthetic || "",
      budgetRange: p.budgetRange || "",
      sizes: p.sizes || "",
      shoeSize: p.shoeSize || "",
      avoidBrands: p.avoidBrands || "",
      notes: p.notes || "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step
                  ? "bg-pink"
                  : i < step
                    ? "bg-pink/40"
                    : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-fg text-center mb-1">
              Who are you shopping for?
            </h2>
            <p className="text-xs text-muted text-center mb-5">
              This helps me find the right styles
            </p>
            <div className="flex flex-col gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  onClick={() => handleSelect("gender", g.toLowerCase())}
                  className={`w-full py-3 rounded-xl text-sm font-medium border transition-all ${
                    profile.gender === g.toLowerCase()
                      ? "border-pink bg-pink/5 text-pink"
                      : "border-gray-200 text-fg hover:border-pink/40"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-fg text-center mb-1">
              What&apos;s your aesthetic?
            </h2>
            <p className="text-xs text-muted text-center mb-5">
              Pick the style that speaks to you
            </p>
            <div className="grid grid-cols-2 gap-2">
              {AESTHETICS.map((a) => (
                <button
                  key={a}
                  onClick={() =>
                    handleSelect("aesthetic", a.toLowerCase())
                  }
                  className={`py-3 rounded-xl text-sm font-medium border transition-all ${
                    profile.aesthetic === a.toLowerCase()
                      ? "border-pink bg-pink/5 text-pink"
                      : "border-gray-200 text-fg hover:border-pink/40"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-fg text-center mb-1">
              What&apos;s your budget?
            </h2>
            <p className="text-xs text-muted text-center mb-5">
              I&apos;ll find items in your range
            </p>
            <div className="flex flex-col gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b}
                  onClick={() => handleSelect("budgetRange", b)}
                  className={`w-full py-3 rounded-xl text-sm font-medium border transition-all ${
                    profile.budgetRange === b
                      ? "border-pink bg-pink/5 text-pink"
                      : "border-gray-200 text-fg hover:border-pink/40"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-fg text-center mb-1">
              What&apos;s your usual size?
            </h2>
            <p className="text-xs text-muted text-center mb-5">
              So I can find the right fit
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSelect("sizes", s)}
                  className={`py-3 rounded-xl text-sm font-medium border transition-all ${
                    profile.sizes === s
                      ? "border-pink bg-pink/5 text-pink"
                      : "border-gray-200 text-fg hover:border-pink/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="w-full mt-4 text-xs text-muted hover:text-fg transition-colors py-2"
        >
          Skip{step < STEPS.length - 1 ? "" : " & finish"}
        </button>
      </div>
    </div>
  );
}
