export const DEEPSEEK_MODEL = 'deepseek-v4-flash'

export async function fetchDeepSeekReply(messages) {
  const response = await fetch('/api/deepseek', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: 0.7,
      stream: false,
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

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (typeof content !== 'string') {
    throw new Error('DeepSeek API 返回内容格式异常')
  }

  return content
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
