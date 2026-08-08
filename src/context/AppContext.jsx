import { createContext, useContext, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const AppContext = createContext(null)
const USERNAME_KEY = 'executive-coach-username'
const DEFAULT_USERNAME = '执行者'

function readStoredUsername() {
  try {
    return (
      window.localStorage.getItem(USERNAME_KEY) || DEFAULT_USERNAME
    )
  } catch {
    return DEFAULT_USERNAME
  }
}

export function AppProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const activeView =
    location.pathname === '/today'
      ? 'today'
      : location.pathname === '/goals'
        ? 'goals'
        : 'chat'
  const [username, setUsernameState] = useState(readStoredUsername)

  function setUsername(value) {
    const cleanUsername = value.trim()
    const nextUsername = cleanUsername || DEFAULT_USERNAME
    setUsernameState(nextUsername)

    try {
      window.localStorage.setItem(USERNAME_KEY, nextUsername)
    } catch {
      // Local storage can be unavailable in strict privacy modes.
    }
  }

  function setActiveView(view) {
    const routeMap = {
      chat: '/chat',
      today: '/today',
      goals: '/goals',
    }
    navigate(routeMap[view] || '/chat')
  }

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        username,
        setUsername,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
