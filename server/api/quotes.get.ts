/** Fixed public-data endpoint; never forwards client headers, cookies or holdings. */
export default defineEventHandler(async (): Promise<unknown> => {
  try {
    return await $fetch<unknown>('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', {
      timeout: 15000,
      retry: 0,
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'TWSE market data unavailable', message: '證交所行情暫時無法取得，請稍後重試。' })
  }
})
