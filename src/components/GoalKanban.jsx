import { useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useGame } from '../context/GameContext'
import { useGoal } from '../context/GoalContext'
import { useTodo } from '../context/TodoContext'

function taskCounts(tasks = []) {
  const completed = tasks.filter((task) => task.completed).length
  return {
    completed,
    total: tasks.length,
    percent: tasks.length
      ? Math.round((completed / tasks.length) * 100)
      : 0,
  }
}

function getTodayKey() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function getPlanCounts(goal) {
  const tasks = goal?.plan?.phases?.flatMap((phase) =>
    (phase.weeks || []).flatMap((week) => week.tasks || []),
  )

  return taskCounts(tasks)
}

function ProgressRing({ percent }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percent / 100)

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="8"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-xl font-black text-emerald-700">{percent}%</span>
      </div>
    </div>
  )
}

function ProgressBar({ percent }) {
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export default function GoalKanban({ goalId }) {
  const {
    goals,
    markGoalTask,
    updatePhaseTitle,
    deletePhase,
    addTaskToWeek,
    updateTask,
    deleteTask,
    moveTask,
  } = useGoal()
  const { todos, isLoading, setTodoCompleted } = useTodo()
  const game = useGame()
  const goal = goals.find((item) => item.id === goalId)

  const [expandedWeekIds, setExpandedWeekIds] = useState(() => {
    const initial = new Set()
    const today = getTodayKey()

    goal?.plan?.phases?.forEach((phase) => {
      const weeks = phase.weeks || []
      const currentWeek =
        weeks.find((week) =>
          (week.tasks || []).some((task) => task.date === today),
        ) || weeks[0]

      if (currentWeek) {
        initial.add(currentWeek.id)
      }
    })
    return initial
  })
  const [addDraft, setAddDraft] = useState(null)
  const [editTaskDraft, setEditTaskDraft] = useState(null)
  const [editPhaseId, setEditPhaseId] = useState(null)
  const [phaseTitleDraft, setPhaseTitleDraft] = useState('')

  if (!goal) {
    return <p className="py-8 text-center text-slate-500">目标不存在。</p>
  }

  const planCounts = getPlanCounts(goal)
  const phases = goal.plan?.phases || []

  function toggleWeek(weekId) {
    setExpandedWeekIds((current) => {
      const next = new Set(current)
      if (next.has(weekId)) {
        next.delete(weekId)
      } else {
        next.add(weekId)
      }
      return next
    })
  }

  function handleToggleTask(task) {
    if (isLoading) {
      return
    }

    const nextCompleted = !task.completed
    if (nextCompleted) {
      game.addExp(10)
    }

    markGoalTask(goal.id, task.id, nextCompleted)
    const linkedTodo = todos.find((todo) => todo.goalTaskId === task.id)
    if (linkedTodo) {
      setTodoCompleted(linkedTodo.id, nextCompleted)
    }
  }

  function openAddTask(phaseId, weekId, location = 'week') {
    setAddDraft({
      phaseId,
      weekId,
      location,
      action: '',
      date: '',
      estMinutes: 30,
    })
  }

  function saveAddTask(event) {
    event.preventDefault()
    if (!addDraft?.action.trim()) {
      return
    }

    addTaskToWeek(goal.id, addDraft.phaseId, addDraft.weekId, {
      action: addDraft.action,
      date: addDraft.date,
      estMinutes: addDraft.estMinutes,
    })
    setAddDraft(null)
  }

  function openEditTask(task) {
    setEditTaskDraft({
      id: task.id,
      action: task.action,
      date: task.date,
      estMinutes: task.estMinutes,
    })
  }

  function saveEditTask(event) {
    event.preventDefault()
    if (!editTaskDraft?.action.trim()) {
      return
    }

    updateTask(goal.id, editTaskDraft.id, {
      action: editTaskDraft.action,
      date: editTaskDraft.date,
      estMinutes: Number(editTaskDraft.estMinutes) || 0,
    })
    setEditTaskDraft(null)
  }

  function startEditPhase(phase) {
    setEditPhaseId(phase.id)
    setPhaseTitleDraft(phase.title)
  }

  function savePhaseTitle() {
    if (editPhaseId && phaseTitleDraft.trim()) {
      updatePhaseTitle(goal.id, editPhaseId, phaseTitleDraft.trim())
    }
    setEditPhaseId(null)
    setPhaseTitleDraft('')
  }

  function findWeeks(phase) {
    return phase.weeks || []
  }

  function moveTaskWithinWeek(week, taskId, direction) {
    const index = week.tasks.findIndex((task) => task.id === taskId)
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= week.tasks.length) {
      return
    }

    const nextTasks = [...week.tasks]
    const [moved] = nextTasks.splice(index, 1)
    nextTasks.splice(targetIndex, 0, moved)
    nextTasks.forEach((task, order) => {
      updateTask(goal.id, task.id, { order })
    })
  }

  function moveTaskToAdjacentWeek(phase, currentWeekId, taskId, direction) {
    const weeks = findWeeks(phase)
    const currentIndex = weeks.findIndex((week) => week.id === currentWeekId)
    const targetWeek = weeks[currentIndex + direction]
    if (targetWeek) {
      moveTask(goal.id, taskId, targetWeek.id)
    }
  }

  function renderAddForm(phaseId, weekId, location = 'week') {
    if (
      addDraft?.phaseId !== phaseId ||
      addDraft?.weekId !== weekId ||
      addDraft?.location !== location
    ) {
      return null
    }

    return (
      <form
        onSubmit={saveAddTask}
        className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3"
      >
        <input
          value={addDraft.action}
          onChange={(event) =>
            setAddDraft({ ...addDraft, action: event.target.value })
          }
          placeholder="任务描述"
          className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base outline-none focus:border-emerald-400"
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="date"
            value={addDraft.date}
            onChange={(event) =>
              setAddDraft({ ...addDraft, date: event.target.value })
            }
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none"
          />
          <input
            type="number"
            min="0"
            value={addDraft.estMinutes}
            onChange={(event) =>
              setAddDraft({
                ...addDraft,
                estMinutes: Number(event.target.value) || 0,
              })
            }
            placeholder="分钟"
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white"
          >
            <Check size={14} />
            添加
          </button>
          <button
            type="button"
            onClick={() => setAddDraft(null)}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-white px-3 text-sm font-semibold text-slate-500"
          >
            <X size={14} />
            取消
          </button>
        </div>
      </form>
    )
  }

  function renderTask(task, phase, week, weekIndex) {
    const isEditing = editTaskDraft?.id === task.id
    const linkedTodo = todos.find((todo) => todo.goalTaskId === task.id)

    return (
      <div
        key={task.id}
        className={`rounded-xl border p-2 ${
          task.completed
            ? 'border-emerald-100 bg-emerald-50'
            : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => handleToggleTask(task)}
            disabled={isLoading}
            aria-label={task.completed ? '标记为未完成' : '标记为完成'}
            className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
              task.completed
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-emerald-600'
            } disabled:opacity-50`}
          >
            {task.completed ? <Check size={16} /> : <Circle size={16} />}
          </button>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <form onSubmit={saveEditTask} className="space-y-2">
                <input
                  value={editTaskDraft.action}
                  onChange={(event) =>
                    setEditTaskDraft({
                      ...editTaskDraft,
                      action: event.target.value,
                    })
                  }
                  className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={editTaskDraft.date}
                    onChange={(event) =>
                      setEditTaskDraft({
                        ...editTaskDraft,
                        date: event.target.value,
                      })
                    }
                    className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    value={editTaskDraft.estMinutes}
                    onChange={(event) =>
                      setEditTaskDraft({
                        ...editTaskDraft,
                        estMinutes: Number(event.target.value) || 0,
                      })
                    }
                    className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white"
                  >
                    <Check size={13} />
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTaskDraft(null)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-white px-3 text-sm text-slate-500"
                  >
                    <X size={13} />
                    取消
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p
                  className={`text-sm font-semibold ${
                    task.completed
                      ? 'text-slate-400 line-through'
                      : 'text-slate-700'
                  }`}
                >
                  {task.action}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {task.date || '未排日期'} · {task.estMinutes || 0} 分钟
                  {linkedTodo?.completed ? ' · 待办已勾选' : ''}
                </p>
              </>
            )}
          </div>

          {!isEditing && (
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => openEditTask(task)}
                aria-label="编辑任务"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={() => deleteTask(goal.id, task.id)}
                aria-label="删除任务"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="mt-1.5 flex items-center gap-1 pl-11">
            <button
              type="button"
              onClick={() => moveTaskWithinWeek(week, task.id, -1)}
              aria-label="任务上移"
              className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <ArrowUp size={12} />
            </button>
            <button
              type="button"
              onClick={() => moveTaskWithinWeek(week, task.id, 1)}
              aria-label="任务下移"
              className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <ArrowDown size={12} />
            </button>
            <button
              type="button"
              onClick={() => moveTaskToAdjacentWeek(phase, week.id, task.id, -1)}
              disabled={weekIndex === 0}
              aria-label="移到上一周"
              className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-30"
            >
              <ArrowLeft size={12} />
            </button>
            <button
              type="button"
              onClick={() =>
                moveTaskToAdjacentWeek(phase, week.id, task.id, 1)
              }
              disabled={weekIndex === phase.weeks.length - 1}
              aria-label="移到下一周"
              className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-30"
            >
              <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-emerald-600">目标看板</p>
            <h2 className="mt-1 text-xl font-black text-slate-800 md:text-2xl">
              {goal.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              已完成 {planCounts.completed}/{planCounts.total} 个行动
            </p>
          </div>
          <ProgressRing percent={planCounts.percent} />
        </div>
      </section>

      {phases.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center">
          <p className="text-sm text-slate-400">还没有阶段，先创建目标计划。</p>
        </div>
      )}

      {phases.map((phase) => {
        const phaseCounts = taskCounts(
          (phase.weeks || []).flatMap((week) => week.tasks || []),
        )
        const weeks = findWeeks(phase)

        return (
          <section
            key={phase.id}
            className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm md:p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                {editPhaseId === phase.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={phaseTitleDraft}
                      onChange={(event) => setPhaseTitleDraft(event.target.value)}
                      className="min-h-10 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={savePhaseTitle}
                      className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white"
                    >
                      <Check size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-base font-black text-slate-800">
                      {phase.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      阶段完成 {phaseCounts.percent}%
                    </p>
                  </>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEditPhase(phase)}
                  aria-label="编辑阶段名"
                  className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => deletePhase(goal.id, phase.id)}
                  aria-label="删除阶段"
                  className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="mt-2">
              <ProgressBar percent={phaseCounts.percent} />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {weeks.map((week, weekIndex) => {
                const weekCounts = taskCounts(week.tasks)
                const isExpanded = expandedWeekIds.has(week.id)

                return (
                  <div
                    key={week.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => toggleWeek(week.id)}
                      className="flex w-full items-center justify-between gap-2 text-left"
                    >
                      <span className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown size={15} />
                        ) : (
                          <ChevronRight size={15} />
                        )}
                        <span className="text-sm font-bold text-slate-700">
                          第 {week.week} 周
                        </span>
                      </span>
                      <span className="text-xs text-slate-400">
                        {weekCounts.percent}%
                      </span>
                    </button>
                    <ProgressBar percent={weekCounts.percent} />

                    {isExpanded && (
                      <div className="mt-2 space-y-2">
                        {(week.tasks || []).map((task) =>
                          renderTask(task, phase, week, weekIndex),
                        )}
                        {renderAddForm(phase.id, week.id)}
                        <button
                          type="button"
                          onClick={() => openAddTask(phase.id, week.id, 'week')}
                          className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-dashed border-emerald-300 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          <Plus size={13} />
                          添加任务
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-3">
              {weeks[0] ? (
                renderAddForm(phase.id, weeks[0].id, 'footer')
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (weeks[0]) {
                    openAddTask(phase.id, weeks[0].id, 'footer')
                  }
                }}
                disabled={!weeks[0]}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 text-sm font-semibold text-slate-500 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40"
              >
                <Plus size={14} />
                添加任务
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
