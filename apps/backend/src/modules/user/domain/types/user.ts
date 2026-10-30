import type { NativeLanguage } from '../../../../common/types/language.ts';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly password: string;
  readonly isEmailVerified: boolean;
  readonly isDeleted: boolean;
  readonly nativeLanguage: NativeLanguage;
  readonly dailyCaptureLimit: number;
  readonly createdAt: Date;
}
