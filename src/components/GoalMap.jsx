import { useState } from 'react'
import {
  CalendarDays,
  Check,
  Lightbulb,
  Loader2,
  Map,
  MoreHorizontal,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { useGoal } from '../context/GoalContext'
import { useGame } from '../context/GameContext'
import { fetchDeepSeekReply, parseJsonObject } from '../services/deepseek'
import GoalDetail from './GoalDetail'
import GoalWizard from './GoalWizard'

function getDeadlineLabel(deadline) {
  if (!deadline) {
    return '无截止日期'
  }

  const deadlineTime = new Date(deadline).getTime()
  if (Number.isNaN(deadlineTime)) {
    return '无截止日期'
  }

  const days = Math.ceil((deadlineTime - Date.now()) / 86400000)
  return days > 0 ? `剩 ${days} 天` : '已到截止日期'
}

export default function GoalMap() {
  const {
    goals,
    addNodesToGoal,
    toggleGoalNode,
    deleteGoal,
  } = useGoal()
  const game = useGame()
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [suggestions, setSuggestions] = useState({})
  const [feedback, setFeedback] = useState('')
  const [menuGoalId, setMenuGoalId] = useState(null)
  const [goalToDelete, setGoalToDelete] = useState(null)
  const [selectedGoalId, setSelectedGoalId] = useState(null)

  async function handleAiSplit(goal) {
    setBusyId(goal.id)
    setFeedback('')

    try {
      const content = await fetchDeepSeekReply([
        {
          role: 'system',
          content:
            '你是目标拆解助手。只返回 JSON，不要解释，不要使用代码块。',
        },
        {
          role: 'user',
          content: `请把目标“${goal.title}”拆成 4-8 个可执行阶段，只返回：{"nodes":["阶段1","阶段2"]}`,
        },
      ])
      const parsed = parseJsonObject(content)

      if (parsed?.nodes?.length) {
        addNodesToGoal(goal.id, parsed.nodes)
        setFeedback(`已为“${goal.title}”添加 ${parsed.nodes.length} 个阶段。`)
      } else {
        setFeedback(`AI 返回：${content}`)
      }
    } catch (error) {
      setFeedback(`AI 拆分失败：${error.message}`)
    } finally {
      setBusyId(null)
    }
  }

  async function handleSuggestion(goal) {
    setBusyId(goal.id)
    setFeedback('')

    try {
      const content = await fetchDeepSeekReply([
        {
          role: 'system',
          content:
            '你是执行教练。给出一条具体、简短、可立即执行的调整建议，不要返回 JSON。',
        },
        {
          role: 'user',
          content: `当前目标“${goal.title}”进度 ${goal.progress}%，请给我一条调整建议。`,
        },
      ])
      setSuggestions((current) => ({
        ...current,
        [goal.id]: content,
      }))
    } catch (error) {
      setFeedback(`AI 建议获取失败：${error.message}`)
    } finally {
      setBusyId(null)
    }
  }

  function handleToggle(goal, node) {
    if (!node.completed) {
      toggleGoalNode(goal.id, node.id)
      const reward = game.grantReward({
        exp: 15,
        coins: 5,
        actionType: 'goal',
      })
      const achievementCopy = reward.newlyUnlocked.length
        ? `成就解锁：${reward.newlyUnlocked
            .map((item) => item.title)
            .join('、')}。`
        : ''
      setFeedback(
        `已推进“${node.title}”。你获得 +15 经验值和 +5 金币。${achievementCopy}`,
      )
      return
    }

    toggleGoalNode(goal.id, node.id)
  }

  function confirmDeleteGoal() {
    if (!goalToDelete) {
      return
    }

    deleteGoal(goalToDelete.id)
    setGoalToDelete(null)
    setMenuGoalId(null)
  }

  if (selectedGoalId) {
    return (
      <GoalDetail
        goalId={selectedGoalId}
        onBack={() => setSelectedGoalId(null)}
      />
    )
  }

  return (
    <section className="chat-scroll h-full overflow-y-auto bg-[#e9efec] px-2 py-3 md:px-4 md:py-5">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Map size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-600 md:text-sm">目标地图</p>
            <h1 className="text-lg font-black text-slate-800 md:text-xl">
              把长期目标切成能落地的路线
            </h1>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 md:mt-4">
          <p className="text-sm text-slate-500 md:text-base">
            使用多步向导创建可执行的目标计划。
          </p>
          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-bold text-white transition hover:bg-emerald-700 md:min-h-11 md:text-sm"
          >
            <Plus size={16} />
            新建目标
          </button>
        </div>

        {feedback && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-base font-medium text-emerald-800 md:px-4 md:text-sm">
            {feedback}
          </div>
        )}

        {goals.length === 0 && (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-5 text-center">
            <p className="text-base font-bold text-slate-600">还没有目标</p>
            <p className="mt-1 text-sm text-slate-400 md:text-base">
              点击“新建目标”，把它拆成阶段、周任务和每日行动。
            </p>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {goals.map((goal) => {
            const isBusy = busyId === goal.id

            return (
              <article
                key={goal.id}
                onClick={() => setSelectedGoalId(goal.id)}
                className="w-full cursor-pointer rounded-2xl border border-white bg-white p-3 shadow-sm transition hover:border-emerald-200 md:p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          ['学习类', '执行类', '习惯类', '杂务类'].includes(
                            goal.category,
                          )
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {goal.category || (goal.type === 'long' ? '长期' : '短期')}
                      </span>
                      <h2 className="truncate text-base font-black text-slate-800 md:text-lg">
                        {goal.title}
                      </h2>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500 md:text-sm">
                      <CalendarDays size={13} />
                      {getDeadlineLabel(goal.deadline)}
                      {goal.deadlineWarning && (
                        <TriangleAlert
                          size={13}
                          className="text-amber-500"
                          aria-label="截止日期已调整但任务未重排"
                        />
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-800">
                        {goal.progress}%
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400">
                        目标进度
                      </p>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setMenuGoalId((current) =>
                            current === goal.id ? null : goal.id,
                          )
                        }}
                        aria-label={`${goal.title} 更多操作`}
                        title="更多操作"
                        className="grid h-11 w-11 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 md:h-9 md:w-9"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {menuGoalId === goal.id && (
                        <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setMenuGoalId(null)
                              setGoalToDelete(goal)
                            }}
                            className="inline-flex min-h-12 w-full items-center gap-2 px-3 text-base font-semibold text-rose-600 transition hover:bg-rose-50 md:min-h-11 md:text-sm"
                          >
                            <Trash2 size={15} />
                            删除目标
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  {goal.nodes.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-center text-xs text-slate-400">
                      还没有阶段，点击“AI 帮我拆分”生成路线。
                    </p>
                  )}

                  {goal.nodes.map((node) => (
                    <label
                      key={node.id}
                      onClick={(event) => event.stopPropagation()}
                      className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 md:min-h-11"
                    >
                      <input
                        type="checkbox"
                        checked={node.completed}
                        onChange={(event) => {
                          event.stopPropagation()
                          handleToggle(goal, node)
                        }}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      <span
                        className={`text-base ${
                          node.completed
                            ? 'text-slate-400 line-through'
                            : 'text-slate-700'
                        }`}
                      >
                        {node.title}
                      </span>
                      {node.completed && (
                        <Check size={14} className="ml-auto text-emerald-600" />
                      )}
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleAiSplit(goal)
                    }}
                    disabled={isBusy}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-3.5 text-base font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60 md:min-h-11 md:text-sm"
                  >
                    {isBusy ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    AI 帮我拆分
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleSuggestion(goal)
                    }}
                    disabled={isBusy}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-400 px-3.5 text-base font-bold text-[#17261f] transition hover:bg-amber-300 disabled:opacity-60 md:min-h-11 md:text-sm"
                  >
                    {isBusy ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Lightbulb size={14} />
                    )}
                    AI 调整建议
                  </button>
                </div>

                {suggestions[goal.id] && (
                  <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <Target size={15} className="mt-0.5 shrink-0 text-amber-700" />
                    <p className="whitespace-pre-wrap text-sm leading-5 text-amber-900 md:text-base">
                      {suggestions[goal.id]}
                    </p>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>

      {goalToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center"
          onClick={() => setGoalToDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">删除目标</h3>
                <p className="mt-0.5 text-sm text-slate-500 md:text-base">
                  确定删除“{goalToDelete.title}”吗？
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm leading-5 text-slate-500 md:text-base">
              删除后，这个目标及其阶段、进度都会一起移除，且无法恢复。
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-100 px-3 text-base font-bold text-slate-600 transition hover:bg-slate-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDeleteGoal}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 text-base font-bold text-white transition hover:bg-rose-700"
              >
                <Trash2 size={15} />
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {isWizardOpen && (
        <GoalWizard
          open={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
        />
      )}
    </section>
  )
}
