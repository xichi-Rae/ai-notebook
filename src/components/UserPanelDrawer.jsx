import { useRef, useState } from 'react'
import { Bell, Download, Save, Sparkles, Trash2, X } from 'lucide-react'
import { useReminder } from '../context/ReminderContext'
import NotificationPermissionCard from './NotificationPermissionCard'

const STYLE_KEY = 'executive-coach-style-learning'

function readStylePreferences() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STYLE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.join('\n') : ''
  } catch {
    return ''
  }
}

export default function UserPanelDrawer({ open, onClose }) {
  const { reminders, toggleReminder, deleteReminder } = useReminder()
  const [styleDraft, setStyleDraft] = useState(readStylePreferences)
  const [saved, setSaved] = useState(false)
  const touchStartXRef = useRef(null)

  function handleSaveStyle() {
    const styles = styleDraft
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)

    try {
      window.localStorage.setItem(STYLE_KEY, JSON.stringify(styles))
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    } catch {
      // Local storage can be unavailable in strict privacy modes.
    }
  }

  function handleExport() {
    const data = {}
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith('executive-coach-')) {
        data[key] = window.localStorage.getItem(key)
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'executive-coach-data.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleTouchStart(event) {
    touchStartXRef.current = event.touches[0].clientX
  }

  function handleTouchEnd(event) {
    const startX = touchStartXRef.current
    const endX = event.changedTouches[0].clientX
    if (startX != null && startX - endX > 60) {
      onClose()
    }
    touchStartXRef.current = null
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed bottom-0 left-0 top-0 z-50 w-[80%] max-w-sm overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-bold text-emerald-600">用户面板</p>
            <h2 className="mt-0.5 text-lg font-black text-slate-800">我的设置</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭用户面板"
            className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <section className="rounded-2xl bg-slate-50 p-3">
            <NotificationPermissionCard />
          </section>

          <section>
            <p className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Sparkles size={16} className="text-amber-500" />
              AI 风格偏好
            </p>
            <textarea
              value={styleDraft}
              onChange={(event) => setStyleDraft(event.target.value)}
              rows={4}
              placeholder={"每行一条偏好，例如：\n回复短一点\n不要用 AI 腔"}
              className="mt-2 min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base leading-6 outline-none focus:border-emerald-400 focus:bg-white"
            />
            <button
              type="button"
              onClick={handleSaveStyle}
              className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-bold text-white"
            >
              <Save size={15} />
              {saved ? '已保存' : '保存风格偏好'}
            </button>
          </section>

          <section>
            <p className="text-base font-bold text-slate-800">数据导出</p>
            <p className="mt-1 text-sm text-slate-500">
              导出本地保存的提醒、SOP、用户名等数据。
            </p>
            <button
              type="button"
              onClick={handleExport}
              className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-100 px-4 text-base font-bold text-slate-600"
            >
              <Download size={15} />
              导出 JSON
            </button>
          </section>

          <section>
            <p className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Bell size={16} className="text-sky-600" />
              我的提醒
            </p>

            <div className="mt-2 space-y-2">
              {reminders.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-400">
                  还没有提醒。
                </p>
              )}

              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-700">
                        {reminder.title}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-400">
                        {reminder.weekdays?.length ? '每周日' : '每天'}{' '}
                        {reminder.time}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleReminder(reminder.id)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                        reminder.enabled
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {reminder.enabled ? '启用' : '停用'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteReminder(reminder.id)}
                    aria-label={`删除 ${reminder.title}`}
                    className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-rose-600"
                  >
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  )
}
