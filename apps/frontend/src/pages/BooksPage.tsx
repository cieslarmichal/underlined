import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { getBooks } from '../api/queries/books';
import { languageNames } from '../api/types/language';
import BookFormDialog from '../components/BookFormDialog';
import BookTile from '../components/BookTile';
import FirstBookIntro from '../components/FirstBookIntro';
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
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Library</h1>
        {(books?.length ?? 0) > 0 && (
          <Button
            onClick={() => setDialogOpen(true)}
            className="h-11"
          >
            <Plus /> Add book
          </Button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      )}

      {Boolean(error) && <p className="text-destructive">Could not load your books. Please try again.</p>}

      {books?.length === 0 && <FirstBookIntro onAddBook={() => setDialogOpen(true)} />}

      <ul className="space-y-3">
        {books?.map((book) => (
          <li key={book.id}>
            <Link
              to={`/books/${book.id}`}
              className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-xs transition-all hover:border-foreground/20 hover:shadow-sm"
            >
              <BookTile title={book.title} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{book.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[book.author, languageNames[book.language]].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {book.wordCount} {book.wordCount === 1 ? 'word' : 'words'}
                </p>
              </div>
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
