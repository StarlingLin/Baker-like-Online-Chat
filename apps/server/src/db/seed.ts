import { and, eq, sql } from 'drizzle-orm'

import { loadConfig } from '../config.js'
import { createDatabaseClient } from './client.js'
import { conversationMembers, conversations, messages, users } from './schema.js'

const seedUsers = [
  {
    uid: 0,
    nickname: '管理员',
    discriminator: 0,
    role: 'admin',
  },
  {
    uid: 1,
    nickname: 'Starling',
    discriminator: 1,
    role: 'user',
  },
  {
    uid: 9999_9999,
    nickname: '测试员工',
    discriminator: 1,
    role: 'user',
  },
] satisfies (typeof users.$inferInsert)[]

const seedConversation = {
  systemKey: 'public-main',
  kind: 'group',
  name: '帝江号公共频道',
  createdByUid: 0,
} satisfies typeof conversations.$inferInsert

const seedMemberAssignments = [
  {
    userUid: 0,
    role: 'owner',
  },
  {
    userUid: 1,
    role: 'member',
  },
  {
    userUid: 9999_9999,
    role: 'member',
  },
] as const

const seedMessages = [
  {
    senderUid: 0,
    clientMessageId: '00000000-0000-4000-8000-000000000001',
    content: '欢迎来到帝江号公共频道。',
  },
  {
    senderUid: 1,
    clientMessageId: '00000000-0000-4000-8000-000000000002',
    content: '这里可以正常显示消息吗？',
  },
  {
    senderUid: 9999_9999,
    clientMessageId: '00000000-0000-4000-8000-000000000003',
    content: '收到，当前显示正常。',
  },
] as const

function getDevelopmentDatabaseName(databaseUrl: string): string {
  const url = new URL(databaseUrl)
  const databaseName = decodeURIComponent(url.pathname.slice(1))
  if (!databaseName || !databaseName.endsWith('_dev')) {
    throw new Error('开发种子只允许写入 _dev 结尾的数据库')
  }
  return databaseName
}

async function runSeed(): Promise<void> {
  const config = loadConfig()
  // 先名称检查
  const databaseName = getDevelopmentDatabaseName(config.databaseUrl)
  const database = createDatabaseClient({
    databaseUrl: config.databaseUrl,
    onPoolError(error) {
      console.error(`数据库连接池错误：${error.message}`)
    },
  })

  try {
    await database.db.transaction(async (transaction) => {
      // 固定用户
      await transaction
        .insert(users)
        .values(seedUsers)
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            nickname: sql`excluded.nickname`,
            discriminator: sql`excluded.discriminator`,
            role: sql`excluded.role`,
          },
        })

      // 固定频道
      const [existingConversation] = await transaction
        .select({
          id: conversations.id,
        })
        .from(conversations)
        .where(eq(conversations.systemKey, seedConversation.systemKey))
        .limit(1)
      let conversationId: number
      if (existingConversation) {
        conversationId = existingConversation.id
        // 已存在时只恢复规范字段
        await transaction
          .update(conversations)
          .set({
            kind: seedConversation.kind,
            name: seedConversation.name,
            createdByUid: seedConversation.createdByUid,
          })
          .where(eq(conversations.id, conversationId))
      } else {
        // 第一次播种时才创建
        const [createdConversation] = await transaction
          .insert(conversations)
          .values(seedConversation)
          .returning({
            id: conversations.id,
          })
        if (!createdConversation) {
          throw new Error('创建固定公共频道后没有返回')
        }
        conversationId = createdConversation.id
      }
      // 成员关系
      await transaction
        .insert(conversationMembers)
        .values(
          seedMemberAssignments.map((member) => ({
            conversationId,
            ...member,
          })),
        )
        .onConflictDoUpdate({
          target: [conversationMembers.conversationId, conversationMembers.userUid],
          set: {
            role: sql`excluded.role`,
          },
        })

      // 固定消息
      for (const seedMessage of seedMessages) {
        const [existingMessage] = await transaction
          .select({
            id: messages.id,
          })
          .from(messages)
          .where(
            and(
              eq(messages.senderUid, seedMessage.senderUid),
              eq(messages.clientMessageId, seedMessage.clientMessageId),
            ),
          )
          .limit(1)

        if (existingMessage) {
          // 已存在时只恢复所属频道和正文
          await transaction
            .update(messages)
            .set({
              conversationId,
              content: seedMessage.content,
            })
            .where(eq(messages.id, existingMessage.id))
        } else {
          // 第一次播种时才创建
          await transaction.insert(messages).values({
            conversationId,
            ...seedMessage,
          })
        }
      }

      // 同步用户 UID
      await transaction.execute(sql`
        SELECT setval(
          'users_uid_seq',
          GREATEST(
            (SELECT last_value FROM users_uid_seq),
            COALESCE(
              (
                SELECT max(${users.uid})
                FROM ${users}
                WHERE ${users.uid} BETWEEN 1 AND 99999998
              ),
              1
            )
          ),
          true
        )
      `)
    })

    console.log('开发种子执行完成')
    console.log(`数据库：${databaseName}`)
    console.log(`用户：${seedUsers.length}`)
    console.log(`会话：${seedConversation.name}`)
    console.log(`成员：${seedMemberAssignments.length}`)
    console.log(`消息：${seedMessages.length}`)
  } finally {
    await database.close()
  }
}

try {
  await runSeed()
} catch (error) {
  const message = error instanceof Error ? error.message : '未知错误'
  console.error(`开发种子执行失败：${message}`)
  process.exitCode = 1
}
