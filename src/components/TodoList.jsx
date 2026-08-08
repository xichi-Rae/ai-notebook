import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Circle,
  ListTodo,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useGoal } from '../context/GoalContext'
import { useTodo } from '../context/TodoContext'

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
            goalTaskId:
              task.id ||
              `${goal.id}-${phase.id}-${week.id}-${week.week}-${task.day}`,
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

function SourceBadge({ source }) {
  if (source === 'goal') {
    return (
      <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">
        目标
      </span>
    )
  }

  if (source === 'ai') {
    return (
      <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
        AI
      </span>
    )
  }

  if (source === 'sop') {
    return (
      <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
        SOP
      </span>
    )
  }

  return (
    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
      手动
    </span>
  )
}

export default function TodoList() {
  const { goals, markGoalTask } = useGoal()
  const {
    todos,
    isLoading,
    addTodo,
    toggleTodo,
    deleteTodo,
    syncGoalTodos,
    markTodoReminded,
  } = useTodo()
  const [draft, setDraft] = useState('')
  const today = getTodayKey()

  const goalTodos = useMemo(
    () => buildGoalTodos(goals, today),
    [goals, today],
  )

  useEffect(() => {
    syncGoalTodos(goalTodos)
  }, [goalTodos, syncGoalTodos])

  const goalItems = todos.filter(
    (todo) => todo.source === 'goal' && !todo.completed,
  )
  const manualItems = todos.filter((todo) => todo.source !== 'goal')
  const totalTodos = todos.length
  const completedTodos = todos.filter((todo) => todo.completed).length
  const progressPercent = totalTodos
    ? Math.round((completedTodos / totalTodos) * 100)
    : 0

  useEffect(() => {
    const staleTodos = todos.filter((todo) => {
      if (todo.completed || todo.remindedForMissed || !todo.createdAt) {
        return false
      }

      const createdTime = new Date(todo.createdAt).getTime()
      if (Number.isNaN(createdTime)) {
        return false
      }

      return Date.now() - createdTime >= 2 * 86400000
    })

    staleTodos.forEach((todo) => {
      markTodoReminded(todo.id)
      window.dispatchEvent(
        new CustomEvent('todo:stale', {
          detail: todo,
        }),
      )
    })
  }, [todos, markTodoReminded])

  function handleAddTodo(event) {
    event.preventDefault()
    if (isLoading) {
      return
    }

    const title = draft.trim()
    if (!title) {
      return
    }

    addTodo({ title, source: 'manual' })
    setDraft('')
  }

  function handleToggle(todo) {
    if (isLoading) {
      return
    }

    toggleTodo(todo.id)
    if (todo.source === 'goal' && todo.goalTaskId) {
      markGoalTask(todo.goalId, todo.goalTaskId, !todo.completed)
    }
  }

  return (
    <section className="chat-scroll h-full overflow-y-auto bg-[#e9efec] px-2 py-3 md:px-4 md:py-5">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <ListTodo size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-600 md:text-sm">今日待办</p>
            <h1 className="text-lg font-black text-slate-800 md:text-xl">
              今天只处理今天该推进的事
            </h1>
          </div>
        </div>

        <section className="mt-4 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-bold text-slate-800">
                {new Date().toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
              <p className="mt-0.5 text-sm text-slate-400 md:text-base">
                已完成 {completedTodos} / {totalTodos}
              </p>
            </div>
            <span className="text-2xl font-black text-emerald-700">
              {progressPercent}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-sky-100 bg-white p-3 shadow-sm md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-bold text-slate-800">来自目标</p>
              <p className="mt-0.5 text-sm text-slate-400 md:text-base">
                自动从目标地图的今日阶段提取。
              </p>
            </div>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sm font-bold text-sky-700">
              {goalItems.length} 项待办
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {goalItems.length === 0 && (
              <p className="rounded-xl border border-dashed border-sky-200 bg-sky-50 px-3 py-4 text-center text-sm text-slate-400">
                今天还没有来自目标地图的任务。
              </p>
            )}

            {goalItems.map((todo) => (
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
                  onClick={() => handleToggle(todo)}
                  aria-label={todo.completed ? '标记为未完成' : '标记为完成'}
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                    todo.completed
                      ? 'text-emerald-600'
                      : 'text-slate-400 hover:text-emerald-600'
                  }`}
                >
                  {todo.completed ? (
                    <CheckCircle2 size={21} />
                  ) : (
                    <Circle size={21} />
                  )}
                </button>

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
                  <p className="mt-0.5 text-xs text-slate-400 md:text-sm">
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 font-bold text-sky-700">
                      {todo.goalTitle}
                    </span>
                    <span className="ml-1">
                      {todo.phaseTitle} · 第 {todo.week} 周 · 第 {todo.day} 天 ·{' '}
                      {todo.estMinutes || 0} 分钟
                    </span>
                  </p>
                </div>

                <SourceBadge source={todo.source} />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-bold text-slate-800">手动添加</p>
              <p className="mt-0.5 text-sm text-slate-400 md:text-base">
                自己输入，或让聊天里的执行猫生成 Todo。
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-700">
              {manualItems.filter((todo) => !todo.completed).length} 项待办
            </span>
          </div>

          <form onSubmit={handleAddTodo} className="mt-3 flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="添加一个手动待办..."
              className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-emerald-400 focus:bg-white md:min-h-11 md:text-sm"
            />
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                disabled={!draft.trim() || isLoading}
              >
              <Plus size={16} />
              添加
            </button>
          </form>

          <div className="mt-3 space-y-2">
            {manualItems.length === 0 && (
              <p className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50 px-3 py-4 text-center text-sm text-slate-400">
                还没有手动待办，可以先添加一条。
              </p>
            )}

            {manualItems.map((todo) => (
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
                    onClick={() => handleToggle(todo)}
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
                  <p className="mt-0.5 text-xs text-slate-400 md:text-sm">
                    {todo.source === 'ai'
                      ? '由执行猫生成'
                      : todo.source === 'sop'
                        ? `来自 ${todo.sopTitle || 'SOP'}`
                        : '手动添加'}{' '}
                    ·{' '}
                    {new Date(todo.createdAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <SourceBadge source={todo.source} />

                <button
                  type="button"
                  onClick={() => deleteTodo(todo.id)}
                  disabled={isLoading}
                  aria-label="删除待办"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 md:text-base">
          <p className="flex items-center gap-2 font-bold">
            <Sparkles size={15} />
            完成奖励
          </p>
          <p className="mt-1">
            勾选任意待办会获得 +10 XP；目标任务会保留在目标地图中继续计算进度。
          </p>
        </div>
      </div>
    </section>
  )
}
