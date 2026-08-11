import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { useGame } from './GameContext'

const TodoContext = createContext(null)

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getLocalDateKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function normalizeTodo(item) {
  const rawEstMinutes = item.est_minutes ?? item.estMinutes
  const estMinutes =
    rawEstMinutes === null || rawEstMinutes === undefined || rawEstMinutes === ''
      ? null
      : Number(rawEstMinutes)

  return {
    ...item,
    id: item.id || item.client_id || createId('todo'),
    title: item.title || item.action || item.content || '未命名待办',
    source: item.source || 'manual',
    completed: Boolean(item.is_completed ?? item.completed),
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    estMinutes: Number.isFinite(estMinutes) ? estMinutes : null,
    est_minutes: Number.isFinite(estMinutes) ? estMinutes : null,
    targetDate:
      item.targetDate || item.target_date || item.date || getLocalDateKey(),
    remindedForMissed: Boolean(
      item.remindedForMissed ?? item.metadata?.remindedForMissed,
    ),
  }
}

function mapRowToTodo(row) {
  const metadata = row.metadata || {}
  return normalizeTodo({
    ...metadata,
    id: row.client_id || `supabase-${row.id}`,
    supabaseId: row.id,
    title: row.content,
    source: row.source || 'manual',
    is_completed: row.is_completed,
    created_at: row.created_at,
    est_minutes: row.est_minutes,
    target_date: row.target_date,
  })
}

function toSupabaseRow(item) {
  const todo = normalizeTodo(item)
  return {
    client_id: todo.id,
    content: todo.title,
    is_completed: todo.completed,
    created_at: todo.createdAt,
    source: todo.source,
    est_minutes: todo.estMinutes,
    target_date: todo.targetDate || todo.date || null,
    metadata: {
      goalId: todo.goalId || null,
      goalTitle: todo.goalTitle || null,
      goalTaskId: todo.goalTaskId || null,
      phaseTitle: todo.phaseTitle || null,
      week: todo.week ?? null,
      day: todo.day ?? null,
      sopId: todo.sopId || null,
      sopTitle: todo.sopTitle || null,
      sopStepOrder: todo.sopStepOrder ?? null,
      remindedForMissed: Boolean(todo.remindedForMissed),
    },
  }
}

