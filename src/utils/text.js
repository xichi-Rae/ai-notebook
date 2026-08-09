export function truncateText(text, maxLength = 600) {
  const cleanText = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleanText.length <= maxLength) {
    return cleanText
  }

  return `${cleanText.slice(0, maxLength)}...（已自动精简）`
}
