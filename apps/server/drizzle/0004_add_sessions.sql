CREATE TABLE "sessions" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"user_uid" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "sessions_token_hash_format_check" CHECK ("sessions"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "sessions_expires_after_created_check" CHECK ("sessions"."expires_at" > "sessions"."created_at")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_uid_users_uid_fk" FOREIGN KEY ("user_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "sessions_user_uid_idx" ON "sessions" USING btree ("user_uid");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");