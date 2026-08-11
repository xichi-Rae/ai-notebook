import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

const GoalContext = createContext(null)

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createNode(title, order, objective = '') {
  return {
    id: createId('node'),
    title,
    objective,
    completed: false,
    order,
  }
}

function createPlanNode(phase, order) {
  return {
    id: phase.id || createId('node'),
    title: phase.title || `阶段 ${order}`,
    objective: phase.objective || '',
    completed: false,
    order,
    plan: phase,
  }
}

function recomputeProgress(nodes) {
  if (!nodes.length) {
    return 0
  }
  const completed = nodes.filter((node) => node.completed).length
  return Math.round((completed / nodes.length) * 100)
}

function withCompletedFlags(plan) {
  if (!plan?.phases?.length) {
    return plan
  }

  return {
    ...plan,
    phases: plan.phases.map((phase) => ({
      ...phase,
      weeks: (phase.weeks || []).map((week) => ({
        ...week,
        tasks: (week.tasks || []).map((task) => ({
          ...task,
          completed: Boolean(task.completed),
        })),
      })),
    })),
  }
}

function recomputePlanProgress(phases) {
  const allTasks = (phases || []).flatMap((phase) =>
    (phase.weeks || []).flatMap((week) => week.tasks || []),
  )

  if (!allTasks.length) {
    return 0
  }

  const completed = allTasks.filter((task) => task.completed).length
  return Math.round((completed / allTasks.length) * 100)
}

