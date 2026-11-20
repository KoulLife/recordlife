CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "title_length" CHECK (char_length("activities"."title") between 1 and 100),
	CONSTRAINT "ended_after_started" CHECK ("activities"."ended_at" is null or "activities"."ended_at" > "activities"."started_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "one_running" ON "activities" USING btree ((true)) WHERE "activities"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "activities_started_at" ON "activities" USING btree ("started_at");