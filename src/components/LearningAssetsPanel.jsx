import { useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  MessageSquareText,
  Sparkles,
  Tags,
  Upload,
  X,
} from 'lucide-react'
import { useGoal } from '../context/GoalContext'
import { useTodo } from '../context/TodoContext'
import { fetchDeepSeekReply, parseJsonObject } from '../services/deepseek'
import { sanitizeAIResponse } from '../utils/sanitizeAIResponse'

function copyTextFallback(text) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function exportSheetAsImage(content) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const lines = content.split('\n')
  const lineHeight = 28
  const width = 900
  context.font = '18px sans-serif'
  const wrappedLines = lines.flatMap((line) =>
    wrapCanvasLine(context, line, width - 64),
  )
  const height = Math.max(420, wrappedLines.length * lineHeight + 80)

  canvas.width = width
  canvas.height = height
  context.fillStyle = '#fffdf8'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#16231e'

  let y = 44
  wrappedLines.forEach((part) => {
    context.fillText(part, 32, y)
    y += lineHeight
  })

  downloadCanvas(canvas, 'executive-coach-cheatsheet.png')
}

function wrapCanvasLine(context, line, maxWidth) {
  const words = line.split('')
  const lines = []
  let current = ''

  words.forEach((char) => {
    const test = current + char
    if (context.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = char
    } else {
      current = test
    }
  })

  if (current) {
    lines.push(current)
  }

  return lines.length ? lines : [line]
}

