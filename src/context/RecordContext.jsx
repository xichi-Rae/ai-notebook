import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

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
  const [isLoading, setIsLoading] = useState(true)
  const hydratedRef = useRef(false)
  const skipPersistRef = useRef(false)

  const fetchRecords = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .order('record_date', { ascending: false })

      if (error) {
        throw error
      }

      const remoteRecords = {}
      ;(data || []).forEach((row) => {
        remoteRecords[row.record_date] = {
          ...createEmptyRecord(row.record_date),
          ...(row.data || {}),
          date: row.record_date,
        }
      })
      if (!remoteRecords[today]) {
        remoteRecords[today] = createEmptyRecord(today)
      }

      skipPersistRef.current = true
      setRecords(remoteRecords)
    } catch (error) {
      console.error('Failed to load records', error)
    } finally {
      setIsLoading(false)
    }
  }, [today])

  const persistRecords = useCallback(
    async (nextRecords) => {
      if (!isSupabaseConfigured) {
        return
      }

      try {
        await supabase.from('records').upsert(
          Object.entries(nextRecords).map(([date, record]) => ({
            record_date: date,
            data: record,
          })),
          { onConflict: 'record_date' },
        )
      } catch (error) {
        console.error('Failed to save records', error)
      }
    },
    [],
  )

  useEffect(() => {
    async function initialize() {
      await fetchRecords()
      hydratedRef.current = true
    }
    initialize()
  }, [fetchRecords])

  useEffect(() => {
    if (!hydratedRef.current) {
      return
    }
    if (skipPersistRef.current) {
      skipPersistRef.current = false
      return
    }
    persistRecords(records)
  }, [persistRecords, records])

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
        isLoading,
        syncRecords: fetchRecords,
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
