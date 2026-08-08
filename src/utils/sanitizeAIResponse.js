export function sanitizeAIResponse(text) {
  if (!text) return ''

  let cleaned = text
  cleaned = cleaned.replace(/\*[^*]+\*/g, '')
  cleaned = cleaned.replace(/^\s*\*\s*/gm, '')
  cleaned = cleaned.replace(/\*\*\*/g, '')
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  return cleaned.trim()
}
