import { useState } from 'react'
import { Download, Save, Sparkles, X } from 'lucide-react'
import NotificationPermissionCard from './NotificationPermissionCard'

const STYLE_KEY = 'executive-coach-style-learning'

function readStylePreferences() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STYLE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.join('\n') : ''
  } catch {
    return ''
  }
}

export default function ChatSettingsPanel({ open, onClose }) {
  const [styleDraft, setStyleDraft] = useState(readStylePreferences)
  const [saved, setSaved] = useState(false)

  if (!open) {
    return null
  }

  function handleSaveStyle() {
    const styles = styleDraft
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)

    try {
      window.localStorage.setItem(STYLE_KEY, JSON.stringify(styles))
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    } catch {
      // Local storage can be unavailable in strict privacy modes.
    }
  }

  function handleExport() {
    const data = {}
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith('executive-coach-')) {
        data[key] = window.localStorage.getItem(key)
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'executive-coach-data.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl border border-white bg-white p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600">设置</p>
            <h2 className="mt-1 text-lg font-black text-slate-800">偏好与数据</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭设置"
            className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
          <NotificationPermissionCard />
        </div>

        <div className="mt-4">
          <p className="flex items-center gap-2 text-base font-bold text-slate-800">
            <Sparkles size={16} className="text-amber-500" />
            AI 风格偏好
          </p>
          <textarea
            value={styleDraft}
            onChange={(event) => setStyleDraft(event.target.value)}
            rows={4}
            placeholder={"每行一条偏好，例如：\n回复短一点\n不要用 AI 腔"}
            className="mt-2 min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base leading-6 outline-none focus:border-emerald-400 focus:bg-white"
          />
          <button
            type="button"
            onClick={handleSaveStyle}
            className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-bold text-white"
          >
            <Save size={15} />
            {saved ? '已保存' : '保存风格偏好'}
          </button>
        </div>

        <div className="mt-4">
          <p className="text-base font-bold text-slate-800">数据导出</p>
          <p className="mt-1 text-sm text-slate-500">
            导出本地保存的提醒、SOP、用户名等数据。
          </p>
          <button
            type="button"
            onClick={handleExport}
            className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-100 px-4 text-base font-bold text-slate-600"
          >
            <Download size={15} />
            导出 JSON
          </button>
        </div>
      </div>
    </div>
  )
}
