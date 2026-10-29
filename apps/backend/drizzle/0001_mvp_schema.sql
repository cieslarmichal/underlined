CREATE TABLE "books" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"author" varchar(255),
	"language" varchar(2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "captures" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"image_key" text NOT NULL,
	"target_language" varchar(2) NOT NULL,
	"status" varchar(16) NOT NULL,
	"ai_result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "word_occurrences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"word_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"capture_id" uuid NOT NULL,
	"surface_form" varchar(255) NOT NULL,
	"sentence" text NOT NULL,
	"sentence_key" text NOT NULL,
	"translation" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"lemma" varchar(255) NOT NULL,
	"lemma_key" varchar(255) NOT NULL,
	"source_language" varchar(2) NOT NULL,
	"target_language" varchar(2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "words_user_languages_lemma_key" UNIQUE("user_id","source_language","target_language","lemma_key")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "native_language" varchar(2) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "daily_capture_limit" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "captures" ADD CONSTRAINT "captures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "captures" ADD CONSTRAINT "captures_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_occurrences" ADD CONSTRAINT "word_occurrences_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_occurrences" ADD CONSTRAINT "word_occurrences_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_occurrences" ADD CONSTRAINT "word_occurrences_capture_id_captures_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."captures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_books_user_id" ON "books" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_captures_user_created_at" ON "captures" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_captures_book_status" ON "captures" USING btree ("book_id","status");--> statement-breakpoint
CREATE INDEX "idx_word_occurrences_word_id" ON "word_occurrences" USING btree ("word_id");--> statement-breakpoint
CREATE INDEX "idx_word_occurrences_book_id" ON "word_occurrences" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "idx_word_occurrences_capture_id" ON "word_occurrences" USING btree ("capture_id");