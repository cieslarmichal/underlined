import type { UnderlinedWord } from '../../../../common/ai/pageAnalysisService.ts';
import type { NativeLanguage } from '../../../../common/types/language.ts';
import type { Transaction } from '../../../../infrastructure/database/transaction.ts';
import type { Capture, CaptureStatus } from '../types/capture.ts';

export interface CreateCaptureData {
  readonly userId: string;
  readonly bookId: string;
  readonly imageKey: string;
  readonly targetLanguage: NativeLanguage;
}

export interface UpdateCaptureData {
  readonly status: CaptureStatus;
  readonly items?: UnderlinedWord[];
}

export interface CaptureRepository {
  // New captures start as failed until the analysis succeeds.
  create(data: CreateCaptureData): Promise<Capture>;
  update(id: string, data: UpdateCaptureData, tx?: Transaction): Promise<Capture>;
  findById(id: string, userId: string): Promise<Capture | null>;
  findByBookId(bookId: string, userId: string, status: CaptureStatus): Promise<Capture[]>;
  // Photos taken since the given moment that were not failed.
  countSince(userId: string, since: Date): Promise<number>;
}
