import { useState } from 'react'
import GoalMap from './GoalMap'
import SopManagement from './SopManagement'

const TABS = [
  { id: 'goals', label: '我的目标' },
  { id: 'sops', label: '我的 SOP' },
]

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState('goals')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2 md:px-4">
        <div className="mx-auto flex max-w-3xl gap-1 rounded-xl bg-slate-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-12 flex-1 items-center justify-center rounded-xl text-base font-bold transition ${
                activeTab === tab.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === 'goals' ? <GoalMap /> : <SopManagement />}
      </div>
    </div>
  )
}
