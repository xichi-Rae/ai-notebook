import {
  ArrowRight,
  Check,
  Clock,
  X,
} from 'lucide-react'
import { useSop } from '../context/SopContext'

export default function SopExecutionCard() {
  const {
    sops,
    activeSopId,
    execution,
    nextSopStep,
    closeActiveSop,
  } = useSop()

  if (!activeSopId) {
    return null
  }

  const sop = sops.find((item) => item.id === activeSopId)
  const currentExecution = execution[activeSopId]

  if (!sop || !currentExecution) {
    return null
  }

  const currentStep = currentExecution.currentStep
  const totalDuration = sop.steps.reduce(
    (total, step) => total + (Number(step.duration) || 0),
    0,
  )
  const completedDuration = sop.steps
    .filter((_, index) => currentExecution.completedSteps.includes(index))
    .reduce((total, step) => total + (Number(step.duration) || 0), 0)
  const progress = totalDuration
    ? Math.round((completedDuration / totalDuration) * 100)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-white bg-white p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:rounded-2xl md:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600">SOP 执行中</p>
            <h2 className="mt-1 text-lg font-black text-slate-800">
              {sop.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeActiveSop}
            aria-label="关闭 SOP 卡片"
            className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm font-semibold text-slate-500">
          <span>总时长进度</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 space-y-2">
          {sop.steps.map((step, index) => {
            const isDone = currentExecution.completedSteps.includes(index)
            const isCurrent = index === currentStep && !currentExecution.completed

            return (
              <div
                key={step.order}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  isCurrent
                    ? 'border-emerald-300 bg-emerald-50'
                    : isDone
                      ? 'border-slate-100 bg-slate-50 opacity-60'
                      : 'border-slate-200 bg-white'
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isDone ? <Check size={15} /> : step.order}
                </span>
                <p
                  className={`min-w-0 flex-1 text-base ${
                    isDone ? 'text-slate-400 line-through' : 'text-slate-700'
                  }`}
                >
                  {step.action}
                </p>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-400">
                  <Clock size={13} />
                  {step.duration} 分
                </span>
              </div>
            )
          })}
        </div>

        {currentExecution.completed ? (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center">
            <p className="text-2xl font-black text-emerald-800">
              🎉 {sop.title} SOP 完成！
            </p>
            <p className="mt-1 font-bold text-emerald-700">+30 EXP</p>
            <button
              type="button"
              onClick={closeActiveSop}
              className="mt-3 min-h-12 w-full rounded-xl bg-emerald-600 text-base font-bold text-white"
            >
              关闭
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => nextSopStep(sop.id)}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-bold text-white transition hover:bg-emerald-700"
          >
            {currentStep < sop.steps.length - 1 ? '下一步' : '完成最后一步'}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
