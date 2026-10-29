import { useContext, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { createBook, updateBook } from '../api/queries/books';
import type { Book } from '../api/types/book';
import { bookLanguages, languageNames, type BookLanguage } from '../api/types/language';
import { AuthContext } from '../context/AuthContext';
import { apiErrorMessage } from '../lib/apiErrorMessage';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Edit mode when a book is given, create mode otherwise.
  book?: Book;
  onSaved: (book: Book) => void;
}

export default function BookFormDialog({ open, onOpenChange, book, onSaved }: Props) {
  const { userData } = useContext(AuthContext);
  const availableLanguages = bookLanguages.filter((language) => language !== userData?.nativeLanguage);

  const [title, setTitle] = useState(book?.title ?? '');
  const [author, setAuthor] = useState(book?.author ?? '');
  const [language, setLanguage] = useState<BookLanguage>(book?.language ?? availableLanguages[0] ?? 'en');
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const saved = book
        ? await updateBook(book.id, { title: title.trim(), author: author.trim() || null })
        : await createBook({ title: title.trim(), author: author.trim() || undefined, language });
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save the book'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{book ? 'Edit book' : 'Add a book'}</DialogTitle>
          <DialogDescription>
            {book
              ? 'The title helps the AI understand names and invented words from the book.'
              : 'The title is used as context, so translations fit the world of the book.'}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={onSubmit}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="book-title"
              className="text-sm font-medium"
            >
              Title
            </label>
            <Input
              id="book-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={255}
              required
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="book-author"
              className="text-sm font-medium"
            >
              Author <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="book-author"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              maxLength={255}
              className="h-11 text-base"
            />
          </div>
          {!book && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Book language</label>
              <Select
                value={language}
                onValueChange={(value) => setLanguage(value as BookLanguage)}
              >
                <SelectTrigger className="w-full h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map((option) => (
                    <SelectItem
                      key={option}
                      value={option}
                    >
                      {languageNames[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            type="submit"
            className="w-full h-11"
            disabled={saving || !title.trim()}
          >
            {saving ? 'Saving...' : book ? 'Save' : 'Add book'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
