import html2canvas from 'html2canvas'

export async function exportSummaryAsImage(elementId, filename) {
  const element = document.getElementById(elementId)
  if (!element) {
    return
  }

  const canvas = await html2canvas(element, {
    backgroundColor: '#FFFAF0',
    scale: 2,
  })

  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export function exportSummaryAsText(content, filename) {
  const blob = new Blob([content], {
    type: 'text/plain;charset=utf-8',
  })
  const link = document.createElement('a')
  link.download = `${filename}.txt`
  link.href = URL.createObjectURL(blob)
  link.click()
}
