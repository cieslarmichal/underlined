import { Camera, Image as ImageIcon, Loader2, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@/components/ui/Menubar';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '../api/ApiError';
import { deleteBook, getBook } from '../api/queries/books';
import { getPendingCaptures, uploadCapture } from '../api/queries/captures';
import { deleteWordFromBook, getWords } from '../api/queries/words';
import type { Word } from '../api/types/word';
import BookFormDialog from '../components/BookFormDialog';
import EditOccurrencesDialog from '../components/EditOccurrencesDialog';
import { site } from '../config';
import { useAsyncData } from '../hooks/useAsyncData';
import { useSEO } from '../hooks/useSEO';
import { apiErrorMessage } from '../lib/apiErrorMessage';
import { clearLastBookId, setLastBookId } from '../lib/lastBook';
import { resizeImage } from '../lib/resizeImage';

function distinctTranslations(word: Word): string {
  return [...new Set(word.occurrences.map((occurrence) => occurrence.translation))].join('; ');
}

export default function BookPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const book = useAsyncData(() => getBook(id), [id]);
  const words = useAsyncData(() => getWords({ bookId: id }), [id]);
  const pending = useAsyncData(() => getPendingCaptures(id), [id]);

  const [uploading, setUploading] = useState(false);
  const [editBookOpen, setEditBookOpen] = useState(false);
  const [deleteBookOpen, setDeleteBookOpen] = useState(false);
  const [editedWord, setEditedWord] = useState<Word>();
  const [removedWord, setRemovedWord] = useState<Word>();

  useSEO({ title: `${book.data?.title ?? 'Book'} - ${site.name}`, noindex: true });

  useEffect(() => {
    if (book.data) setLastBookId(book.data.id);
  }, [book.data]);

  useEffect(() => {
    if (book.error instanceof ApiError && book.error.status === 404) {
      clearLastBookId();
      navigate('/books', { replace: true });
    }
  }, [book.error, navigate]);

  async function onPhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setUploading(true);

    try {
      const photo = await resizeImage(file);
      const capture = await uploadCapture(id, photo);
      navigate(`/books/${id}/review/${capture.id}`, { state: { capture } });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not process the photo. Please try again.'));
      setUploading(false);
    }
  }

  async function onRemoveWord() {
    if (!removedWord) return;

    try {
      await deleteWordFromBook(id, removedWord.id);
      await Promise.all([words.reload(), book.reload()]);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not remove the word'));
    } finally {
      setRemovedWord(undefined);
    }
  }

  async function onDeleteBook() {
    try {
      await deleteBook(id);
      clearLastBookId();
      navigate('/books', { replace: true });
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.status === 409
          ? 'Remove the words from this book first, then delete it.'
          : apiErrorMessage(error, 'Could not delete the book'),
      );
      setDeleteBookOpen(false);
    }
  }

  const pendingCaptures = pending.data ?? [];

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-72px)] max-w-2xl flex-col px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {book.loading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <>
              <h1 className="truncate text-2xl font-bold">{book.data?.title}</h1>
              {book.data?.author && <p className="text-sm text-muted-foreground">{book.data.author}</p>}
            </>
          )}
        </div>
        {book.data && (
          <Menubar className="border-none bg-transparent p-0 shadow-none">
            <MenubarMenu>
              <MenubarTrigger
                aria-label="Book options"
                className="size-11 justify-center p-0"
              >
                <MoreVertical className="size-5" />
              </MenubarTrigger>
              <MenubarContent align="end">
                <MenubarItem
                  onClick={() => setEditBookOpen(true)}
                  className="min-h-11 cursor-pointer gap-3 px-3 py-2"
                >
                  <Pencil className="size-4" /> Edit book
                </MenubarItem>
                <MenubarItem
                  onClick={() => setDeleteBookOpen(true)}
                  className="min-h-11 cursor-pointer gap-3 px-3 py-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" /> Delete book
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        )}
      </div>

      {pendingCaptures.length > 0 && (
        <Link
          to={`/books/${id}/review/${pendingCaptures[0]?.id ?? ''}`}
          className="mb-4 block rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm font-medium"
        >
          {pendingCaptures.length} {pendingCaptures.length === 1 ? 'photo is' : 'photos are'} waiting for your approval
          →
        </Link>
      )}

      <div className="flex-1">
        {words.loading && <Skeleton className="h-40 w-full rounded-xl" />}

        {words.data?.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">No words yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Underline unknown words in your book with a pencil and take a photo of the page.
            </p>
          </div>
        )}

        <ul className="divide-y rounded-xl border bg-card">
          {words.data?.map((word) => (
            <li
              key={word.id}
              className="flex items-center gap-2 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {word.lemma}
                  {word.encounters > 1 && (
                    <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {word.encounters}×
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{distinctTranslations(word)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={`Edit ${word.lemma}`}
                onClick={() => setEditedWord(word)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={`Remove ${word.lemma}`}
                onClick={() => setRemovedWord(word)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] mt-6 flex flex-col items-center gap-2 bg-gradient-to-t from-background via-background to-transparent pb-2 pt-4">
        <Button
          size="lg"
          className="h-16 w-full max-w-sm rounded-2xl text-lg"
          onClick={() => cameraInput.current?.click()}
          disabled={uploading || !book.data}
        >
          <Camera className="size-6" /> Take a photo
        </Button>
        <button
          type="button"
          className="flex min-h-[44px] items-center gap-1.5 px-3 text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => galleryInput.current?.click()}
          disabled={uploading || !book.data}
        >
          <ImageIcon className="size-4" /> from gallery
        </button>
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPhotoSelected}
        />
        <input
          ref={galleryInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPhotoSelected}
        />
      </div>

      {uploading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/95 px-6 text-center">
          <Loader2 className="size-10 animate-spin" />
          <p className="text-lg font-semibold">Reading your page...</p>
          <p className="text-sm text-muted-foreground">This usually takes 10–20 seconds.</p>
        </div>
      )}

      {book.data && editBookOpen && (
        <BookFormDialog
          open={editBookOpen}
          onOpenChange={setEditBookOpen}
          book={book.data}
          onSaved={() => void book.reload()}
        />
      )}

      {editedWord && (
        <EditOccurrencesDialog
          word={editedWord}
          open
          onOpenChange={(open) => !open && setEditedWord(undefined)}
          onSaved={() => void words.reload()}
        />
      )}

      <Dialog
        open={Boolean(removedWord)}
        onOpenChange={(open) => !open && setRemovedWord(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove &ldquo;{removedWord?.lemma}&rdquo;?</DialogTitle>
            <DialogDescription>
              The word is removed from this book. If it appears in other books, it stays there.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemovedWord(undefined)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onRemoveWord}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteBookOpen}
        onOpenChange={setDeleteBookOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this book?</DialogTitle>
            <DialogDescription>
              A book can only be deleted when it has no saved words. Its photos are deleted with it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteBookOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteBook}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
