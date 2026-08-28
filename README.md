# 仿 Baker 网页聊天工具

一个界面模仿《明日方舟：终末地》中 Baker 的在线聊天工具。
主要实现浏览器在线聊天功能，类似 Fiora。

目前是准备第一个 Demo，先完成一个固定群聊的基本功能吧。
TODO: 多个群、私聊、Github企鹅之类的 OAuth……

## 文件结构
```text
./
    apps/
        web/        # Vue 浏览器端
        server/     # Fastify 服务端
    packages/
        contracts/  # 前后端共享协议
```

## 技术方向
- Vue3、TypeScript、Vite、Pinia
- Fastify、Socket.IO
- PostgreSQL、Drizzle ORM
- pnpm workspace

## 开发环境
- Node.js 24
- pnpm 11.24.0
- PostgreSQL 18
