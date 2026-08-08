import { Bell, Check, Hand } from 'lucide-react'
import { useReminder } from '../context/ReminderContext'

export default function ReminderCard({ message }) {
  const { markResponded, respondedIds } = useReminder()
  const isResponded = respondedIds.includes(message.reminderId)

  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-600 text-white shadow-sm md:h-8 md:w-8">
        <Bell size={16} />
      </div>

      <div className="min-w-0 flex-1 max-w-md rounded-2xl rounded-tl-md border border-sky-100 bg-white p-3 shadow-sm md:p-4">
        <p className="text-xs font-black text-sky-600 md:text-sm">提醒</p>
        <h3 className="mt-1 text-base font-bold text-slate-800 md:text-base">
          {message.title}
        </h3>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-500 md:text-base">
          {message.text || message.content}
        </p>

        <button
          type="button"
          onClick={() => markResponded(message.reminderId)}
          disabled={isResponded}
          className={`mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl px-3.5 text-base font-bold transition md:min-h-11 md:text-sm ${
            isResponded
              ? 'bg-slate-100 text-slate-500'
              : 'bg-sky-600 text-white shadow-sm hover:bg-sky-700'
          }`}
        >
          {isResponded ? <Check size={14} /> : <Hand size={14} />}
          {isResponded ? '已打卡' : '提醒打卡'}
        </button>
      </div>
    </div>
  )
}
