import { FileText, Image, Sparkles } from 'lucide-react'
import {
  exportSummaryAsImage,
  exportSummaryAsText,
} from '../utils/export'

export default function SummaryCard({ message }) {
  const summaryId = message.summaryId || `summary-${message.id}`
  const title = message.summaryTitle || '总结报告'
  const date = message.summaryDate || ''
  const filename = message.filename || title

  async function handleExportImage() {
    await exportSummaryAsImage(summaryId, `${filename}-${date || 'summary'}`)
  }

  function handleExportText() {
    exportSummaryAsText(message.text || '', `${filename}-${date || 'summary'}`)
  }

  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400 text-white shadow-sm md:h-8 md:w-8">
        <Sparkles size={16} />
      </div>

      <div
        id={summaryId}
        className="min-w-0 max-w-md flex-1 rounded-2xl rounded-tl-md border-2 border-amber-200 bg-[#FFFAF0] p-3 shadow-sm md:p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-black text-amber-600">AI 总结</p>
            <h3 className="mt-0.5 text-base font-black text-slate-800">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">{date}</p>
          </div>
        </div>

        <p className="mt-3 whitespace-pre-wrap break-words text-base leading-7 text-slate-700">
          {message.text}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportImage}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-amber-100 px-3 text-sm font-bold text-amber-700"
          >
            <Image size={15} />
            导出图片
          </button>
          <button
            type="button"
            onClick={handleExportText}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-sky-100 px-3 text-sm font-bold text-sky-700"
          >
            <FileText size={15} />
            导出文档
          </button>
        </div>
      </div>
    </div>
  )
}
