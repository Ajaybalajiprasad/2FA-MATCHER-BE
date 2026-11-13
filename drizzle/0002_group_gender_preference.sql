ALTER TABLE "groups" ADD COLUMN "gender_preference" text DEFAULT 'ANY' NOT NULL;--> statement-breakpoint
UPDATE "groups" SET "gender_preference" = t."gender_preference" FROM "travellers" t WHERE t."id" = "groups"."owner_id";
