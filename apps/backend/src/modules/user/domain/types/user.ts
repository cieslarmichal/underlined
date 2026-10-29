import type { NativeLanguage } from '../../../../common/types/language.ts';
import type { UserRole } from '../../../../common/types/userRole.ts';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly password: string;
  readonly role: UserRole;
  readonly isEmailVerified: boolean;
  readonly isDeleted: boolean;
  readonly nativeLanguage: NativeLanguage;
  readonly dailyCaptureLimit: number;
  readonly createdAt: Date;
}
