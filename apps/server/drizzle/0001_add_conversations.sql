CREATE TABLE "conversations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"system_key" varchar(32),
	"kind" varchar(16) NOT NULL,
	"name" varchar(32),
	"created_by_uid" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_system_key_unique" UNIQUE("system_key"),
	CONSTRAINT "conversations_kind_check" CHECK ("conversations"."kind" IN ('group', 'direct')),
	CONSTRAINT "conversations_system_key_check" CHECK ((
        "conversations"."system_key" IS NULL
        OR (
          "conversations"."kind" = 'group'
          AND char_length(btrim("conversations"."system_key")) > 0
        )
      )),
	CONSTRAINT "conversations_name_check" CHECK ((
        (
          "conversations"."kind" = 'group'
          AND "conversations"."name" IS NOT NULL
          AND char_length(btrim("conversations"."name")) > 0
        )
        OR (
          "conversations"."kind" = 'direct'
          AND "conversations"."name" IS NULL
        )
      ))
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_uid_users_uid_fk" FOREIGN KEY ("created_by_uid") REFERENCES "public"."users"("uid") ON DELETE restrict ON UPDATE restrict;