import { createContext, useContext, useReducer } from 'react'

const GameContext = createContext(null)
const GAME_STORAGE_KEY = 'executive-coach-game-state'
const INITIAL_LEVEL = 7
const INITIAL_EXP = 0
const INITIAL_EXP_TO_NEXT_LEVEL = 300

function resetLegacyGameState() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(GAME_STORAGE_KEY)
  } catch {
    // Ignore storage cleanup failures.
  }
}

const ACHIEVEMENTS = [
  {
    id: 'first-task',
    title: '初次出刀',
    description: '完成第一个任务或目标阶段',
    unlocked: false,
    icon: 'target',
  },
  {
    id: 'focus-warrior',
    title: '专注战士',
    description: '累计完成 3 个行动单元',
    unlocked: false,
    icon: 'timer',
  },
  {
    id: 'streak-3',
    title: '三日连击',
    description: '连续积累 3 个行动单元',
    unlocked: false,
    icon: 'flame',
  },
  {
    id: 'echo',
    title: '应声虫',
    description: '连续响应提醒打卡 3 次',
    unlocked: false,
    icon: 'bell',
  },
  {
    id: 'notification-unlock',
    title: '通知解锁',
    description: '开启浏览器通知权限',
    unlocked: false,
    icon: 'bell',
  },
]

const LEVEL_GUIDE = {
  rewards: [
    { label: '完成番茄钟', exp: 15 },
    { label: '达成日目标', exp: 30 },
    { label: '连续打卡 3 天（额外）', exp: 50 },
    { label: '获得成就', exp: 100 },
  ],
  coinUsage: '将来可兑换主题皮肤或休息券',
}

const initialState = {
  level: INITIAL_LEVEL,
  exp: INITIAL_EXP,
  expToNextLevel: INITIAL_EXP_TO_NEXT_LEVEL,
  coins: 0,
  streak: 0,
  totalCompletedActions: 0,
  achievements: ACHIEVEMENTS,
  isAchievementsOpen: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'GRANT_REWARD':
      return {
        ...state,
        level: action.level,
        exp: action.exp,
        expToNextLevel: action.expToNextLevel,
        coins: action.coins,
        totalCompletedActions: action.totalCompletedActions,
        achievements: state.achievements.map((achievement) =>
          action.unlockedIds.includes(achievement.id)
            ? { ...achievement, unlocked: true }
            : achievement,
        ),
      }

    case 'ADD_EXP':
      return {
        ...state,
        level: action.level,
        exp: action.exp,
        expToNextLevel: action.expToNextLevel,
      }

    case 'ADD_COINS':
      return { ...state, coins: action.coins }

    case 'UNLOCK_ACHIEVEMENT':
      return {
        ...state,
        achievements: state.achievements.map((achievement) =>
          achievement.id === action.id
            ? { ...achievement, unlocked: true }
            : achievement,
        ),
      }

    case 'SET_ACHIEVEMENTS_OPEN':
      return { ...state, isAchievementsOpen: action.value }

    default:
      return state
  }
}

function computeExp(currentExp, level, expToNextLevel, amount) {
  let nextExp = currentExp + amount
  let nextLevel = level
  let nextThreshold = expToNextLevel
  let leveledUp = false

  while (nextExp >= nextThreshold) {
    nextExp -= nextThreshold
    nextLevel += 1
    nextThreshold = Math.round(nextThreshold * 1.25)
    leveledUp = true
  }

  return {
    exp: nextExp,
    level: nextLevel,
    expToNextLevel: nextThreshold,
    leveledUp,
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    resetLegacyGameState()
    return initialState
  })

  function grantReward({ exp = 15, coins = 5, actionType = 'task' } = {}) {
    const expResult = computeExp(state.exp, state.level, state.expToNextLevel, exp)
    const totalCompletedActions = state.totalCompletedActions + 1
    const unlockedIds = []

    if (totalCompletedActions === 1) {
      unlockedIds.push('first-task')
    }
    if (totalCompletedActions >= 3) {
      unlockedIds.push('focus-warrior')
    }
    if (totalCompletedActions === 3) {
      unlockedIds.push('streak-3')
    }

    const newlyUnlocked = state.achievements.filter(
      (achievement) =>
        unlockedIds.includes(achievement.id) && !achievement.unlocked,
    )

    dispatch({
      type: 'GRANT_REWARD',
      ...expResult,
      coins: state.coins + coins,
      totalCompletedActions,
      unlockedIds,
    })

    return {
      ...expResult,
      gainedExp: exp,
      gainedCoins: coins,
      coins,
      newlyUnlocked,
      totalCompletedActions,
    }
  }

  function addExp(amount) {
    const result = computeExp(state.exp, state.level, state.expToNextLevel, amount)
    dispatch({ type: 'ADD_EXP', ...result })
    return result
  }

  function addCoins(amount) {
    const coins = state.coins + amount
    dispatch({ type: 'ADD_COINS', coins })
    return coins
  }

  function unlockAchievement(id) {
    const achievement = state.achievements.find((item) => item.id === id)
    if (!achievement || achievement.unlocked) {
      return null
    }
    dispatch({ type: 'UNLOCK_ACHIEVEMENT', id })
    return achievement
  }

  function openAchievements() {
    dispatch({ type: 'SET_ACHIEVEMENTS_OPEN', value: true })
  }

  function closeAchievements() {
    dispatch({ type: 'SET_ACHIEVEMENTS_OPEN', value: false })
  }

  return (
    <GameContext.Provider
      value={{
        ...state,
        LEVEL_GUIDE,
        grantReward,
        addExp,
        addCoins,
        unlockAchievement,
        openAchievements,
        closeAchievements,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within GameProvider')
  }
  return context
}
