"use client";

import { useState, useRef, useEffect } from "react";
import { useStore } from "@/lib/store-context";
import { StyleProfile } from "@/lib/types";

const CLOTHING_SIZES = [
  "XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL",
  "00", "0", "2", "4", "6", "8", "10", "12", "14", "16", "18", "20",
];

const SHOE_SIZES = [
  "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5",
  "9", "9.5", "10", "10.5", "11", "11.5", "12", "13", "14", "15",
];

const FILTER_CONFIG: { key: string; label: string; field: keyof StyleProfile; options: string[] }[] = [
  {
    key: "gender",
    label: "Gender",
    field: "gender",
    options: ["women", "men", "unisex"],
  },
  {
    key: "aesthetic",
    label: "Style",
    field: "aesthetic",
    options: ["minimalist", "boho", "streetwear", "classic", "trendy", "romantic"],
  },
  {
    key: "budgetRange",
    label: "Price",
    field: "budgetRange",
    options: ["Under $25", "Under $50", "$50–$100", "$100–$150", "$150–$300", "$300+"],
  },
  {
    key: "sizes",
    label: "Clothing Size",
    field: "sizes",
    options: CLOTHING_SIZES,
  },
  {
    key: "shoeSize",
    label: "Shoe Size",
    field: "shoeSize",
    options: SHOE_SIZES,
  },
];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Popover({
  options,
  currentValue,
  onSelect,
  onClose,
  gridCols,
}: {
  options: string[];
  currentValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  gridCols?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  if (gridCols) {
    return (
      <div
        ref={ref}
        className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50 min-w-[180px] max-h-[240px] overflow-y-auto"
      >
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onSelect(opt);
                onClose();
              }}
              className={`px-2 py-1.5 text-xs rounded-md text-center transition-colors ${
                opt === currentValue
                  ? "bg-pink/10 text-pink font-medium"
                  : "text-fg hover:bg-gray-50"
              }`}
            >
              {capitalize(opt)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[140px] max-h-[240px] overflow-y-auto"
    >
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => {
            onSelect(opt);
            onClose();
          }}
          className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
            opt === currentValue
              ? "bg-pink/5 text-pink font-medium"
              : "text-fg hover:bg-gray-50"
          }`}
        >
          {capitalize(opt)}
        </button>
      ))}
    </div>
  );
}

function FilterChip({
  label,
  value,
  options,
  onUpdate,
  onClear,
  gridCols,
}: {
  label: string;
  value: string;
  options: string[];
  onUpdate: (value: string) => void;
  onClear: () => void;
  gridCols?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div className="inline-flex items-center gap-1 border border-gray-200 rounded-full pl-2 pr-1 py-1 text-xs bg-white">
        <span className="text-muted mr-0.5">{label}:</span>
        <button
          onClick={() => setOpen(!open)}
          className="font-medium text-fg hover:text-pink transition-colors"
        >
          {capitalize(value)}
        </button>
        <button
          onClick={onClear}
          className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full text-muted hover:bg-gray-100 hover:text-fg transition-colors"
          aria-label={`Clear ${label}`}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l6 6M7 1L1 7" />
          </svg>
        </button>
      </div>
      {open && (
        <Popover
          options={options}
          currentValue={value}
          onSelect={onUpdate}
          onClose={() => setOpen(false)}
          gridCols={gridCols}
        />
      )}
    </div>
  );
}

function getGridCols(key: string): number | undefined {
  if (key === "sizes") return 4;
  if (key === "shoeSize") return 4;
  return undefined;
}

/** Desktop sidebar (hidden on mobile) */
function DesktopSidebar() {
  const { styleProfile, updateStyleField, clearStyleProfile } = useStore();

  if (!styleProfile) {
    return (
      <div className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-gray-100 bg-surface p-4">
        <p className="text-xs text-muted mb-3">No style preferences set.</p>
        <button
          onClick={() => clearStyleProfile()}
          className="text-xs font-medium text-pink hover:text-pink-dark transition-colors"
        >
          Set up your style
        </button>
      </div>
    );
  }

  const activeFilters = FILTER_CONFIG.filter(
    (config) => styleProfile[config.field]
  );
  const inactiveFilters = FILTER_CONFIG.filter(
    (config) => !styleProfile[config.field]
  );

  return (
    <div className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-gray-100 bg-surface p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
          Your Preferences
        </h3>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted"
        >
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </div>

      {activeFilters.length === 0 && inactiveFilters.length === FILTER_CONFIG.length ? (
        <p className="text-xs text-muted">
          No preferences set yet. Use the filters below to personalize your results.
        </p>
      ) : null}

      {/* Active filters as chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {activeFilters.map((config) => (
            <FilterChip
              key={config.key}
              label={config.label}
              value={styleProfile[config.field]}
              options={config.options}
              onUpdate={(v) => updateStyleField(config.field, v)}
              onClear={() => updateStyleField(config.field, "")}
              gridCols={getGridCols(config.key)}
            />
          ))}
        </div>
      )}

      {/* Inactive filters — show as "Add" buttons */}
      {inactiveFilters.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          <p className="text-[10px] text-muted uppercase tracking-wide mb-1">Add filter</p>
          {inactiveFilters.map((config) => (
            <AddFilterButton
              key={config.key}
              config={config}
              onSelect={(v) => updateStyleField(config.field, v)}
            />
          ))}
        </div>
      )}

      {activeFilters.length > 0 && (
        <button
          onClick={clearStyleProfile}
          className="mt-auto pt-4 text-xs text-muted hover:text-pink transition-colors text-left"
        >
          Reset all
        </button>
      )}
    </div>
  );
}

function AddFilterButton({
  config,
  onSelect,
}: {
  config: { key: string; label: string; field: keyof StyleProfile; options: string[] };
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left text-xs text-muted hover:text-fg py-1.5 px-2 rounded-md hover:bg-white transition-colors flex items-center gap-1.5"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 1v8M1 5h8" />
        </svg>
        {config.label}
      </button>
      {open && (
        <Popover
          options={config.options}
          currentValue=""
          onSelect={(v) => {
            onSelect(v);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
          gridCols={getGridCols(config.key)}
        />
      )}
    </div>
  );
}

/** Mobile horizontal chip row (hidden on desktop) */
function MobileFilterChips() {
  const { styleProfile, updateStyleField, clearStyleProfile } = useStore();

  if (!styleProfile) return null;

  const activeFilters = FILTER_CONFIG.filter(
    (config) => styleProfile[config.field]
  );
  const inactiveFilters = FILTER_CONFIG.filter(
    (config) => !styleProfile[config.field]
  );

  return (
    <div className="md:hidden flex items-center gap-2 px-4 py-2 overflow-x-auto border-b border-gray-100 bg-surface">
      {activeFilters.map((config) => (
        <FilterChip
          key={config.key}
          label={config.label}
          value={styleProfile[config.field]}
          options={config.options}
          onUpdate={(v) => updateStyleField(config.field, v)}
          onClear={() => updateStyleField(config.field, "")}
          gridCols={getGridCols(config.key)}
        />
      ))}
      {inactiveFilters.map((config) => (
        <MobileAddChip
          key={config.key}
          config={config}
          onSelect={(v) => updateStyleField(config.field, v)}
        />
      ))}
      {activeFilters.length > 0 && (
        <button
          onClick={clearStyleProfile}
          className="shrink-0 text-xs text-muted hover:text-pink transition-colors px-2"
        >
          Reset
        </button>
      )}
    </div>
  );
}

function MobileAddChip({
  config,
  onSelect,
}: {
  config: { key: string; label: string; field: keyof StyleProfile; options: string[] };
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 border border-dashed border-gray-300 rounded-full px-2.5 py-1 text-xs text-muted hover:text-fg hover:border-gray-400 transition-colors"
      >
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 1v8M1 5h8" />
        </svg>
        {config.label}
      </button>
      {open && (
        <Popover
          options={config.options}
          currentValue=""
          onSelect={(v) => {
            onSelect(v);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
          gridCols={getGridCols(config.key)}
        />
      )}
    </div>
  );
}

export { DesktopSidebar, MobileFilterChips };
