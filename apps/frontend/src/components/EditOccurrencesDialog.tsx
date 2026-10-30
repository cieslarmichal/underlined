import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { updateOccurrence } from '../api/queries/words';
import type { Word, WordOccurrence } from '../api/types/word';
import { apiErrorMessage } from '../lib/apiErrorMessage';
import HighlightedSentence from './HighlightedSentence';

interface Props {
  word: Word;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

// Lets the reader fix the meaning of the word separately for each sentence it appeared in.
export default function EditOccurrencesDialog({ word, open, onOpenChange, onSaved }: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{word.lemma}</DialogTitle>
          <DialogDescription>Edit the meaning used in each sentence.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {word.occurrences.map((occurrence) => (
            <OccurrenceEditor
              key={occurrence.id}
              occurrence={occurrence}
              onSaved={onSaved}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OccurrenceEditor({ occurrence, onSaved }: { occurrence: WordOccurrence; onSaved: () => void }) {
  const [translation, setTranslation] = useState(occurrence.translation);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);

    try {
      await updateOccurrence(occurrence.id, translation);
      toast.success('Saved');
      onSaved();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save the meaning'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="font-serif text-base leading-relaxed text-muted-foreground">
        <HighlightedSentence
          sentence={occurrence.sentence}
          word={occurrence.surfaceForm}
        />
      </p>
      <p className="text-xs text-muted-foreground">{occurrence.bookTitle}</p>
      <div className="flex gap-2">
        <Input
          value={translation}
          onChange={(event) => setTranslation(event.target.value)}
          maxLength={500}
          className="h-11 text-base"
          aria-label={`Meaning in: ${occurrence.sentence}`}
        />
        <Button
          className="h-11"
          onClick={save}
          disabled={saving || !translation.trim() || translation.trim() === occurrence.translation}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
