import { useApp } from '../context/AppContext'

function EmojiIcon({ children }) {
  return <span className="text-xl leading-none">{children}</span>
}

const TABS = [
  { id: 'chat', label: '聊天', icon: () => <EmojiIcon>💬</EmojiIcon> },
  { id: 'today', label: '今日', icon: () => <EmojiIcon>✅</EmojiIcon> },
  { id: 'goals', label: '目标', icon: () => <EmojiIcon>🎯</EmojiIcon> },
]

export default function TopNav() {
  const { activeView, setActiveView } = useApp()

  return (
    <>
      <nav className="hidden shrink-0 gap-1 border-b border-slate-200 bg-white px-4 py-2 md:flex">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeView === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition md:min-h-0 md:py-2 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </nav>

      <nav className="fixed-bottom fixed inset-x-0 z-40 border-t border-slate-200 bg-white shadow-[0_-2px_12px_rgba(15,23,42,0.08)] md:hidden">
        <div className="mx-auto flex max-w-4xl">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeView === tab.id

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] ${
                  isActive
                    ? 'text-emerald-600'
                    : 'text-slate-500'
                }`}
              >
                <Icon size={22} />
                <span className="text-base font-semibold">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
