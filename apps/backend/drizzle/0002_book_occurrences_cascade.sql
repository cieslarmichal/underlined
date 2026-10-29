ALTER TABLE "word_occurrences" DROP CONSTRAINT "word_occurrences_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "word_occurrences" ADD CONSTRAINT "word_occurrences_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;