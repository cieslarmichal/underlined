import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import type { Word } from '../api/types/word';
import HighlightedSentence from './HighlightedSentence';

interface Props {
  word: Word;
  onEdit: () => void;
  onDelete: () => void;
}

// Board card: the dictionary entry with all distinct meanings; sentences stay collapsed until the reader asks.
export default function WordCard({ word, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const meanings = [...new Set(word.occurrences.map((occurrence) => occurrence.translation))];
  // With a single meaning the sentences would only repeat the header, so show it per sentence only when it differs.
  const showMeaningPerSentence = meanings.length > 1;

  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">
            {word.lemma}
            {word.encounters > 1 && (
              <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                met {word.encounters}×
              </span>
            )}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{meanings.join(' — ')}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={`Edit ${word.lemma}`}
          onClick={onEdit}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={`Delete ${word.lemma}`}
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      </div>

      <button
        type="button"
        className="mt-2 flex min-h-[44px] items-center gap-1 text-sm font-medium text-muted-foreground"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        Show sentences ({word.occurrences.length})
        <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <ul className="mt-1 space-y-3">
          {word.occurrences.map((occurrence) => (
            <li
              key={occurrence.id}
              className="border-l-2 pl-3"
            >
              <p className="text-sm">
                <HighlightedSentence
                  sentence={occurrence.sentence}
                  word={occurrence.surfaceForm}
                />
              </p>
              {showMeaningPerSentence && (
                <p className="mt-0.5 text-sm text-muted-foreground">{occurrence.translation}</p>
              )}
              <p className="text-xs text-muted-foreground">{occurrence.bookTitle}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
