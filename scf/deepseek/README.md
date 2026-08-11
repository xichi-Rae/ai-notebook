# 腾讯云 SCF DeepSeek 流式代理

这个目录是腾讯云函数（SCF）的独立部署包：

```text
scf/deepseek/
├── index.js
├── package.json
└── README.md
```

## 部署步骤

1. 打开腾讯云控制台，进入「云函数 SCF」→「函数服务」→「新建」。
2. 函数类型选择「Web 函数」或「HTTP 函数」。
3. 运行环境选择 `Nodejs 20.19`。
4. 代码上传方式选择「本地上传 ZIP」或「在线编辑」，入口文件为 `index.js`。
5. 添加环境变量：

```env
DEEPSEEK_API_KEY=你的DeepSeek密钥
```

6. 在「高级配置」中把执行超时时间设置为 `60` 秒。
7. 创建完成后，在函数详情页找到「函数 URL」或公网访问地址，复制给前端使用。

> 部署后不要把 `DEEPSEEK_API_KEY` 写进前端 `.env`。它只应存在于 SCF 的环境变量中。

## 前端接入

把云函数的公网地址写入项目的 `.env`：

```env
VITE_DEEPSEEK_API_URL=https://你的云函数公网地址
```

然后重新构建并部署前端静态文件。前端所有 DeepSeek 调用已经统一经过
`src/services/deepseek.js`，会自动读取这个变量。

## 流式传输

`index.js` 会把 DeepSeek 返回的 `response.body` 原样透传给浏览器，使用 SSE
流式输出；云函数不需要等整个 DeepSeek 响应结束才返回。前端收到
`Content-Type: text/event-stream` 时也会逐段读取 SSE 数据。

函数已内置 CORS，支持浏览器跨域调用；`OPTIONS` 预检请求会直接返回 204。

## 本地验证

先在 SCF 环境变量里填好 `DEEPSEEK_API_KEY`，然后用公网地址测试：

```bash
curl -N -X POST "$VITE_DEEPSEEK_API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "说一句话"}],
    "stream": true
  }'
```
