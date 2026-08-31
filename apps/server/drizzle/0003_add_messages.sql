CREATE TABLE "messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"sender_uid" integer NOT NULL,
	"client_message_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_sender_uid_client_message_id_unique" UNIQUE("sender_uid","client_message_id"),
	CONSTRAINT "messages_content_length_check" CHECK (char_length(btrim("messages"."content")) BETWEEN 1 AND 2000)
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_uid_users_uid_fk" FOREIGN KEY ("sender_uid") REFERENCES "public"."users"("uid") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "messages_conversation_id_id_idx" ON "messages" USING btree ("conversation_id","id");