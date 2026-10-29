export type CaptureStatus = 'pending_review' | 'accepted' | 'rejected' | 'failed';

export interface CaptureItem {
  readonly lemma: string;
  readonly surfaceForm: string;
  readonly translation: string;
  // How many times the word is already in the dictionary.
  readonly timesSeen: number;
}

export interface Capture {
  readonly id: string;
  readonly bookId: string;
  readonly status: CaptureStatus;
  readonly items: CaptureItem[];
  readonly createdAt: string;
}
