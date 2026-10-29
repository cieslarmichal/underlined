import { customAlphabet } from 'nanoid';
import { v7 as uuid } from 'uuid';

export class IdService {
  private static readonly allowedNanoidCharacters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  private static readonly nanoidLength = 32;
  private static readonly nanoidGenerator = customAlphabet(this.allowedNanoidCharacters, this.nanoidLength);

  public static generateUuid(): string {
    return uuid();
  }

  public static generateNanoid(): string {
    return this.nanoidGenerator();
  }
}
