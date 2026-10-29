import type { UnderlinedWord } from '../../../../common/ai/pageAnalysisService.ts';
import type { NativeLanguage } from '../../../../common/types/language.ts';

export type CaptureStatus = 'pending_review' | 'accepted' | 'rejected' | 'failed';

export interface Capture {
  readonly id: string;
  readonly userId: string;
  readonly bookId: string;
  readonly imageKey: string;
  readonly targetLanguage: NativeLanguage;
  readonly status: CaptureStatus;
  readonly items: UnderlinedWord[];
  readonly createdAt: Date;
}

export interface CaptureItem extends UnderlinedWord {
  // How many times the word is already saved in the user's dictionary.
  readonly timesSeen: number;
}

export interface CaptureView {
  readonly capture: Capture;
  readonly items: CaptureItem[];
}
