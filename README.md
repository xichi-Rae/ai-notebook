# AI 手帐本

一个基于 React + Vite + Tailwind CSS 的 PWA 执行教练应用。

## 本地运行

```bash
pnpm install
pnpm dev
```

浏览器访问 `http://localhost:5173`。

## 环境变量

复制 `.env.example` 为 `.env`，并填入：

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的匿名公钥
DEEPSEEK_API_KEY=你的DeepSeek密钥
```

`DEEPSEEK_API_KEY` 只用于 EdgeOne 边缘函数，不能直接在前端代码中读取。

## EdgeOne Pages 部署

1. 构建命令：`npm run build`
2. 输出目录：`dist`
3. 环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `DEEPSEEK_API_KEY`

`DEEPSEEK_API_KEY` 在 EdgeOne 环境变量中必须设置为“运行时”范围，这样 `edge-functions/api/deepseek.js` 才能读取。

## Supabase

执行：

```sql
supabase/migrations/001_create_tasks.sql
supabase/migrations/002_create_sync_tables.sql
```

任务和目标的写入以 Supabase 为准，本地 Context 作为 UI 状态和缓存。

## AI 目标拆分

采用两段式：

1. 创建目标时只生成阶段大纲。
2. 在目标详情页逐阶段点击“生成详细计划”，再生成周任务和每日行动。

所有 DeepSeek 请求统一走 `src/services/deepseek.js`，带 9 秒超时和流式响应。
