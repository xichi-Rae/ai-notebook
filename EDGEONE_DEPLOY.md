# EdgeOne Pages 部署说明

本项目的生产构建产物在 `dist/`，已经包含：

- 静态页面和 PWA 文件
- `edge-functions/api/deepseek.js`，用于把 `/api/deepseek` 请求转发到 DeepSeek，且 API Key 只放在 EdgeOne 环境变量里

## 打包

```bash
pnpm run build:edgeone
```

构建完成后，`dist/` 根目录需要有 `index.html`。直接把 `dist/` 压缩成 ZIP 时，不要把 `dist` 这一层目录包进去。

## 用 EdgeOne 控制台直接上传

1. 登录 EdgeOne Pages / Makers 控制台。
2. 创建项目，选择“直接上传”。
3. 上传 `executive-coach-chat-edgeone.zip`。
4. 部署成功后，在项目设置里添加环境变量：
   - 变量名：`DEEPSEEK_API_KEY`
   - 变量值：你的 DeepSeek API Key
   - 作用范围：必须勾选“运行时”
5. 保存并重新部署一次，使环境变量生效。

## 用 EdgeOne CLI 部署

需要先有 EdgeOne API Token：

```bash
pnpm exec edgeone makers deploy ./dist -n executive-coach-chat -t <EDGEONE_API_TOKEN> --area global
pnpm exec edgeone makers env set DEEPSEEK_API_KEY <你的DeepSeekKey> -t <EDGEONE_API_TOKEN>
```

部署成功后，CLI 会输出 EdgeOne Pages 预览地址，手机直接访问该地址即可。