export default function LearningAssetsPanel({ goalId, onBack }) {
  const {
    goals,
    saveCheatSheet,
    addMasteredConcepts,
    setWeakConcepts,
    saveLearningRecord,
  } = useGoal()
  const { addTodos } = useTodo()
  const goal = goals.find((item) => item.id === goalId)

  const [currentSheet, setCurrentSheet] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastAnalysis, setLastAnalysis] = useState(null)
  const [toast, setToast] = useState('')

  if (!goal) {
    return (
      <section className="p-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-slate-500"
        >
          <ArrowLeft size={16} />
          返回目标详情
        </button>
        <p className="mt-6 text-center text-slate-500">目标不存在。</p>
      </section>
    )
  }

  function showToast(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  async function handleGenerateCheatSheet() {
    setIsGenerating(true)
    setToast('')

    const records = goal.learningRecords
      ?.map(
        (record) => `用户：${record.user || ''}\n私教：${record.assistant || ''}`,
      )
      .filter(Boolean)
      .join('\n\n')

    const prompt = `请根据以下学习记录，生成一页速查表，包含：
1. 一句话定义
2. 核心概念（列出 3-5 个）
3. 真实例子（1 个）
4. 常见错误（2 个）
5. 使用前检查清单（3 条）
6. 5 个自测问题
格式要求：简洁、适合快速复习，使用 Emoji 作为视觉标记。

学习记录：
${records || '暂无学习记录，请先生成一些私教对话。'}`

    try {
      const content = await fetchDeepSeekReply([
        {
          role: 'system',
          content:
            '你是学习速查表生成专家。直接输出速查表，不要输出额外解释。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ])
      setCurrentSheet(sanitizeAIResponse(content))
    } catch (error) {
      showToast(`速查表生成失败：${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSaveSheet() {
    if (!currentSheet.trim()) {
      return
    }

    saveCheatSheet(goal.id, currentSheet)
    showToast('速查表已保存。')
  }

  async function handleCopySheet() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentSheet)
      } else {
        copyTextFallback(currentSheet)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      copyTextFallback(currentSheet)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  async function handleAnalyzeImport(event) {
    event.preventDefault()
    if (!importText.trim() || isAnalyzing) {
      return
    }

    setIsAnalyzing(true)
    setToast('')

    const prompt = `请分析以下用户与 AI 的对话记录，提取：
1. 用户暴露的薄弱点
2. 用户表现出理解的概念
3. 反复出现的卡点
4. 建议的 3 个复习行动
返回格式：{ "weak_points": [], "understood": [], "stuck_points": [], "suggestions": [] }

对话记录：
${importText}`

    try {
      const content = await fetchDeepSeekReply([
        {
          role: 'system',
          content:
            '你是学习诊断分析专家。只返回合法 JSON，不要输出解释或 Markdown。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ])
      const parsed = parseJsonObject(content)

      if (!parsed) {
        throw new Error('AI 没有返回有效分析结果')
      }

      addMasteredConcepts(goal.id, parsed.understood || [])
      setWeakConcepts(goal.id, [
        ...(parsed.weak_points || []),
        ...(parsed.stuck_points || []),
      ])
      addTodos(
        (parsed.suggestions || []).map((suggestion) => ({
          title: sanitizeAIResponse(suggestion),
          source: 'ai',
          goalId: goal.id,
          goalTitle: goal.title,
        })),
      )
      saveLearningRecord(goal.id, {
        type: 'external-import',
        content: importText,
        analysis: parsed,
      })

      setLastAnalysis(parsed)
      setImportOpen(false)
      setImportText('')
      showToast('已更新知识图谱和今日待办。')
    } catch (error) {
      showToast(`导入分析失败：${error.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const mastered = goal.masteredConcepts || []
  const weak = goal.weakConcepts || []
  const savedSheets = goal.cheatSheets || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-slate-500"
        >
          <ArrowLeft size={16} />
          返回目标详情
        </button>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-700">
          学习资产库
        </span>
      </div>

      {toast && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
          {toast}
        </p>
      )}

      <section className="rounded-2xl border border-white bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-sky-600" />
            <div>
              <p className="text-base font-bold text-slate-800">速查表</p>
              <p className="mt-0.5 text-sm text-slate-400 md:text-base">
                根据学习记录生成一页可快速复习的资料。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateCheatSheet}
            disabled={isGenerating}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-600 px-4 text-base font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            生成速查表
          </button>
        </div>

        {currentSheet ? (
          <div className="mt-4 rounded-2xl border border-sky-100 bg-[#fffdf8] p-4">
            <pre className="whitespace-pre-wrap break-words font-sans text-base leading-7 text-slate-700">
              {currentSheet}
            </pre>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopySheet}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-3 text-base font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? '已复制' : '复制文本'}
              </button>
              <button
                type="button"
                onClick={() => exportSheetAsImage(currentSheet)}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-3 text-base font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <Download size={15} />
                导出图片
              </button>
              <button
                type="button"
                onClick={handleSaveSheet}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-base font-bold text-white transition hover:bg-emerald-700"
              >
                <FileText size={15} />
                保存速查表
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-sky-200 bg-sky-50 px-4 py-6 text-center text-sm text-slate-400">
            还没有速查表。生成后可以复制纯文本、导出图片或保存到目标。
          </p>
        )}

        {savedSheets.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-bold text-slate-600">已保存</p>
            {savedSheets.map((sheet) => (
              <div
                key={sheet.id}
                className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600"
              >
                <p className="whitespace-pre-wrap break-words line-clamp-4">
                  {sheet.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-emerald-600" />
          <div>
            <p className="text-base font-bold text-slate-800">知识图谱</p>
            <p className="mt-0.5 text-sm text-slate-400 md:text-base">
              绿色表示已掌握，橙色表示需要重点复习。
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-bold text-emerald-700">已掌握概念</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {mastered.length === 0 && (
                <span className="text-sm text-slate-400">暂无</span>
              )}
              {mastered.map((concept) => (
                <span
                  key={concept}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800"
                >
                  ✅ {concept}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-orange-600">薄弱概念</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {weak.length === 0 && (
                <span className="text-sm text-slate-400">暂无</span>
              )}
              {weak.map((concept) => (
                <span
                  key={concept}
                  className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-800"
                >
                  ⚠️ {concept}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tags size={18} className="text-amber-600" />
            <div>
              <p className="text-base font-bold text-slate-800">外部对话导入</p>
              <p className="mt-0.5 text-sm text-slate-400 md:text-base">
                粘贴其他 AI 对话，自动分析弱点和复习行动。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-400 px-4 text-base font-bold text-[#17261f] transition hover:bg-amber-300"
          >
            <Upload size={16} />
            导入外部对话
          </button>
        </div>

        {lastAnalysis && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <MessageSquareText size={15} />
              最近分析
            </p>
            <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <p>薄弱点：{(lastAnalysis.weak_points || []).join('、') || '无'}</p>
              <p>
                已理解：{(lastAnalysis.understood || []).join('、') || '无'}
              </p>
              <p>卡点：{(lastAnalysis.stuck_points || []).join('、') || '无'}</p>
              <p>
                建议：{(lastAnalysis.suggestions || []).join('、') || '无'}
              </p>
            </div>
          </div>
        )}
      </section>

      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center"
          onClick={() => setImportOpen(false)}
        >
          <form
            onSubmit={handleAnalyzeImport}
            className="w-full max-w-lg rounded-2xl border border-white bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-600">外部对话分析</p>
                <h3 className="mt-1 text-lg font-black text-slate-800">
                  导入聊天记录
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                aria-label="关闭导入"
                className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              rows={8}
              placeholder="把用户与 AI 的完整对话粘贴到这里..."
              className="mt-4 min-h-40 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base leading-6 outline-none focus:border-amber-400 focus:bg-white"
            />

            <button
              type="submit"
              disabled={!importText.trim() || isAnalyzing}
              className="mt-4 min-h-12 w-full rounded-xl bg-amber-400 text-base font-bold text-[#17261f] transition hover:bg-amber-300 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  正在分析...
                </span>
              ) : (
                '分析并更新'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
