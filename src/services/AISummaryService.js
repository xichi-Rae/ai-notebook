import { fetchDeepSeekReply } from './deepseek'
import { sanitizeAIResponse } from '../utils/sanitizeAIResponse'
export {
  exportSummaryAsImage,
  exportSummaryAsText,
} from '../utils/export'

const SUMMARY_STORAGE_KEY = 'executive-coach-ai-summaries'

function toLocalDateKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function addDays(dateKey, amount) {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + amount)
  return toLocalDateKey(date)
}

function getDateRange(endDate, days) {
  const dates = []
  for (let index = days - 1; index >= 0; index -= 1) {
    dates.push(addDays(endDate, -index))
  }
  return dates
}

function createEmptyRecord(date) {
  return {
    date,
    mood: '😐',
    energy: 3,
    diet: [],
    bills: [],
    focus: 'distracted',
  }
}

function getRecord(records, date) {
  return records?.[date] || createEmptyRecord(date)
}

function countCompletedTodos(todos, startDate, endDate) {
  return todos.filter((todo) => {
    if (!todo.completed) {
      return false
    }
    if (!todo.targetDate && !todo.date) {
      return true
    }
    const targetDate = todo.targetDate || todo.date
    return targetDate >= startDate && targetDate <= endDate
  }).length
}

function formatMood(moods) {
  if (!moods?.length) {
    return '暂无记录'
  }
  return moods.join('、')
}

function formatEnergy(energies) {
  if (!energies?.length) {
    return '暂无记录'
  }
  return energies.join(' / 5、')
}

function formatDiet(diets) {
  if (!diets?.length) {
    return '暂无记录'
  }
  return diets
    .map(
      (diet) =>
        `${diet.meal || '一餐'}：${diet.content || '未填写内容'}${
          diet.cost ? `（${diet.cost} 元）` : ''
        }`,
    )
    .join('；')
}

function formatBills(bills) {
  if (!bills?.length) {
    return '暂无记录'
  }
  const total = bills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0)
  return `${bills
    .map((bill) => `${bill.item || '未命名'} ${Number(bill.amount) || 0} 元`)
    .join('、')}；合计 ${total} 元`
}

export function getDailySummaryData(date, records = {}, todos = []) {
  const record = getRecord(records, date)
  const completedTodos = countCompletedTodos(todos, date, date)

  return {
    date,
    mood: record.mood ? [record.mood] : [],
    energy: record.energy == null ? [] : [record.energy],
    diet: record.diet || [],
    bills: record.bills || [],
    completedTodos,
    focus: record.focus || '暂无记录',
  }
}

export function getWeeklySummaryData(endDate, records = {}, todos = []) {
  const dates = getDateRange(endDate, 7)
  const rangeRecords = dates.map((date) => getRecord(records, date))

  return {
    startDate: dates[0],
    endDate,
    mood: rangeRecords.map((record) => record.mood).filter(Boolean),
    energy: rangeRecords
      .map((record) => record.energy)
      .filter((value) => value != null),
    diet: rangeRecords.flatMap((record) => record.diet || []),
    bills: rangeRecords.flatMap((record) => record.bills || []),
    completedTodos: countCompletedTodos(todos, dates[0], endDate),
  }
}

export function getMonthlySummaryData(endDate, records = {}, todos = []) {
  const dates = getDateRange(endDate, 30)
  const rangeRecords = dates.map((date) => getRecord(records, date))

  return {
    startDate: dates[0],
    endDate,
    mood: rangeRecords.map((record) => record.mood).filter(Boolean),
    energy: rangeRecords
      .map((record) => record.energy)
      .filter((value) => value != null),
    diet: rangeRecords.flatMap((record) => record.diet || []),
    bills: rangeRecords.flatMap((record) => record.bills || []),
    completedTodos: countCompletedTodos(todos, dates[0], endDate),
  }
}

function buildSummaryPrompt(type, data) {
  const typeLabels = {
    day: '今日',
    week: '本周',
    month: '本月',
  }
  const label = typeLabels[type] || '今日'

  return `你是用户的私人复盘教练。根据以下用户的生活记录，生成一份${label}总结报告：

心情记录：${formatMood(data.mood)}
能量水平：${formatEnergy(data.energy)}
饮食记录：${formatDiet(data.diet)}
消费记录：${formatBills(data.bills)}
完成任务：${data.completedTodos || 0} 个

请用温暖、鼓励的语气，包含以下内容：
1. 总体概述（2-3句话）
2. 亮点与进步
3. 需要关注的地方
4. 一个下周的小建议

格式要求：使用 Emoji 标记各板块，段落简短，适合手机阅读。避免使用星号。`
}

export async function generateSummary(type, data) {
  const prompt = buildSummaryPrompt(type, data)
  const content = await fetchDeepSeekReply([
    {
      role: 'user',
      content: prompt,
    },
  ])
  return sanitizeAIResponse(content)
}

function readSummaryStore() {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(SUMMARY_STORAGE_KEY) || '{}',
    )
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function readStoredSummary(type, date) {
  return readSummaryStore()[`${type}:${date}`] || null
}

export function saveStoredSummary(type, date, summary) {
  const nextStore = {
    ...readSummaryStore(),
    [`${type}:${date}`]: summary,
  }
  try {
    window.localStorage.setItem(
      SUMMARY_STORAGE_KEY,
      JSON.stringify(nextStore),
    )
  } catch {
    // Local storage can be unavailable in privacy modes.
  }
}
