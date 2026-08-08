import { useEffect, useRef, useState } from 'react'

const LIKED_MESSAGES_KEY = 'liked_messages'

function readLikedMessages() {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(LIKED_MESSAGES_KEY) || '[]',
    )
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

function isMessageLiked(messageId) {
  return readLikedMessages().some((item) => item.id === messageId)
}

function getMessageText(message) {
  if (message.type === 'meaning') {
    return [message.title, message.body || message.text].filter(Boolean).join('\n')
  }

  if (message.type === 'task') {
    return `任务卡片：${message.title}\n时长：${message.duration || 25} 分钟`
  }

  if (message.type === 'reminder') {
    return [message.title || '提醒', message.text || message.content || message.time]
      .filter(Boolean)
      .join('\n')
  }

  return message.text || message.body || message.title || ''
}

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

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

export default function AIBubbleActions({ message }) {
  const [liked, setLiked] = useState(() => isMessageLiked(message.id))
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  function showToast(text) {
    setToast(text)
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast('')
    }, 1800)
  }

  function handleLike() {
    const likedMessages = readLikedMessages()
    const alreadyLiked = likedMessages.some((item) => item.id === message.id)
    const nextLikedMessages = alreadyLiked
      ? likedMessages.filter((item) => item.id !== message.id)
      : [
          ...likedMessages,
          {
            id: message.id,
            text: getMessageText(message),
            likedAt: new Date().toISOString(),
          },
        ]

    try {
      window.localStorage.setItem(
        LIKED_MESSAGES_KEY,
        JSON.stringify(nextLikedMessages),
      )
      setLiked(!alreadyLiked)
      showToast(alreadyLiked ? '已取消喜欢' : '已收到你的喜欢~')
    } catch {
      showToast('保存失败，稍后再试')
    }
  }

  async function handleCopy() {
    const plainText = stripMarkdown(getMessageText(message))

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plainText)
        showToast('已复制')
        return
      }
    } catch {
      // Fall through to the non-async fallback.
    }

    try {
      copyTextFallback(plainText)
      showToast('已复制')
    } catch {
      showToast('复制失败，请手动选择文本')
    }
  }

  return (
    <div
      className={`ml-10 mt-0.5 flex items-center justify-end gap-1 pr-1 transition-opacity duration-200 group-focus-within:opacity-100 group-active:opacity-100 group-hover:opacity-100 ${
        liked ? 'opacity-100' : 'opacity-40'
      }`}
    >
      {toast ? (
        <span className="mr-auto whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm">
          {toast}
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleLike}
        aria-label={liked ? '取消喜欢这条消息' : '喜欢这条消息'}
        aria-pressed={liked}
        className={`grid h-5 w-5 place-items-center rounded-full p-0 text-[10px] leading-none transition hover:bg-gray-100 ${
          liked ? 'text-blue-500' : 'text-slate-500'
        }`}
      >
        👍
      </button>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="复制这条消息"
        className="grid h-5 w-5 place-items-center rounded-full p-0 text-[10px] leading-none text-slate-500 transition hover:bg-gray-100"
      >
        📋
      </button>
    </div>
  )
}
