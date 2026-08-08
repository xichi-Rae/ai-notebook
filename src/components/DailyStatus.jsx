import { useState } from 'react'
import {
  Banknote,
  ClipboardList,
  Coffee,
  Focus,
  Plus,
} from 'lucide-react'
import { useRecord } from '../context/RecordContext'

const MOODS = ['😄', '😐', '😢', '😴']

export default function DailyStatus() {
  const {
    todayRecord,
    setMood,
    setEnergy,
    setFocus,
    addDiet,
    addBill,
  } = useRecord()
  const [dietMeal, setDietMeal] = useState('午餐')
  const [dietContent, setDietContent] = useState('')
  const [dietCost, setDietCost] = useState(0)
  const [billItem, setBillItem] = useState('')
  const [billAmount, setBillAmount] = useState(0)
  const [billCategory, setBillCategory] = useState('餐饮')

  const billTotal = todayRecord.bills.reduce(
    (total, bill) => total + Number(bill.amount || 0),
    0,
  )

  function handleDiet(event) {
    event.preventDefault()
    addDiet({
      meal: dietMeal,
      content: dietContent,
      cost: dietCost,
    })
    setDietContent('')
    setDietCost(0)
  }

  function handleBill(event) {
    event.preventDefault()
    addBill({
      item: billItem,
      amount: billAmount,
      category: billCategory,
    })
    setBillItem('')
    setBillAmount(0)
  }

  return (
    <section className="chat-scroll h-full overflow-y-auto bg-[#e9efec] px-2 py-3 md:px-4 md:py-5">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-600 text-white shadow-sm">
            <ClipboardList size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-sky-700 md:text-sm">今日状态</p>
            <h1 className="text-lg font-black text-slate-800 md:text-xl">
              记录心情、能量与生活闭环
            </h1>
          </div>
        </div>

        {todayRecord.sopCompletions?.length > 0 && (
          <section className="mt-3 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm md:mt-4 md:p-4">
            <p className="text-base font-bold text-slate-800">今日 SOP 完成</p>
            <div className="mt-2 space-y-2">
              {todayRecord.sopCompletions.map((completion, index) => (
                <div
                  key={`${completion.title}-${index}`}
                  className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5"
                >
                  <div>
                    <p className="text-base font-bold text-emerald-800">
                      🎉 {completion.title}
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-600">
                      完成 {completion.steps} 个步骤 · +30 EXP
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(completion.completedAt).toLocaleTimeString(
                      'zh-CN',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2 md:mt-4 md:gap-4">
          <section className="rounded-2xl border border-white bg-white p-3 shadow-sm md:p-4">
            <p className="text-base font-bold text-slate-800">心情</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setMood(mood)}
                  className={`grid h-12 place-items-center rounded-xl text-2xl transition md:h-11 ${
                    todayRecord.mood === mood
                      ? 'bg-emerald-100 ring-2 ring-emerald-400'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>

            <p className="mt-5 text-base font-bold text-slate-800">
              能量：{todayRecord.energy}/5
            </p>
            <input
              type="range"
              min="1"
              max="5"
              value={todayRecord.energy}
              onChange={(event) => setEnergy(event.target.value)}
              className="mt-2 w-full accent-emerald-600"
            />

            <p className="mt-5 text-base font-bold text-slate-800">专注状态</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFocus('focused')}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-base font-bold ${
                  todayRecord.focus === 'focused'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Focus size={15} />
                专注
              </button>
              <button
                type="button"
                onClick={() => setFocus('distracted')}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-base font-bold ${
                  todayRecord.focus === 'distracted'
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Focus size={15} />
                分心
              </button>
            </div>
          </section>

          <div className="space-y-4">
            <section className="rounded-2xl border border-white bg-white p-3 shadow-sm md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-slate-800">饮食摘要</p>
                <Coffee size={16} className="text-amber-600" />
              </div>

              <form onSubmit={handleDiet} className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={dietMeal}
                    onChange={(event) => setDietMeal(event.target.value)}
                    className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-2 text-base outline-none md:min-h-10 md:text-sm"
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
                    className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-emerald-400 md:min-h-10 md:text-sm"
                  />
                </div>
                <input
                  value={dietContent}
                  onChange={(event) => setDietContent(event.target.value)}
                  placeholder="吃了什么"
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-emerald-400 md:min-h-10 md:text-sm"
                />
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-base font-bold text-white transition hover:bg-emerald-700 md:min-h-10 md:text-sm"
                >
                  <Plus size={14} />
                  添加饮食
                </button>
              </form>

              <div className="mt-3 space-y-1.5">
                {todayRecord.diet.length === 0 && (
                  <p className="text-sm text-slate-400 md:text-base">今天还没有饮食记录。</p>
                )}
                {todayRecord.diet.map((item, index) => (
                  <div
                    key={`${item.meal}-${index}`}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm md:text-base"
                  >
                    <span className="font-semibold text-slate-700">
                      {item.meal}：{item.content}
                    </span>
                    <span className="text-slate-400">{item.cost} 元</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white bg-white p-3 shadow-sm md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-slate-800">账单</p>
                <Banknote size={16} className="text-sky-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-800">
                {billTotal} 元
              </p>
              <p className="text-xs text-slate-400 md:text-sm">今日账单合计</p>

              <form onSubmit={handleBill} className="mt-3 grid grid-cols-2 gap-2">
                <input
                  value={billItem}
                  onChange={(event) => setBillItem(event.target.value)}
                  placeholder="项目"
                  className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-emerald-400 md:min-h-10 md:text-sm"
                />
                <input
                  type="number"
                  min="0"
                  value={billAmount}
                  onChange={(event) => setBillAmount(Number(event.target.value))}
                  placeholder="金额"
                  className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none focus:border-emerald-400 md:min-h-10 md:text-sm"
                />
                <select
                  value={billCategory}
                  onChange={(event) => setBillCategory(event.target.value)}
                  className="col-span-2 min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base outline-none md:min-h-10 md:text-sm"
                >
                  <option>餐饮</option>
                  <option>交通</option>
                  <option>学习</option>
                  <option>娱乐</option>
                  <option>其他</option>
                </select>
                <button
                  type="submit"
                  className="col-span-2 inline-flex min-h-12 items-center justify-center gap-1 rounded-xl bg-sky-600 px-3 text-base font-bold text-white transition hover:bg-sky-700 md:min-h-10 md:text-sm"
                >
                  <Plus size={14} />
                  添加账单
                </button>
              </form>

              <div className="mt-3 space-y-1.5">
                {todayRecord.bills.length === 0 && (
                  <p className="text-sm text-slate-400 md:text-base">今天还没有账单。</p>
                )}
                {todayRecord.bills.map((bill, index) => (
                  <div
                    key={`${bill.item}-${index}`}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm md:text-base"
                  >
                    <span className="font-semibold text-slate-700">
                      {bill.item}
                      <span className="ml-2 text-slate-400">{bill.category}</span>
                    </span>
                    <span className="font-bold text-slate-700">
                      {bill.amount} 元
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}
