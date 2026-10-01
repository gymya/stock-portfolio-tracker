import { translateMarketDate } from '../date/rocDateTranslator.ts'
import type { StockQuote, StockQuoteProvider } from './types.ts'

interface FugleQuote {
  symbol: string
  name: string
  date: string
  exchange: string
  type: string
  closePrice?: number
  closeTime?: number
  previousClose?: number
  lastTrade?: { price?: number; time?: number }
}
const positive = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null

export function normalizeFugleQuote(data: unknown): StockQuote {
  if (!data || typeof data !== 'object') throw new Error('Fugle 行情格式異常。')
  const row = data as Partial<FugleQuote>
  if (typeof row.symbol !== 'string' || !/^[A-Z0-9]{4,10}$/.test(row.symbol) || typeof row.name !== 'string' || !row.name.trim() || typeof row.date !== 'string') throw new Error('Fugle 行情格式異常。')
  if (row.exchange !== 'TWSE' || row.type !== 'EQUITY') throw new Error('目前僅支援證交所上市股票與 ETF。')
  const date = translateMarketDate(row.date)
  // lastPrice/change include trial matching; only use actual trades for valuation.
  const tradePrice = positive(row.lastTrade?.price)
  const close = tradePrice ?? positive(row.closePrice)
  const previousClose = positive(row.previousClose)
  const micros = tradePrice !== null ? row.lastTrade?.time : row.closeTime
  let quoteTime: string | null = null
  if (typeof micros === 'number' && Number.isSafeInteger(micros) && micros > 0) {
    const instant = new Date(micros / 1000)
    if (Number.isFinite(instant.getTime())) {
      const localDate = new Date(instant.getTime() + 8 * 3600000).toISOString().slice(0, 10)
      if (localDate !== date) throw new Error('Fugle 成交日期與報價日期不一致。')
      quoteTime = instant.toISOString()
    }
  }
  return { symbol: row.symbol, name: row.name.trim(), date, close, previousClose, change: close !== null && previousClose !== null ? Number((close - previousClose).toFixed(8)) : null, quoteTime }
}

export const fugleProvider: StockQuoteProvider = {
  async fetchQuotes(symbols = []) {
    if (!symbols.length) return []
    const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`, { signal: AbortSignal.timeout(30000) })
    if (!response.ok) {
      const messages: Record<number, string> = {
        400: '股票代碼格式錯誤，或一次查詢超過 20 檔。',
        401: 'Fugle API Key 無效，請檢查伺服器設定。',
        403: 'Fugle 方案沒有此行情權限。',
        404: '找不到此股票代碼。',
        429: 'Fugle 行情額度已達上限，請稍後重試。',
        503: 'Fugle 行情服務尚未設定，請設定伺服器 API Key 與網址。',
      }
      throw new Error(messages[response.status] ?? 'Fugle 行情暫時無法取得，請稍後重試。')
    }
    const data: unknown = await response.json()
    if (!Array.isArray(data) || data.length !== symbols.length) throw new Error('Fugle 回傳不完整的行情。')
    const quotes = data.map(normalizeFugleQuote)
    if (new Set(quotes.map(q => q.symbol)).size !== symbols.length || quotes.some(q => !symbols.includes(q.symbol))) throw new Error('Fugle 回傳的股票代碼不一致。')
    return quotes
  },
}
