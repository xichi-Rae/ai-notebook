import { useEffect, useState } from 'react'
import { Save, Trash2, X } from 'lucide-react'

const REPEAT_OPTIONS = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'once', label: '不重复' },
]

function getRepeat(reminder) {
  if (!reminder) {
    return 'daily'
  }
  if (reminder.repeat) {
    return reminder.repeat
  }
  return reminder.weekdays?.length ? 'weekly' : 'daily'
}

export default function ReminderFormModal({
  open,
  reminder,
  onClose,
  onSave,
  onDelete,
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [time, setTime] = useState('08:00')
  const [repeat, setRepeat] = useState('daily')
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [enabled, setEnabled] = useState(true)
  const [deleteConfirming, setDeleteConfirming] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setTitle(reminder?.title || '')
    setContent(reminder?.content || reminder?.title || '')
    setTime(reminder?.time || '08:00')
    setRepeat(getRepeat(reminder))
    setDayOfMonth(Number(reminder?.dayOfMonth) || 1)
    setEnabled(reminder?.enabled ?? true)
    setDeleteConfirming(false)
  }, [open, reminder])

  if (!open) {
    return null
  }

  function handleSubmit(event) {
    event.preventDefault()
    const cleanContent = content.trim()
    if (!cleanContent || !time) {
      return
    }

    onSave({
      title: title.trim() || cleanContent.slice(0, 20) || '提醒',
      content: cleanContent,
      time,
      repeat,
      dayOfMonth: repeat === 'monthly' ? Number(dayOfMonth) || 1 : null,
      enabled,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-sky-600">定时提醒</p>
            <h2 className="mt-0.5 text-lg font-black text-slate-800">
              {reminder ? '编辑提醒' : '新增提醒'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭提醒表单"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700">
              提醒内容
            </label>
            <input
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="例如：查看群/官网"
              required
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base text-slate-800 outline-none focus:border-sky-400 focus:bg-white md:text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-slate-700">
                提醒时间
              </label>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base text-slate-800 outline-none focus:border-sky-400 focus:bg-white md:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700">
                重复模式
              </label>
              <select
                value={repeat}
                onChange={(event) => setRepeat(event.target.value)}
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base text-slate-800 outline-none focus:border-sky-400 focus:bg-white md:text-sm"
              >
                {REPEAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {repeat === 'weekly' && (
            <p className="rounded-xl bg-sky-50 px-3 py-2.5 text-sm text-sky-700">
              每周默认周日触发，可在后续编辑时调整。
            </p>
          )}

          {repeat === 'monthly' && (
            <div>
              <label className="block text-sm font-bold text-slate-700">
                每月几号
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(event) => setDayOfMonth(event.target.value)}
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base text-slate-800 outline-none focus:border-sky-400 focus:bg-white md:text-sm"
              />
            </div>
          )}

          <div>
            <span className="block text-sm font-bold text-slate-700">
              是否启用
            </span>
            <button
              type="button"
              onClick={() => setEnabled((value) => !value)}
              aria-label={enabled ? '停用提醒' : '启用提醒'}
              className="mt-1.5 inline-flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3"
            >
              <span
                className={`text-sm font-bold ${
                  enabled ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                {enabled ? '启用中' : '已停用'}
              </span>
              <span
                className={`inline-flex h-8 w-14 items-center rounded-full p-1 transition ${
                  enabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-slate-100 px-4 text-base font-bold text-slate-600"
            >
              取消
            </button>
            <button
              type="submit"
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-base font-bold text-white transition hover:bg-sky-700"
            >
              <Save size={16} />
              保存
            </button>
          </div>

          {reminder && !deleteConfirming && (
            <button
              type="button"
              onClick={() => setDeleteConfirming(true)}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 text-base font-bold text-rose-600 transition hover:bg-rose-100"
            >
              <Trash2 size={16} />
              删除此提醒
            </button>
          )}

          {reminder && deleteConfirming && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm font-semibold text-rose-700">
                确认删除「{reminder.title}」吗？
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onDelete(reminder.id)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-rose-600 px-3 text-sm font-bold text-white"
                >
                  确认删除
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirming(false)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-white px-3 text-sm font-bold text-slate-600"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
