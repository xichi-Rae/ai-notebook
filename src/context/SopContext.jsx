import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useGame } from './GameContext'
import { useRecord } from './RecordContext'
import { useTodo } from './TodoContext'
import { playTaskCompleteSound } from '../utils/sound'
import { PRESET_SOPS } from '../data/presetSops'

const SopContext = createContext(null)
const SOP_STORAGE_KEY = 'executive-coach-sops'
const LOAD_LIMIT_KEY = 'executive-coach-daily-load-limit'
const PRESET_IMPORTED_KEY = 'executive-coach-sop-presets-imported'

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getToday() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function daysBetween(startDate, endDate) {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0
  }
  return Math.max(0, Math.floor((end - start) / 86400000))
}

function readSops() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(SOP_STORAGE_KEY) || '[]',
    )
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readLoadLimit() {
  if (typeof window === 'undefined') {
    return 600
  }

  try {
    const value = Number(
      window.localStorage.getItem(LOAD_LIMIT_KEY) || 600,
    )
    return value > 0 ? value : 600
  } catch {
    return 600
  }
}

function initializeSops() {
  const stored = readSops()

  if (typeof window === 'undefined') {
    return stored
  }

  try {
    if (window.localStorage.getItem(PRESET_IMPORTED_KEY) === '1') {
      return stored
    }

    const today = getToday()
    const existingIds = new Set(stored.map((sop) => sop.id))
    const missingPresets = PRESET_SOPS.filter(
      (preset) => !existingIds.has(preset.id),
    ).map((preset) => ({
      ...preset,
      created_at: today,
      last_modified: today,
    }))

    if (missingPresets.length) {
      const next = [...stored, ...missingPresets]
      window.localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(next))
      window.localStorage.setItem(PRESET_IMPORTED_KEY, '1')
      return next
    }

    window.localStorage.setItem(PRESET_IMPORTED_KEY, '1')
    return stored
  } catch {
    return stored
  }
}

