import { createContext, useContext, useState } from 'react'

const RecordContext = createContext(null)

function getToday() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function createEmptyRecord(date) {
  return {
    date,
    mood: '😐',
    energy: 3,
    diet: [],
    bills: [],
    focus: 'distracted',
    sopCompletions: [],
  }
}

export function RecordProvider({ children }) {
  const today = getToday()
  const [records, setRecords] = useState({
    [today]: createEmptyRecord(today),
  })

  const todayRecord = records[today] || createEmptyRecord(today)

  function updateToday(patch) {
    setRecords((currentRecords) => ({
      ...currentRecords,
      [today]: {
        ...createEmptyRecord(today),
        ...currentRecords[today],
        ...patch,
      },
    }))
  }

  function addDiet({ meal = '午餐', content = '', cost = 0 }) {
    setRecords((currentRecords) => {
      const current = currentRecords[today] || createEmptyRecord(today)
      return {
        ...currentRecords,
        [today]: {
          ...current,
          diet: [
            ...current.diet,
            {
              meal,
              content,
              cost: Number(cost) || 0,
            },
          ],
        },
      }
    })
  }

  function addBill({ item = '未命名', amount = 0, category = '餐饮' }) {
    setRecords((currentRecords) => {
      const current = currentRecords[today] || createEmptyRecord(today)
      return {
        ...currentRecords,
        [today]: {
          ...current,
          bills: [
            ...current.bills,
            {
              item,
              amount: Number(amount) || 0,
              category,
            },
          ],
        },
      }
    })
  }

  function setMood(mood) {
    updateToday({ mood })
  }

  function setEnergy(energy) {
    updateToday({ energy: Number(energy) })
  }

  function setFocus(focus) {
    updateToday({ focus })
  }

  function addSopCompletion({ title, steps = 0, completedAt = new Date().toISOString() }) {
    setRecords((currentRecords) => {
      const current = currentRecords[today] || createEmptyRecord(today)
      return {
        ...currentRecords,
        [today]: {
          ...current,
          sopCompletions: [
            ...(current.sopCompletions || []),
            {
              title,
              steps,
              completedAt,
            },
          ],
        },
      }
    })
  }

  return (
    <RecordContext.Provider
      value={{
        today,
        todayRecord,
        records,
        updateToday,
        addDiet,
        addBill,
        setMood,
        setEnergy,
        setFocus,
        addSopCompletion,
      }}
    >
      {children}
    </RecordContext.Provider>
  )
}

export function useRecord() {
  const context = useContext(RecordContext)
  if (!context) {
    throw new Error('useRecord must be used within RecordProvider')
  }
  return context
}
