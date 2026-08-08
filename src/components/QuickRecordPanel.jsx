import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { useChat } from '../context/ChatContext'
import { useRecord } from '../context/RecordContext'

const MOODS = ['😄', '😐', '😢', '😴']

export default function QuickRecordPanel({ open, onClose }) {
  const { addSystemMessage } = useChat()
  const { setMood, addDiet, addBill } = useRecord()
  const [selectedMood, setSelectedMood] = useState('😐')
  const [meal, setMeal] = useState('午餐')
  const [content, setContent] = useState('')
  const [dietCost, setDietCost] = useState(0)
  const [billItem, setBillItem] = useState('')
  const [billAmount, setBillAmount] = useState(0)
  const [category, setCategory] = useState('餐饮')

  if (!open) {
    return null
  }

  function handleMood() {
    setMood(selectedMood)
    addSystemMessage(`✅ 已记录今日心情：${selectedMood}`)
    onClose()
  }

  function handleDiet(event) {
    event.preventDefault()
    addDiet({ meal, content, cost: dietCost })
    addSystemMessage(`✅ 已记录${meal}：${content || '未填写内容'} ${dietCost} 元`)
    setContent('')
    setDietCost(0)
    onClose()
  }

  function handleBill(event) {
    event.preventDefault()
    addBill({ item: billItem, amount: billAmount, category })
    addSystemMessage(`✅ 已记账：${billItem || '未命名'} ${billAmount} 元`)
    setBillItem('')
    setBillAmount(0)
    onClose()
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
            <p className="text-xs font-bold text-sky-600">快捷记录</p>
            <h2 className="mt-1 text-lg font-black text-slate-800">今天发生了什么</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭快捷记录"
            className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-base font-bold text-slate-800">心情</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {MOODS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSelectedMood(item)}
                className={`grid h-12 place-items-center rounded-xl text-2xl ${
                  selectedMood === item
                    ? 'bg-emerald-100 ring-2 ring-emerald-400'
                    : 'bg-slate-50'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleMood}
            className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-bold text-white"
          >
            <Check size={15} />
            保存心情
          </button>
        </div>

        <form onSubmit={handleDiet} className="mt-4 rounded-2xl bg-slate-50 p-3">
          <p className="text-base font-bold text-slate-800">饮食记录</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              value={meal}
              onChange={(event) => setMeal(event.target.value)}
              className="min-h-12 rounded-xl border border-slate-200 bg-white px-2 text-base"
            >
              <option>早餐</option>
              <option>午餐</option>
              <option>晚餐</option>
              <option>加餐</option>
            </select>
            <input
              type="number"
              min="0"
              value={dietCost}
              onChange={(event) => setDietCost(Number(event.target.value))}
              placeholder="花费"
              className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-base"
            />
          </div>
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="吃了什么"
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base"
          />
          <button
            type="submit"
            className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-600 px-4 text-base font-bold text-white"
          >
            <Plus size={15} />
            添加饮食
          </button>
        </form>

        <form onSubmit={handleBill} className="mt-4 rounded-2xl bg-slate-50 p-3">
          <p className="text-base font-bold text-slate-800">快速记账</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              value={billItem}
              onChange={(event) => setBillItem(event.target.value)}
              placeholder="项目"
              className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-base"
            />
            <input
              type="number"
              min="0"
              value={billAmount}
              onChange={(event) => setBillAmount(Number(event.target.value))}
              placeholder="金额"
              className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-base"
            />
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base"
          >
            <option>餐饮</option>
            <option>交通</option>
            <option>学习</option>
            <option>娱乐</option>
            <option>其他</option>
          </select>
          <button
            type="submit"
            className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-600 px-4 text-base font-bold text-white"
          >
            <Plus size={15} />
            添加账单
          </button>
        </form>
      </div>
    </div>
  )
}
