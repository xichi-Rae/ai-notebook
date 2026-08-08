import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  Loader2,
  PencilRuler,
  Sparkles,
  X,
} from 'lucide-react'
import { useGoal } from '../context/GoalContext'
import { useTodo } from '../context/TodoContext'
import { fetchDeepSeekReply, parseJsonObject } from '../services/deepseek'
import EditablePlanTree from './EditablePlanTree'

const CATEGORIES = ['学习类', '执行类', '习惯类', '杂务类']

const QUESTION_PAGES = [
  [
    {
      key: 'familiarity',
      type: 'choice',
      title: '你目前对这个领域了解多少？',
      options: ['完全小白', '有一点基础', '已经入门'],
    },
    {
      key: 'dailyMinutes',
      type: 'choice',
      title: '你每天能投入多少时间在这个目标上？',
      options: ['15分钟', '30分钟', '1小时', '2小时', '不固定'],
    },
  ],
  [
    {
      key: 'preference',
      type: 'choice',
      title: '你更喜欢理论学习还是动手实践？',
      options: ['理论学习', '动手实践', '两者结合'],
    },
    {
      key: 'bestTime',
      type: 'choice',
      title: '你每天精力最好的学习时段是？',
      options: ['早上', '下午', '晚上', '不固定', '多个时段'],
    },
    {
      key: 'studyDays',
      type: 'choice',
      title: '你希望每周学习几天？',
      options: ['每天', '5天（工作日）', '3天', '不固定'],
    },
  ],
  [
    {
      key: 'avoid',
      type: 'multi',
      title: '有没有特别想避免的学习方式？',
      options: ['长视频', '读论文', '大量背诵', '其他'],
    },
    {
      key: 'pastAttempt',
      type: 'textarea',
      title: '你过去尝试过类似目标吗？如果失败了，原因是什么？',
    },
  ],
]

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getTodayKey() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function createEmptyPlan() {
  return {
    phases: [
      {
        id: createId('phase'),
        title: '阶段 1',
        weeks: [
          {
            id: createId('week'),
            week: 1,
            tasks: [
              {
                id: createId('task'),
                day: 1,
                action: '',
                estMinutes: 30,
                date: '',
              },
            ],
          },
        ],
      },
    ],
  }
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

function flattenPlanToTodos(goalId, goalTitle, plan) {
  const todos = []
  const today = getTodayKey()

  plan?.phases?.forEach((phase) => {
    phase?.weeks?.forEach((week) => {
      week?.tasks?.forEach((task) => {
        if (task.date !== today) {
          return
        }

        todos.push({
          title: task.action,
          source: 'goal',
          goalTaskId: task.id,
          goalId,
          goalTitle,
          phaseTitle: phase.title || '未命名阶段',
          week: week.week,
          day: task.day,
          action: task.action,
          estMinutes: task.estMinutes,
          date: task.date,
        })
      })
    })
  })

  return todos
}

export default function GoalWizard({ open, onClose }) {
  const { addGoal } = useGoal()
  const { addTodos } = useTodo()
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState(null)
  const [info, setInfo] = useState({
    title: '',
    category: '学习类',
    deadline: '',
    reason: '',
  })
  const [plan, setPlan] = useState(createEmptyPlan)
  const [answers, setAnswers] = useState({
    familiarity: '',
    dailyMinutes: '',
    preference: '',
    bestTime: '',
    studyDays: '',
    avoid: [],
    pastAttempt: '',
  })
  const [surveyPage, setSurveyPage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) {
    return null
  }

  function updateInfo(patch) {
    setInfo((current) => ({ ...current, ...patch }))
  }

  function updateAnswer(key, value) {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  function chooseMode(nextMode) {
    setMode(nextMode)
    setError('')

    if (nextMode === 'manual') {
      setPlan(createEmptyPlan())
      setStep(3)
    } else {
      setSurveyPage(0)
      setStep(3)
    }
  }

  function buildQuestionnaireText() {
    return [
      `了解程度：${answers.familiarity || '未填写'}`,
      `每天可投入：${answers.dailyMinutes || '未填写'}`,
      `学习偏好：${answers.preference || '未填写'}`,
      `每天精力最佳学习时段：${answers.bestTime || '未填写'}`,
      `每周学习天数：${answers.studyDays || '未填写'}`,
      `想避免的方式：${answers.avoid.length ? answers.avoid.join('、') : '无'}`,
      `过去尝试：${answers.pastAttempt || '未填写'}`,
    ].join('\n')
  }

  async function submitAiDiagnosis(event) {
    event?.preventDefault()
    setIsLoading(true)
    setError('')

    const prompt = `你是一个目标拆分专家。根据以下用户信息，将该目标拆分为一个三级学习计划：
用户目标：${info.title}
截止日期：${info.deadline || '未设置'}
用户信息：
${buildQuestionnaireText()}

请返回严格符合以下格式的 JSON（不要包含其他文字）：
{
  "phases": [
    {
      "title": "阶段名称",
      "weeks": [
        {
          "week": 1,
          "tasks": [
            { "day": 1, "date": "YYYY-MM-DD", "action": "具体可执行行动", "est_minutes": 30 }
          ]
        }
      ]
    }
  ]
}
强制要求：
1. 每个 task 必须包含 "date" 字段，值为具体的日期（YYYY-MM-DD 格式），从目标开始日期起按天递增。
2. 同一天的任务数量不能超过 5 个。
3. 每个任务的 est_minutes 必须在 15-90 分钟之间。
4. 任务必须是“今天打开就能做”的原子动作，不能是“学习第三章”这种模糊描述。`

    try {
      const content = await fetchDeepSeekReply([
        {
          role: 'system',
          content:
            '你是目标拆分专家。只返回合法 JSON，不要输出解释、Markdown 或代码块。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ])
      const parsed = parseJsonObject(content)

      if (!parsed?.phases?.length) {
        throw new Error('AI 没有返回有效的阶段计划')
      }

      setPlan(normalizePlan(parsed))
      setStep(4)
    } catch (requestError) {
      setError(`AI 拆分失败：${requestError.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  function confirmCreate() {
    const goalId = addGoal({
      title: info.title,
      category: info.category,
      deadline: info.deadline,
      reason: info.reason,
      plan,
    })

    if (!goalId) {
      return
    }

    addTodos(flattenPlanToTodos(goalId, info.title, plan))
    onClose()
  }

  function renderBasicInfo() {
    return (
      <div className="space-y-4">
        <div>
          <label
            htmlFor="goal-title"
            className="text-sm font-bold text-slate-700"
          >
            目标标题
          </label>
          <input
            id="goal-title"
            value={info.title}
            onChange={(event) => updateInfo({ title: event.target.value })}
            placeholder="例如：三个月通过雅思口语"
            className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-emerald-400 focus:bg-white"
          />
        </div>

        <div>
          <p className="text-sm font-bold text-slate-700">目标类别</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => updateInfo({ category })}
                aria-pressed={info.category === category}
                className={`inline-flex min-h-12 items-center justify-center rounded-xl border px-3 text-base font-bold transition ${
                  info.category === category
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="goal-deadline"
            className="text-sm font-bold text-slate-700"
          >
            截止日期
          </label>
          <div className="relative mt-1.5">
            <CalendarDays
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="goal-deadline"
              type="date"
              value={info.deadline}
              onChange={(event) => updateInfo({ deadline: event.target.value })}
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-base text-slate-700 outline-none focus:border-emerald-400 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="goal-reason"
            className="text-sm font-bold text-slate-700"
          >
            你为什么想达成这个目标？
          </label>
          <textarea
            id="goal-reason"
            value={info.reason}
            onChange={(event) => updateInfo({ reason: event.target.value })}
            rows={4}
            placeholder="写下这个目标对你真正重要的原因..."
            className="mt-1.5 min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base leading-6 outline-none focus:border-emerald-400 focus:bg-white"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!info.title.trim()}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            下一步
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  function renderSplitMode() {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => chooseMode('manual')}
          className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
              <PencilRuler size={22} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-800">我自己拆</p>
              <p className="mt-1 text-sm text-slate-500">
                手动添加阶段、周任务和每日行动，完全由你掌控。
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => chooseMode('ai')}
          className="w-full rounded-2xl border-2 border-sky-200 bg-white p-4 text-left transition hover:border-sky-300 hover:bg-sky-50"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700">
              <Bot size={22} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-800">AI 帮我拆</p>
              <p className="mt-1 text-sm text-slate-500">
                回答一组诊断问题，让 AI 生成可编辑的三级学习计划。
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStep(1)}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-slate-500 transition hover:bg-slate-100"
        >
          <ArrowLeft size={16} />
          返回基本信息
        </button>
      </div>
    )
  }

  function renderQuestion(question) {
    if (question.type === 'number') {
      return (
        <div key={question.key}>
          <p className="text-base font-bold text-slate-800">{question.title}</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={answers.weeklyHours}
              onChange={(event) =>
                updateAnswer('weeklyHours', event.target.value)
              }
              placeholder="例如：5"
              className="min-h-12 w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-base font-bold outline-none focus:border-sky-400"
            />
            <span className="text-sm font-semibold text-slate-500">小时</span>
          </div>
        </div>
      )
    }

    if (question.type === 'multi') {
      return (
        <div key={question.key}>
          <p className="text-base font-bold text-slate-800">{question.title}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {question.options.map((option) => {
              const active = answers.avoid.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    updateAnswer(
                      'avoid',
                      active
                        ? answers.avoid.filter((item) => item !== option)
                        : [...answers.avoid, option],
                    )
                  }
                  aria-pressed={active}
                  className={`inline-flex min-h-12 items-center justify-center rounded-xl border px-3 text-base font-semibold transition ${
                    active
                      ? 'border-sky-400 bg-sky-50 text-sky-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'
                  }`}
                >
                  {active && <Check size={15} className="mr-1" />}
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    if (question.type === 'textarea') {
      return (
        <div key={question.key}>
          <p className="text-base font-bold text-slate-800">{question.title}</p>
          <textarea
            value={answers.pastAttempt}
            onChange={(event) =>
              updateAnswer('pastAttempt', event.target.value)
            }
            rows={4}
            placeholder="如果失败过，简单写一下卡在哪里..."
            className="mt-2 min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base leading-6 outline-none focus:border-sky-400 focus:bg-white"
          />
        </div>
      )
    }

    return (
      <div key={question.key}>
        <p className="text-base font-bold text-slate-800">{question.title}</p>
        <div className="mt-2 space-y-2">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updateAnswer(question.key, option)}
              aria-pressed={answers[question.key] === option}
              className={`w-full rounded-xl border px-3 py-3 text-left text-base font-semibold transition ${
                answers[question.key] === option
                  ? 'border-sky-400 bg-sky-50 text-sky-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderSurvey() {
    const questions = QUESTION_PAGES[surveyPage]
    const isLastPage = surveyPage === QUESTION_PAGES.length - 1

    return (
      <form onSubmit={submitAiDiagnosis} className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-sky-600">AI 诊断问卷</p>
            <p className="mt-1 text-base font-bold text-slate-800">
              第 {surveyPage + 1} / {QUESTION_PAGES.length} 屏
            </p>
          </div>
          {error && (
            <p className="max-w-[50%] text-right text-xs font-semibold text-rose-600">
              {error}
            </p>
          )}
        </div>

        <div className="space-y-5">
          {questions.map((question) => renderQuestion(question))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              if (surveyPage === 0) {
                setStep(2)
              } else {
                setSurveyPage((page) => page - 1)
              }
            }}
            disabled={isLoading}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <ArrowLeft size={16} />
            上一步
          </button>

          {!isLastPage ? (
            <button
              type="button"
              onClick={() => setSurveyPage((page) => page + 1)}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-600 px-5 text-base font-bold text-white transition hover:bg-sky-700"
            >
              下一组
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-600 px-5 text-base font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  正在生成计划...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  生成 AI 计划
                </>
              )}
            </button>
          )}
        </div>
      </form>
    )
  }

  function renderPlanEditor() {
    return (
      <div className="space-y-4">
        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        )}

        <EditablePlanTree plan={plan} onChangePlan={setPlan} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              if (mode === 'ai') {
                setSurveyPage(QUESTION_PAGES.length - 1)
              }
              setStep(mode === 'ai' ? 3 : 2)
            }}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-slate-500 transition hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            上一步
          </button>

          <button
            type="button"
            onClick={confirmCreate}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white transition hover:bg-emerald-700"
          >
            <Check size={16} />
            确认创建
          </button>
        </div>
      </div>
    )
  }

  function renderCurrentStep() {
    if (step === 1) {
      return renderBasicInfo()
    }
    if (step === 2) {
      return renderSplitMode()
    }
    if (step === 3 && mode === 'ai') {
      return renderSurvey()
    }
    if (step === 3 && mode === 'manual') {
      return renderPlanEditor()
    }
    if (step === 4) {
      return renderPlanEditor()
    }
    return null
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#e9efec]">
      <div className="mx-auto min-h-full w-full max-w-2xl px-3 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:py-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-emerald-600">新建目标向导</p>
            <h1 className="mt-0.5 text-lg font-black text-slate-800 md:text-xl">
              第 {step} / 4 步
            </h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭新建目标向导"
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-500 shadow-sm transition hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </header>

        <div className="mt-4 rounded-2xl border border-white bg-white p-3 shadow-sm md:p-5">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  )
}
