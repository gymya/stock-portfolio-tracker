/** Fixed public-data endpoint; never forwards client headers, cookies or holdings. */
export default defineEventHandler(async (event): Promise<unknown> => {
  const { twseApiBaseUrl } = useRuntimeConfig(event)
  let baseURL: string
  try {
    const url = new URL(twseApiBaseUrl)
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/v1' || url.search || url.hash) {
      throw new Error('Invalid API origin')
    }
    baseURL = url.origin + url.pathname
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Market data configuration unavailable', message: '行情服務設定尚未完成，請聯絡管理者。' })
  }
  try {
    return await $fetch<unknown>('/exchangeReport/STOCK_DAY_ALL', {
      baseURL,
      timeout: 15000,
      retry: 0,
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'TWSE market data unavailable', message: '證交所行情暫時無法取得，請稍後重試。' })
  }
})
