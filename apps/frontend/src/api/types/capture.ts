export type CaptureStatus = 'pending_review' | 'accepted' | 'rejected' | 'failed';

export interface CaptureItem {
  readonly lemma: string;
  readonly surfaceForm: string;
  readonly translation: string;
}

export interface Capture {
  readonly id: string;
  readonly bookId: string;
  readonly status: CaptureStatus;
  readonly items: CaptureItem[];
  readonly createdAt: string;
}
