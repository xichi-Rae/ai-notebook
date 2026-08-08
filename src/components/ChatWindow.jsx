import { useEffect, useRef } from 'react'
import { useChat } from '../context/ChatContext'
import MessageBubble from './MessageBubble'

export default function ChatWindow() {
  const { messages, isTyping } = useChat()
  const scrollRef = useRef(null)

  useEffect(() => {
    const node = scrollRef.current
    if (node) {
      node.scrollTop = node.scrollHeight
    }
  }, [messages, isTyping])

  return (
    <section
      ref={scrollRef}
      className="chat-scroll flex-1 overflow-y-auto bg-[#e9efec] px-2 py-3 md:px-5 md:py-4"
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex justify-center">
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm md:text-sm">
            今日 · 冒险记录
          </span>
        </div>

        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isTyping && <TypingIndicator />}
        </div>
      </div>
    </section>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 pl-10">
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:120ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-300 [animation-delay:240ms]" />
        </div>
        <span className="text-sm font-medium text-slate-500 md:text-base">
          执行猫正在思考...
        </span>
      </div>
    </div>
  )
}
