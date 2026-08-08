import { Coins, Sparkles, X } from 'lucide-react'
import { useGame } from '../context/GameContext'

export default function LevelGuideModal({ open, onClose }) {
  const { level, exp, expToNextLevel, LEVEL_GUIDE } = useGame()

  if (!open) {
    return null
  }

  const rewards = LEVEL_GUIDE?.rewards || []
  const remainingExp = Math.max(0, expToNextLevel - exp)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border border-white bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600">成长系统</p>
            <h2 className="mt-1 text-lg font-black text-slate-800">升级指南</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭升级指南"
            className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 md:h-9 md:w-9"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-[#16231e] p-3 text-white md:p-4">
          <p className="text-sm font-semibold text-emerald-100/70 md:text-base">
            当前等级
          </p>
          <p className="mt-1 text-2xl font-black md:text-3xl">
            Lv.{level}
          </p>
          <p className="mt-2 text-sm text-emerald-100/80 md:text-base">
            本等级经验值：{exp} / {expToNextLevel} XP
          </p>
          <p className="mt-1 text-sm text-emerald-100/80 md:text-base">
            距下一级还差 {remainingExp} XP
          </p>
        </div>

        <div className="mt-4">
          <p className="flex items-center gap-2 text-base font-bold text-slate-800">
            <Sparkles size={16} className="text-amber-500" />
            常见经验值
          </p>
          <div className="mt-2 space-y-2">
            {rewards.map((reward) => (
              <div
                key={reward.label}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
              >
                <span className="text-base text-slate-700">{reward.label}</span>
                <span className="font-black text-emerald-700">
                  +{reward.exp} XP
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 md:p-4">
          <p className="flex items-center gap-2 text-base font-bold text-amber-900">
            <Coins size={16} />
            金币用途
          </p>
          <p className="mt-1 text-sm leading-5 text-amber-800 md:text-base">
            {LEVEL_GUIDE?.coinUsage || '将来可兑换主题皮肤或休息券'}
          </p>
        </div>
      </div>
    </div>
  )
}
