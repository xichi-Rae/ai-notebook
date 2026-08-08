import { createContext, useContext, useEffect, useReducer } from 'react'
import { EXECUTIVE_COACH_SYSTEM_PROMPT } from '../config/systemPrompt'
import {
  fetchDeepSeekReply,
  parseAssistantContent,
} from '../services/deepseek'
import { playTaskCompleteSound } from '../utils/sound'
import { sanitizeAIResponse } from '../utils/sanitizeAIResponse'
import { useGame } from './GameContext'
import { useGoal } from './GoalContext'
import { useRecord } from './RecordContext'
import { useSop } from './SopContext'
import { useTodo } from './TodoContext'

const ChatContext = createContext(null)
const STYLE_LEARNING_KEY = 'executive-coach-style-learning'

let idCounter = 0

function createId(prefix = 'msg') {
  idCounter += 1
  return `${prefix}-${Date.now()}-${idCounter}`
}

function buildInitialMessages() {
  return [
    {
      id: 'welcome',
      role: 'system',
      type: 'text',
      text: '我是执行猫。今天不追求“状态很好”，只追求“还能推动一格”。把你想推进的事发给我，我会把它压成 5-25 分钟的行动单元。',
    },
    {
      id: 'meaning',
      role: 'system',
      type: 'meaning',
      title: '今日为什么做',
      body: '今天不是为了证明自己，而是为了保留“我还能为在意的事情行动”的能力。意义感会在完成最小一格后重新出现。',
    },
    {
      id: 'hint',
      role: 'system',
      type: 'text',
      text: '你可以说“我完成了整理高频话题卡”，或发“记账 午餐 25”“我吃了炸鸡”，我会同步更新目标、经验值和今日记录。',
    },
  ]
}

function serializeMessageForApi(message) {
  if (message.type === 'meaning') {
    return `[今日为什么做]\n${message.body || message.text}`
  }

  if (message.type === 'task') {
    return `[任务卡片] ${message.title}（${message.duration ?? 25} 分钟倒计时）`
  }

  return message.text || message.body || ''
}

function readStyleLearning() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STYLE_LEARNING_KEY) || '[]',
    )
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

function buildSystemPrompt() {
  const learnedStyles = readStyleLearning()
  if (learnedStyles.length === 0) {
    return EXECUTIVE_COACH_SYSTEM_PROMPT
  }

  return `${EXECUTIVE_COACH_SYSTEM_PROMPT}

## 风格学习区
用户教过你的回复风格：
${learnedStyles.map((style) => `- ${style}`).join('\n')}

在生成回复时优先遵守这些规则。`
}

function buildApiMessages(messages) {
  return [
    {
      role: 'system',
      content: buildSystemPrompt(),
    },
    ...messages.map((message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: serializeMessageForApi(message),
    })),
  ]
}

