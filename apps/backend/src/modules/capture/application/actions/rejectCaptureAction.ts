import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { CaptureRepository } from '../../domain/repositories/captureRepository.ts';

export class RejectCaptureAction {
  private readonly captureRepository: CaptureRepository;

  public constructor(captureRepository: CaptureRepository) {
    this.captureRepository = captureRepository;
  }

  public async execute(id: string, userId: string): Promise<void> {
    const capture = await this.captureRepository.findById(id, userId);

    if (!capture) {
      throw new ResourceNotFoundError({ resource: 'Capture', captureId: id });
    }

    if (capture.status !== 'pending_review') {
      throw new OperationNotValidError({ reason: 'This photo is not waiting for review' });
    }

    await this.captureRepository.update(id, { status: 'rejected' });
  }
}
