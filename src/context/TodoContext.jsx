import { createContext, useCallback, useContext, useState } from 'react'
import { useGame } from './GameContext'

const TodoContext = createContext(null)

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeTodo(item) {
  return {
    ...item,
    id: item.id || createId('todo'),
    title: item.title || item.action || '未命名待办',
    source: item.source || 'manual',
    completed: Boolean(item.completed),
    createdAt: item.createdAt || new Date().toISOString(),
    remindedForMissed: Boolean(item.remindedForMissed),
  }
}

export function TodoProvider({ children }) {
  const game = useGame()
  const [todos, setTodos] = useState([])

  const addTodos = useCallback((items = []) => {
    if (!items.length) {
      return []
    }

    const nextTodos = items.map((item) => normalizeTodo(item))
    setTodos((currentTodos) => [
      ...currentTodos,
      ...nextTodos,
    ])
    return nextTodos
  }, [])

  const addTodo = useCallback(
    ({ title, source = 'manual' } = {}) => {
      addTodos([{ title, source }])
    },
    [addTodos],
  )

  const toggleTodo = useCallback(
    (todoId) => {
      const currentTodo = todos.find((todo) => todo.id === todoId)
      if (!currentTodo) {
        return
      }

      const willComplete = !currentTodo.completed
      if (willComplete) {
        game.addExp(10)
      }

      setTodos((currentTodos) =>
        currentTodos.map((todo) =>
          todo.id === todoId
            ? { ...todo, completed: willComplete }
            : todo,
        ),
      )
    },
    [game, todos],
  )

  const setTodoCompleted = useCallback((todoId, completed) => {
    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: Boolean(completed) } : todo,
      ),
    )
  }, [])

  const deleteTodo = useCallback((todoId) => {
    setTodos((currentTodos) =>
      currentTodos.filter((todo) => todo.id !== todoId),
    )
  }, [])

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

  return (
    <TodoContext.Provider
      value={{
        todos,
        addTodo,
        addTodos,
        toggleTodo,
        setTodoCompleted,
        deleteTodo,
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
