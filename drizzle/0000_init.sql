CREATE TABLE "cities" (
	"name" text PRIMARY KEY NOT NULL,
	"country" text NOT NULL,
	"country_code" text NOT NULL,
	"timezone" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_cities" (
	"airport" text PRIMARY KEY NOT NULL,
	"city" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"aliases" json NOT NULL,
	"city" text NOT NULL,
	"area" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"rating" double precision NOT NULL,
	"stars" integer NOT NULL,
	"check_in_from" text NOT NULL,
	"check_out_until" text NOT NULL,
	"family_friendly" boolean NOT NULL,
	"image" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interests" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"category" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_availability" (
	"room_id" text NOT NULL,
	"date" text NOT NULL,
	"rooms_left" integer NOT NULL,
	CONSTRAINT "room_availability_room_id_date_pk" PRIMARY KEY("room_id","date")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"hotel_id" text NOT NULL,
	"room_type" text NOT NULL,
	"name" text NOT NULL,
	"max_adults" integer NOT NULL,
	"max_children" integer NOT NULL,
	"price_per_night_inr" integer NOT NULL,
	"currency" text NOT NULL,
	"refundable" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traveller_interests" (
	"traveller_id" text NOT NULL,
	"interest_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "traveller_interests_traveller_id_interest_id_pk" PRIMARY KEY("traveller_id","interest_id")
);
--> statement-breakpoint
CREATE TABLE "travellers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"age" integer,
	"gender" text NOT NULL,
	"home_city" text NOT NULL,
	"home_airport" text,
	"gender_preference" text NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"group_id" text NOT NULL,
	"traveller_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_group_id_traveller_id_pk" PRIMARY KEY("group_id","traveller_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"city" text NOT NULL,
	"check_in" text NOT NULL,
	"check_out" text NOT NULL,
	"max_size" integer NOT NULL,
	"budget_inr" integer NOT NULL,
	"itinerary" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "join_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"seeker_id" text NOT NULL,
	"search_id" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decided_at" timestamp,
	CONSTRAINT "join_requests_group_seeker_uq" UNIQUE("group_id","seeker_id")
);
--> statement-breakpoint
CREATE TABLE "searches" (
	"id" text PRIMARY KEY NOT NULL,
	"seeker_id" text NOT NULL,
	"home_city" text,
	"city" text NOT NULL,
	"check_in" text NOT NULL,
	"check_out" text NOT NULL,
	"budget_inr" integer NOT NULL,
	"interests" json NOT NULL,
	"gender" text NOT NULL,
	"gender_preference" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"hotel_id" text NOT NULL,
	"room_id" text NOT NULL,
	"rooms" integer NOT NULL,
	"nights" integer NOT NULL,
	"members" integer NOT NULL,
	"total_inr" integer NOT NULL,
	"per_member_inr" integer NOT NULL,
	"booked_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_group_id_unique" UNIQUE("group_id")
);
--> statement-breakpoint
CREATE TABLE "saved_options" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"traveller_id" text NOT NULL,
	"hotel_id" text NOT NULL,
	"room_id" text NOT NULL,
	"rooms" integer NOT NULL,
	"nights" integer NOT NULL,
	"total_inr" integer NOT NULL,
	"per_member_inr" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saved_options_group_traveller_room_uq" UNIQUE("group_id","traveller_id","room_id")
);
--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_city_cities_name_fk" FOREIGN KEY ("city") REFERENCES "public"."cities"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_availability" ADD CONSTRAINT "room_availability_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traveller_interests" ADD CONSTRAINT "traveller_interests_traveller_id_travellers_id_fk" FOREIGN KEY ("traveller_id") REFERENCES "public"."travellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traveller_interests" ADD CONSTRAINT "traveller_interests_interest_id_interests_id_fk" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_traveller_id_travellers_id_fk" FOREIGN KEY ("traveller_id") REFERENCES "public"."travellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_travellers_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."travellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_city_cities_name_fk" FOREIGN KEY ("city") REFERENCES "public"."cities"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_seeker_id_travellers_id_fk" FOREIGN KEY ("seeker_id") REFERENCES "public"."travellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "searches" ADD CONSTRAINT "searches_seeker_id_travellers_id_fk" FOREIGN KEY ("seeker_id") REFERENCES "public"."travellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_booked_by_id_travellers_id_fk" FOREIGN KEY ("booked_by_id") REFERENCES "public"."travellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_options" ADD CONSTRAINT "saved_options_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_options" ADD CONSTRAINT "saved_options_traveller_id_travellers_id_fk" FOREIGN KEY ("traveller_id") REFERENCES "public"."travellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_options" ADD CONSTRAINT "saved_options_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_options" ADD CONSTRAINT "saved_options_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;