const initialState = {
  draft: '',
  isTyping: false,
  activeTask: null,
  messages: buildInitialMessages(),
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DRAFT':
      return { ...state, draft: action.value }

    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: action.message.id,
            role: 'user',
            type: 'text',
            text: action.message.text,
          },
        ],
      }

    case 'ADD_SYSTEM_MESSAGES':
      return {
        ...state,
        messages: [...state.messages, ...action.messages],
      }

    case 'SET_MESSAGES':
      return { ...state, messages: action.messages }

    case 'SET_TYPING':
      return { ...state, isTyping: action.value }

    case 'START_TASK':
      return { ...state, activeTask: action.task }

    case 'TICK_TASK': {
      const task = state.activeTask
      if (!task || task.status !== 'running' || task.remainingSeconds <= 0) {
        return state
      }

      const remainingSeconds = task.remainingSeconds - 1

      return {
        ...state,
        activeTask: {
          ...task,
          remainingSeconds,
          status: remainingSeconds <= 0 ? 'completed' : 'running',
        },
      }
    }

    case 'COMPLETE_TASK': {
      const task = state.activeTask
      if (!task || task.id !== action.taskId || task.status === 'completed') {
        return state
      }

      return {
        ...state,
        activeTask: {
          ...task,
          status: 'completed',
          remainingSeconds: 0,
        },
      }
    }

    default:
      return state
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const game = useGame()
  const goal = useGoal()
  const record = useRecord()
  const todo = useTodo()
  const sop = useSop()

  useEffect(() => {
    const task = state.activeTask
    if (!task || task.status !== 'running' || task.remainingSeconds <= 0) {
      return undefined
    }

    const intervalId = setInterval(() => {
      dispatch({ type: 'TICK_TASK' })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [state.activeTask?.id, state.activeTask?.status])

  useEffect(() => {
    function handleReminderTriggered(event) {
      const reminder = event.detail
      dispatch({
        type: 'ADD_SYSTEM_MESSAGES',
        messages: [
          {
            id: createId('sys'),
            role: 'system',
            type: 'reminder',
            title: reminder.title,
            text: reminder.content || reminder.time,
            reminderId: reminder.id,
            time: reminder.time,
          },
        ],
      })
    }

    function handleReminderResponded(event) {
      const detail = event.detail
      const achievementCopy = detail.achievementTitle
        ? `成就解锁：${detail.achievementTitle}。`
        : ''

      dispatch({
        type: 'ADD_SYSTEM_MESSAGES',
        messages: [
          {
            id: createId('sys'),
            role: 'system',
            type: 'text',
            reward: true,
            text: `提醒打卡成功。这是第 ${detail.count} 次连续响应。${achievementCopy}`,
          },
        ],
      })
    }

    function handleTodoStale(event) {
      const todo = event.detail
      dispatch({
        type: 'ADD_SYSTEM_MESSAGES',
        messages: [
          {
            id: createId('sys'),
            role: 'system',
            type: 'text',
            text: `看到「${todo.title}」连续两天没打勾了，是卡住了还是需要调整？`,
          },
        ],
      })
    }

    function handleSopFeedback(event) {
      const { sop: currentSop } = event.detail
      dispatch({
        type: 'ADD_SYSTEM_MESSAGES',
        messages: [
          {
            id: createId('sys'),
            role: 'system',
            type: 'text',
            text: `你的「${currentSop.title}」SOP 用起来怎么样？有没有哪一步的顺序或时间需要调整？`,
          },
        ],
      })
    }

    function handleSopTriggered(event) {
      const { sop: currentSop, execution: sopExecution } = event.detail
      dispatch({
        type: 'ADD_SYSTEM_MESSAGES',
        messages: [
          {
            id: createId('sys'),
            role: 'system',
            type: 'sop',
            sopId: currentSop.id,
            title: currentSop.title,
            sop: currentSop,
            execution: sopExecution,
          },
        ],
      })
    }

    function handleSopCompleted(event) {
      const { sop: currentSop } = event.detail
      dispatch({
        type: 'ADD_SYSTEM_MESSAGES',
        messages: [
          {
            id: createId('sys'),
            role: 'system',
            type: 'text',
            reward: true,
            text: `🎉 ${currentSop.title} SOP 完成！你获得了 +30 经验值。`,
          },
        ],
      })
    }

    window.addEventListener('reminder:triggered', handleReminderTriggered)
    window.addEventListener('reminder:responded', handleReminderResponded)
    window.addEventListener('todo:stale', handleTodoStale)
    window.addEventListener('sop:feedback', handleSopFeedback)
    window.addEventListener('sop:triggered', handleSopTriggered)
    window.addEventListener('sop:completed', handleSopCompleted)

    return () => {
      window.removeEventListener('reminder:triggered', handleReminderTriggered)
      window.removeEventListener('reminder:responded', handleReminderResponded)
      window.removeEventListener('todo:stale', handleTodoStale)
      window.removeEventListener('sop:feedback', handleSopFeedback)
      window.removeEventListener('sop:triggered', handleSopTriggered)
      window.removeEventListener('sop:completed', handleSopCompleted)
    }
  }, [])

  function applyActionCard(actionCard, nextMessages) {
    if (actionCard.type === 'timer') {
      const duration = Math.round(actionCard.duration)
      const taskId = `task-${Date.now()}`
      const title = actionCard.title || '开始25分钟专注'
      const totalSeconds = duration * 60

      nextMessages.push({
        id: createId('sys'),
        role: 'system',
        type: 'task',
        title,
        taskId,
        duration,
        totalSeconds,
        status: 'idle',
      })

      const warning = sop.getLoadWarning(duration)
      return warning ? { feedback: warning } : null
    }

    if (actionCard.type === 'todo') {
      const title = actionCard.title || actionCard.content || ''
      if (title) {
        todo.addTodo({
          title,
          source: actionCard.source === 'manual' ? 'manual' : 'ai',
          estMinutes:
            Number(actionCard.est_minutes ?? actionCard.estMinutes) || 30,
        })
        const warning = sop.getLoadWarning(
          Number(actionCard.est_minutes ?? actionCard.estMinutes) || 30,
        )
        return {
          feedback: `已添加到今日待办：${title}${
            warning ? `。${warning}` : ''
          }`,
        }
      }
    }

    if (actionCard.type === 'sopWizard') {
      sop.openWizard()
      return {
        feedback: 'SOP 创建向导已打开。',
      }
    }

    if (actionCard.type === 'sopUpdate') {
      if (actionCard.sopId && Array.isArray(actionCard.steps)) {
        sop.updateSopSteps(actionCard.sopId, actionCard.steps)
        return {
          feedback: '已根据你的反馈更新 SOP 步骤。',
        }
      }
    }

    if (actionCard.type === 'goalProgress') {
      const target = goal.findGoalByTitle(actionCard.goalTitle)
      if (!target) {
        return {
          feedback: `没有找到目标“${actionCard.goalTitle}”，请先在目标地图中添加它。`,
        }
      }

      if (actionCard.nodeTitle) {
        const node = target.nodes.find(
          (item) =>
            item.title === actionCard.nodeTitle ||
            item.id === actionCard.nodeTitle,
        )

        if (node && !node.completed) {
          goal.toggleGoalNode(target.id, node.id)
          const reward = game.grantReward({
            exp: 15,
            coins: 5,
            actionType: 'goal',
          })
          const achievementCopy = reward.newlyUnlocked.length
            ? `成就解锁：${reward.newlyUnlocked
                .map((item) => item.title)
                .join('、')}。`
            : ''

          return {
            feedback: `已推进“${node.title}”。你获得 +15 经验值和 +5 金币。${achievementCopy}`,
          }
        }

        if (node?.completed) {
          return { feedback: `“${node.title}”已经完成，不用重复推进。` }
        }
      }

      if (Number.isFinite(Number(actionCard.progress))) {
        goal.setGoalProgress(target.id, Number(actionCard.progress))
        return {
          feedback: `已将“${target.title}”进度更新为 ${Number(
            actionCard.progress,
          )}%。`,
        }
      }

      return {
        feedback: `已定位目标“${target.title}”，但缺少可更新的阶段信息。`,
      }
    }

    if (
      actionCard.type === 'record' ||
      actionCard.type === 'diet' ||
      actionCard.type === 'bill'
    ) {
      const recordType = actionCard.recordType || actionCard.type

      if (recordType === 'diet') {
        record.addDiet({
          meal: actionCard.meal,
          content: actionCard.content,
          cost: actionCard.cost,
        })
        return {
          feedback: `已记录${actionCard.meal || '一餐'}：${
            actionCard.content || '未填写内容'
          }。`,
        }
      }

      if (recordType === 'bill') {
        record.addBill({
          item: actionCard.item,
          amount: actionCard.amount,
          category: actionCard.category,
        })
        return {
          feedback: `已记账：${actionCard.item || '未命名'} ${Number(
            actionCard.amount,
          ) || 0} 元。`,
        }
      }

      if (recordType === 'mood') {
        record.updateToday({ mood: actionCard.mood })
        return { feedback: `已记录今日心情：${actionCard.mood}` }
      }

      if (recordType === 'energy') {
        record.updateToday({ energy: Number(actionCard.energy) })
        return { feedback: `已记录今日能量：${Number(actionCard.energy)}/5` }
      }

      if (recordType === 'focus') {
        record.updateToday({ focus: actionCard.focus })
        return { feedback: '已记录今日专注状态。' }
      }

      return null
    }

    if (actionCard.type === 'game') {
      const reward = game.grantReward({
        exp: Number(actionCard.exp) || 15,
        coins: Number(actionCard.coins) || 5,
      })
      const levelCopy = reward.leveledUp
        ? `等级提升到 Lv.${reward.level}。`
        : ''

      return {
        feedback: `你获得 +${reward.gainedExp} 经验值和 +${reward.gainedCoins} 金币。${levelCopy}`,
      }
    }

    return null
  }

  async function generateAssistantReply(historyForApi, replacementMessages = null) {
    dispatch({ type: 'SET_TYPING', value: true })
    try {
      const content = await fetchDeepSeekReply(historyForApi)
      const parsed = parseAssistantContent(content)
      const nextMessages = []

      if (parsed.text) {
        nextMessages.push({
          id: createId('sys'),
          role: 'system',
          type: 'text',
          text: sanitizeAIResponse(parsed.text),
        })
      }

      if (parsed.actionCard) {
        const actionResult = applyActionCard(parsed.actionCard, nextMessages)
        if (actionResult?.feedback) {
          nextMessages.push({
            id: createId('sys'),
            role: 'system',
            type: 'text',
            reward: true,
            text: actionResult.feedback,
          })
        }
      }

      if (replacementMessages) {
        dispatch({
          type: 'SET_MESSAGES',
          messages: [...replacementMessages, ...nextMessages],
        })
      } else if (nextMessages.length > 0) {
        dispatch({ type: 'ADD_SYSTEM_MESSAGES', messages: nextMessages })
      }
    } catch (error) {
      const message = /401|auth|api key|invalid/i.test(error.message)
        ? 'DeepSeek API 密钥未配置或无效。请在 .env.local 中填写 VITE_DEEPSEEK_API_KEY 后重启开发服务器。'
        : `DeepSeek 请求失败：${error.message}`

      dispatch({
        type: 'ADD_SYSTEM_MESSAGES',
        messages: [
          {
            id: createId('sys'),
            role: 'system',
            type: 'text',
            error: true,
            text: message,
          },
        ],
      })
    } finally {
      dispatch({ type: 'SET_TYPING', value: false })
    }
  }

  async function sendMessage(rawText) {
    const text = rawText.trim()
    if (!text || state.isTyping) {
      return
    }

    dispatch({
      type: 'ADD_USER_MESSAGE',
      message: {
        id: createId('user'),
        text,
      },
    })

    if (/(建立|创建).*sop|整理一下每日流程|帮我整理.*流程/i.test(text)) {
      dispatch({
        type: 'ADD_SYSTEM_MESSAGES',
        messages: [
          {
            id: createId('sys'),
            role: 'system',
            type: 'text',
            text: '我听到你想建立 SOP。先回答我一个问题：你现在生活中最混乱、最消耗你精力的时间段或场景是什么？',
          },
        ],
      })
      sop.openWizard()
      return
    }

    const historyForApi = buildApiMessages([
      ...state.messages,
      {
        role: 'user',
        type: 'text',
        text,
      },
    ])

    await generateAssistantReply(historyForApi)
  }

  function teachStyle(instruction) {
    const cleanInstruction = instruction.trim()
    if (!cleanInstruction || state.isTyping) {
      return
    }

    const learnedStyles = readStyleLearning()
    const nextStyles = [...learnedStyles, cleanInstruction]

    try {
      window.localStorage.setItem(
        STYLE_LEARNING_KEY,
        JSON.stringify(nextStyles),
      )
    } catch {
      // Local storage can be unavailable in strict privacy modes.
    }

    const lastUserIndex = state.messages.reduce(
      (foundIndex, message, index) =>
        message.role === 'user' ? index : foundIndex,
      -1,
    )

    if (lastUserIndex < 0) {
      return
    }

    const keepMessages = state.messages.slice(0, lastUserIndex + 1)
    const historyForApi = buildApiMessages(keepMessages)
    generateAssistantReply(historyForApi, keepMessages)
  }

  function completeTask(taskId, title = '任务') {
    const task = state.activeTask
    if (!task || task.id !== taskId || task.status === 'completed') {
      return
    }

    const reward = game.grantReward({
      exp: 15,
      coins: 5,
      actionType: 'task',
    })
    dispatch({ type: 'COMPLETE_TASK', taskId })

    window.dispatchEvent(
      new CustomEvent('task:completed', {
        detail: {
          taskId,
          title,
          reward: {
            xp: 15,
            coins: 5,
          },
        },
      }),
    )

    playTaskCompleteSound()

    const levelCopy = reward.leveledUp
      ? `等级提升到 Lv.${reward.level}。`
      : `距离下一级还差 ${reward.expToNextLevel - reward.exp} 点经验。`
    const achievementCopy = reward.newlyUnlocked.length
      ? `成就解锁：${reward.newlyUnlocked
          .map((item) => item.title)
          .join('、')}。`
      : ''

    const messages = [
      {
        id: createId('sys'),
        role: 'system',
        type: 'text',
        reward: true,
        text: `完成。你获得了 +15 经验值和 +5 金币。${levelCopy}${achievementCopy}`,
      },
    ]

    dispatch({
      type: 'ADD_SYSTEM_MESSAGES',
      messages,
    })
  }

  function setDraft(value) {
    dispatch({ type: 'SET_DRAFT', value })
  }

  function addSystemMessage(text, options = {}) {
    dispatch({
      type: 'ADD_SYSTEM_MESSAGES',
      messages: [
        {
          id: createId('sys'),
          role: 'system',
          type: 'text',
          text,
          ...options,
        },
      ],
    })
  }

  return (
    <ChatContext.Provider
      value={{
        ...state,
        sendMessage,
        teachStyle,
        completeTask,
        setDraft,
        addSystemMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within ChatProvider')
  }
  return context
}
