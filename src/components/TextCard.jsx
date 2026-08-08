import { Bot } from 'lucide-react'

export default function TextCard({ message }) {
  const isReward = Boolean(message.reward)
  const isError = Boolean(message.error)

  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#17261f] text-emerald-200 shadow-sm md:h-8 md:w-8">
        <Bot size={16} />
      </div>

      <div className="min-w-0 flex-1 max-w-md rounded-2xl rounded-tl-md border border-white bg-white p-3 shadow-sm md:p-4">
        <p
          className={`whitespace-pre-wrap break-words text-base leading-6 md:text-base ${
            isReward
              ? 'font-medium text-emerald-800'
              : isError
                ? 'font-medium text-red-700'
                : 'text-slate-700'
          }`}
        >
          {message.text}
        </p>
      </div>
    </div>
  )
}
