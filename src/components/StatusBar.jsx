import { useState } from 'react'
import { Award, Coins, Flame, Gamepad2, HelpCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useGame } from '../context/GameContext'
import AchievementModal from './AchievementModal'
import LevelGuideModal from './LevelGuideModal'
import UserPanelDrawer from './UserPanelDrawer'

export default function StatusBar() {
  const { username } = useApp()
  const {
    level,
    exp,
    expToNextLevel,
    coins,
    streak,
    openAchievements,
  } = useGame()
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false)
  const xpPercent = Math.min(
    100,
    Math.round((exp / expToNextLevel) * 100),
  )

  return (
    <header className="shrink-0 border-b border-emerald-950 bg-[#16231e] text-white shadow-sm">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 px-2 py-2 md:gap-3 md:px-4 md:py-3">
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => setIsUserPanelOpen(true)}
            aria-label="打开用户面板"
            title="用户面板"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-300 text-[#14211c] shadow-inner transition hover:bg-emerald-200 md:h-11 md:w-11"
          >
            <Gamepad2 size={22} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2 md:gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold md:text-base">
                  {username}
                </p>
                <p className="mt-0.5 text-xs text-emerald-100/70 md:text-sm">
                  Lv.{level} · 冒险手帐
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold md:gap-2 md:text-sm">
                <span className="hidden items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-white sm:inline-flex md:px-2.5 md:py-1.5">
                  <Flame size={13} className="text-amber-300" />
                  {streak}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-2 py-1 text-amber-200 md:px-2.5 md:py-1.5">
                  <Coins size={13} />
                  {coins}
                </span>
                <button
                  type="button"
                  onClick={openAchievements}
                  aria-label="打开成就列表"
                  title="成就"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full bg-sky-300/15 px-3 text-base text-sky-200 transition hover:bg-sky-300/25 md:min-h-0 md:min-w-0 md:px-2.5 md:py-1.5 md:text-sm"
                >
                  <Award size={13} />
                  成就
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-100/70 md:text-sm">
            <span className="flex items-center gap-1">
              经验值
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                aria-label="打开升级指南"
                title="升级指南"
                className="grid h-11 w-11 place-items-center rounded-full text-amber-300 transition hover:bg-white/10 md:h-8 md:w-8"
              >
                <HelpCircle size={15} />
              </button>
            </span>
            <span>
              {exp} / {expToNextLevel} XP
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-lime-300 to-amber-300 transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>
      <AchievementModal />
      <LevelGuideModal
        open={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
      <UserPanelDrawer
        open={isUserPanelOpen}
        onClose={() => setIsUserPanelOpen(false)}
      />
    </header>
  )
}
