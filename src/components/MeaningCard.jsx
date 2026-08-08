import { Compass, Sparkles } from 'lucide-react'

export default function MeaningCard({ message }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400 text-[#17261f] shadow-sm md:h-8 md:w-8">
        <Compass size={16} />
      </div>

      <div className="relative min-w-0 flex-1 max-w-md overflow-hidden rounded-2xl border-2 border-emerald-400/70 bg-[#fffdf8] p-3 shadow-md md:p-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-400 via-amber-300 to-sky-400" />
        <div className="pointer-events-none absolute -right-7 -top-9 h-20 w-20 rotate-12 rounded-2xl border-4 border-emerald-100" />
        <div className="pointer-events-none absolute -bottom-9 -left-7 h-16 w-16 -rotate-12 rounded-2xl border-4 border-amber-100" />

        <div className="relative">
          <div className="flex items-center gap-2 text-emerald-700">
            <Sparkles size={16} />
            <span className="text-sm font-black md:text-base">
              {message.title || '今日为什么做'}
            </span>
          </div>

          <p className="mt-3 whitespace-pre-wrap break-words text-base font-medium leading-6 text-slate-800 md:text-base">
            {message.body || message.text}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-emerald-100 pt-3 text-xs font-semibold text-emerald-700 md:mt-4 md:text-sm">
            <span>意义不是找到的，是一格一格做出来的。</span>
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5">
              今日锚点
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
