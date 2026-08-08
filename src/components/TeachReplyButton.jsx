import { useState } from 'react'
import { MessageSquarePlus, RotateCcw, X } from 'lucide-react'
import { useChat } from '../context/ChatContext'

export default function TeachReplyButton() {
  const { teachStyle } = useChat()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const instruction = draft.trim()
    if (!instruction) {
      return
    }

    teachStyle(instruction)
    setOpen(false)
    setDraft('')
  }

  return (
    <div className="ml-10 mt-1">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 text-base font-semibold text-slate-500 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 md:px-2.5 md:text-sm"
        >
          <MessageSquarePlus size={12} />
          不满意？教我说
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm"
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            placeholder="告诉我你希望它怎么回复..."
            className="min-h-12 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base leading-5 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white md:text-sm"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-base font-bold text-white transition hover:bg-emerald-700 md:min-h-0 md:py-1.5 md:text-sm"
            >
              <RotateCcw size={13} />
              保存并重写
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setDraft('')
              }}
              aria-label="取消"
              className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 md:h-8 md:w-8"
            >
              <X size={14} />
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
