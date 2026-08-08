import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useApp } from './AppContext'
import { useGame } from './GameContext'

const ReminderContext = createContext(null)
const REMINDER_STORAGE_KEY = 'executive-coach-reminders'
const RESPONSE_STORAGE_KEY = 'executive-coach-reminder-responses'

const PRESET_REMINDERS = [
  {
    id: 'preset-morning',
    title: '晨间启动',
    content: '开始今天的第一格行动',
    time: '08:00',
    weekdays: [],
    enabled: true,
  },
  {
    id: 'preset-noon',
    title: '查看群/官网',
    content: '有什么需要处理的吗？',
    time: '12:00',
    weekdays: [],
    enabled: true,
  },
  {
    id: 'preset-evening',
    title: '晚间复盘',
    content: '把今天写成一段冒险故事',
    time: '21:00',
    weekdays: [],
    enabled: true,
  },
  {
    id: 'preset-sunday',
    title: '周日大扫除',
    content: '清理待办、文件和生活空间',
    time: '19:00',
    weekdays: [0],
    enabled: true,
  },
]

function createReminderId() {
  return `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function readReminders() {
  if (typeof window === 'undefined') {
    return PRESET_REMINDERS
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(REMINDER_STORAGE_KEY) || 'null',
    )
    return Array.isArray(parsed) ? parsed : PRESET_REMINDERS
  } catch {
    return PRESET_REMINDERS
  }
}

function readResponses() {
  if (typeof window === 'undefined') {
    return { responseCount: 0, respondedIds: [] }
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RESPONSE_STORAGE_KEY) || '{}',
    )
    return {
      responseCount: Number(parsed.responseCount) || 0,
      respondedIds: Array.isArray(parsed.respondedIds)
        ? parsed.respondedIds
        : [],
    }
  } catch {
    return { responseCount: 0, respondedIds: [] }
  }
}

export function ReminderProvider({ children }) {
  const { setActiveView } = useApp()
  const game = useGame()
  const initialReminders = readReminders()
  const initialResponses = readResponses()
  const [reminders, setReminders] = useState(initialReminders)
  const [responseCount, setResponseCount] = useState(
    initialResponses.responseCount,
  )
  const [respondedIds, setRespondedIds] = useState(
    initialResponses.respondedIds,
  )
  const lastTriggeredMinuteRef = useRef('')

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      const permissionRequest = Notification.requestPermission()
      if (permissionRequest?.catch) {
        permissionRequest.catch(() => {})
      }
    }
  }, [])

  function persistReminders(nextReminders) {
    setReminders(nextReminders)
    try {
      window.localStorage.setItem(
        REMINDER_STORAGE_KEY,
        JSON.stringify(nextReminders),
      )
    } catch {
      // Local storage can be unavailable in privacy modes.
    }
  }

  function addReminder({ title, content = '', time, weekdays = [], enabled = true }) {
    if (!title?.trim() || !time) {
      return null
    }

    const reminder = {
      id: createReminderId(),
      title: title.trim(),
      content: content.trim(),
      time,
      weekdays,
      enabled,
    }
    persistReminders([...reminders, reminder])
    return reminder
  }

  function updateReminder(id, patch) {
    const nextReminders = reminders.map((reminder) =>
      reminder.id === id ? { ...reminder, ...patch } : reminder,
    )
    persistReminders(nextReminders)
  }

  function toggleReminder(id) {
    const nextReminders = reminders.map((reminder) =>
      reminder.id === id
        ? { ...reminder, enabled: !reminder.enabled }
        : reminder,
    )
    persistReminders(nextReminders)
  }

  function deleteReminder(id) {
    persistReminders(reminders.filter((reminder) => reminder.id !== id))
  }

  function markResponded(reminderId) {
    if (respondedIds.includes(reminderId)) {
      return
    }

    const nextRespondedIds = [...respondedIds, reminderId]
    const nextResponseCount = responseCount + 1
    setRespondedIds(nextRespondedIds)
    setResponseCount(nextResponseCount)

    try {
      window.localStorage.setItem(
        RESPONSE_STORAGE_KEY,
        JSON.stringify({
          responseCount: nextResponseCount,
          respondedIds: nextRespondedIds,
        }),
      )
    } catch {
      // Local storage can be unavailable in privacy modes.
    }

    const achievement = game.unlockAchievement('echo')

    window.dispatchEvent(
      new CustomEvent('reminder:responded', {
        detail: {
          reminderId,
          count: nextResponseCount,
          achievementTitle: achievement?.title || null,
        },
      }),
    )
  }

  function triggerReminder(reminder) {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const notification = new Notification(reminder.title, {
        body: reminder.content || `${reminder.time} 提醒`,
      })

      notification.onclick = () => {
        window.focus()
        setActiveView('chat')
        markResponded(reminder.id)
        notification.close()
      }
    }

    window.dispatchEvent(
      new CustomEvent('reminder:triggered', {
        detail: reminder,
      }),
    )
  }

  useEffect(() => {
    function checkReminders() {
      const now = new Date()
      const minutes = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes(),
      ).padStart(2, '0')}`
      const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${minutes}`

      if (lastTriggeredMinuteRef.current === minuteKey) {
        return
      }

      lastTriggeredMinuteRef.current = minuteKey
      const weekday = now.getDay()

      reminders.forEach((reminder) => {
        if (!reminder.enabled || reminder.time !== minutes) {
          return
        }
        if (reminder.weekdays?.length && !reminder.weekdays.includes(weekday)) {
          return
        }

        triggerReminder(reminder)
      })
    }

    checkReminders()
    const intervalId = setInterval(checkReminders, 60000)

    return () => clearInterval(intervalId)
  }, [reminders])

  return (
    <ReminderContext.Provider
      value={{
        reminders,
        responseCount,
        respondedIds,
        addReminder,
        updateReminder,
        toggleReminder,
        deleteReminder,
        markResponded,
        requestPermission: () => {
          if (
            typeof window !== 'undefined' &&
            'Notification' in window
          ) {
            const permissionRequest = Notification.requestPermission()
            if (permissionRequest?.catch) {
              permissionRequest.catch(() => {})
            }
          }
        },
      }}
    >
      {children}
    </ReminderContext.Provider>
  )
}

export function useReminder() {
  const context = useContext(ReminderContext)
  if (!context) {
    throw new Error('useReminder must be used within ReminderProvider')
  }
  return context
}
