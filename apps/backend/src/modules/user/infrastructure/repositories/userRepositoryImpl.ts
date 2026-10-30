import { eq } from 'drizzle-orm';

import { IdService } from '../../../../common/id/idService.ts';
import type { NativeLanguage } from '../../../../common/types/language.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { users } from '../../../../infrastructure/database/schema.ts';
import type { Transaction } from '../../../../infrastructure/database/transaction.ts';
import type {
  AccountStatus,
  CreateUserData,
  UpdateUserData,
  UserRepository,
} from '../../domain/repositories/userRepository.ts';
import type { User } from '../../domain/types/user.ts';

export class UserRepositoryImpl implements UserRepository {
  private readonly databaseClient: DatabaseClient;

  public constructor(databaseClient: DatabaseClient) {
    this.databaseClient = databaseClient;
  }

  public async create(data: CreateUserData, tx?: Transaction): Promise<User> {
    const db = tx ?? this.databaseClient.db;

    const [newUser] = await db
      .insert(users)
      .values({
        id: IdService.generateUuid(),
        email: data.email,
        password: data.password,
        isEmailVerified: data.isEmailVerified ?? false,
        ...(data.nativeLanguage !== undefined && { nativeLanguage: data.nativeLanguage }),
      })
      .returning();

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    return this.mapToUser(newUser);
  }

  public async update(id: string, data: UpdateUserData, tx?: Transaction): Promise<User> {
    const db = tx ?? this.databaseClient.db;

    const updateData: Record<string, unknown> = {};

    if (data.password !== undefined) updateData['password'] = data.password;
    if (data.email !== undefined) updateData['email'] = data.email;
    if (data.isEmailVerified !== undefined) updateData['isEmailVerified'] = data.isEmailVerified;
    if (data.isDeleted !== undefined) updateData['isDeleted'] = data.isDeleted;
    if (data.nativeLanguage !== undefined) updateData['nativeLanguage'] = data.nativeLanguage;

    const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();

    if (!updatedUser) {
      throw new Error('Failed to update user');
    }

    return this.mapToUser(updatedUser);
  }

  public async findById(id: string, tx?: Transaction): Promise<User | null> {
    const db = tx ?? this.databaseClient.db;

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    return user ? this.mapToUser(user) : null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.databaseClient.db.select().from(users).where(eq(users.email, email)).limit(1);

    return user ? this.mapToUser(user) : null;
  }

  public async delete(id: string): Promise<void> {
    await this.databaseClient.db.delete(users).where(eq(users.id, id));
  }

  public async getAccountStatus(userId: string): Promise<AccountStatus> {
    const [record] = await this.databaseClient.db
      .select({ isDeleted: users.isDeleted })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!record) {
      return { exists: false, isDeleted: false };
    }

    return { exists: true, isDeleted: record.isDeleted };
  }

  private mapToUser(dbUser: typeof users.$inferSelect): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      password: dbUser.password,
      isEmailVerified: dbUser.isEmailVerified,
      isDeleted: dbUser.isDeleted,
      nativeLanguage: dbUser.nativeLanguage as NativeLanguage,
      dailyCaptureLimit: dbUser.dailyCaptureLimit,
      createdAt: dbUser.createdAt,
    };
  }
}
