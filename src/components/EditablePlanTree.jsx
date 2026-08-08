import { useState } from 'react'
import {
  CalendarDays,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react'

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createTask(day = 1) {
  return {
    id: createId('task'),
    day,
    action: '',
    estMinutes: 30,
    date: '',
  }
}

function createWeek(week = 1) {
  return {
    id: createId('week'),
    week,
    tasks: [createTask(1)],
  }
}

function createPhase(title = '阶段 1') {
  return {
    id: createId('phase'),
    title,
    weeks: [createWeek(1)],
  }
}

function moveItem(list, fromIndex, toIndex) {
  if (fromIndex === toIndex) {
    return list
  }

  const nextList = [...list]
  const [movedItem] = nextList.splice(fromIndex, 1)
  nextList.splice(toIndex, 0, movedItem)
  return nextList
}

export default function EditablePlanTree({ plan, onChangePlan }) {
  const [dragging, setDragging] = useState(null)
  const phases = Array.isArray(plan?.phases) ? plan.phases : []

  function startDrag(event, item) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', '')
    setDragging(item)
  }

  function commitPhases(nextPhases) {
    onChangePlan({ ...plan, phases: nextPhases })
  }

  function updatePhase(phaseIndex, patch) {
    commitPhases(
      phases.map((phase, index) =>
        index === phaseIndex ? { ...phase, ...patch } : phase,
      ),
    )
  }

  function updateWeek(phaseIndex, weekIndex, patch) {
    commitPhases(
      phases.map((phase, index) => {
        if (index !== phaseIndex) {
          return phase
        }

        return {
          ...phase,
          weeks: phase.weeks.map((week, weekItemIndex) =>
            weekItemIndex === weekIndex ? { ...week, ...patch } : week,
          ),
        }
      }),
    )
  }

  function updateTask(phaseIndex, weekIndex, taskIndex, patch) {
    commitPhases(
      phases.map((phase, index) => {
        if (index !== phaseIndex) {
          return phase
        }

        return {
          ...phase,
          weeks: phase.weeks.map((week, weekItemIndex) => {
            if (weekItemIndex !== weekIndex) {
              return week
            }

            return {
              ...week,
              tasks: week.tasks.map((task, taskItemIndex) =>
                taskItemIndex === taskIndex ? { ...task, ...patch } : task,
              ),
            }
          }),
        }
      }),
    )
  }

  function addPhase() {
    commitPhases([...phases, createPhase(`阶段 ${phases.length + 1}`)])
  }

  function addWeek(phaseIndex) {
    const phase = phases[phaseIndex]
    const nextWeek = createWeek((phase?.weeks?.length || 0) + 1)
    updatePhase(phaseIndex, {
      weeks: [...(phase?.weeks || []), nextWeek],
    })
  }

  function addTask(phaseIndex, weekIndex) {
    const phase = phases[phaseIndex]
    const week = phase?.weeks?.[weekIndex]
    const nextTask = createTask((week?.tasks?.length || 0) + 1)
    updateWeek(phaseIndex, weekIndex, {
      tasks: [...(week?.tasks || []), nextTask],
    })
  }

  function deletePhase(phaseIndex) {
    commitPhases(phases.filter((_, index) => index !== phaseIndex))
  }

  function deleteWeek(phaseIndex, weekIndex) {
    const phase = phases[phaseIndex]
    updatePhase(phaseIndex, {
      weeks: phase.weeks.filter((_, index) => index !== weekIndex),
    })
  }

  function deleteTask(phaseIndex, weekIndex, taskIndex) {
    const week = phases[phaseIndex].weeks[weekIndex]
    updateWeek(phaseIndex, weekIndex, {
      tasks: week.tasks.filter((_, index) => index !== taskIndex),
    })
  }

  function handlePhaseDrop(targetIndex) {
    if (!dragging || dragging.type !== 'phase') {
      return
    }
    commitPhases(moveItem(phases, dragging.phaseIndex, targetIndex))
    setDragging(null)
  }

  function handleWeekDrop(phaseIndex, targetIndex) {
    if (
      !dragging ||
      dragging.type !== 'week' ||
      dragging.phaseIndex !== phaseIndex
    ) {
      return
    }

    const phase = phases[phaseIndex]
    updatePhase(phaseIndex, {
      weeks: moveItem(phase.weeks, dragging.weekIndex, targetIndex),
    })
    setDragging(null)
  }

  function handleTaskDrop(phaseIndex, weekIndex, targetIndex) {
    if (
      !dragging ||
      dragging.type !== 'task' ||
      dragging.phaseIndex !== phaseIndex ||
      dragging.weekIndex !== weekIndex
    ) {
      return
    }

    const week = phases[phaseIndex]?.weeks?.[weekIndex]
    updateWeek(phaseIndex, weekIndex, {
      tasks: moveItem(week.tasks, dragging.taskIndex, targetIndex),
    })
    setDragging(null)
  }

  return (
    <div className="space-y-3">
      {phases.length === 0 && (
        <button
          type="button"
          onClick={addPhase}
          className="min-h-12 w-full rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 text-base font-bold text-emerald-700 transition hover:bg-emerald-100"
        >
          + 添加第一个阶段
        </button>
      )}

      {phases.map((phase, phaseIndex) => (
        <section
          key={phase.id}
          className="rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm md:p-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handlePhaseDrop(phaseIndex)}
        >
          <div className="flex items-center gap-2">
            <span
              draggable
              onDragStart={(event) =>
                startDrag(event, { type: 'phase', phaseIndex })
              }
              onDragEnd={() => setDragging(null)}
              className="grid h-11 w-11 shrink-0 cursor-grab place-items-center rounded-xl bg-slate-100 text-slate-400 active:cursor-grabbing"
              aria-label="拖动阶段排序"
            >
              <GripVertical size={17} />
            </span>

            <input
              value={phase.title}
              onChange={(event) =>
                updatePhase(phaseIndex, { title: event.target.value })
              }
              placeholder="阶段名称"
              className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white md:min-h-11 md:text-sm"
            />

            <button
              type="button"
              onClick={() => deletePhase(phaseIndex)}
              aria-label="删除阶段"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100 md:h-9 md:w-9"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="ml-0 mt-3 space-y-3 md:ml-14">
            {phase.weeks?.map((week, weekIndex) => (
              <div
                key={week.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleWeekDrop(phaseIndex, weekIndex)}
              >
                <div className="flex items-center gap-2">
                  <span
                    draggable
                    onDragStart={(event) =>
                      startDrag(event, {
                        type: 'week',
                        phaseIndex,
                        weekIndex,
                      })
                    }
                    onDragEnd={() => setDragging(null)}
                    className="grid h-10 w-10 shrink-0 cursor-grab place-items-center rounded-lg bg-white text-slate-400 active:cursor-grabbing"
                    aria-label="拖动周排序"
                  >
                    <GripVertical size={15} />
                  </span>
                  <label className="flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-500">
                    第
                    <input
                      type="number"
                      min="1"
                      value={week.week}
                      onChange={(event) =>
                        updateWeek(phaseIndex, weekIndex, {
                          week: Number(event.target.value) || 1,
                        })
                      }
                      className="min-h-10 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-base font-bold text-slate-700 outline-none focus:border-emerald-400"
                    />
                    周
                  </label>
                  <button
                    type="button"
                    onClick={() => deleteWeek(phaseIndex, weekIndex)}
                    aria-label="删除周"
                    className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {week.tasks?.map((task, taskIndex) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-white bg-white p-2 shadow-sm"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() =>
                        handleTaskDrop(phaseIndex, weekIndex, taskIndex)
                      }
                    >
                      <div className="flex items-start gap-2">
                        <span
                          draggable
                          onDragStart={(event) =>
                            startDrag(event, {
                              type: 'task',
                              phaseIndex,
                              weekIndex,
                              taskIndex,
                            })
                          }
                          onDragEnd={() => setDragging(null)}
                          className="mt-1 grid h-10 w-10 shrink-0 cursor-grab place-items-center rounded-lg bg-slate-100 text-slate-400 active:cursor-grabbing"
                          aria-label="拖动行动排序"
                        >
                          <GripVertical size={15} />
                        </span>

                        <div className="min-w-0 flex-1 space-y-2">
                          <input
                            value={task.action}
                            onChange={(event) =>
                              updateTask(phaseIndex, weekIndex, taskIndex, {
                                action: event.target.value,
                              })
                            }
                            placeholder="具体可执行的行动"
                            className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-base text-slate-700 outline-none focus:border-emerald-400 focus:bg-white md:min-h-10 md:text-sm"
                          />

                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <label className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                              第
                              <input
                                type="number"
                                min="1"
                                max="7"
                                value={task.day}
                                onChange={(event) =>
                                  updateTask(
                                    phaseIndex,
                                    weekIndex,
                                    taskIndex,
                                    { day: Number(event.target.value) || 1 },
                                  )
                                }
                                className="min-h-10 w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 text-center text-base text-slate-700 outline-none focus:border-emerald-400"
                              />
                              天
                            </label>

                            <label className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                              <input
                                type="number"
                                min="1"
                                value={task.estMinutes}
                                onChange={(event) =>
                                  updateTask(
                                    phaseIndex,
                                    weekIndex,
                                    taskIndex,
                                    { estMinutes: Number(event.target.value) || 0 },
                                  )
                                }
                                className="min-h-10 w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 text-center text-base text-slate-700 outline-none focus:border-emerald-400"
                              />
                              分钟
                            </label>

                            <label className="col-span-2 flex items-center gap-1 text-xs font-semibold text-slate-500 sm:col-span-1">
                              <CalendarDays size={13} className="shrink-0" />
                              <input
                                type="date"
                                value={task.date}
                                onChange={(event) =>
                                  updateTask(
                                    phaseIndex,
                                    weekIndex,
                                    taskIndex,
                                    { date: event.target.value },
                                  )
                                }
                                className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
                              />
                            </label>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            deleteTask(phaseIndex, weekIndex, taskIndex)
                          }
                          aria-label="删除行动"
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addTask(phaseIndex, weekIndex)}
                  className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 text-sm font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  <Plus size={14} />
                  添加每日行动
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addWeek(phaseIndex)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-emerald-300 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              <Plus size={14} />
              添加周
            </button>
          </div>
        </section>
      ))}

      {phases.length > 0 && (
        <button
          type="button"
          onClick={addPhase}
          className="min-h-12 w-full rounded-2xl border-2 border-dashed border-emerald-300 bg-white px-4 text-base font-bold text-emerald-700 transition hover:bg-emerald-50"
        >
          + 添加阶段
        </button>
      )}
    </div>
  )
}
