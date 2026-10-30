import { X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { getRememberCard, recordRemember } from '../api/queries/words';
import type { RememberOutcome } from '../api/types/word';
import { useAsyncData } from '../hooks/useAsyncData';
import { apiErrorMessage } from '../lib/apiErrorMessage';
import { isRememberCardEnabled } from '../lib/preferences';
import HighlightedSentence from './HighlightedSentence';

interface Props {
  bookId: string;
  // Called after the reader marks the word as known, so lists can refresh.
  onKnown?: () => void;
}

// A single optional reminder: one saved word in its sentence. No queue, no counters, nothing is ever overdue.
export default function RememberCard({ bookId, onKnown }: Props) {
  const [round, setRound] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [enabled] = useState(isRememberCardEnabled);

  const { data: card } = useAsyncData(
    () => (enabled ? getRememberCard(bookId) : Promise.resolve(null)),
    [bookId, enabled, round],
  );

  if (!enabled || dismissed || !card) return null;

  async function answer(outcome: RememberOutcome) {
    if (!card) return;

    try {
      await recordRemember(card.wordId, outcome);
      setAnswered(true);
      if (outcome === 'known') onKnown?.();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save your answer'));
    }
  }

  function another() {
    setRevealed(false);
    setAnswered(false);
    setRound((value) => value + 1);
  }

  return (
    <section
      aria-label="A word to remember"
      className="mb-4 rounded-2xl border border-highlight/60 bg-highlight-soft/60 p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Remember this?</h2>
        <button
          type="button"
          aria-label="Hide for now"
          className="-m-2 flex size-11 items-center justify-center text-muted-foreground"
          onClick={() => setDismissed(true)}
        >
          <X className="size-4" />
        </button>
      </div>

      <ul className="space-y-3">
        {card.sentences.map(({ sentence, surfaceForm }) => (
          <li
            key={sentence}
            className="font-serif text-lg leading-relaxed"
          >
            <HighlightedSentence
              sentence={sentence}
              word={surfaceForm}
            />
          </li>
        ))}
      </ul>

      {!revealed && (
        <Button
          variant="outline"
          className="mt-3 h-11 w-full"
          onClick={() => setRevealed(true)}
        >
          Show meaning
        </Button>
      )}

      {revealed && (
        <div className="mt-3">
          <p className="font-semibold">
            {card.lemma} <span className="font-normal text-muted-foreground">→</span> {card.translations.join('; ')}
          </p>

          {!answered ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => answer('not_yet')}
                >
                  Not yet
                </Button>
                <Button
                  className="h-11"
                  onClick={() => answer('recalled')}
                >
                  Got it
                </Button>
              </div>
              <button
                type="button"
                className="mt-1 min-h-11 text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => answer('known')}
              >
                I already know this word well
              </button>
            </>
          ) : (
            <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>Noted.</span>
              <button
                type="button"
                className="min-h-11 underline-offset-4 hover:underline"
                onClick={another}
              >
                Another word
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
