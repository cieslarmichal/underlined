import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { getBooks } from '../api/queries/books';
import { languageNames } from '../api/types/language';
import BookFormDialog from '../components/BookFormDialog';
import { site } from '../config';
import { useAsyncData } from '../hooks/useAsyncData';
import { useSEO } from '../hooks/useSEO';

export default function BooksPage() {
  useSEO({ title: `Library - ${site.name}`, noindex: true });

  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: books, loading, error } = useAsyncData(getBooks, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Library</h1>
        <Button
          onClick={() => setDialogOpen(true)}
          className="h-11"
        >
          <Plus /> Add book
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {Boolean(error) && <p className="text-destructive">Could not load your books. Please try again.</p>}

      {books?.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">No books yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the book you are reading, then photograph pages with underlined words.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {books?.map((book) => (
          <li key={book.id}>
            <Link
              to={`/books/${book.id}`}
              className="block rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
            >
              <p className="font-semibold">{book.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {[book.author, languageNames[book.language]].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {book.wordCount} {book.wordCount === 1 ? 'word' : 'words'}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {dialogOpen && (
        <BookFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSaved={(book) => navigate(`/books/${book.id}`)}
        />
      )}
    </div>
  );
}
