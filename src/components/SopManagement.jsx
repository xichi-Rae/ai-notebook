import { useState } from 'react'
import {
  CalendarDays,
  Clock,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  Workflow,
} from 'lucide-react'
import { useSop } from '../context/SopContext'

const TABS = [
  { id: '日', label: '日 SOP' },
  { id: '周', label: '周 SOP' },
  { id: '月', label: '月/年 SOP' },
]

function isInTrial(sop) {
  if (!sop.trial_days) {
    return false
  }
  const created = new Date(sop.created_at).getTime()
  const today = new Date()
  const days = Number.isNaN(created)
    ? 0
    : Math.max(0, Math.floor((today.getTime() - created) / 86400000))
  return days <= sop.trial_days
}

export default function SopManagement() {
  const {
    sops,
    dailyMaxMinutes,
    setDailyMaxMinutes,
    openWizard,
    updateSop,
    toggleSop,
    deleteSop,
    getLoadWarning,
  } = useSop()
  const [activeTab, setActiveTab] = useState('日')
  const [loadInput, setLoadInput] = useState(String(dailyMaxMinutes))
  const [editingSop, setEditingSop] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTime, setEditTime] = useState('')
  const loadWarning = getLoadWarning(0)

  const filteredSops =
    activeTab === '月/年 SOP'
      ? sops.filter((sop) => sop.category === '月' || sop.category === '年')
      : sops.filter((sop) => sop.category === activeTab)

  function handleSaveLoad() {
    setDailyMaxMinutes(loadInput)
  }

  function startEdit(sop) {
    setEditingSop(sop)
    setEditTitle(sop.title)
    setEditTime(sop.trigger_time)
  }

  function saveEdit(event) {
    event.preventDefault()
    if (!editingSop || !editTitle.trim() || !editTime) {
      return
    }

    updateSop(editingSop.id, {
      title: editTitle.trim(),
      trigger_time: editTime,
      trigger_times: [editTime],
    })
    setEditingSop(null)
  }

  return (
    <section className="chat-scroll h-full overflow-y-auto bg-[#e9efec] px-2 py-3 md:px-4 md:py-5">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Workflow size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-600 md:text-sm">SOP 管理</p>
            <h1 className="text-lg font-black text-slate-800 md:text-xl">
              把重复流程变成自动轨道
            </h1>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white bg-white p-3 shadow-sm">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-12 items-center justify-center rounded-xl px-2 text-sm font-bold transition md:text-base ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-600">每日最大负载</p>
              <p className="mt-0.5 text-xs text-slate-400">
                当前 {dailyMaxMinutes} 分钟为 {dailyMaxMinutes / 60} 小时，达到
                80% 时执行猫会预警。
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="30"
                value={loadInput}
                onChange={(event) => setLoadInput(event.target.value)}
                className="min-h-12 w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-base font-bold outline-none focus:border-emerald-400"
              />
              <span className="self-center text-sm font-semibold text-slate-500">
                分钟
              </span>
              <button
                type="button"
                onClick={handleSaveLoad}
                className="inline-flex min-h-12 items-center rounded-xl bg-emerald-600 px-3 text-base font-bold text-white"
              >
                保存
              </button>
            </div>
          </div>

          {loadWarning && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800">
              {loadWarning}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500 md:text-base">
            {activeTab === '日 SOP'
              ? '每日固定流程'
              : activeTab === '周 SOP'
                ? '每周固定流程'
                : '每月或每年固定流程'}
          </p>
          <button
            type="button"
            onClick={openWizard}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-bold text-white"
          >
            <Plus size={16} />
            新建 SOP
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {filteredSops.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-6 text-center">
              <p className="text-base font-bold text-slate-600">还没有这个层级的 SOP</p>
              <p className="mt-1 text-sm text-slate-400">
                点击“新建 SOP”，让执行猫帮你整理流程。
              </p>
            </div>
          )}

          {filteredSops.map((sop) => (
            <article
              key={sop.id}
              className="rounded-2xl border border-white bg-white p-3 shadow-sm md:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-slate-800">
                      {sop.title}
                    </h3>
                    {isInTrial(sop) && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                        试用 {sop.trial_days} 天
                      </span>
                    )}
                    {!sop.active && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                        已停用
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <ListChecks size={13} />
                      {sop.steps.length} 步
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {sop.trigger_times?.join('、') || sop.trigger_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays size={13} />
                      {sop.category === '日'
                        ? '每日'
                        : sop.category === '周'
                          ? '每周'
                          : sop.category === '月'
                            ? '每月'
                            : '每年'}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSop(sop.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                    sop.active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {sop.active ? '启用' : '停用'}
                </button>
              </div>

              <div className="mt-3 space-y-1.5">
                {sop.steps.map((step) => (
                  <div
                    key={step.order}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="font-bold text-emerald-700">
                      {step.order}.
                    </span>
                    <span className="flex-1 text-slate-600">{step.action}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {step.duration} 分钟
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => startEdit(sop)}
                  aria-label={`编辑 ${sop.title}`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  <Pencil size={15} />
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => deleteSop(sop.id)}
                  aria-label={`删除 ${sop.title}`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2 size={15} />
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {editingSop && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center"
          onClick={() => setEditingSop(null)}
        >
          <form
            onSubmit={saveEdit}
            className="w-full max-w-sm rounded-2xl border border-white bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-black text-slate-800">编辑 SOP</h3>
            <label className="mt-3 block text-sm font-bold text-slate-700">
              SOP 名称
            </label>
            <input
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-emerald-400"
            />
            <label className="mt-3 block text-sm font-bold text-slate-700">
              触发时间
            </label>
            <input
              type="time"
              value={editTime}
              onChange={(event) => setEditTime(event.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-emerald-400"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingSop(null)}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-slate-100 text-base font-bold text-slate-600"
              >
                取消
              </button>
              <button
                type="submit"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-emerald-600 text-base font-bold text-white"
              >
                保存
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
