import { ArrowRight, Check, Clock, Workflow } from 'lucide-react'
import { useSop } from '../context/SopContext'

export default function SopCard({ message }) {
  const { sops, execution, nextSopStep } = useSop()
  const sop = message.sop || sops.find((item) => item.id === message.sopId)
  const currentExecution =
    execution[sop?.id] || message.execution || null

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
    <div className="flex items-start gap-2">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm md:h-8 md:w-8">
        <Workflow size={16} />
      </div>

      <div className="min-w-0 flex-1 max-w-md rounded-2xl rounded-tl-md border border-emerald-100 bg-white p-3 shadow-sm md:p-4">
        <p className="text-xs font-black text-emerald-600 md:text-sm">SOP 执行</p>
        <h3 className="mt-1 text-base font-bold text-slate-800 md:text-base">
          {sop.title}
        </h3>

        <div className="mt-3 space-y-1.5">
          {sop.steps.map((step, index) => {
            const isDone = currentExecution.completedSteps.includes(index)
            const isCurrent =
              index === currentStep && !currentExecution.completed

            return (
              <div
                key={step.order}
                className={`flex items-center gap-2 rounded-lg border p-2 ${
                  isCurrent
                    ? 'border-emerald-300 bg-emerald-50'
                    : isDone
                      ? 'border-slate-100 bg-slate-50 opacity-60'
                      : 'border-slate-200 bg-white'
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isDone ? <Check size={13} /> : step.order}
                </span>
                <p
                  className={`min-w-0 flex-1 text-sm ${
                    isDone ? 'text-slate-400 line-through' : 'text-slate-700'
                  }`}
                >
                  {step.action}
                </p>
                <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                  <Clock size={12} />
                  {step.duration} 分
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>总时长进度</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {!currentExecution.completed && (
          <button
            type="button"
            onClick={() => nextSopStep(sop.id)}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-bold text-white transition hover:bg-emerald-700"
          >
            {currentStep < sop.steps.length - 1 ? '下一步' : '完成最后一步'}
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  )
}
