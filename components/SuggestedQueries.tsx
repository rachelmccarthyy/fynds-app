import { SUGGESTED_QUERIES } from "@/lib/constants";

interface SuggestedQueriesProps {
  onSelect: (query: string) => void;
}

export default function SuggestedQueries({ onSelect }: SuggestedQueriesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTED_QUERIES.map((query) => (
        <button
          key={query}
          onClick={() => onSelect(query)}
          className="px-3 py-1.5 text-xs font-medium text-fg bg-surface border border-gray-200 rounded-full hover:border-pink hover:text-pink transition-colors duration-200"
        >
          {query}
        </button>
      ))}
    </div>
  );
}
