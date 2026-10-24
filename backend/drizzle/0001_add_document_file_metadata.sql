ALTER TABLE "documents" ADD COLUMN "original_file_name" varchar(255);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "storage_key" varchar(255);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "mime_type" varchar(100);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "file_size" integer;