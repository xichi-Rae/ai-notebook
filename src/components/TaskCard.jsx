import { useEffect, useRef, useState } from 'react'
import { Check, Pause, Play, Target, X } from 'lucide-react'
import { useGame } from '../context/GameContext'
import { playTaskCompleteSound } from '../utils/sound'

const PRESETS = [
  { label: '🍅 15分钟', minutes: 15 },
  { label: '🍅🍅 25分钟', minutes: 25 },
  { label: '🍅🍅🍅 45分钟', minutes: 45 },
]

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function TaskCard({ message }) {
  const defaultMinutes =
    Number(message.duration) >= 1 ? Math.round(Number(message.duration)) : 25
  const [selectedMinutes, setSelectedMinutes] = useState(defaultMinutes)
  const [customMinutes, setCustomMinutes] = useState('')
  const [phase, setPhase] = useState('setup')
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const finishRef = useRef(false)
  const game = useGame()

  const totalSeconds = Math.max(1, selectedMinutes) * 60
  const parsedCustomMinutes = Number(customMinutes)
  const hasValidCustomMinutes =
    customMinutes !== '' &&
    Number.isFinite(parsedCustomMinutes) &&
    parsedCustomMinutes >= 1
  const canStart = hasValidCustomMinutes || selectedMinutes >= 1
  const progress =
    phase === 'running' || phase === 'paused'
      ? Math.min(100, Math.round((1 - remainingSeconds / totalSeconds) * 100))
      : 0

  function finishTimer() {
    if (finishRef.current) {
      return
    }

    finishRef.current = true
    setPhase('completed')
    setRemainingSeconds(0)
    game.addExp(15)
    game.addCoins(5)
    playTaskCompleteSound()

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('番茄钟完成！', {
          body: `${message.title} 完成，获得 +15 XP 和 +5 金币。`,
        })
      } catch {
        // Some mobile browsers can reject notifications even when permission is granted.
      }
    }
  }

  useEffect(() => {
    if (phase !== 'running') {
      return undefined
    }

    if (remainingSeconds <= 0) {
      finishTimer()
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [phase, remainingSeconds])

  function startTimer() {
    const minutes = hasValidCustomMinutes ? parsedCustomMinutes : selectedMinutes
    if (!Number.isFinite(minutes) || minutes < 1) {
      return
    }

    const safeMinutes = Math.min(180, Math.round(minutes))
    finishRef.current = false
    setSelectedMinutes(safeMinutes)
    setCustomMinutes('')
    setRemainingSeconds(safeMinutes * 60)
    setPhase('running')

    if ('Notification' in window && Notification.permission === 'default') {
      const permissionPromise = Notification.requestPermission()
      if (permissionPromise?.catch) {
        permissionPromise.catch(() => {})
      }
    }
  }

  function choosePreset(minutes) {
    if (phase !== 'setup') {
      return
    }

    setSelectedMinutes(minutes)
    setCustomMinutes('')
  }

  function resetTimer() {
    finishRef.current = false
    setSelectedMinutes(defaultMinutes)
    setCustomMinutes('')
    setRemainingSeconds(0)
    setPhase('setup')
  }

  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm md:h-8 md:w-8">
        <Target size={16} />
      </div>

      <div className="min-w-0 flex-1 max-w-md rounded-2xl rounded-tl-md border border-emerald-100 bg-white p-3 shadow-sm md:p-4">
        <p className="text-xs font-black text-emerald-600 md:text-sm">任务卡片</p>
        <h3 className="mt-1 text-base font-bold text-slate-800 md:text-base">
          {message.title}
        </h3>

        {phase === 'setup' && (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2 md:mt-4">
              {PRESETS.map((preset) => {
                const active = selectedMinutes === preset.minutes
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => choosePreset(preset.minutes)}
                    aria-pressed={active}
                    className={`min-h-11 rounded-xl border px-2 text-sm font-bold transition active:scale-[0.98] md:min-h-11 ${
                      active
                        ? 'border-amber-400 bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center gap-2 md:mt-4">
              <label
                htmlFor={`custom-minutes-${message.taskId}`}
                className="shrink-0 text-sm font-semibold text-slate-600"
              >
                自定义
              </label>
              <input
                id={`custom-minutes-${message.taskId}`}
                type="number"
                min="1"
                max="180"
                value={customMinutes}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, '')
                  setCustomMinutes(value)
                  const minutes = Number(value)
                  if (minutes >= 1) {
                    setSelectedMinutes(Math.min(180, minutes))
                  }
                }}
                placeholder="25"
                className="min-h-11 w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-base font-bold text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white"
              />
              <span className="text-sm font-medium text-slate-500">分钟</span>
            </div>

            <button
              type="button"
              onClick={startTimer}
              disabled={!canStart}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-base font-black text-[#17261f] shadow-sm transition hover:bg-amber-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ▶️ 开始专注
            </button>
          </>
        )}

        {(phase === 'running' || phase === 'paused') && (
          <>
            <div className="mt-3 flex items-center justify-between gap-3 md:mt-4">
              <div className="shrink-0 rounded-xl bg-[#17261f] px-3 py-2 text-center text-white md:px-4">
                <p className="font-mono text-2xl font-bold leading-none tabular-nums md:text-3xl">
                  {formatTime(remainingSeconds)}
                </p>
                <p className="mt-1 text-xs text-emerald-100/70">剩余</p>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 md:text-sm">
                  <span>番茄钟进度</span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 md:mt-4">
              <button
                type="button"
                onClick={() =>
                  setPhase((current) =>
                    current === 'running' ? 'paused' : 'running',
                  )
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-base font-bold text-white transition hover:bg-emerald-700 active:scale-[0.99]"
              >
                {phase === 'running' ? (
                  <>
                    <Pause size={16} />
                    暂停
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    继续
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetTimer}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 text-base font-bold text-rose-700 transition hover:bg-rose-100 active:scale-[0.99]"
              >
                <X size={16} />
                ✖️ 放弃
              </button>
            </div>
          </>
        )}

        {phase === 'completed' && (
          <>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-3 md:mt-4 md:p-4">
              <div>
                <p className="text-base font-black text-emerald-800">✅ 番茄钟完成！</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  +15 XP · +5 金币
                </p>
              </div>
              <p className="font-mono text-2xl font-bold text-emerald-700">
                00:00
              </p>
            </div>

            <button
              type="button"
              onClick={resetTimer}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-base font-bold text-emerald-700 transition hover:bg-emerald-50 active:scale-[0.99]"
            >
              <Check size={16} />
              再来一轮
            </button>
          </>
        )}
      </div>
    </div>
  )
}
