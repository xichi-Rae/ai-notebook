import { useEffect, useMemo } from 'react'
import {
  CheckCircle2,
  Circle,
  Clock,
  ListChecks,
  Play,
  Trash2,
  Workflow,
} from 'lucide-react'
import { useGame } from '../context/GameContext'
import { useGoal } from '../context/GoalContext'
import { useSop } from '../context/SopContext'
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

export default function TodayPanel() {
  const { level, exp, expToNextLevel } = useGame()
  const { goals } = useGoal()
  const {
    todos,
    toggleTodo,
    deleteTodo,
    syncGoalTodos,
  } = useTodo()
  const {
    sops,
    execution,
    triggerSop,
    nextSopStep,
  } = useSop()
  const today = getTodayKey()
  const goalTodos = useMemo(
    () => buildGoalTodos(goals, today),
    [goals, today],
  )

  useEffect(() => {
    syncGoalTodos(goalTodos)
  }, [goalTodos, syncGoalTodos])

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

                {todo.source !== 'goal' && (
                  <button
                    type="button"
                    onClick={() => deleteTodo(todo.id)}
                    aria-label="删除待办"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
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
