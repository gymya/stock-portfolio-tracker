import { normalizeFugleQuote } from '../../app/services/stock/fugle.ts'

// Short-lived per-symbol cache: no holdings or share counts are stored.
const cache = new Map<string, { until: number; data: unknown }>()
const pending = new Map<string, Promise<unknown>>()

export default defineEventHandler(async (event): Promise<unknown[]> => {
  setHeader(event, 'Cache-Control', 'no-store')
  const raw = getQuery(event).symbols
  if (typeof raw !== 'string' || raw.length > 220) throw createError({ statusCode: 400, statusMessage: 'Invalid symbols' })
  const symbols = [...new Set(raw.split(','))]
  if (!symbols.length || symbols.length > 20 || symbols.some(s => !/^[A-Z0-9]{4,10}$/.test(s))) throw createError({ statusCode: 400, statusMessage: 'Invalid symbols' })
  const { fugleApiBaseUrl, fugleApiKey } = useRuntimeConfig(event)
  let baseURL: string
  try {
    const url = new URL(fugleApiBaseUrl)
    if (!fugleApiKey.trim() || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Invalid configuration')
    baseURL = url.origin + url.pathname.replace(/\/$/, '')
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Fugle configuration unavailable' })
  }
  async function quote(symbol: string): Promise<unknown> {
    const hit = cache.get(symbol)
    if (hit && hit.until > Date.now()) return hit.data
    const existing = pending.get(symbol)
    if (existing) return existing
    const request = (async () => {
      try {
        const data = await $fetch<unknown>(`/intraday/quote/${symbol}`, {
          baseURL, headers: { 'X-API-KEY': fugleApiKey }, timeout: 12000, retry: 0,
        })
        const normalized = normalizeFugleQuote(data)
        if (normalized.symbol !== symbol) throw new Error('Unexpected quote symbol')
        if (cache.size >= 500) cache.clear()
        cache.set(symbol, { until: Date.now() + 60000, data })
        return data
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        throw createError({ statusCode: status && [401, 403, 404, 429].includes(status) ? status : 502, statusMessage: 'Fugle quote unavailable' })
      } finally { pending.delete(symbol) }
    })()
    pending.set(symbol, request)
    return request
  }
  return Promise.all(symbols.map(quote))
})
