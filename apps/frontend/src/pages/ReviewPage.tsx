import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { acceptCapture, getPendingCaptures, rejectCapture, retryCapture } from '../api/queries/captures';
import type { Capture } from '../api/types/capture';
import { site } from '../config';
import { useAsyncData } from '../hooks/useAsyncData';
import { useSEO } from '../hooks/useSEO';
import { apiErrorMessage } from '../lib/apiErrorMessage';

export default function ReviewPage() {
  useSEO({ title: `Review - ${site.name}`, noindex: true });

  const { bookId = '', captureId = '' } = useParams();
  const navigate = useNavigate();
  const stateCapture = (useLocation().state as { capture?: Capture } | null)?.capture;

  const [retried, setRetried] = useState<Capture>();
  const [busy, setBusy] = useState(false);

  // A capture opened from the "waiting for approval" banner is not in the navigation state.
  const pending = useAsyncData(
    async () => (stateCapture?.id === captureId ? undefined : getPendingCaptures(bookId)),
    [bookId, captureId],
  );

  const capture =
    retried ?? (stateCapture?.id === captureId ? stateCapture : pending.data?.find((c) => c.id === captureId));
  const backToBook = () => navigate(`/books/${bookId}`, { replace: true });

  async function run(action: () => Promise<void>, failure: string) {
    setBusy(true);

    try {
      await action();
    } catch (error) {
      toast.error(apiErrorMessage(error, failure));
    } finally {
      setBusy(false);
    }
  }

  const accept = () =>
    run(async () => {
      await acceptCapture(captureId);
      toast.success('Words saved');
      backToBook();
    }, 'Could not save the words');

  const reject = () =>
    run(async () => {
      await rejectCapture(captureId);
      backToBook();
    }, 'Could not discard the photo');

  const retry = () =>
    run(async () => {
      setRetried(await retryCapture(captureId));
    }, 'Still could not read the page. Please try again.');

  if (!capture) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        {pending.loading ? (
          <Loader2 className="size-8 animate-spin" />
        ) : (
          <div className="text-center">
            <p className="font-medium">This photo is no longer waiting for review.</p>
            <Button
              className="mt-4 h-11"
              onClick={backToBook}
            >
              Back to the book
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (capture.status === 'failed') {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-xl font-bold">We couldn&apos;t read this page</h1>
        <p className="mt-2 text-muted-foreground">Something went wrong on our side. Your photo is saved.</p>
        <Button
          className="mt-6 h-12 w-full"
          onClick={retry}
          disabled={busy}
        >
          {busy ? 'Trying again...' : 'Try again'}
        </Button>
        <Button
          variant="ghost"
          className="mt-2 h-11 w-full"
          onClick={backToBook}
        >
          Back to the book
        </Button>
      </div>
    );
  }

  if (capture.items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-xl font-bold">No underlined words found</h1>
        <p className="mt-2 text-muted-foreground">
          For a better result: hold the phone straight above the page, use good light, keep the underline dark and make
          sure the whole line is in the frame.
        </p>
        <Button
          className="mt-6 h-12 w-full"
          onClick={backToBook}
        >
          Take another photo
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-65px-3.5rem-env(safe-area-inset-bottom))] max-w-2xl flex-col px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">
        {capture.items.length} {capture.items.length === 1 ? 'word' : 'words'} found
      </h1>

      <ul className="divide-y rounded-xl border bg-card">
        {capture.items.map((item) => (
          <li
            key={item.lemma}
            className="px-4 py-3"
          >
            <p className="font-semibold">
              {item.lemma} <span className="font-normal text-muted-foreground">→</span> {item.translation}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex-1" />

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] mt-6 flex flex-col gap-2 bg-background pb-2 pt-3">
        <Button
          className="h-14 w-full text-base"
          onClick={accept}
          disabled={busy}
        >
          Accept all
        </Button>
        <Button
          variant="outline"
          className="h-12 w-full"
          onClick={reject}
          disabled={busy}
        >
          Discard
        </Button>
        <Link
          to={`/books/${bookId}`}
          className="py-2 text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Decide later
        </Link>
      </div>
    </div>
  );
}
