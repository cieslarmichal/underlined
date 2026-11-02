import { Download } from 'lucide-react';
import { useState } from 'react';
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
import { exportWords, type ExportFormat } from '../api/queries/words';
import { downloadFile } from '../lib/downloadFile';
import { apiErrorMessage } from '../lib/apiErrorMessage';

interface ExportWordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Limits the export to one book. Everything is exported when not set.
  bookId?: string;
  scope: string;
}

const formats: { value: ExportFormat; title: string; text: string; extension: string }[] = [
  {
    value: 'anki',
    title: 'Anki',
    text: 'One card per word: the word on the front, meanings and your sentences on the back. In Anki use File → Import.',
    extension: 'txt',
  },
  {
    value: 'csv',
    title: 'Spreadsheet (CSV)',
    text: 'One row per sentence, with the book and languages. Opens in Excel, Numbers and Google Sheets.',
    extension: 'csv',
  },
];

export default function ExportWordsDialog({ open, onOpenChange, bookId, scope }: ExportWordsDialogProps) {
  const [busy, setBusy] = useState<ExportFormat>();

  async function onExport(format: ExportFormat, extension: string) {
    setBusy(format);

    try {
      const blob = await exportWords(format, bookId);
      const date = new Date().toISOString().slice(0, 10);

      downloadFile(blob, `underlined-${format === 'anki' ? 'anki' : 'words'}-${date}.${extension}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not export your words'));
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export your words</DialogTitle>
          <DialogDescription>Your words are yours. Download {scope}, including the words you know.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {formats.map(({ value, title, text, extension }) => (
            <button
              key={value}
              type="button"
              disabled={busy !== undefined}
              onClick={() => void onExport(value, extension)}
              className="flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent disabled:opacity-60"
            >
              <Download className="mt-0.5 size-5 shrink-0" />
              <span>
                <span className="block font-medium">{busy === value ? 'Preparing…' : title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span>
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
