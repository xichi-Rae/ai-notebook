export async function onRequest(context) {
  const { request, env } = context

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = env.DEEPSEEK_API_KEY || env.VITE_DEEPSEEK_API_KEY
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

  let payload
  try {
    payload = await request.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const upstream = await fetch(
    'https://api.deepseek.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    },
  )

  const headers = new Headers()
  headers.set(
    'Content-Type',
    upstream.headers.get('content-type') || 'application/json',
  )
  headers.set('Cache-Control', 'no-cache')
  headers.set('Connection', 'keep-alive')

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}

export default onRequest
