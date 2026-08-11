import { useState } from 'react'
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  Check,
  GraduationCap,
  Loader2,
  Pencil,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  Target,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useGoal } from '../context/GoalContext'
import { fetchDeepSeekReply, parseJsonObject } from '../services/deepseek'
import { sanitizeAIResponse } from '../utils/sanitizeAIResponse'
import EditablePlanTree from './EditablePlanTree'
import GoalKanban from './GoalKanban'
import LearningAssetsPanel from './LearningAssetsPanel'

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getTodayKey() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function getDaysUntil(deadline) {
  if (!deadline) {
    return null
  }

  const deadlineTime = new Date(deadline).getTime()
  if (Number.isNaN(deadlineTime)) {
    return null
  }

  return Math.ceil((deadlineTime - Date.now()) / 86400000)
}

function normalizePlan(parsed) {
  const phases = Array.isArray(parsed?.phases)
    ? parsed.phases.map((phase, phaseIndex) => ({
        id: phase.id || createId('phase'),
        title: phase.title || `阶段 ${phaseIndex + 1}`,
        weeks: Array.isArray(phase.weeks)
          ? phase.weeks.map((week, weekIndex) => ({
              id: week.id || createId('week'),
              week: Number(week.week) || weekIndex + 1,
              tasks: Array.isArray(week.tasks)
                ? week.tasks.map((task, taskIndex) => ({
                    id: task.id || createId('task'),
                    day: Number(task.day) || taskIndex + 1,
                    action: task.action || '',
                    estMinutes:
                      Number(task.est_minutes ?? task.estMinutes) || 30,
                    date: task.date || '',
                  }))
                : [],
            }))
          : [],
      }))
    : []

  return { phases }
}

function flattenUncompletedTasks(goal) {
  const tasks = []

  goal?.plan?.phases?.forEach((phase) => {
    phase?.weeks?.forEach((week) => {
      week?.tasks?.forEach((task) => {
        tasks.push({
          phase: phase.title,
          week: week.week,
          day: task.day,
          action: task.action,
          estMinutes: task.estMinutes,
        })
      })
    })
  })

  return tasks
}

function buildTutorPrompt(goal) {
  const ladder = goal?.plan?.phases
    ?.map((phase) => phase.title)
    .join(' → ')

  return `你是用户学习「${goal.title}」的专属私教。你掌握用户的学习阶梯和当前进度。
当前学习阶梯：${ladder || '尚未设置'}
当前进度：${goal?.progress || 0}%
已掌握概念：${goal?.masteredConcepts?.join('、') || '暂无'}

你的教学原则：
1. 每次只问一个问题，从简单到困难递进。
2. 用户回答后，给出评分（1-5分），指出对错和遗漏。
3. 只重新解释用户没掌握的部分，不重复已知内容。
4. 如果用户连续答错2题，切换教学方法（从提问改为费曼复述：让用户用自己的话解释概念）。
5. 每完成一个知识点的检测，自动生成一条学习记录更新到目标进度中。
6. 每次对话结束前，建议明天需要重点复习的内容。
使用口语化、鼓励性语言，适当使用 Emoji。

每次回复末尾必须附上一行 JSON（不要包含其他文字）：
{"score":1-5,"understood":["本次确认掌握的概念"],"weak":["本次暴露的薄弱概念"]}`
}

async function extractConcepts(userText, assistantText) {
  const content = await fetchDeepSeekReply([
    {
      role: 'system',
      content:
        '从下面的私教对话中提取 1-3 个用户已经掌握的知识点。只返回 JSON，不要解释：{"concepts":["知识点1","知识点2"]}',
    },
    {
      role: 'user',
      content: `用户：${userText}\n\n私教：${assistantText}`,
    },
  ])

  const parsed = parseJsonObject(content)
  return Array.isArray(parsed?.concepts) ? parsed.concepts : []
}

