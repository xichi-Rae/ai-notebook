import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Image,
  ListChecks,
  Loader2,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Workflow,
  X,
} from 'lucide-react'
import { useChat } from '../context/ChatContext'
import { useGame } from '../context/GameContext'
import { useGoal } from '../context/GoalContext'
import { useRecord } from '../context/RecordContext'
import { useSop } from '../context/SopContext'
import { useTodo } from '../context/TodoContext'
import {
  exportSummaryAsImage,
  exportSummaryAsText,
  generateSummary,
  getDailySummaryData,
  readStoredSummary,
  saveStoredSummary,
} from '../services/AISummaryService'

function getTodayKey() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function buildGoalTodos(goals, today) {
  const goalTodos = []

  goals.forEach((goal) => {
    if (goal.progress >= 100) {
      return
    }

    goal.plan?.phases?.forEach((phase) => {
      phase?.weeks?.forEach((week) => {
        week?.tasks?.forEach((task) => {
          if (task.date !== today) {
            return
          }

          goalTodos.push({
            title: task.action || `${phase.title || '目标'}行动`,
            source: 'goal',
            completed: Boolean(task.completed),
            goalTaskId: task.id,
            goalId: goal.id,
            goalTitle: goal.title,
            phaseTitle: phase.title,
            week: week.week,
            day: task.day,
            estMinutes: task.estMinutes,
            date: task.date,
            createdAt: new Date().toISOString(),
          })
        })
      })
    })
  })

  return goalTodos
}

const TIME_OPTIONS = [
  { value: '', label: '不设定' },
  { value: '15', label: '15 分钟' },
  { value: '30', label: '30 分钟' },
  { value: '60', label: '1 小时' },
]

