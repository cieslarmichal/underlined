ALTER TABLE "users" ALTER COLUMN "daily_capture_limit" SET DEFAULT 5;--> statement-breakpoint
ALTER TABLE "captures" ADD COLUMN "ai_model" varchar(100);--> statement-breakpoint
ALTER TABLE "captures" ADD COLUMN "ai_prompt_tokens" integer;--> statement-breakpoint
ALTER TABLE "captures" ADD COLUMN "ai_completion_tokens" integer;--> statement-breakpoint
ALTER TABLE "captures" ADD COLUMN "ai_cost_usd" numeric(12, 6);--> statement-breakpoint
ALTER TABLE "captures" ADD COLUMN "ai_duration_ms" integer;UPDATE "users" SET "daily_capture_limit" = 5 WHERE "daily_capture_limit" = 10;
