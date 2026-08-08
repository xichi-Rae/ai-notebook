import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Clock,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
import { useSop } from '../context/SopContext'
import { fetchDeepSeekReply, parseJsonObject } from '../services/deepseek'
import { sanitizeAIResponse } from '../utils/sanitizeAIResponse'

export default function SopWizardModal() {
  const { wizardOpen, closeWizard, addSop, getLoadWarning } = useSop()
  const [step, setStep] = useState(1)
  const [painPoint, setPainPoint] = useState('')
  const [tasks, setTasks] = useState('')
  const [triggerTime, setTriggerTime] = useState('07:00')
  const [title, setTitle] = useState('晨间流程')
  const [category, setCategory] = useState('日')
  const [steps, setSteps] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [createdMessage, setCreatedMessage] = useState('')

  if (!wizardOpen) {
    return null
  }

  function resetWizard() {
    setStep(1)
    setPainPoint('')
    setTasks('')
    setTriggerTime('07:00')
    setTitle('晨间流程')
    setCategory('日')
    setSteps([])
    setError('')
    setCreatedMessage('')
  }

  async function handleGenerate() {
    setIsGenerating(true)
    setError('')

    const prompt = `你是 SOP 整理专家。用户觉得以下场景混乱、消耗精力：${painPoint}
用户需要在这个场景完成以下事情（不一定是顺序）：
${tasks}

请自动合并同类项，生成一个有序步骤链。返回严格 JSON：
{"title":"简短流程名称","steps":[{"order":1,"action":"步骤","duration":5}]}
步骤要具体，时长为分钟。不要输出其他内容。`

    try {
      const content = await fetchDeepSeekReply([
        {
          role: 'system',
          content:
            '你是 SOP 整理专家。只返回合法 JSON，不要解释、Markdown 或代码块。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ])
      const parsed = parseJsonObject(content)

      if (!parsed?.steps?.length) {
        throw new Error('AI 没有返回有效步骤')
      }

      setTitle(sanitizeAIResponse(parsed.title) || title)
      setSteps(
        parsed.steps.map((step) => ({
          ...step,
          action: sanitizeAIResponse(step.action),
        })),
      )
      setStep(3)
    } catch (requestError) {
      const fallbackSteps = tasks
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((action, index) => ({
          order: index + 1,
          action: sanitizeAIResponse(action),
          duration: 5,
        }))

      if (fallbackSteps.length) {
        setSteps(fallbackSteps)
        setStep(3)
      } else {
        setError(`AI 生成失败：${requestError.message}`)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  function handleCreate() {
    if (!title.trim() || !steps.length) {
      return
    }

    const totalMinutes = steps.reduce(
      (total, step) => total + (Number(step.duration) || 0),
      0,
    )
    const warning = getLoadWarning(totalMinutes)

    addSop({
      title,
      category,
      steps,
      trigger_time: triggerTime,
      trial_days: 5,
    })

    setCreatedMessage(
      warning
        ? `已创建「${title}」，试用 5 天。${warning}`
        : `已创建「${title}」，试用 5 天。`,
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
      <div className="mx-auto flex min-h-full w-full max-w-lg items-end justify-center p-0 md:items-center md:p-4">
        <div className="w-full rounded-t-3xl bg-[#e9efec] p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:rounded-2xl md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-600">SOP 创建向导</p>
              <h2 className="mt-1 text-xl font-black text-slate-800">
                第 {step} / 4 步
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                resetWizard()
                closeWizard()
              }}
              aria-label="关闭 SOP 向导"
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-500 shadow-sm"
            >
              <X size={17} />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white bg-white p-4 shadow-sm">
            {createdMessage ? (
              <div className="space-y-4">
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-base font-semibold text-emerald-800">
                  {createdMessage}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    resetWizard()
                    closeWizard()
                  }}
                  className="min-h-12 w-full rounded-xl bg-emerald-600 text-base font-bold text-white"
                >
                  完成
                </button>
              </div>
            ) : step === 1 ? (
              <div className="space-y-4">
                <p className="text-base font-bold text-slate-800">
                  ​你现在生活中最混乱、最消耗你精力的时间段或场景是什么？
                </p>
                <textarea
                  value={painPoint}
                  onChange={(event) => setPainPoint(event.target.value)}
                  rows={4}
                  placeholder="例如：早上出门前，总是找不到东西，时间很赶..."
                  className="min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base leading-6 outline-none focus:border-emerald-400 focus:bg-white"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!painPoint.trim()}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white disabled:opacity-50"
                  >
                    下一步
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : step === 2 ? (
              <div className="space-y-4">
                <p className="text-base font-bold text-slate-800">
                  在这个时间段里，你通常需要完成哪些事？按顺序告诉我。
                </p>
                <textarea
                  value={tasks}
                  onChange={(event) => setTasks(event.target.value)}
                  rows={6}
                  placeholder={"每行一件事：\n喝一杯温水\n洗漱\n吃早饭"}
                  className="min-h-40 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base leading-6 outline-none focus:border-emerald-400 focus:bg-white"
                />
                {error && (
                  <p className="text-sm font-semibold text-rose-600">{error}</p>
                )}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-slate-500"
                  >
                    <ArrowLeft size={16} />
                    上一步
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!tasks.trim() || isGenerating}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-600 px-5 text-base font-bold text-white disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    生成 SOP
                  </button>
                </div>
              </div>
            ) : step === 3 ? (
              <div className="space-y-4">
                <p className="text-base font-bold text-slate-800">
                  AI 已整理步骤链，请确认。
                </p>
                <div className="space-y-2">
                  {steps.map((item) => (
                    <div
                      key={item.order}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                        {item.order}
                      </span>
                      <p className="flex-1 text-base text-slate-700">
                        {item.action}
                      </p>
                      <span className="shrink-0 text-sm font-semibold text-slate-400">
                        {item.duration} 分钟
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white"
                  >
                    下一步
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-slate-700">执行周期</p>
                  <div className="mt-1.5 grid grid-cols-4 gap-2">
                    {['日', '周', '月', '年'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCategory(item)}
                        aria-pressed={category === item}
                        className={`inline-flex min-h-12 items-center justify-center rounded-xl border text-base font-bold ${
                          category === item
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {item === '日'
                          ? '每日'
                          : item === '周'
                            ? '每周'
                            : item === '月'
                              ? '每月'
                              : '每年'}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-base font-bold text-slate-800">
                  你希望每天几点开始这个流程？
                </p>
                <div className="flex items-center gap-2">
                  <Clock size={17} className="text-slate-400" />
                  <input
                    type="time"
                    value={triggerTime}
                    onChange={(event) => setTriggerTime(event.target.value)}
                    className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    SOP 名称
                  </label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base"
                  />
                </div>

                <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                  创建后将标注“试用 5 天”，第 3 天和第 5 天我会主动询问调整。
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-slate-500"
                  >
                    <ArrowLeft size={16} />
                    上一步
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white"
                  >
                    <Check size={16} />
                    创建 SOP
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