export function TodoProvider({ children }) {
  const game = useGame()
  const [todos, setTodos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const mutationBusyRef = useRef(false)

  const fetchTodos = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const { data, error: queryError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (queryError) {
        throw queryError
      }

      const cloudTodos = (data || []).map(mapRowToTodo)
      setTodos((currentTodos) => {
        const cloudIds = new Set(cloudTodos.map((todo) => String(todo.id)))
        const localOnlyGoalTodos = currentTodos.filter(
          (todo) => todo.source === 'goal' && !cloudIds.has(String(todo.id)),
        )
        return [...cloudTodos, ...localOnlyGoalTodos]
      })
      setError('')
    } catch (fetchError) {
      setError(fetchError.message || '任务同步失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const persistTodoRows = useCallback(
    async (items) => {
      if (!isSupabaseConfigured) {
        return
      }

      setIsLoading(true)
      try {
        const rows = items.map(toSupabaseRow)
        const { data, error: insertError } = await supabase
          .from('tasks')
          .insert(rows)
          .select()

        if (insertError) {
          throw insertError
        }

        const rowById = new Map(
          (data || []).map((row) => [row.client_id, row]),
        )
        setTodos((currentTodos) =>
          currentTodos.map((todo) => {
            const row = rowById.get(todo.id)
            return row ? { ...todo, supabaseId: row.id } : todo
          }),
        )
        await fetchTodos()
      } catch (saveError) {
        setError(saveError.message || '任务保存失败')
      } finally {
        setIsLoading(false)
      }
    },
    [fetchTodos],
  )

  const addTodos = useCallback(
    (items = []) => {
      if (!items.length) {
        return []
      }

      const nextTodos = items.map(normalizeTodo)
      setTodos((currentTodos) => [...currentTodos, ...nextTodos])

      if (isSupabaseConfigured) {
        persistTodoRows(nextTodos)
      }

      return nextTodos
    },
    [persistTodoRows],
  )

  const addTodo = useCallback(
    (params = {}) => addTodos([params])[0],
    [addTodos],
  )

  const toggleTodo = useCallback(
    async (todoId) => {
      if (mutationBusyRef.current) {
        return
      }

      const currentTodo = todos.find((todo) => todo.id === todoId)
      if (!currentTodo) {
        return
      }

      const previousCompleted = currentTodo.completed
      const willComplete = !previousCompleted
      mutationBusyRef.current = true
      setIsLoading(true)

      try {
        setTodos((currentTodos) =>
          currentTodos.map((todo) =>
            todo.id === todoId
              ? { ...todo, completed: willComplete }
              : todo,
          ),
        )

        if (currentTodo.supabaseId) {
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ is_completed: willComplete })
            .eq('id', currentTodo.supabaseId)

          if (updateError) {
            throw updateError
          }
        }

        if (willComplete) {
          game.addExp(10)
        }
      } catch (toggleError) {
        setError(toggleError.message || '更新任务失败')
        setTodos((currentTodos) =>
          currentTodos.map((todo) =>
            todo.id === todoId
              ? { ...todo, completed: previousCompleted }
              : todo,
          ),
        )
      } finally {
        mutationBusyRef.current = false
        setIsLoading(false)
      }
    },
    [game, todos],
  )

  const setTodoCompleted = useCallback(
    async (todoId, completed) => {
      if (mutationBusyRef.current) {
        return
      }

      const currentTodo = todos.find((todo) => todo.id === todoId)
      if (!currentTodo) {
        return
      }

      const previousCompleted = currentTodo.completed
      const nextCompleted = Boolean(completed)
      mutationBusyRef.current = true
      setIsLoading(true)

      try {
        setTodos((currentTodos) =>
          currentTodos.map((todo) =>
            todo.id === todoId
              ? { ...todo, completed: nextCompleted }
              : todo,
          ),
        )

        if (currentTodo.supabaseId) {
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ is_completed: nextCompleted })
            .eq('id', currentTodo.supabaseId)

          if (updateError) {
            throw updateError
          }
        }
      } catch (updateError) {
        setError(updateError.message || '更新任务失败')
        setTodos((currentTodos) =>
          currentTodos.map((todo) =>
            todo.id === todoId
              ? { ...todo, completed: previousCompleted }
              : todo,
          ),
        )
      } finally {
        mutationBusyRef.current = false
        setIsLoading(false)
      }
    },
    [todos],
  )

  const deleteTodo = useCallback(
    async (todoId) => {
      if (mutationBusyRef.current) {
        return
      }

      const currentTodo = todos.find((todo) => todo.id === todoId)
      if (!currentTodo) {
        return
      }

      mutationBusyRef.current = true
      setIsLoading(true)

      try {
        if (currentTodo.supabaseId) {
          const { error: deleteError } = await supabase
            .from('tasks')
            .delete()
            .eq('id', currentTodo.supabaseId)

          if (deleteError) {
            throw deleteError
          }
        }

        setTodos((currentTodos) =>
          currentTodos.filter((todo) => todo.id !== todoId),
        )
      } catch (deleteError) {
        setError(deleteError.message || '删除任务失败')
      } finally {
        mutationBusyRef.current = false
        setIsLoading(false)
      }
    },
    [todos],
  )

  const updateTodo = useCallback(
    async (todoId, updates = {}) => {
      if (mutationBusyRef.current) {
        return
      }

      const currentTodo = todos.find((todo) => todo.id === todoId)
      if (!currentTodo) {
        return
      }

      const nextTodo = normalizeTodo({ ...currentTodo, ...updates })
      mutationBusyRef.current = true
      setIsLoading(true)

      try {
        if (currentTodo.supabaseId) {
          const row = toSupabaseRow(nextTodo)
          const { error: updateError } = await supabase
            .from('tasks')
            .update({
              content: row.content,
              is_completed: row.is_completed,
              source: row.source,
              est_minutes: row.est_minutes,
              target_date: row.target_date,
              metadata: row.metadata,
            })
            .eq('id', currentTodo.supabaseId)

          if (updateError) {
            throw updateError
          }
        }

        setTodos((currentTodos) =>
          currentTodos.map((todo) =>
            todo.id === todoId ? nextTodo : todo,
          ),
        )
      } catch (updateError) {
        setError(updateError.message || '编辑任务失败')
      } finally {
        mutationBusyRef.current = false
        setIsLoading(false)
      }
    },
    [todos],
  )

  const markTodoReminded = useCallback((todoId) => {
    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === todoId
          ? { ...todo, remindedForMissed: true }
          : todo,
      ),
    )
  }, [])

  const syncGoalTodos = useCallback((goalTodos = []) => {
    setTodos((currentTodos) => {
      const manualTodos = currentTodos.filter((todo) => todo.source !== 'goal')
      const existingGoalMap = new Map(
        currentTodos
          .filter((todo) => todo.source === 'goal' && todo.goalTaskId)
          .map((todo) => [todo.goalTaskId, todo]),
      )

      const nextGoalTodos = goalTodos.map((goalTodo) => {
        const existing = existingGoalMap.get(goalTodo.goalTaskId)
        return existing
          ? { ...existing, ...goalTodo, completed: existing.completed }
          : normalizeTodo(goalTodo)
      })

      return [...manualTodos, ...nextGoalTodos]
    })
  }, [])

  useEffect(() => {
    fetchTodos()

    let channel = null
    if (isSupabaseConfigured) {
      channel = supabase
        .channel('tasks-sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
          },
          () => {
            fetchTodos()
          },
        )
        .subscribe()
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchTodos])

  return (
    <TodoContext.Provider
      value={{
        todos,
        isLoading,
        error,
        syncTodos: fetchTodos,
        addTodo,
        addTodos,
        toggleTodo,
        setTodoCompleted,
        deleteTodo,
        updateTodo,
        syncGoalTodos,
        markTodoReminded,
      }}
    >
      {children}
    </TodoContext.Provider>
  )
}

export function useTodo() {
  const context = useContext(TodoContext)
  if (!context) {
    throw new Error('useTodo must be used within TodoProvider')
  }
  return context
}
