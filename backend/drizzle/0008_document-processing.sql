ALTER TABLE "documents" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "extracted_text" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "processing_error" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "processed_at" timestamp with time zone;