import bcrypt from 'bcrypt';

import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import type { Config } from '../../../../core/config.ts';

export class PasswordService {
  private readonly config: Config;

  public constructor(config: Config) {
    this.config = config;
  }

  public async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.config.hashSaltRounds);

    return bcrypt.hash(password, salt);
  }

  public async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  public validatePassword(password: string): void {
    if (password.length < 8) {
      throw new OperationNotValidError({
        reason: 'Password must be at least 8 characters long.',
      });
    }

    if (password.length > 64) {
      throw new OperationNotValidError({
        reason: 'Password must be at most 64 characters long.',
      });
    }

    if (!/[a-z]/.test(password)) {
      throw new OperationNotValidError({
        reason: 'Password must contain at least one lowercase letter.',
      });
    }

    if (!/[A-Z]/.test(password)) {
      throw new OperationNotValidError({
        reason: 'Password must contain at least one uppercase letter.',
      });
    }

    if (!/[0-9]/.test(password)) {
      throw new OperationNotValidError({
        reason: 'Password must contain at least one number.',
      });
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new OperationNotValidError({
        reason: 'Password must contain at least one special character.',
      });
    }
  }
}
