import { normalizeStockList, STOCK_LIST_TTL, type StockEntry } from '../../app/services/stock/catalog.ts'
let cache: { stocks: StockEntry[]; fetchedAt: number } | null = null
let pending: Promise<{ stocks: StockEntry[]; fetchedAt: number }> | null = null
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store')
  if (cache && Date.now() - cache.fetchedAt < STOCK_LIST_TTL) return cache
  if (pending) return pending
  const { fugleApiBaseUrl, fugleApiKey } = useRuntimeConfig(event)
  let baseURL: string
  try {
    const url = new URL(fugleApiBaseUrl)
    if (!fugleApiKey.trim() || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error()
    baseURL = url.origin + url.pathname.replace(/\/$/, '')
  } catch { throw createError({ statusCode: 503, statusMessage: 'Fugle configuration unavailable' }) }
  pending = (async () => {
    try {
      const data = await $fetch<{ data: unknown }>('/intraday/tickers', {
        baseURL, query: { type: 'EQUITY', exchange: 'TWSE' },
        headers: { 'X-API-KEY': fugleApiKey }, timeout: 12000, retry: 0,
      })
      cache = { stocks: normalizeStockList(data.data), fetchedAt: Date.now() }
      return cache
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      throw createError({ statusCode: status && [401, 403, 429].includes(status) ? status : 502, statusMessage: 'Fugle stock list unavailable' })
    } finally { pending = null }
  })()
  return pending
})
