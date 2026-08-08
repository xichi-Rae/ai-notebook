import { BarChart3, Loader2 } from 'lucide-react'
import { useChat } from '../context/ChatContext'

export default function SummaryPromptCard({ message }) {
  const { generateSummary, isTyping } = useChat()
  const type = message.summaryType === 'month' ? 'month' : 'week'

  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-600 text-white shadow-sm md:h-8 md:w-8">
        <BarChart3 size={16} />
      </div>

      <div className="min-w-0 max-w-md flex-1 rounded-2xl rounded-tl-md border-2 border-sky-200 bg-sky-50 p-3 shadow-sm md:p-4">
        <p className="text-sm font-bold text-slate-700">{message.text}</p>
        <button
          type="button"
          onClick={() => generateSummary(type)}
          disabled={isTyping}
          className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-600 px-4 text-base font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-11 md:text-sm"
        >
          {isTyping ? (
            <Loader2 size={15} className="animate-spin" />
          ) : null}
          {type === 'month' ? '生成月总结' : '生成周总结'}
        </button>
      </div>
    </div>
  )
}
