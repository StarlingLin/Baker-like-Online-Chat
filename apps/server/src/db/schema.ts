import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    uid: integer('uid')
      .primaryKey()
      /* 递增分配 UID */
      .generatedByDefaultAsIdentity({
        name: 'users_uid_seq',
        startWith: 1,
        minValue: 1,
        maxValue: 9999_9999,
      }),
    nickname: varchar('nickname', { length: 16 }).notNull(),
    discriminator: smallint('discriminator').notNull(),
    role: varchar('role', { length: 16 }).$type<'user' | 'admin'>().notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /* 昵称和编号不能都一样 */
    unique('users_nickname_discriminator_unique').on(table.nickname, table.discriminator),
    check('users_uid_range_check', sql`${table.uid} BETWEEN 0 AND 99999999`),
    check('users_discriminator_range_check', sql`${table.discriminator} BETWEEN 0 AND 9999`),
    check('users_role_check', sql`${table.role} IN ('user', 'admin')`),
    check('users_nickname_not_blank_check', sql`char_length(btrim(${table.nickname})) > 0`),
    /* 管理员 */
    check(
      'users_reserved_zero_identity_check',
      sql`(
        (
          ${table.uid} = 0
          AND ${table.discriminator} = 0
          AND ${table.role} = 'admin'
        )
        OR
        (
          ${table.uid} > 0
          AND ${table.discriminator} > 0
        )
      )`,
    ),
  ],
)

export const conversations = pgTable(
  'conversations',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity({
      name: 'conversations_id_seq',
      startWith: 1,
      minValue: 1,
    }),
    systemKey: varchar('system_key', { length: 32 }),
    kind: varchar('kind', { length: 16 }).$type<'group' | 'direct'>().notNull(),
    name: varchar('name', { length: 32 }),
    createdByUid: integer('created_by_uid')
      .notNull()
      .references(() => users.uid, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('conversations_system_key_unique').on(table.systemKey),
    check('conversations_kind_check', sql`${table.kind} IN ('group', 'direct')`),
    check(
      'conversations_system_key_check',
      sql`(
        ${table.systemKey} IS NULL
        OR (
          ${table.kind} = 'group'
          AND char_length(btrim(${table.systemKey})) > 0
        )
      )`,
    ),
    check(
      'conversations_name_check',
      sql`(
        (
          ${table.kind} = 'group'
          AND ${table.name} IS NOT NULL
          AND char_length(btrim(${table.name})) > 0
        )
        OR (
          ${table.kind} = 'direct'
          AND ${table.name} IS NULL
        )
      )`,
    ),
  ],
)

export const conversationMembers = pgTable(
  'conversation_members',
  {
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversations.id, {
        onDelete: 'cascade',
        onUpdate: 'restrict',
      }),
    userUid: integer('user_uid')
      .notNull()
      .references(() => users.uid, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    role: varchar('role', { length: 16 }).$type<'owner' | 'admin' | 'member'>().notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'conversation_members_pkey',
      columns: [table.conversationId, table.userUid],
    }),
    check('conversation_members_role_check', sql`${table.role} IN ('owner', 'admin', 'member')`),
    index('conversation_members_user_uid_idx').on(table.userUid),
    uniqueIndex('conversation_members_one_owner_idx')
      .on(table.conversationId)
      .where(sql`${table.role} = 'owner'`),
  ],
)

export const messages = pgTable(
  'messages',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity({
      name: 'messages_id_seq',
      startWith: 1,
      minValue: 1,
    }),
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversations.id, {
        onDelete: 'cascade',
        onUpdate: 'restrict',
      }),
    senderUid: integer('sender_uid')
      .notNull()
      .references(() => users.uid, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    clientMessageId: uuid('client_message_id').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('messages_sender_uid_client_message_id_unique').on(
      table.senderUid,
      table.clientMessageId,
    ),
    check(
      'messages_content_length_check',
      sql`char_length(btrim(${table.content})) BETWEEN 1 AND 2000`,
    ),
    index('messages_conversation_id_id_idx').on(table.conversationId, table.id),
  ],
)

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
    userUid: integer('user_uid')
      .notNull()
      .references(() => users.uid, {
        onDelete: 'cascade',
        onUpdate: 'restrict',
      }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    check('sessions_token_hash_format_check', sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check('sessions_expires_after_created_check', sql`${table.expiresAt} > ${table.createdAt}`),
    index('sessions_user_uid_idx').on(table.userUid),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
)
