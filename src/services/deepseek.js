export const DEEPSEEK_MODEL = 'deepseek-v4-flash'
const REQUEST_TIMEOUT_MS = 15000

async function readStreamContent(response) {
  const reader = response.body?.getReader()
  if (!reader) {
    return ''
  }

  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let content = ''

  function parseBuffer() {
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    lines.forEach((line) => {
      const dataLine = line.trim()
      if (!dataLine.startsWith('data:')) {
        return
      }

      const data = dataLine.slice(5).trim()
      if (data === '[DONE]') {
        content += '\n[DONE]'
        return
      }

      try {
        const parsed = JSON.parse(data)
        const delta = parsed?.choices?.[0]?.delta
        if (delta?.content) {
          content += delta.content
        }
      } catch {
        // Ignore keep-alive or partial SSE lines.
      }
    })
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
    parseBuffer()
  }

  parseBuffer()
  return content.replace(/\n\[DONE\]$/, '')
}

export async function fetchDeepSeekReply(messages, options = {}) {
  const controller = new AbortController()
  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch('/api/deepseek', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        temperature: 0.7,
        stream: true,
      }),
    })

    if (!response.ok) {
      let message = `DeepSeek API 请求失败 (${response.status})`
      try {
        const errorData = await response.json()
        if (errorData?.error?.message) {
          message = errorData.error.message
        }
      } catch {
        // Keep the status-based fallback message.
      }
      throw new Error(message)
    }

    const contentType = response.headers.get('content-type') || ''
    let content = ''

    if (contentType.includes('text/event-stream')) {
      content = await readStreamContent(response)
    } else {
      const text = await response.text()
      if (text.trim().startsWith('{')) {
        const data = JSON.parse(text)
        content = data?.choices?.[0]?.message?.content || ''
        if (!content && data?.error?.message) {
          throw new Error(data.error.message)
        }
      } else {
        content = text
      }
    }

    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('DeepSeek API 返回内容格式异常')
    }

    return content
  } catch (error) {
    if (error.name === 'AbortError' || controller.signal.aborted) {
      throw new Error('AI 请求超时，请精简内容重试')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function extractTrailingJson(content) {
  const trimmed = content.trimEnd()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```\s*$/)

  if (fenceMatch) {
    try {
      return {
        json: JSON.parse(fenceMatch[1].trim()),
        textBefore: trimmed.slice(0, fenceMatch.index).trim(),
      }
    } catch {
      // Fall through to the line-based parser.
    }
  }

  const lines = trimmed.split(/\r?\n/)

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const candidate = lines.slice(index).join('\n').trim()
    if (!candidate.startsWith('{') || !candidate.endsWith('}')) {
      continue
    }

    try {
      const parsed = JSON.parse(candidate)
      return {
        json: parsed,
        textBefore: lines.slice(0, index).join('\n').trim(),
      }
    } catch {
      // Try the previous line before treating the whole content as text.
    }
  }

  return null
}

export function parseJsonObject(content) {
  return extractTrailingJson(content)?.json ?? null
}

export function parseAssistantContent(content) {
  const trimmed = content.trimEnd()
  const extracted = extractTrailingJson(content)

  if (extracted?.json?.actionCard) {
    const actionCard = extracted.json.actionCard

    if (actionCard.type === 'timer') {
      const duration = Number(actionCard.duration)
      return {
        text: extracted.textBefore,
        actionCard: {
          ...actionCard,
          duration: Number.isFinite(duration) ? Math.max(1, duration) : 25,
        },
      }
    }

    return {
      text: extracted.textBefore,
      actionCard,
    }
  }

  return { text: trimmed, actionCard: null }
}