export function GoalProvider({ children }) {
  const [goals, setGoals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const hydratedRef = useRef(false)
  const skipPersistRef = useRef(false)

  const fetchGoals = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        throw error
      }

      skipPersistRef.current = true
      setGoals(
        (data || []).map((row) => ({
          id: row.id,
          title: row.title || '未命名目标',
          category: row.category || '学习类',
          deadline: row.deadline || '',
          reason: row.reason || '',
          ...(row.data || {}),
        })),
      )
    } catch (error) {
      console.error('Failed to load goals', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const persistGoals = useCallback(async (nextGoals) => {
    if (!isSupabaseConfigured || !nextGoals.length) {
      return
    }

    try {
      await supabase.from('goals').upsert(
        nextGoals.map((goal) => ({
          id: goal.id,
          title: goal.title,
          category: goal.category,
          deadline: goal.deadline || '',
          reason: goal.reason || '',
          data: goal,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id' },
      )
    } catch (error) {
      console.error('Failed to save goals', error)
    }
  }, [])

  useEffect(() => {
    async function initialize() {
      await fetchGoals()
      hydratedRef.current = true
    }
    initialize()
  }, [fetchGoals])

  useEffect(() => {
    if (!hydratedRef.current) {
      return
    }
    if (skipPersistRef.current) {
      skipPersistRef.current = false
      return
    }
    if (goals.length) {
      persistGoals(goals)
    }
  }, [goals, persistGoals])

  function addGoal({
    title,
    category = '学习类',
    deadline = '',
    reason = '',
    plan = null,
    phases = null,
  } = {}) {
    const cleanTitle = title?.trim()
    if (!cleanTitle) {
      return null
    }

    const goalId = createId('goal')
    const safePlan = plan?.phases?.length ? withCompletedFlags(plan) : null
    const outlinePhases = Array.isArray(phases)
      ? phases
      : safePlan?.phases?.length
        ? safePlan.phases
        : []
    const nodes = outlinePhases.length
      ? outlinePhases.map((phase, index) =>
          createNode(
            phase.title || `阶段 ${index + 1}`,
            index + 1,
            phase.objective || phase.description || '',
          ),
        )
      : safePlan?.phases?.length
      ? safePlan.phases.map((phase, index) => createPlanNode(phase, index + 1))
      : []

    setGoals((currentGoals) => [
      ...currentGoals,
      {
        id: goalId,
        title: cleanTitle,
        category,
        deadline,
        reason,
        progress: 0,
        nodes,
        plan: safePlan,
        deadlineWarning: false,
        learningRecords: [],
        masteredConcepts: [],
        weakConcepts: [],
        cheatSheets: [],
      },
    ])

    return goalId
  }

  function upsertPhasePlan(goalId, phasePlan) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) => {
        if (goal.id !== goalId) {
          return goal
        }

        const currentPhases = goal.plan?.phases || []
        const phaseIndex = currentPhases.findIndex(
          (phase) => phase.id === phasePlan.id,
        )
        const nextPhases =
          phaseIndex >= 0
            ? currentPhases.map((phase, index) =>
                index === phaseIndex
                  ? { ...phase, ...phasePlan }
                  : phase,
              )
            : [...currentPhases, phasePlan]
        const plan = { phases: nextPhases }
        const nodes = nextPhases.map((phase, index) =>
          createPlanNode(phase, index + 1),
        )

        return {
          ...goal,
          plan,
          nodes,
          progress: recomputePlanProgress(nextPhases),
        }
      }),
    )
  }

  function addNodesToGoal(goalId, nodes) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return
    }

    setGoals((currentGoals) =>
      currentGoals.map((goal) => {
        if (goal.id !== goalId) {
          return goal
        }

        const addedNodes = nodes.map((node, index) =>
          typeof node === 'string'
            ? createNode(node, goal.nodes.length + index + 1)
            : createNode(node.title || '未命名阶段', goal.nodes.length + index + 1),
        )
        const nextNodes = [...goal.nodes, ...addedNodes]

        return {
          ...goal,
          nodes: nextNodes,
          progress: recomputeProgress(nextNodes),
        }
      }),
    )
  }

  function toggleGoalNode(goalId, nodeId) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) => {
        if (goal.id !== goalId) {
          return goal
        }

        const nextNodes = goal.nodes.map((node) =>
          node.id === nodeId ? { ...node, completed: !node.completed } : node,
        )

        return {
          ...goal,
          nodes: nextNodes,
          progress: recomputeProgress(nextNodes),
        }
      }),
    )
  }

  function setGoalProgress(goalId, progress) {
    const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0))
    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId ? { ...goal, progress: safeProgress } : goal,
      ),
    )
  }

  function findGoalByTitle(title) {
    const cleanTitle = title?.trim()
    if (!cleanTitle) {
      return null
    }

    return (
      goals.find((goal) => goal.id === cleanTitle) ||
      goals.find(
        (goal) =>
          cleanTitle.includes(goal.title) || goal.title.includes(cleanTitle),
      ) ||
      null
    )
  }

  function deleteGoal(goalId) {
    if (isSupabaseConfigured) {
      supabase.from('goals').delete().eq('id', goalId).then()
    }
    setGoals((currentGoals) =>
      currentGoals.filter((goal) => goal.id !== goalId),
    )
  }

  function updateGoalDeadline(goalId, deadline, options = {}) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              deadline,
              deadlineWarning: Boolean(options.warning),
            }
          : goal,
      ),
    )
  }

  function replaceGoalPlan(goalId, plan) {
    const safePlan = plan?.phases?.length ? withCompletedFlags(plan) : null
    const nodes = safePlan?.phases?.length
      ? safePlan.phases.map((phase, index) => createPlanNode(phase, index + 1))
      : []

    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              plan: safePlan,
              nodes,
              progress: recomputeProgress(nodes),
              deadlineWarning: false,
            }
          : goal,
      ),
    )
  }

  function saveLearningRecord(goalId, record) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              learningRecords: [
                ...(goal.learningRecords || []),
                {
                  id: createId('record'),
                  createdAt: new Date().toISOString(),
                  ...record,
                },
              ],
            }
          : goal,
      ),
    )
  }

  function addMasteredConcepts(goalId, concepts = []) {
    const cleanConcepts = Array.isArray(concepts)
      ? concepts.map((concept) => String(concept).trim()).filter(Boolean)
      : []

    if (!cleanConcepts.length) {
      return
    }

    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              masteredConcepts: Array.from(
                new Set([
                  ...(goal.masteredConcepts || []),
                  ...cleanConcepts,
                ]),
              ),
            }
          : goal,
      ),
    )
  }

  function incrementGoalProgress(goalId, points = 5) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              progress: Math.min(100, goal.progress + Number(points) || 0),
            }
          : goal,
      ),
    )
  }

  function markGoalTask(goalId, taskId, completed) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) => {
        if (goal.id !== goalId || !goal.plan) {
          return goal
        }

        const phases = goal.plan.phases.map((phase) => ({
          ...phase,
          weeks: (phase.weeks || []).map((week) => ({
            ...week,
            tasks: (week.tasks || []).map((task) =>
              task.id === taskId
                ? { ...task, completed: Boolean(completed) }
                : task,
            ),
          })),
        }))

        const allTasks = phases.flatMap((phase) =>
          (phase.weeks || []).flatMap((week) => week.tasks || []),
        )
        const completedTasks = allTasks.filter((task) => task.completed).length
        const progress = allTasks.length
          ? Math.round((completedTasks / allTasks.length) * 100)
          : goal.progress

        return {
          ...goal,
          plan: {
            ...goal.plan,
            phases,
          },
          progress,
        }
      }),
    )
  }

  function updatePhaseTitle(goalId, phaseId, title) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) => {
        if (goal.id !== goalId || !goal.plan) {
          return goal
        }

        const phases = goal.plan.phases.map((phase) =>
          phase.id === phaseId ? { ...phase, title: title || phase.title } : phase,
        )

        return {
          ...goal,
          plan: { ...goal.plan, phases },
          progress: recomputePlanProgress(phases),
        }
      }),
    )
  }

  function deletePhase(goalId, phaseId) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) => {
        if (goal.id !== goalId || !goal.plan) {
          return goal
        }

        const phases = goal.plan.phases.filter((phase) => phase.id !== phaseId)
        return {
          ...goal,
          plan: { ...goal.plan, phases },
          progress: recomputePlanProgress(phases),
        }
      }),
    )
  }

  function addTaskToWeek(goalId, phaseId, weekId, task) {
    const nextTask = {
      id: createId('task'),
      day: Number(task.day) || 1,
      action: task.action || '未命名任务',
      estMinutes: Number(task.estMinutes) || 0,
      date: task.date || '',
      completed: false,
    }

    setGoals((currentGoals) =>
      currentGoals.map((goal) => {
        if (goal.id !== goalId || !goal.plan) {
          return goal
        }

        const phases = goal.plan.phases.map((phase) => {
          if (phase.id !== phaseId) {
            return phase
          }

          return {
            ...phase,
            weeks: (phase.weeks || []).map((week) =>
              week.id === weekId
                ? { ...week, tasks: [...(week.tasks || []), nextTask] }
                : week,
            ),
          }
        })

        return {
          ...goal,
          plan: { ...goal.plan, phases },
          progress: recomputePlanProgress(phases),
        }
      }),
    )
  }

  function updateTask(goalId, taskId, patch) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) => {
        if (goal.id !== goalId || !goal.plan) {
          return goal
        }

        const phases = goal.plan.phases.map((phase) => ({
          ...phase,
          weeks: (phase.weeks || []).map((week) => ({
            ...week,
            tasks: (week.tasks || []).map((task) =>
              task.id === taskId ? { ...task, ...patch } : task,
            ),
          })),
        }))

        return {
          ...goal,
          plan: { ...goal.plan, phases },
          progress: recomputePlanProgress(phases),
        }
      }),
    )
  }

  function deleteTask(goalId, taskId) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) => {
        if (goal.id !== goalId || !goal.plan) {
          return goal
        }

        const phases = goal.plan.phases.map((phase) => ({
          ...phase,
          weeks: (phase.weeks || []).map((week) => ({
            ...week,
            tasks: (week.tasks || []).filter((task) => task.id !== taskId),
          })),
        }))

        return {
          ...goal,
          plan: { ...goal.plan, phases },
          progress: recomputePlanProgress(phases),
        }
      }),
    )
  }

  function moveTask(goalId, taskId, targetWeekId) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) => {
        if (goal.id !== goalId || !goal.plan) {
          return goal
        }

        let movedTask = null
        const phases = goal.plan.phases.map((phase) => ({
          ...phase,
          weeks: (phase.weeks || []).map((week) => {
            const taskIndex = (week.tasks || []).findIndex(
              (task) => task.id === taskId,
            )
            if (taskIndex >= 0) {
              movedTask = week.tasks[taskIndex]
              return {
                ...week,
                tasks: week.tasks.filter((task) => task.id !== taskId),
              }
            }
            return week
          }),
        }))

        if (!movedTask) {
          return goal
        }

        const nextPhases = phases.map((phase) => ({
          ...phase,
          weeks: (phase.weeks || []).map((week) =>
            week.id === targetWeekId
              ? { ...week, tasks: [...(week.tasks || []), movedTask] }
              : week,
          ),
        }))

        return {
          ...goal,
          plan: { ...goal.plan, phases: nextPhases },
          progress: recomputePlanProgress(nextPhases),
        }
      }),
    )
  }

  function setWeakConcepts(goalId, concepts = []) {
    const cleanConcepts = Array.isArray(concepts)
      ? concepts.map((concept) => String(concept).trim()).filter(Boolean)
      : []

    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              weakConcepts: Array.from(
                new Set([
                  ...(goal.weakConcepts || []),
                  ...cleanConcepts,
                ]),
              ),
            }
          : goal,
      ),
    )
  }

  function saveCheatSheet(goalId, content) {
    if (!content?.trim()) {
      return
    }

    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              cheatSheets: [
                ...(goal.cheatSheets || []),
                {
                  id: createId('sheet'),
                  content,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : goal,
      ),
    )
  }

  return (
    <GoalContext.Provider
      value={{
        goals,
        isLoading,
        syncGoals: fetchGoals,
        addGoal,
        upsertPhasePlan,
        addNodesToGoal,
        toggleGoalNode,
        setGoalProgress,
        findGoalByTitle,
        deleteGoal,
        updateGoalDeadline,
        replaceGoalPlan,
        saveLearningRecord,
        addMasteredConcepts,
        incrementGoalProgress,
        setWeakConcepts,
        saveCheatSheet,
        markGoalTask,
        updatePhaseTitle,
        deletePhase,
        addTaskToWeek,
        updateTask,
        deleteTask,
        moveTask,
      }}
    >
      {children}
    </GoalContext.Provider>
  )
}

export function useGoal() {
  const context = useContext(GoalContext)
  if (!context) {
    throw new Error('useGoal must be used within GoalProvider')
  }
  return context
}
