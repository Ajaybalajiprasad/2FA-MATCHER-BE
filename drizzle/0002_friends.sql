CREATE TABLE "friendships" (
	"id" text PRIMARY KEY NOT NULL,
	"traveller_a_id" text NOT NULL,
	"traveller_b_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	CONSTRAINT "friendships_pair_unique" UNIQUE("traveller_a_id","traveller_b_id"),
	CONSTRAINT "friendships_ordered_pair" CHECK ("friendships"."traveller_a_id" < "friendships"."traveller_b_id"),
	CONSTRAINT "friendships_requester_in_pair" CHECK ("friendships"."requester_id" IN ("friendships"."traveller_a_id", "friendships"."traveller_b_id")),
	CONSTRAINT "friendships_status" CHECK ("friendships"."status" IN ('PENDING', 'ACCEPTED'))
);
--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_traveller_a_id_travellers_id_fk" FOREIGN KEY ("traveller_a_id") REFERENCES "public"."travellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_traveller_b_id_travellers_id_fk" FOREIGN KEY ("traveller_b_id") REFERENCES "public"."travellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_travellers_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."travellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "friendships_a_idx" ON "friendships" USING btree ("traveller_a_id");--> statement-breakpoint
CREATE INDEX "friendships_b_idx" ON "friendships" USING btree ("traveller_b_id");