import type { BookSuggestion } from '../api/queries/books';

interface Props {
  suggestions: BookSuggestion[];
  onSelect: (suggestion: BookSuggestion) => void;
}

// Suggestions from an external book database; the reader can ignore them and type a title by hand.
export default function BookSuggestions({ suggestions, onSelect }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <ul
      role="listbox"
      aria-label="Book suggestions"
      className="max-h-60 overflow-y-auto rounded-lg border bg-popover shadow-sm"
    >
      {suggestions.map((suggestion) => (
        <li
          key={`${suggestion.title}|${suggestion.author ?? ''}`}
          role="option"
          aria-selected={false}
        >
          <button
            type="button"
            className="flex min-h-11 w-full flex-col items-start justify-center px-3 py-2 text-left transition-colors hover:bg-accent"
            onClick={() => onSelect(suggestion)}
          >
            <span className="text-sm font-medium">{suggestion.title}</span>
            <span className="text-xs text-muted-foreground">
              {[suggestion.author, suggestion.year].filter(Boolean).join(' · ')}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
