import crypto from 'crypto';

export class CryptoService {
  public static hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
