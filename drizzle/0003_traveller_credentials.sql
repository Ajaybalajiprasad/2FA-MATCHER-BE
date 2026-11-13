ALTER TABLE "travellers" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "travellers" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "travellers" ADD CONSTRAINT "travellers_email_unique" UNIQUE("email");