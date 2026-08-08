# Supabase 多设备同步配置

## 1. 安装依赖

项目已使用 pnpm 安装：

```bash
pnpm add @supabase/supabase-js
```

如果你改用 npm：

```bash
npm install @supabase/supabase-js
```

## 2. 配置环境变量

打开项目根目录的 `.env`，填入你的 Supabase 项目信息：

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的匿名公钥
```

`VITE_SUPABASE_ANON_KEY` 是 Supabase 的 `anon public` key，不是 service role key。

## 3. 创建 tasks 表

在 Supabase 控制台打开 SQL Editor，执行：

[supabase/migrations/001_create_tasks.sql](C:/Users/15429/Documents/Codex/2026-08-07/1-5-25-2-3-15/outputs/executive-coach-chat/supabase/migrations/001_create_tasks.sql)

表结构包含任务内容、完成状态、来源、预估时长、目标日期和用于前端去重的 `client_id`。

## 4. 多设备同步说明

当前实现没有接入 Supabase Auth，因此同一张 `tasks` 表会同步给所有能访问该表的用户。

如果以后要按账号隔离，需要：

1. 在 Supabase 开启 Email/Password 登录。
2. 给 `tasks` 表加 `user_id` 字段。
3. 开启 RLS 并创建按 `auth.uid()` 过滤的读写策略。
