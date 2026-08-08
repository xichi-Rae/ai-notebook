export default async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const apiPath = url.pathname.replace(/^\/api\/deepseek\/?/, '')
  const apiKey =
    env.DEEPSEEK_API_KEY || env.VITE_DEEPSEEK_API_KEY

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: {
          message: 'DEEPSEEK_API_KEY 尚未在 EdgeOne Pages 配置',
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  const body = await request.text()
  const upstream = await fetch(`https://api.deepseek.com/${apiPath}`, {
    method: request.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: body || undefined,
  })
  const text = await upstream.text()

  return new Response(text, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('content-type') || 'application/json',
    },
  })
}
