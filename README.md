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
VITE_DEEPSEEK_API_URL=https://你的腾讯云SCF函数公网地址
DEEPSEEK_API_KEY=你的DeepSeek密钥
```

`DEEPSEEK_API_KEY` 只用于腾讯云 SCF，不能直接在前端代码中读取。
`VITE_DEEPSEEK_API_URL` 是 SCF 云函数的公网地址；本地开发如果保留 Vite 代理，也可以不设置，让前端回退到 `/api/deepseek`。

## AI 后端部署（腾讯云 SCF）

完整代码和步骤见 `scf/deepseek/README.md`。核心步骤：

1. 在腾讯云 SCF 创建「Web 函数」，运行环境选择 `Nodejs 20.19`。
2. 上传 `scf/deepseek/` 目录，入口文件为 `index.js`。
3. 配置环境变量 `DEEPSEEK_API_KEY`。
4. 把执行超时时间设置为 `60` 秒。
5. 创建成功后复制「函数 URL」，填入项目 `.env` 的 `VITE_DEEPSEEK_API_URL`，再重新构建部署前端。

函数已支持 SSE 流式透传和 CORS，前端读取 `Content-Type: text/event-stream` 时不会等完整响应结束后才解析。

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
