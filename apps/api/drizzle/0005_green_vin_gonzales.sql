ALTER TABLE "profile" ADD COLUMN "username" text NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_username_unique" UNIQUE("username");