import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useReminder } from '../context/ReminderContext'
import { useGoal } from '../context/GoalContext'
import { useRecord } from '../context/RecordContext'
import { useTodo } from '../context/TodoContext'
import NotificationPermissionCard from './NotificationPermissionCard'
import ReminderFormModal from './ReminderFormModal'

const STYLE_KEY = 'executive-coach-style-learning'

function readStylePreferences() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STYLE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.join('\n') : ''
  } catch {
    return ''
  }
}

function getRepeatLabel(reminder) {
  if (reminder.repeat === 'weekly') {
    return '每周日'
  }
  if (reminder.repeat === 'monthly') {
    return `每月${reminder.dayOfMonth || 1}日`
  }
  if (reminder.repeat === 'once') {
    return '不重复'
  }
  return '每天'
}

export default function UserPanelDrawer({ open, onClose }) {
  const {
    reminders,
    addReminder,
    updateReminder,
    toggleReminder,
    deleteReminder,
  } = useReminder()
  const { syncGoals } = useGoal()
  const { syncRecords } = useRecord()
  const { syncTodos } = useTodo()
  const [styleDraft, setStyleDraft] = useState(readStylePreferences)
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState(null)
  const touchStartXRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setReminderModalOpen(false)
      setEditingReminder(null)
    }
  }, [open])

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

  async function handleManualSync() {
    if (syncing) {
      return
    }

    setSyncing(true)
    try {
      await Promise.all([syncGoals(), syncTodos(), syncRecords()])
      window.setTimeout(() => setSyncing(false), 600)
    } catch {
      setSyncing(false)
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

  const sortedReminders = [...reminders].sort((a, b) =>
    a.time.localeCompare(b.time),
  )

  function openAddReminder() {
    setEditingReminder(null)
    setReminderModalOpen(true)
  }

  function openEditReminder(reminder) {
    setEditingReminder(reminder)
    setReminderModalOpen(true)
  }

  function closeReminderModal() {
    setReminderModalOpen(false)
    setEditingReminder(null)
  }

  function handleSaveReminder(payload) {
    if (editingReminder) {
      updateReminder(editingReminder.id, payload)
    } else {
      addReminder(payload)
    }
    closeReminderModal()
  }

  function handleDeleteReminder(id) {
    deleteReminder(id)
    closeReminderModal()
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
              onClick={handleManualSync}
              disabled={syncing}
              className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-600 px-4 text-base font-bold text-white disabled:opacity-60"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              {syncing ? '正在同步...' : '手动同步'}
            </button>
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
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-base font-bold text-slate-800">
                <Bell size={16} className="text-sky-600" />
                我的提醒
              </p>
              <button
                type="button"
                onClick={openAddReminder}
                className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-sky-600 px-3 text-sm font-bold text-white transition hover:bg-sky-700"
              >
                <Plus size={15} />
                新增
              </button>
            </div>

            <div className="mt-2 space-y-2">
              {sortedReminders.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-400">
                  还没有提醒。
                </p>
              )}

              {sortedReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-700">
                        {reminder.title}
                      </p>
                      {reminder.content &&
                        reminder.content !== reminder.title && (
                          <p className="mt-0.5 text-sm text-slate-500">
                            {reminder.content}
                          </p>
                        )}
                      <p className="mt-0.5 text-sm text-slate-400">
                        {getRepeatLabel(reminder)} {reminder.time}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditReminder(reminder)}
                        aria-label={`编辑 ${reminder.title}`}
                        className="grid h-11 w-11 place-items-center rounded-full text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
                      >
                        <Pencil size={16} />
                      </button>
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

      <ReminderFormModal
        open={reminderModalOpen}
        reminder={editingReminder}
        onClose={closeReminderModal}
        onSave={handleSaveReminder}
        onDelete={handleDeleteReminder}
      />
    </>
  )
}
