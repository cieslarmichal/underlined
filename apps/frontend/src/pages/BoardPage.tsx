import { Search } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { getBooks } from '../api/queries/books';
import { deleteWord, getWords, getWordsSummary, setWordKnown } from '../api/queries/words';
import type { Word, WordSort } from '../api/types/word';
import EditOccurrencesDialog from '../components/EditOccurrencesDialog';
import WordCard from '../components/WordCard';
import { site } from '../config';
import { useAsyncData } from '../hooks/useAsyncData';
import { useDebounce } from '../hooks/useDebounce';
import { useSEO } from '../hooks/useSEO';
import { apiErrorMessage } from '../lib/apiErrorMessage';

const allBooks = 'all';

type View = 'active' | 'met' | 'known';

const views: { value: View; label: string }[] = [
  { value: 'active', label: 'Learning' },
  { value: 'met', label: 'Met again' },
  { value: 'known', label: 'Known' },
];

const parseView = (value: string | null): View => (value === 'met' || value === 'known' ? value : 'active');

export default function BoardPage() {
  useSEO({ title: `Words - ${site.name}`, noindex: true });

  const [searchParams] = useSearchParams();
  const [bookId, setBookId] = useState(searchParams.get('bookId') ?? allBooks);
  const [view, setView] = useState<View>(parseView(searchParams.get('view')));
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<WordSort>('newest');
  const [editedWord, setEditedWord] = useState<Word>();
  const [deletedWord, setDeletedWord] = useState<Word>();

  const query = useDebounce(search.trim(), 300);

  const books = useAsyncData(getBooks, []);
  const summary = useAsyncData(getWordsSummary, []);
  const words = useAsyncData(
    () =>
      getWords({
        bookId: bookId === allBooks ? undefined : bookId,
        q: query || undefined,
        sort,
        status: view === 'known' ? 'known' : 'active',
        ...(view === 'met' && { minEncounters: 2 }),
      }),
    [bookId, query, sort, view],
  );

  async function onToggleKnown(word: Word) {
    try {
      await setWordKnown(word.id, !word.known);
      await Promise.all([words.reload(), summary.reload()]);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not update the word'));
    }
  }

  async function onDeleteWord() {
    if (!deletedWord) return;

    try {
      await deleteWord(deletedWord.id);
      await words.reload();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not delete the word'));
    } finally {
      setDeletedWord(undefined);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Words</h1>
      {summary.data && summary.data.totalWords > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          This week: {summary.data.newWords} new {summary.data.newWords === 1 ? 'word' : 'words'},{' '}
          {summary.data.metAgain} met again. {summary.data.totalWords} in total, {summary.data.knownWords} known.
        </p>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_12rem_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search words and translations"
            className="h-11 pl-10 text-base"
            aria-label="Search words and translations"
          />
        </div>
        <Select
          value={bookId}
          onValueChange={setBookId}
        >
          <SelectTrigger
            className="h-11 w-full text-base"
            aria-label="Filter by book"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={allBooks}>All books</SelectItem>
            {books.data?.map((book) => (
              <SelectItem
                key={book.id}
                value={book.id}
              >
                {book.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as WordSort)}
        >
          <SelectTrigger
            className="h-11 w-full text-base"
            aria-label="Sort words"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="frequent">Most often met</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        role="group"
        aria-label="Show"
        className="mb-4 flex gap-2"
      >
        {views.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => setView(value)}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
              view === value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {words.loading && !words.data && <Skeleton className="h-32 w-full rounded-xl" />}

      {Boolean(words.error) && <p className="text-destructive">Could not load your words. Please try again.</p>}

      {words.data?.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">
            {query || bookId !== allBooks || view !== 'active' ? 'No matching words' : 'No words yet'}
          </p>
          {!query && bookId === allBooks && view === 'active' && (
            <p className="mt-1 text-sm text-muted-foreground">Words you save from your books appear here.</p>
          )}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {words.data?.map((word) => (
          <WordCard
            key={word.id}
            word={word}
            onEdit={() => setEditedWord(word)}
            onDelete={() => setDeletedWord(word)}
            onToggleKnown={() => void onToggleKnown(word)}
          />
        ))}
      </div>

      {editedWord && (
        <EditOccurrencesDialog
          word={editedWord}
          open
          onOpenChange={(open) => !open && setEditedWord(undefined)}
          onSaved={() => void words.reload()}
        />
      )}

      <Dialog
        open={Boolean(deletedWord)}
        onOpenChange={(open) => !open && setDeletedWord(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{deletedWord?.lemma}&rdquo;?</DialogTitle>
            <DialogDescription>
              The word is deleted with all its sentences from all books. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletedWord(undefined)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteWord}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