export function SopProvider({ children }) {
  const game = useGame()
  const record = useRecord()
  const todo = useTodo()
  const [sops, setSops] = useState(initializeSops)
  const [dailyMaxMinutes, setDailyMaxMinutesState] = useState(readLoadLimit)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [activeSopId, setActiveSopId] = useState(null)
  const [execution, setExecution] = useState({})
  const [feedbackSent, setFeedbackSent] = useState([])

  function persistSops(nextSops) {
    setSops(nextSops)
    try {
      window.localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(nextSops))
    } catch {
      // Local storage can be unavailable in privacy modes.
    }
  }

  const addSop = useCallback(
    ({
      title,
      category = '日',
      steps = [],
      trigger_time = '07:00',
      trigger_times = null,
      trial_days = 5,
    } = {}) => {
      if (!title?.trim() || !steps.length) {
        return null
      }

      const today = getToday()
      const sop = {
        id: createId('sop'),
        title: title.trim(),
        category,
        steps: steps.map((step, index) => ({
          order: index + 1,
          action: step.action || step.title || `步骤 ${index + 1}`,
          duration: Number(step.duration) || 5,
        })),
        trigger_time,
        trigger_times: Array.isArray(trigger_times)
          ? trigger_times
          : [trigger_time],
        active: true,
        trial_days,
        created_at: today,
        last_modified: today,
      }

      setSops((current) => {
        const next = [...current, sop]
        try {
          window.localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(next))
        } catch {
          // Ignore storage failures.
        }
        return next
      })

      return sop
    },
    [],
  )

  const updateSop = useCallback(
    (sopId, patch) => {
      setSops((current) => {
        const next = current.map((sop) =>
          sop.id === sopId
            ? {
                ...sop,
                ...patch,
                last_modified: getToday(),
              }
            : sop,
        )
        try {
          window.localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(next))
        } catch {
          // Ignore storage failures.
        }
        return next
      })
    },
    [],
  )

  const updateSopSteps = useCallback(
    (sopId, steps) => {
      updateSop(sopId, {
        steps: steps.map((step, index) => ({
          order: index + 1,
          action: step.action || step.title || `步骤 ${index + 1}`,
          duration: Number(step.duration) || 5,
        })),
      })
    },
    [updateSop],
  )

  const deleteSop = useCallback((sopId) => {
    setSops((current) => {
      const next = current.filter((sop) => sop.id !== sopId)
      try {
        window.localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore storage failures.
      }
      return next
    })
  }, [])

  const toggleSop = useCallback((sopId) => {
    setSops((current) => {
      const next = current.map((sop) =>
        sop.id === sopId ? { ...sop, active: !sop.active } : sop,
      )
      try {
        window.localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore storage failures.
      }
      return next
    })
  }, [])

  const triggerSop = useCallback(
    (sopId) => {
      const sop = sops.find((item) => item.id === sopId)
      if (!sop) {
        return
      }

      const linkedTodos = todo.addTodos(
        sop.steps.map((step) => ({
          title: step.action,
          source: 'sop',
          estMinutes: step.duration,
          sopId: sop.id,
          sopTitle: sop.title,
          sopStepOrder: step.order,
        })),
      )
      const linkedTodoIds = linkedTodos.map((item) => item.id)
      const today = getToday()
      const nextExecution = {
        date: today,
        currentStep: 0,
        completedSteps: [],
        linkedTodoIds,
        completed: false,
      }

      setExecution((current) => ({
        ...current,
        [sop.id]: nextExecution,
      }))
      setActiveSopId(sop.id)
      window.dispatchEvent(
        new CustomEvent('sop:triggered', {
          detail: {
            sop,
            execution: nextExecution,
          },
        }),
      )
    },
    [sops, todo],
  )

  const nextSopStep = useCallback(
    (sopId) => {
      const sop = sops.find((item) => item.id === sopId)
      const currentExecution = execution[sopId]
      if (!sop || !currentExecution || currentExecution.completed) {
        return
      }

      const currentStep = currentExecution.currentStep
      const currentLinkedTodoId =
        currentExecution.linkedTodoIds?.[currentStep]
      if (currentLinkedTodoId) {
        todo.setTodoCompleted(currentLinkedTodoId, true)
      }

      const nextStep = currentStep + 1
      const completed = nextStep >= sop.steps.length

      if (completed) {
        game.addExp(30)
        record.addSopCompletion({
          title: sop.title,
          steps: sop.steps.length,
        })
        playTaskCompleteSound()
        window.dispatchEvent(
          new CustomEvent('sop:completed', {
            detail: {
              sop,
              steps: sop.steps.length,
            },
          }),
        )
      }

      setExecution((current) => ({
        ...current,
        [sopId]: {
          ...currentExecution,
          currentStep: completed ? currentStep : nextStep,
          completedSteps: [...currentExecution.completedSteps, currentStep],
          completed,
        },
      }))
    },
    [execution, game, record, sops, todo],
  )

  const closeActiveSop = useCallback(() => {
    setActiveSopId(null)
  }, [])

  const setDailyMaxMinutes = useCallback((minutes) => {
    const safeMinutes = Math.max(30, Number(minutes) || 600)
    setDailyMaxMinutesState(safeMinutes)
    try {
      window.localStorage.setItem(LOAD_LIMIT_KEY, String(safeMinutes))
    } catch {
      // Ignore storage failures.
    }
  }, [])

  const getLoadWarning = useCallback(
    (extraMinutes = 0) => {
      const currentLoad = todo.todos.reduce(
        (total, item) => total + (Number(item.estMinutes) || 0),
        0,
      )
      const nextLoad = currentLoad + Number(extraMinutes) || 0
      const limit = dailyMaxMinutes

      if (nextLoad >= limit * 0.8) {
        return `今天的任务已经排到 80% 了，要不要把一些事挪到明天？`
      }

      return null
    },
    [dailyMaxMinutes, todo.todos],
  )

  useEffect(() => {
    function checkDueSops() {
      const now = new Date()
      const minutes = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes(),
      ).padStart(2, '0')}`
      const today = getToday()
      const weekday = now.getDay()
      const dayOfMonth = now.getDate()

      sops.forEach((sop) => {
        if (!sop.active) {
          return
        }

        const triggerTimes = sop.trigger_times?.length
          ? sop.trigger_times
          : [sop.trigger_time]
        if (!triggerTimes.includes(minutes)) {
          return
        }

        if (sop.category === '周' && !(sop.weekdays || []).includes(weekday)) {
          return
        }

        if (
          (sop.category === '月' || sop.category === '年') &&
          dayOfMonth !== (sop.month_day || 1)
        ) {
          return
        }

        if (
          execution[sop.id]?.date === today &&
          execution[sop.id]?.completed
        ) {
          return
        }

        triggerSop(sop.id)
      })
    }

    checkDueSops()
    const intervalId = setInterval(checkDueSops, 60000)
    return () => clearInterval(intervalId)
  }, [execution, sops, triggerSop])

  useEffect(() => {
    const today = getToday()

    sops.forEach((sop) => {
      if (!sop.trial_days) {
        return
      }

      const day = daysBetween(sop.created_at, today)
      const day3Key = `${sop.id}-day3`
      const day5Key = `${sop.id}-day5`

      if (day >= 3 && !feedbackSent.includes(day3Key)) {
        setFeedbackSent((current) => [...current, day3Key])
        window.dispatchEvent(
          new CustomEvent('sop:feedback', {
            detail: {
              sop,
              day: 3,
            },
          }),
        )
      }

      if (day >= 5 && !feedbackSent.includes(day5Key)) {
        setFeedbackSent((current) => [...current, day5Key])
        window.dispatchEvent(
          new CustomEvent('sop:feedback', {
            detail: {
              sop,
              day: 5,
            },
          }),
        )
      }
    })
  }, [feedbackSent, sops])

  return (
    <SopContext.Provider
      value={{
        sops,
        dailyMaxMinutes,
        wizardOpen,
        activeSopId,
        execution,
        addSop,
        updateSop,
        updateSopSteps,
        deleteSop,
        toggleSop,
        openWizard: () => setWizardOpen(true),
        closeWizard: () => setWizardOpen(false),
        triggerSop,
        nextSopStep,
        closeActiveSop,
        setDailyMaxMinutes,
        getLoadWarning,
      }}
    >
      {children}
    </SopContext.Provider>
  )
}

export function useSop() {
  const context = useContext(SopContext)
  if (!context) {
    throw new Error('useSop must be used within SopProvider')
  }
  return context
}
