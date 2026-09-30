import type { StockQuote } from '~/services/stock/types'
import { twseProvider } from '~/services/stock/twse'
const CACHE_MS = 5 * 60 * 1000
let pending: Promise<void> | null = null
export function useStockQuotes() {
  const quotes = useState<StockQuote[]>('quotes', () => [])
  const loading = useState('quotes-loading', () => false)
  const error = useState<string | null>('quotes-error', () => null)
  const fetchedAt = useState<number | null>('quotes-fetched-at', () => null)
  async function refresh(force = false) {
    if (pending) return pending
    if (!force && fetchedAt.value && Date.now() - fetchedAt.value < CACHE_MS) return
    loading.value = true
    error.value = null
    pending = (async () => {
      try { quotes.value = await twseProvider.fetchQuotes(); fetchedAt.value = Date.now() }
      catch (e) { error.value = e instanceof TypeError || (e instanceof Error && e.name === 'TimeoutError') ? '無法連線至證交所，請確認網路後重試。' : e instanceof Error ? e.message : '行情讀取失敗，請稍後重試。' }
      finally { loading.value = false; pending = null }
    })()
    return pending
  }
  return { quotes, loading, error, fetchedAt, refresh }
}
