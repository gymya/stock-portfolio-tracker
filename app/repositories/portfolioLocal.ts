import type { Holding } from '../types/portfolio.ts'
import type { PortfolioRepository } from './types.ts'
export const PORTFOLIO_KEY = 'tw-portfolio:v1'
export function validateHoldings(value: unknown): Holding[] {
  if (!Array.isArray(value)) throw new Error('持股資料損毀')
  const symbols = new Set<string>()
  return value.map(row => {
    if (!row || typeof row.symbol !== 'string' || !/^[A-Z0-9]{4,10}$/.test(row.symbol) || typeof row.shares !== 'number' || !Number.isFinite(row.shares) || row.shares <= 0 || symbols.has(row.symbol)) throw new Error('持股資料損毀')
    symbols.add(row.symbol)
    return { symbol: row.symbol, shares: row.shares }
  })
}
export function createPortfolioLocal(getStorage: () => Pick<Storage, 'getItem' | 'setItem'>): PortfolioRepository {
  // Failed reads lock persistence so an unreadable portfolio is never silently overwritten.
  let writable = false
  return {
    async load() {
      writable = false
      const raw = getStorage().getItem(PORTFOLIO_KEY)
      const holdings = raw === null ? [] : validateHoldings(JSON.parse(raw))
      writable = true
      return holdings
    },
    async save(holdings) {
      if (!writable) throw new Error('無法讀取原有資料，已停止覆寫。')
      getStorage().setItem(PORTFOLIO_KEY, JSON.stringify(validateHoldings(holdings)))
    },
  }
}
