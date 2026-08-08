export default async function handler(req, res) {
  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path]
  const apiPath = segments.filter(Boolean).join('/')
  const apiKey =
    process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY

  if (!apiKey) {
    res.status(500).json({
      error: {
        message: 'DEEPSEEK_API_KEY 尚未在部署平台配置',
      },
    })
    return
  }

  try {
    const upstream = await fetch(`https://api.deepseek.com/${apiPath}`, {
      method: req.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: req.body ? JSON.stringify(req.body) : undefined,
    })
    const text = await upstream.text()

    res
      .status(upstream.status)
      .setHeader(
        'Content-Type',
        upstream.headers.get('content-type') || 'application/json',
      )
      .send(text)
  } catch (error) {
    res.status(502).json({
      error: {
        message: `DeepSeek 代理请求失败：${error.message}`,
      },
    })
  }
}
