import { useState } from 'react'
import {
  Bell,
  BellPlus,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserRound,
  Workflow,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useReminder } from '../context/ReminderContext'
import NotificationPermissionCard from './NotificationPermissionCard'

const PRESETS = [
  {
    title: '晨间启动',
    content: '开始今天的第一格行动',
    time: '08:00',
    weekdays: [],
  },
  {
    title: '查看群/官网',
    content: '有什么需要处理的吗？',
    time: '12:00',
    weekdays: [],
  },
  {
    title: '晚间复盘',
    content: '把今天写成一段冒险故事',
    time: '21:00',
    weekdays: [],
  },
  {
    title: '周日大扫除',
    content: '清理待办、文件和生活空间',
    time: '19:00',
    weekdays: [0],
  },
]

function formatSchedule(reminder) {
  const weekday = reminder.weekdays?.length ? '每周日' : '每天'
  return `${weekday} ${reminder.time}`
}

export default function ReminderSettings() {
  const { username, setUsername, setActiveView } = useApp()
  const {
    reminders,
    responseCount,
    addReminder,
    updateReminder,
    toggleReminder,
    deleteReminder,
  } = useReminder()
  const [title, setTitle] = useState('')
  const [profileName, setProfileName] = useState(username)
  const [profileSaved, setProfileSaved] = useState(false)
  const [content, setContent] = useState('')
  const [time, setTime] = useState('08:00')
  const [repeat, setRepeat] = useState('daily')
  const [editingId, setEditingId] = useState(null)

  function resetForm() {
    setTitle('')
    setContent('')
    setTime('08:00')
    setRepeat('daily')
    setEditingId(null)
  }

  function handleSubmit(event) {
    event.preventDefault()
    const payload = {
      title,
      content,
      time,
      weekdays: repeat === 'sunday' ? [0] : [],
    }

    if (editingId) {
      updateReminder(editingId, payload)
    } else {
      addReminder(payload)
    }

    resetForm()
  }

  function startEdit(reminder) {
    setTitle(reminder.title)
    setContent(reminder.content || '')
    setTime(reminder.time)
    setRepeat(reminder.weekdays?.includes(0) ? 'sunday' : 'daily')
    setEditingId(reminder.id)
  }

  function addPreset(preset) {
    addReminder(preset)
  }

  function handleProfileSave(event) {
    event.preventDefault()
    setUsername(profileName)
    setProfileSaved(true)
    window.setTimeout(() => setProfileSaved(false), 2000)
  }

  return (
    <section className="chat-scroll h-full overflow-y-auto bg-[#e9efec] px-2 py-3 md:px-4 md:py-5">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-600 text-white shadow-sm">
            <Bell size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-sky-700 md:text-sm">定时提醒</p>
            <h1 className="text-lg font-black text-slate-800 md:text-xl">
              每天准时叫你回来行动
            </h1>
          </div>
        </div>

        <section className="mt-3 rounded-2xl border border-white bg-white p-3 shadow-sm md:mt-4 md:p-4">
          <div className="flex items-center gap-2">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <UserRound size={20} />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">个人资料</p>
              <p className="mt-0.5 text-sm text-slate-400 md:text-base">
                当前用户名：{username}
              </p>
            </div>
          </div>

          <form
            onSubmit={handleProfileSave}
            className="mt-3 flex flex-col gap-2 sm:flex-row"
          >
            <input
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder="输入新的用户名"
              maxLength={20}
              className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-emerald-400 focus:bg-white md:min-h-11 md:text-sm"
            />
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-bold text-white transition hover:bg-emerald-700 md:min-h-11 md:text-sm"
            >
              <Save size={15} />
              保存用户名
            </button>
          </form>

          {profileSaved && (
            <p className="mt-2 text-sm font-semibold text-emerald-700">
              用户名已保存到本地。
            </p>
          )}
        </section>

        <section className="mt-3 rounded-2xl border border-white bg-white p-3 shadow-sm md:p-4">
          <button
            type="button"
            onClick={() => setActiveView('sops')}
            className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-emerald-50 p-3 text-left transition hover:bg-emerald-100"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
              <Workflow size={20} />
            </span>
            <span>
              <span className="block text-base font-bold text-slate-800">
                我的 SOP
              </span>
              <span className="mt-0.5 block text-sm text-slate-500">
                管理日、周、月/年固定流程
              </span>
            </span>
          </button>
        </section>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 md:mt-4">
          <section className="rounded-2xl border border-white bg-white p-3 shadow-sm md:p-4">
            <NotificationPermissionCard />
          </section>

          <section className="rounded-2xl border border-white bg-white p-3 shadow-sm md:p-4">
            <p className="text-base font-bold text-slate-800">提醒打卡</p>
            <p className="mt-1 text-sm text-slate-500 md:text-base">
              已连续响应 {responseCount} 次，满 3 次解锁“应声虫”成就。
            </p>
          </section>
        </div>

        <section className="mt-3 rounded-2xl border border-white bg-white p-3 shadow-sm md:mt-4 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-slate-800">
                {editingId ? '编辑提醒' : '添加提醒'}
              </p>
              <p className="mt-0.5 text-sm text-slate-400 md:text-base">
                精确到分钟，应用打开时也会触发。
              </p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex min-h-11 items-center rounded-xl bg-slate-100 px-3 text-base font-semibold text-slate-500 md:min-h-0 md:py-1.5 md:text-sm"
              >
                取消编辑
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="提醒名称"
              className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-sky-400 md:min-h-11 md:text-sm"
            />
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-sky-400 md:min-h-11 md:text-sm"
            />
            <input
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="提醒内容"
              className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-sky-400 md:min-h-11 md:text-sm"
            />
            <select
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
              className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-sky-400 md:min-h-11 md:text-sm"
            >
              <option value="daily">每天</option>
              <option value="sunday">每周日</option>
            </select>
            <button
              type="submit"
              className="sm:col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-base font-bold text-white transition hover:bg-sky-700 md:min-h-11 md:text-sm"
            >
              <Plus size={16} />
              {editingId ? '保存修改' : '添加提醒'}
            </button>
          </form>
        </section>

        <section className="mt-4">
          <p className="mb-2 text-base font-bold text-slate-700">预设模板</p>
          <div className="grid gap-2 sm:grid-cols-2 md:gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => addPreset(preset)}
                className="flex min-h-14 items-center justify-between rounded-2xl border border-white bg-white p-3 text-left shadow-sm transition hover:border-sky-300"
              >
                <span>
                  <span className="block text-base font-bold text-slate-800">
                    {preset.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-400 md:text-base">
                    {preset.weekdays?.length ? '每周日' : '每天'} {preset.time}
                  </span>
                </span>
                <BellPlus size={16} className="text-sky-600" />
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 space-y-3">
          <p className="text-base font-bold text-slate-700">我的提醒</p>
          {reminders.map((reminder) => (
            <article
              key={reminder.id}
              className="rounded-2xl border border-white bg-white p-3 shadow-sm md:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-800">
                    {reminder.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 md:text-base">
                    {reminder.content || '没有额外内容'}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-sky-700 md:text-base">
                    {formatSchedule(reminder)}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={reminder.enabled}
                  onChange={() => toggleReminder(reminder.id)}
                  className="h-5 w-5 accent-sky-600"
                  aria-label={`启用或停用 ${reminder.title}`}
                />
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(reminder)}
                  className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-base font-semibold text-slate-600 transition hover:bg-slate-200 md:min-h-11 md:text-sm"
                >
                  <Pencil size={13} />
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => deleteReminder(reminder.id)}
                  className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-rose-50 px-3 text-base font-semibold text-rose-600 transition hover:bg-rose-100 md:min-h-11 md:text-sm"
                >
                  <Trash2 size={13} />
                  删除
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  )
}
