import type { NativeLanguage } from './language';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly isEmailVerified: boolean;
  readonly isDeleted: boolean;
  readonly nativeLanguage: NativeLanguage;
  readonly dailyCaptureLimit: number;
  // Only returned by GET /users/me.
  readonly capturesToday?: number;
  readonly createdAt: string;
}
