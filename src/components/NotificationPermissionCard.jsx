import { useState } from 'react'
import { BellRing } from 'lucide-react'
import { useGame } from '../context/GameContext'

function getBrowserPermission() {
  return typeof Notification !== 'undefined'
    ? Notification.permission
    : 'unsupported'
}

export default function NotificationPermissionCard() {
  const { unlockAchievement } = useGame()
  const [permissionState, setPermissionState] = useState(getBrowserPermission)
  const [isRequesting, setIsRequesting] = useState(false)
  const [testSent, setTestSent] = useState(false)

  const isSupported = typeof Notification !== 'undefined'
  const isStandalone =
    typeof window !== 'undefined' &&
    window.matchMedia('(display-mode: standalone)').matches
  const isGranted = permissionState === 'granted'
  const isDenied = permissionState === 'denied'
  const isDefault = permissionState === 'default'

  let buttonLabel = '🔔 开启每日提醒'
  let buttonClassName =
    'bg-sky-600 text-white hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60'
  let buttonDisabled = false
  let guideText = ''

  if (!isSupported) {
    buttonLabel = '🔕 你的浏览器不支持通知'
    buttonClassName = 'cursor-not-allowed bg-slate-200 text-slate-500'
    buttonDisabled = true
  } else if (isGranted) {
    buttonLabel = '✅ 通知已开启'
    buttonClassName = 'cursor-not-allowed bg-slate-200 text-slate-500'
    buttonDisabled = true
  } else if (isDenied) {
    buttonLabel = '❌ 通知被拒绝'
    buttonClassName = 'bg-rose-50 text-rose-600 hover:bg-rose-100'
    guideText = '请在浏览器设置 → 网站设置中，允许本网站发送通知'
  }

  function sendTestNotification() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return
    }

    try {
      new Notification('执行猫', {
        body: '测试通知：通知权限正常，我会按时提醒你。',
      })
      setTestSent(true)
      window.setTimeout(() => setTestSent(false), 2200)
    } catch {
      // Some mobile browsers may reject the notification even when granted.
    }
  }

  async function handleNotificationRequest() {
    if (typeof Notification === 'undefined') {
      return
    }

    if (Notification.permission === 'granted') {
      setPermissionState('granted')
      return
    }

    if (Notification.permission === 'denied') {
      alert('请在浏览器设置中手动允许通知')
      return
    }

    setIsRequesting(true)
    try {
      const result = await Notification.requestPermission()
      setPermissionState(result)

      if (result === 'granted') {
        unlockAchievement('notification-unlock')
        try {
          new Notification('执行猫', {
            body: '通知已就绪！我会按时提醒你。',
          })
        } catch {
          // The permission is granted; some mobile browsers still require the PWA prompt.
        }
      }
    } finally {
      setIsRequesting(false)
    }
  }

  return (
    <div>
      <p className="text-base font-bold text-slate-800">浏览器通知权限</p>
      <p className="mt-1 text-sm text-slate-500 md:text-base">
        当前状态：
        {!isSupported
          ? '不支持'
          : isGranted
            ? '已授权'
            : isDenied
              ? '已拒绝'
              : '未决定'}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleNotificationRequest}
          disabled={buttonDisabled || isRequesting}
          className={`inline-flex min-h-12 items-center gap-2 rounded-xl px-3.5 text-base font-bold transition md:min-h-11 md:text-sm ${buttonClassName}`}
        >
          <BellRing size={15} />
          {isRequesting ? '正在请求...' : buttonLabel}
        </button>

        {isGranted && (
          <button
            type="button"
            onClick={sendTestNotification}
            className="inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-bold text-sky-600 underline decoration-sky-300 underline-offset-4 transition hover:text-sky-700 md:min-h-9"
          >
            {testSent ? '已发送测试通知' : '测试通知'}
          </button>
        )}
      </div>

      {guideText && (
        <p className="mt-2 text-sm text-rose-500 md:text-base">{guideText}</p>
      )}

      {isSupported && isDefault && !isStandalone && (
        <p className="mt-2 text-xs text-slate-400 md:hidden md:text-sm">
          手机上需将此网页添加到主屏幕才能接收后台通知
        </p>
      )}
    </div>
  )
}
