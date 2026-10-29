import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { boolean, pgTable, timestamp, uuid, varchar, text } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { v7 as uuidv7 } from 'uuid';

const databaseUrl = process.env['DATABASE_URL'];
const adminEmail = process.env['ADMIN_EMAIL'];
const adminPassword = process.env['ADMIN_PASSWORD'];

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: varchar('role', { length: 10 }).notNull().default('user'),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function seedAdmin(): Promise<void> {
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL is not defined');
  }

  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD is not defined');
  }

  try {
    const [existing] = await db.select().from(users).where(eq(users.email, adminEmail));

    if (existing) {
      console.log(`Admin user with email ${adminEmail} already exists. Skipping.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 14);

    await db.insert(users).values({
      id: uuidv7(),
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true,
    });

    console.log(`Successfully created admin user with email: ${adminEmail}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

await seedAdmin();
