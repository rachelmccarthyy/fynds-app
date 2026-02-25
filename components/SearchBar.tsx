"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  disabled,
}: SearchBarProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-full shadow-sm"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe what you're looking for..."
        disabled={disabled}
        className="flex-1 px-4 py-2 bg-transparent text-fg placeholder-muted text-sm focus:outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="flex-none w-10 h-10 flex items-center justify-center bg-pink text-white rounded-full hover:bg-pink-dark transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 10H16M16 10L11 5M16 10L11 15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
