'use strict'

const http = require('http')

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions'
const PORT = process.env.PORT || 9000
const TIMEOUT_MS = 55_000

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

async function readRequestBody(request) {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    ...corsHeaders(),
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(body))
}

async function handleRequest(request, response) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders())
    response.end()
    return
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, {
      error: { message: 'Method not allowed' },
    })
    return
  }

  let payload
  try {
    payload = JSON.parse(await readRequestBody(request))
  } catch {
    sendJson(response, 400, {
      error: { message: 'Invalid JSON body' },
    })
    return
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    sendJson(response, 500, {
      error: { message: 'DEEPSEEK_API_KEY is not configured' },
    })
    return
  }

  try {
    const upstream = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    const contentType =
      upstream.headers.get('content-type') || 'application/json'

    if (payload.stream && upstream.body) {
      response.writeHead(upstream.status, {
        ...corsHeaders(),
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })

      const reader = upstream.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        response.write(Buffer.from(value))
        if (typeof response.flush === 'function') {
          response.flush()
        }
      }
      response.end()
      return
    }

    const body = await upstream.text()
    response.writeHead(upstream.status, {
      ...corsHeaders(),
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    response.end(body)
  } catch (error) {
    if (!response.headersSent) {
      sendJson(response, 502, {
        error: {
          message: error.name === 'TimeoutError'
            ? 'DeepSeek upstream timeout'
            : error.message,
        },
      })
      return
    }
    response.end()
  }
}

const server = http.createServer(handleRequest)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`DeepSeek proxy listening on ${PORT}`)
})
