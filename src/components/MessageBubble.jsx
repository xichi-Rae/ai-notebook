import MeaningCard from './MeaningCard'
import AIBubbleActions from './AIBubbleActions'
import ReminderCard from './ReminderCard'
import SopCard from './SopCard'
import SummaryCard from './SummaryCard'
import SummaryPromptCard from './SummaryPromptCard'
import TaskCard from './TaskCard'
import TeachReplyButton from './TeachReplyButton'
import TextCard from './TextCard'
import { sanitizeAIResponse } from '../utils/sanitizeAIResponse'

function sanitizeMessage(message) {
  if (message.role !== 'system') {
    return message
  }

  const safeSop = message.sop
    ? {
        ...message.sop,
        steps: (message.sop.steps || []).map((step) => ({
          ...step,
          action: sanitizeAIResponse(step.action),
          title: sanitizeAIResponse(step.title),
        })),
      }
    : message.sop

  return {
    ...message,
    text: sanitizeAIResponse(message.text),
    body: sanitizeAIResponse(message.body),
    title: sanitizeAIResponse(message.title),
    content: sanitizeAIResponse(message.content),
    sop: safeSop,
  }
}

export default function MessageBubble({ message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[86%] rounded-2xl rounded-tr-md bg-[#d9f2c8] px-3 py-3 text-base font-medium text-slate-800 shadow-sm md:max-w-[84%] md:px-4 md:text-base">
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>
      </div>
    )
  }

  const safeMessage = sanitizeMessage(message)

  if (safeMessage.type === 'system-notice') {
    return (
      <div className="flex justify-center px-4">
        <span className="max-w-[92%] rounded-full bg-slate-200/90 px-3 py-2 text-center text-xs font-medium leading-5 text-slate-600 shadow-sm md:text-sm">
          {safeMessage.text}
        </span>
      </div>
    )
  }

  if (safeMessage.type === 'summary') {
    return <SummaryCard message={safeMessage} />
  }

  if (safeMessage.type === 'summary-prompt') {
    return <SummaryPromptCard message={safeMessage} />
  }

  let card
  if (message.type === 'reminder') {
    card = <ReminderCard message={safeMessage} />
  } else if (message.type === 'task') {
    card = <TaskCard message={safeMessage} />
  } else if (message.type === 'sop') {
    card = <SopCard message={safeMessage} />
  } else if (message.type === 'meaning') {
    card = <MeaningCard message={safeMessage} />
  } else {
    card = <TextCard message={safeMessage} />
  }

  return (
    <div>
      <div className="group">
        {card}
        <AIBubbleActions message={safeMessage} />
      </div>
      <TeachReplyButton />
    </div>
  )
}
