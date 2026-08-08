import {
  Award,
  Bell,
  Flame,
  Star,
  Target,
  Timer,
  Trophy,
  X,
} from 'lucide-react'
import { useGame } from '../context/GameContext'

const ICON_MAP = {
  target: Target,
  timer: Timer,
  flame: Flame,
  star: Star,
  trophy: Trophy,
  bell: Bell,
}

export default function AchievementModal() {
  const { achievements, closeAchievements, isAchievementsOpen } = useGame()

  if (!isAchievementsOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 md:items-center md:p-4"
      onClick={closeAchievements}
    >
      <div
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border border-white bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600">成就系统</p>
            <h2 className="mt-1 text-lg font-black text-slate-800">徽章收藏</h2>
          </div>
          <button
            type="button"
            onClick={closeAchievements}
            aria-label="关闭成就列表"
            className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 md:h-9 md:w-9"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {achievements.map((achievement) => {
            const Icon = ICON_MAP[achievement.icon] || Award

            return (
              <div
                key={achievement.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${
                  achievement.unlocked
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    achievement.unlocked
                      ? 'bg-amber-400 text-[#17261f]'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <Icon size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">
                    {achievement.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {achievement.description}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                    achievement.unlocked
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {achievement.unlocked ? '已解锁' : '未解锁'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
