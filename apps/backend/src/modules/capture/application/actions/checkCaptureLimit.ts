import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import type { User } from '../../../user/domain/types/user.ts';
import type { CaptureRepository } from '../../domain/repositories/captureRepository.ts';

export function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function assertWithinDailyLimit(captureRepository: CaptureRepository, user: User): Promise<void> {
  const used = await captureRepository.countSince(user.id, startOfUtcDay());

  if (used >= user.dailyCaptureLimit) {
    throw new OperationNotValidError({
      reason: `Daily limit of ${String(user.dailyCaptureLimit)} page photos reached. Try again tomorrow.`,
    });
  }
}
