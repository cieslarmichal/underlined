ALTER TABLE "words" ADD COLUMN "known_at" timestamp;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "last_shown_at" timestamp;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "last_outcome" varchar(12);