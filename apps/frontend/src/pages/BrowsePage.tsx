import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { getBook } from '../api/queries/books';
import { getWords } from '../api/queries/words';
import HighlightedSentence from '../components/HighlightedSentence';
import { site } from '../config';
import { useAsyncData } from '../hooks/useAsyncData';
import { useSEO } from '../hooks/useSEO';

const swipeThreshold = 50;

// Reading your words again as sentences, in the order you met them. No questions, no scores.
export default function BrowsePage() {
  const { id = '' } = useParams();
  const book = useAsyncData(() => getBook(id), [id]);
  const words = useAsyncData(() => getWords({ bookId: id, status: 'all' }), [id]);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useSEO({ title: `${book.data?.title ?? 'Your words'} - ${site.name}`, noindex: true });

  const entries = useMemo(
    () =>
      (words.data ?? [])
        .flatMap((word) => word.occurrences.map((occurrence) => ({ word, occurrence })))
        .sort((a, b) => a.occurrence.createdAt.localeCompare(b.occurrence.createdAt)),
    [words.data],
  );

  const last = entries.length - 1;
  const current = entries[Math.min(index, last)];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(value + 1, last));
      if (event.key === 'ArrowLeft') setIndex((value) => Math.max(value - 1, 0));
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [last]);

  function onTouchEnd(event: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;

    if (start === null) return;

    const delta = event.changedTouches[0] ? event.changedTouches[0].clientX - start : 0;

    if (delta <= -swipeThreshold) setIndex((value) => Math.min(value + 1, last));
    if (delta >= swipeThreshold) setIndex((value) => Math.max(value - 1, 0));
  }

  return (
    <div
      className="mx-auto flex min-h-[calc(100dvh-65px-3.5rem-env(safe-area-inset-bottom))] max-w-2xl flex-col px-4 py-6"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={onTouchEnd}
    >
      <Link
        to={`/books/${id}`}
        className="flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Back to the book
      </Link>

      <div className="mt-2 mb-6">
        {book.loading ? (
          <Skeleton className="h-7 w-56" />
        ) : (
          <>
            <h1 className="font-serif text-2xl font-semibold leading-tight">Your words in {book.data?.title}</h1>
            <p className="text-sm text-muted-foreground">
              {entries.length} {entries.length === 1 ? 'sentence' : 'sentences'}, in the order you met them
            </p>
          </>
        )}
      </div>

      {words.loading && <Skeleton className="h-48 w-full rounded-xl" />}

      {!words.loading && !current && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">Nothing to flip through yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Words you save from this book will appear here.</p>
        </div>
      )}

      {current && (
        <article className="flex flex-1 flex-col justify-center">
          <div className="rounded-2xl border bg-card p-6">
            <p className="font-serif text-xl leading-relaxed">
              <HighlightedSentence
                sentence={current.occurrence.sentence}
                word={current.occurrence.surfaceForm}
              />
            </p>
            <p className="mt-5 font-semibold">
              {current.word.lemma} <span className="font-normal text-muted-foreground">→</span>{' '}
              {current.occurrence.translation}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              className="size-12 rounded-full"
              aria-label="Previous sentence"
              onClick={() => setIndex((value) => Math.max(value - 1, 0))}
              disabled={index <= 0}
            >
              <ChevronLeft />
            </Button>
            <span className="text-sm text-muted-foreground">
              {Math.min(index, last) + 1} of {entries.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-12 rounded-full"
              aria-label="Next sentence"
              onClick={() => setIndex((value) => Math.min(value + 1, last))}
              disabled={index >= last}
            >
              <ChevronRight />
            </Button>
          </div>
        </article>
      )}
    </div>
  );
}