export default function TodayPanel() {
  const chat = useChat()
  const { level, exp, expToNextLevel } = useGame()
  const { records } = useRecord()
  const { goals } = useGoal()
  const {
    todos,
    isLoading,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    syncGoalTodos,
  } = useTodo()
  const {
    sops,
    execution,
    triggerSop,
    nextSopStep,
  } = useSop()
  const today = getTodayKey()
  const [manualDraft, setManualDraft] = useState('')
  const [manualMinutes, setManualMinutes] = useState('')
  const [editingTodoId, setEditingTodoId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [editMinutes, setEditMinutes] = useState('')
  const [summary, setSummary] = useState(() =>
    readStoredSummary('day', today),
  )
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const summaryRef = useRef(null)
  const goalTodos = useMemo(
    () => buildGoalTodos(goals, today),
    [goals, today],
  )

  useEffect(() => {
    syncGoalTodos(goalTodos)
  }, [goalTodos, syncGoalTodos])

  function handleAddManualTodo(event) {
    event.preventDefault()
    if (isLoading) {
      return
    }

    const title = manualDraft.trim()
    if (!title) {
      return
    }

    const estMinutes = manualMinutes ? Number(manualMinutes) : null
    addTodo({
      title,
      source: 'manual',
      estMinutes,
      targetDate: today,
    })

    chat.addSystemMessage(
      `📋 用户刚刚在今日待办中手动添加了任务：「${title}」${
        estMinutes ? `，预估时长 ${estMinutes} 分钟` : ''
      }`,
      { type: 'system-notice' },
    )

    setManualDraft('')
    setManualMinutes('')
  }

  function startEdit(todoItem) {
    setEditingTodoId(todoItem.id)
    setEditDraft(todoItem.title)
    setEditMinutes(todoItem.estMinutes ? String(todoItem.estMinutes) : '')
  }

  function saveEdit(todoId) {
    const title = editDraft.trim()
    if (!title) {
      return
    }

    updateTodo(todoId, {
      title,
      estMinutes: editMinutes ? Number(editMinutes) : null,
      targetDate: today,
    })
    setEditingTodoId(null)
    setEditDraft('')
    setEditMinutes('')
  }

  function cancelEdit() {
    setEditingTodoId(null)
    setEditDraft('')
    setEditMinutes('')
  }

  async function handleGenerateSummary() {
    if (summaryLoading) {
      return
    }

    if (summary) {
      summaryRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      return
    }

    setSummaryLoading(true)
    setSummaryError('')
    try {
      const data = getDailySummaryData(today, records, todos)
      const generatedSummary = await generateSummary('day', data)
      setSummary(generatedSummary)
      saveStoredSummary('day', today, generatedSummary)
    } catch (error) {
      setSummaryError(error.message || '总结生成失败，请稍后重试')
    } finally {
      setSummaryLoading(false)
    }
  }

  async function handleExportImage() {
    if (summary && summaryRef.current) {
      await exportSummaryAsImage('today-summary-card', `今日总结-${today}`)
    }
  }

  function handleExportText() {
    if (summary) {
      exportSummaryAsText(summary, `今日总结-${today}.txt`)
    }
  }

  const completedCount = todos.filter((todo) => todo.completed).length
  const totalCount = todos.length
  const progress = totalCount
    ? Math.round((completedCount / totalCount) * 100)
    : 0
  const todaySops = sops.filter((sop) => sop.category === '日' && sop.active)

  return (
    <section className="chat-scroll h-full overflow-y-auto bg-[#e9efec] px-2 py-3 md:px-4 md:py-5">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-600">今日</p>
              <h1 className="mt-1 text-lg font-black text-slate-800 md:text-xl">
                {new Date().toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </h1>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-600">
                Lv.{level} · {exp}/{expToNextLevel} XP
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                今日完成 {completedCount}/{totalCount}
              </p>
              {isLoading && (
                <p className="mt-1 text-xs font-semibold text-emerald-600">
                  正在同步任务...
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <section className="mt-4 rounded-2xl border border-white bg-white p-3 shadow-sm md:p-4">
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-slate-800">今日待办</p>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-700">
              {totalCount - completedCount} 项待办
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <p className="text-sm font-bold text-emerald-800">手动添加的任务</p>
            <form
              onSubmit={handleAddManualTodo}
              className="mt-2 grid gap-2 md:grid-cols-[1fr_10rem_auto]"
            >
              <input
                value={manualDraft}
                onChange={(event) => setManualDraft(event.target.value)}
                placeholder="写一个新任务，回车添加"
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-800 outline-none focus:border-emerald-400 md:min-h-11 md:text-sm"
              />
              <select
                value={manualMinutes}
                onChange={(event) => setManualMinutes(event.target.value)}
                aria-label="预估时间"
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-700 outline-none focus:border-emerald-400 md:min-h-11 md:text-sm"
              >
                {TIME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!manualDraft.trim() || isLoading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-11 md:text-sm"
              >
                <Plus size={16} />
                添加
              </button>
            </form>
          </div>

          <div className="mt-3 space-y-2">
            {todos.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-400">
                今天还没有待办。
              </p>
            )}

            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`flex items-center gap-2 rounded-xl border p-2 ${
                  todo.completed
                    ? 'border-emerald-100 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleTodo(todo.id)}
                  disabled={isLoading}
                  aria-label={todo.completed ? '标记为未完成' : '标记为完成'}
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                    todo.completed
                      ? 'text-emerald-600'
                      : 'text-slate-400 hover:text-emerald-600'
                  } disabled:opacity-50`}
                >
                  {todo.completed ? (
                    <CheckCircle2 size={21} />
                  ) : (
                    <Circle size={21} />
                  )}
                </button>

                {editingTodoId === todo.id ? (
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      placeholder="任务描述"
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-800 outline-none focus:border-emerald-400 md:text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={editMinutes}
                        onChange={(event) => setEditMinutes(event.target.value)}
                        aria-label="编辑预估时间"
                        className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-700 outline-none focus:border-emerald-400 md:text-sm"
                      >
                        {TIME_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(todo.id)}
                          disabled={isLoading}
                          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white"
                        >
                          <Check size={15} />
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-slate-200 px-3 text-sm font-bold text-slate-600"
                        >
                          <X size={15} />
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-base font-semibold ${
                        todo.completed
                          ? 'text-slate-400 line-through'
                          : 'text-slate-700'
                      }`}
                    >
                      {todo.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {todo.source === 'goal'
                        ? `来自目标：${todo.goalTitle}`
                        : todo.source === 'sop'
                          ? `来自 SOP：${todo.sopTitle}`
                          : todo.source === 'ai'
                            ? '由执行猫生成'
                            : '手动添加'}
                      {todo.estMinutes ? ` · ${todo.estMinutes} 分钟` : ''}
                    </p>
                  </div>
                )}

                {todo.source !== 'goal' && editingTodoId !== todo.id && (
                  <button
                    type="button"
                    onClick={() => startEdit(todo)}
                    disabled={isLoading}
                    aria-label="编辑待办"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-sky-600 disabled:opacity-50"
                  >
                    <Pencil size={16} />
                  </button>
                )}

                {todo.source !== 'goal' && (
                  <button
                    type="button"
                    onClick={() => deleteTodo(todo.id)}
                    disabled={isLoading}
                    aria-label="删除待办"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm md:p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-base font-bold text-violet-700">
                <Sparkles size={16} />
                今日总结
              </p>
              <p className="mt-0.5 text-sm text-slate-400">{today}</p>
            </div>

            {summary && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExportImage}
                  aria-label="导出今日总结图片"
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-violet-50 px-3 text-sm font-bold text-violet-700"
                >
                  <Image size={15} />
                  图片
                </button>
                <button
                  type="button"
                  onClick={handleExportText}
                  aria-label="导出今日总结文档"
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-sky-50 px-3 text-sm font-bold text-sky-700"
                >
                  <FileText size={15} />
                  文档
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-base font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-11 md:text-sm"
          >
            {summaryLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                正在生成今日总结...
              </>
            ) : summary ? (
              '📋 查看今日总结'
            ) : (
              '✨ 生成今日总结'
            )}
          </button>

          {summaryError && (
            <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
              {summaryError}
            </p>
          )}

          {summary && (
            <div
              ref={summaryRef}
              id="today-summary-card"
              className="mt-3 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-4"
            >
              <p className="text-xs font-bold text-violet-500">AI 今日复盘</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-base leading-7 text-slate-700">
                {summary}
              </p>
            </div>
          )}
        </section>

        <section className="mt-4 space-y-3">
          <p className="text-base font-bold text-slate-700">今日 SOP</p>

          {todaySops.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-center">
              <p className="text-sm text-slate-400">今天没有排期的 SOP</p>
            </div>
          )}

          {todaySops.map((sop) => {
            const currentExecution = execution[sop.id]
            const isDone = currentExecution?.completed

            return (
              <article
                key={sop.id}
                className="rounded-2xl border border-white bg-white p-3 shadow-sm md:p-4"
              >
                <div className="flex items-center gap-2">
                  <Workflow size={17} className="text-emerald-600" />
                  <h3 className="min-w-0 flex-1 text-base font-black text-slate-800">
                    {sop.title}
                  </h3>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={13} />
                    {sop.trigger_time}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  {sop.steps.map((step, index) => {
                    const completed = currentExecution?.completedSteps?.includes(index)
                    const current =
                      currentExecution &&
                      !isDone &&
                      index === currentExecution.currentStep

                    return (
                      <div
                        key={step.order}
                        className={`flex items-center gap-2 rounded-lg border p-2 ${
                          current
                            ? 'border-emerald-300 bg-emerald-50'
                            : completed
                              ? 'border-slate-100 bg-slate-50 opacity-60'
                              : 'border-slate-200 bg-white'
                        }`}
                      >
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                            completed
                              ? 'bg-emerald-500 text-white'
                              : current
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {completed ? <CheckCircle2 size={13} /> : step.order}
                        </span>
                        <p
                          className={`min-w-0 flex-1 text-sm ${
                            completed
                              ? 'text-slate-400 line-through'
                              : 'text-slate-700'
                          }`}
                        >
                          {step.action}
                        </p>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <ListChecks size={12} />
                          {step.duration} 分
                        </span>
                      </div>
                    )
                  })}
                </div>

                {isDone ? (
                  <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-center text-sm font-bold text-emerald-700">
                    🎉 今日 SOP 已完成
                  </p>
                ) : currentExecution ? (
                  <button
                    type="button"
                    onClick={() => nextSopStep(sop.id)}
                    className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-bold text-white"
                  >
                    下一步
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => triggerSop(sop.id)}
                    className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 text-base font-bold text-white"
                  >
                    <Play size={15} />
                    开始执行
                  </button>
                )}
              </article>
            )
          })}
        </section>
      </div>
    </section>
  )
}
