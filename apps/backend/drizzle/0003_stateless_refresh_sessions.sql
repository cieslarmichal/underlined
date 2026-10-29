ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_current_refresh_hash_unique";--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "generation" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "current_refresh_hash";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "prev_refresh_hash";--> statement-breakpoint
-- Existing refresh tokens carry no generation claim and can no longer be verified.
UPDATE "user_sessions" SET "status" = 'revoked', "updated_at" = now() WHERE "status" = 'active';
