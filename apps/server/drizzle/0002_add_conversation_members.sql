CREATE TABLE "conversation_members" (
	"conversation_id" integer NOT NULL,
	"user_uid" integer NOT NULL,
	"role" varchar(16) NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_members_pkey" PRIMARY KEY("conversation_id","user_uid"),
	CONSTRAINT "conversation_members_role_check" CHECK ("conversation_members"."role" IN ('owner', 'admin', 'member'))
);
--> statement-breakpoint
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_uid_users_uid_fk" FOREIGN KEY ("user_uid") REFERENCES "public"."users"("uid") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "conversation_members_user_uid_idx" ON "conversation_members" USING btree ("user_uid");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_members_one_owner_idx" ON "conversation_members" USING btree ("conversation_id") WHERE "conversation_members"."role" = 'owner';