function splitLearningResponse(content) {
  const trimmed = content.trimEnd()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```\s*$/)

  if (fenceMatch) {
    try {
      return {
        text: trimmed.slice(0, fenceMatch.index).trim(),
        json: JSON.parse(fenceMatch[1].trim()),
      }
    } catch {
      // Fall through to line-based parsing.
    }
  }

  const lines = trimmed.split(/\r?\n/)

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const candidate = lines.slice(index).join('\n').trim()
    if (!candidate.startsWith('{') || !candidate.endsWith('}')) {
      continue
    }

    try {
      return {
        text: lines.slice(0, index).join('\n').trim(),
        json: JSON.parse(candidate),
      }
    } catch {
      // Keep looking for a valid trailing JSON block.
    }
  }

  return { text: content, json: null }
}

export default function GoalDetail({ goalId, onBack }) {
  const {
    goals,
    updateGoalDeadline,
    replaceGoalPlan,
    upsertPhasePlan,
    saveLearningRecord,
    addMasteredConcepts,
    incrementGoalProgress,
    setWeakConcepts,
  } = useGoal()
  const goal = goals.find((item) => item.id === goalId)

  const [mode, setMode] = useState('overview')
  const [detailTab, setDetailTab] = useState('overview')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateDraft, setDateDraft] = useState(goal?.deadline || '')
  const [dateOptions, setDateOptions] = useState(null)
  const [planDraft, setPlanDraft] = useState(null)
  const [isReplanning, setIsReplanning] = useState(false)
  const [expandingPhaseId, setExpandingPhaseId] = useState(null)
  const [toast, setToast] = useState('')
  const [tutorMessages, setTutorMessages] = useState(() => [
    {
      role: 'assistant',
      content: `嗨，我是你学习「${goal?.title || '这个目标'}」的专属私教 👋 我们先从一个最基础的问题开始，你用自己现在会的程度回答就行。`,
    },
  ])
  const [tutorInput, setTutorInput] = useState('')
  const [isTutorLoading, setIsTutorLoading] = useState(false)

  if (!goal) {
    return (
      <section className="chat-scroll h-full overflow-y-auto bg-[#e9efec] px-4 py-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-slate-500"
        >
          <ArrowLeft size={16} />
          返回目标地图
        </button>
        <p className="mt-6 text-center text-base text-slate-500">目标不存在。</p>
      </section>
    )
  }

  function showToast(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  async function generatePhasePlan(phase) {
    if (expandingPhaseId) {
      return
    }

    setExpandingPhaseId(phase.id)
    const prompt = `你是目标拆分专家。请为以下阶段生成详细计划：
阶段：${phase.title}
阶段目标：${phase.objective || '未填写'}
所属目标：${goal.title}

请返回严格 JSON（不要包含其他文字）：
{"weeks":[{"week":1,"tasks":[{"day":1,"date":"YYYY-MM-DD","action":"具体可执行行动","est_minutes":30}]}]}

强制要求：
1. 返回 2-6 周。
2. 每周 3-5 个任务。
3. 每个任务必须包含 date、action、est_minutes。
4. 行动必须是今天打开就能做的原子动作。`

    try {
      const content = await fetchDeepSeekReply(
        [
          {
            role: 'system',
            content:
              '你是目标拆分专家。只返回合法 JSON，不要输出解释、Markdown 或代码块。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        { timeoutMs: 9000 },
      )
      const parsed = parseJsonObject(content)
      const weeks = parsed?.weeks || parsed?.phases?.[0]?.weeks

      if (!Array.isArray(weeks) || !weeks.length) {
        throw new Error('AI 没有返回有效的周任务')
      }

      const normalizedWeeks = weeks.map((week, weekIndex) => ({
        id: week.id || createId('week'),
        week: Number(week.week) || weekIndex + 1,
        tasks: Array.isArray(week.tasks)
          ? week.tasks.map((task, taskIndex) => ({
              id: task.id || createId('task'),
              day: Number(task.day) || taskIndex + 1,
              date: task.date || '',
              action: task.action || '',
              estMinutes:
                Number(task.est_minutes ?? task.estMinutes) || 30,
            }))
          : [],
      }))

      upsertPhasePlan(goal.id, {
        id: phase.id,
        title: phase.title,
        objective: phase.objective || '',
        weeks: normalizedWeeks,
      })
      showToast('阶段详细计划已生成')
    } catch (error) {
      showToast(`生成失败：${error.message}`)
    } finally {
      setExpandingPhaseId(null)
    }
  }

  function openDatePicker() {
    setDateDraft(goal.deadline || getTodayKey())
    setShowDatePicker(true)
  }

  function confirmDateSelection() {
    if (!dateDraft) {
      return
    }

    if (dateDraft === goal.deadline) {
      setShowDatePicker(false)
      return
    }

    setDateOptions({
      oldDeadline: goal.deadline,
      newDeadline: dateDraft,
    })
    setShowDatePicker(false)
  }

  function applyDeadlineOnly() {
    updateGoalDeadline(goal.id, dateOptions.newDeadline, { warning: true })
    setDateOptions(null)
    showToast('日期已保存，目标卡片将显示黄色警告。')
  }

  function openManualAdjust() {
    updateGoalDeadline(goal.id, dateOptions.newDeadline, { warning: false })
    setPlanDraft(goal.plan || { phases: [] })
    setDateOptions(null)
    setMode('manual')
  }

  async function handleAiReplan() {
    setIsReplanning(true)

    const uncompletedTasks = flattenUncompletedTasks(goal)
    const taskSummary = uncompletedTasks.length
      ? uncompletedTasks
          .map(
            (task) =>
              `- ${task.phase} / 第${task.week}周 / 第${task.day}天：${task.action}（${task.estMinutes}分钟）`,
          )
          .join('\n')
      : '暂无未完成任务'

    const prompt = `你是一个目标重排专家。请根据新的截止日期，重新安排以下未完成任务：
目标：${goal.title}
新截止日期：${dateOptions.newDeadline}
当前未完成任务：
${taskSummary}

请返回严格 JSON，格式：
{"phases":[{"title":"阶段名称","weeks":[{"week":1,"tasks":[{"day":1,"action":"具体行动","est_minutes":30}]}]}]}
行动必须具体到今天可以执行，不要写模糊描述。`

    try {
      const content = await fetchDeepSeekReply([
        {
          role: 'system',
          content:
            '你是目标重排专家。只返回合法 JSON，不要输出解释、Markdown 或代码块。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ])
      const parsed = parseJsonObject(content)

      if (!parsed?.phases?.length) {
        throw new Error('AI 没有返回有效计划')
      }

      replaceGoalPlan(goal.id, normalizePlan(parsed))
      updateGoalDeadline(goal.id, dateOptions.newDeadline, { warning: false })
      setDateOptions(null)
      showToast('AI 已重新调整每日任务。')
    } catch (error) {
      showToast(`AI 重排失败：${error.message}`)
    } finally {
      setIsReplanning(false)
    }
  }

  function saveManualPlan() {
    replaceGoalPlan(goal.id, planDraft)
    setMode('overview')
    showToast('手动调整后的计划已保存。')
  }

  async function sendTutorMessage() {
    const userText = tutorInput.trim()
    if (!userText || isTutorLoading) {
      return
    }

    const userMessage = { role: 'user', content: userText }
    const historyForApi = [
      { role: 'system', content: buildTutorPrompt(goal) },
      ...tutorMessages,
      userMessage,
    ]

    setTutorInput('')
    setIsTutorLoading(true)
    setTutorMessages((current) => [...current, userMessage])

    try {
      const assistantText = await fetchDeepSeekReply(historyForApi)
      const split = splitLearningResponse(assistantText)
      const displayText = sanitizeAIResponse(split.text || assistantText)
      const markers = split.json
      const assistantMessage = { role: 'assistant', content: displayText }

      setTutorMessages((current) => [...current, assistantMessage])
      saveLearningRecord(goal.id, {
        type: 'tutor',
        user: userText,
        assistant: displayText,
      })

      if (markers) {
        addMasteredConcepts(goal.id, markers.understood)
        setWeakConcepts(goal.id, markers.weak)
        incrementGoalProgress(goal.id, 5)
      } else {
        try {
          const concepts = await extractConcepts(userText, assistantText)
          addMasteredConcepts(goal.id, concepts)
          incrementGoalProgress(goal.id, 5)
        } catch {
          // Concept extraction is optional; learning record is already saved.
        }
      }
    } catch (error) {
      setTutorMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: `私教暂时卡住了：${error.message}`,
        },
      ])
    } finally {
      setIsTutorLoading(false)
    }
  }

  function renderPhaseCards() {
    const phases = goal.nodes?.length ? goal.nodes : goal.plan?.phases || []

    if (!phases.length) {
      return null
    }

    return (
      <div className="rounded-2xl border border-white bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-bold text-slate-800">阶段大纲</p>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
            {phases.length} 个阶段
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {phases.map((phase, index) => {
            const phasePlan = goal.plan?.phases?.find(
              (item) => item.id === phase.id,
            )
            const hasDetail = phasePlan?.weeks?.length
            const isExpanding = expandingPhaseId === phase.id

            return (
              <div
                key={phase.id}
                className="rounded-xl border border-sky-100 bg-sky-50/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-800">
                      {index + 1}. {phase.title}
                    </p>
                    {phase.objective && (
                      <p className="mt-1 text-sm text-slate-500">
                        {phase.objective}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasDetail) {
                        document
                          .getElementById('goal-kanban')
                          ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          })
                        return
                      }
                      generatePhasePlan(phase)
                    }}
                    disabled={isExpanding}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold ${
                      hasDetail
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-sky-600 text-white hover:bg-sky-700'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {isExpanding ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : null}
                    {hasDetail ? '查看详细计划' : '生成详细计划'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderOverview() {
    const oldDays = getDaysUntil(dateOptions?.oldDeadline || goal.deadline)
    const newDays = getDaysUntil(dateOptions?.newDeadline)
    const deadlineText = oldDays == null ? '无截止日期' : `剩余 ${oldDays} 天`

    return (
      <div className="space-y-4">
        {goal.category === '学习类' && (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => setDetailTab('overview')}
              className={`inline-flex min-h-12 items-center justify-center rounded-xl text-base font-bold transition ${
                detailTab === 'overview'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              目标详情
            </button>
            <button
              type="button"
              onClick={() => setDetailTab('assets')}
              className={`inline-flex min-h-12 items-center justify-center rounded-xl text-base font-bold transition ${
                detailTab === 'assets'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              学习资产库
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-slate-500 transition hover:bg-slate-100"
        >
          <ArrowLeft size={16} />
          返回目标地图
        </button>

        <div className="rounded-2xl border border-white bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
                {goal.category || '学习类'}
              </span>
              <h2 className="mt-2 text-xl font-black text-slate-800 md:text-2xl">
                {goal.title}
              </h2>
              {goal.reason && (
                <p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">
                  {goal.reason}
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <p className="text-3xl font-black text-emerald-700">
                {goal.progress}%
              </p>
              <p className="text-xs font-semibold text-slate-400">目标进度</p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500"
              style={{ width: `${goal.progress}%` }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              {goal.deadlineWarning ? (
                <TriangleAlert size={17} className="text-amber-500" />
              ) : (
                <CalendarDays size={17} className="text-sky-600" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-600">截止日期</p>
                <p className="text-sm text-slate-500">
                  {goal.deadline || '未设置'} · {deadlineText}
                  {goal.deadlineWarning ? ' · 待重排' : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openDatePicker}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-600 px-4 text-base font-bold text-white transition hover:bg-sky-700"
            >
              <Pencil size={15} />
              调整
            </button>
          </div>

          {goal.category === '学习类' && (
            <button
              type="button"
              onClick={() => setMode('tutor')}
              className="mt-4 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-sky-600 px-4 text-base font-black text-white shadow-sm transition hover:opacity-95"
            >
              <GraduationCap size={20} />
              进入 AI 私教模式
            </button>
          )}
        </div>

        {renderPhaseCards()}

        {goal.plan?.phases?.some((phase) => phase.weeks?.length) && (
          <div
            id="goal-kanban"
            className="rounded-2xl border border-white bg-white p-4 shadow-sm md:p-5"
          >
            <GoalKanban goalId={goal.id} />
          </div>
        )}

        {(goal.masteredConcepts?.length > 0 ||
          goal.learningRecords?.length > 0) && (
          <div className="rounded-2xl border border-white bg-white p-4 shadow-sm md:p-5">
            <p className="text-base font-bold text-slate-800">学习记录</p>

            {goal.masteredConcepts?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {goal.masteredConcepts.map((concept) => (
                  <span
                    key={concept}
                    className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800"
                  >
                    ✅ {concept}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 space-y-2">
              {goal.learningRecords
                ?.slice()
                .reverse()
                .slice(0, 5)
                .map((record) => (
                  <div
                    key={record.id}
                    className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600"
                  >
                    <p className="font-semibold text-slate-700">你：{record.user}</p>
                    <p className="mt-1 line-clamp-3">
                      {record.assistant?.slice(0, 180)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {toast && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
            {toast}
          </p>
        )}
      </div>
    )
  }

  function renderManualEdit() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMode('overview')}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-slate-500"
          >
            <ArrowLeft size={16} />
            返回详情
          </button>
          <button
            type="button"
            onClick={saveManualPlan}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white transition hover:bg-emerald-700"
          >
            <Check size={16} />
            保存计划
          </button>
        </div>

        <div className="rounded-2xl border border-white bg-white p-3 shadow-sm md:p-5">
          <EditablePlanTree plan={planDraft} onChangePlan={setPlanDraft} />
        </div>
      </div>
    )
  }

  function renderTutor() {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMode('overview')}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-slate-500"
          >
            <ArrowLeft size={16} />
            退出私教
          </button>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-700">
            {goal.title} · 私教
          </span>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
          <div className="chat-scroll flex-1 overflow-y-auto space-y-3 p-3 md:p-4">
            {tutorMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-base leading-6 ${
                    message.role === 'user'
                      ? 'rounded-tr-md bg-emerald-600 text-white'
                      : 'rounded-tl-md border border-violet-100 bg-violet-50 text-slate-700'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isTutorLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={15} className="animate-spin" />
                私教正在思考...
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              sendTutorMessage()
            }}
            className="border-t border-slate-200 p-3 pb-safe"
          >
            <div className="flex gap-2">
              <input
                value={tutorInput}
                onChange={(event) => setTutorInput(event.target.value)}
                placeholder="回答私教的问题..."
                className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-violet-400 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!tutorInput.trim() || isTutorLoading}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-violet-600 text-white transition hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400"
                aria-label="发送私教消息"
              >
                <SendHorizontal size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <section className="chat-scroll h-full overflow-y-auto bg-[#e9efec] px-2 py-3 md:px-4 md:py-5">
      <div className="mx-auto max-w-3xl">
        {mode === 'manual' ? (
          renderManualEdit()
        ) : mode === 'tutor' ? (
          <div className="h-[calc(100dvh-180px)]">{renderTutor()}</div>
        ) : goal.category === '学习类' && detailTab === 'assets' ? (
          <LearningAssetsPanel
            goalId={goal.id}
            onBack={() => setDetailTab('overview')}
          />
        ) : (
          renderOverview()
        )}
      </div>

      {showDatePicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center"
          onClick={() => setShowDatePicker(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800">调整截止日期</h3>
              <button
                type="button"
                onClick={() => setShowDatePicker(false)}
                aria-label="关闭日期选择"
                className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <input
              type="date"
              value={dateDraft}
              onChange={(event) => setDateDraft(event.target.value)}
              className="mt-4 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-sky-400"
            />

            <button
              type="button"
              onClick={confirmDateSelection}
              disabled={!dateDraft}
              className="mt-4 min-h-12 w-full rounded-xl bg-sky-600 text-base font-bold text-white transition hover:bg-sky-700 disabled:opacity-50"
            >
              确认日期
            </button>
          </div>
        </div>
      )}

      {dateOptions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center"
          onClick={() => setDateOptions(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-sky-600" />
              <h3 className="text-lg font-black text-slate-800">日期已调整</h3>
            </div>

            <p className="mt-3 text-base leading-6 text-slate-600">
              剩余时间从 {getDaysUntil(goal.deadline) ?? '无'} 天变为{' '}
              {getDaysUntil(dateOptions.newDeadline)} 天。需要 AI 重新调整每日任务吗？
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={handleAiReplan}
                disabled={isReplanning}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-base font-bold text-white transition hover:bg-violet-700 disabled:opacity-60"
              >
                {isReplanning ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Bot size={16} />
                )}
                AI 自动重排
              </button>

              <button
                type="button"
                onClick={openManualAdjust}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-bold text-white transition hover:bg-emerald-700"
              >
                <Pencil size={16} />
                我自己调
              </button>

              <button
                type="button"
                onClick={applyDeadlineOnly}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-base font-bold text-[#17261f] transition hover:bg-amber-300"
              >
                <Target size={16} />
                暂不调整
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
