-- Older installations applied the friends migration before the gender preference
-- migration was added to the journal. Repair that skipped column without changing
-- preferences already written by newer installations.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'groups' AND column_name = 'gender_preference'
  ) THEN
    ALTER TABLE "groups" ADD COLUMN "gender_preference" text DEFAULT 'ANY' NOT NULL;
    UPDATE "groups" SET "gender_preference" = t."gender_preference"
      FROM "travellers" t WHERE t."id" = "groups"."owner_id";
  END IF;
END $$;
