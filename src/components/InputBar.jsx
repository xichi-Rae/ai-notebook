import { Mic, Plus, SendHorizontal, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useChat } from '../context/ChatContext'
import QuickRecordPanel from './QuickRecordPanel'

export default function InputBar() {
  const { draft, isTyping, sendMessage, setDraft } = useChat()
  const [isQuickRecordOpen, setIsQuickRecordOpen] = useState(false)
  const canSend = draft.trim().length > 0 && !isTyping

  function handleSubmit(event) {
    event.preventDefault()
    if (!canSend) {
      return
    }
    sendMessage(draft)
    setDraft('')
  }

  return (
    <footer className="shrink-0 border-t border-slate-200 bg-white px-2 pb-safe pt-2 md:px-4 md:py-3">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-2xl items-end gap-2"
      >
        <button
          type="button"
          onClick={() => setIsQuickRecordOpen(true)}
          aria-label="快捷记录"
          title="快捷记录"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 md:h-11 md:w-11"
        >
          <Plus size={19} />
        </button>

        <button
          type="button"
          title="语音输入功能留空"
          aria-label="语音输入（即将开放）"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 md:h-11 md:w-11"
        >
          <Mic size={19} />
        </button>

        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSubmit(event)
            }
          }}
          rows={1}
          placeholder="输入今天想推进的事..."
          className="min-h-12 max-h-28 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800 outline-none transition placeholder:text-base placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 md:min-h-11 md:text-sm md:placeholder:text-sm"
        />

        <button
          type="submit"
          disabled={!canSend}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 md:h-11 md:w-11"
        >
          <SendHorizontal size={19} />
        </button>
      </form>

      <div className="mx-auto mt-2 flex max-w-2xl items-center gap-2 px-1 text-xs text-slate-400 md:text-sm">
        <Sparkles size={13} />
        <span>
          提示：可发送“推进目标”“记账 午餐 25”“我吃了炸鸡”，执行猫会调用
          DeepSeek 并同步更新数据。
        </span>
      </div>
      <QuickRecordPanel
        open={isQuickRecordOpen}
        onClose={() => setIsQuickRecordOpen(false)}
      />
    </footer>
  )
}
