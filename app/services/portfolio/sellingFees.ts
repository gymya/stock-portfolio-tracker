import { calculateReturn } from "./calculatePortfolio.ts"
import type { PortfolioSummary } from '../../types/portfolio.ts'

// TWSE ETF codes and tax rules; unknown instruments stay unestimated.
export function sellingTaxRate(symbol: string, date: string): number | null {
  if (/^00\d{3}B$/.test(symbol)) return date <= '2026-12-31' ? 0 : null
  if (/^00\d{2,4}$/.test(symbol) || /^00\d{3}[ALRTU]$/.test(symbol)) return 0.001
  if (/^91\d{2,4}$/.test(symbol)) return 0.001
  if (/^[1-9]\d{3}$/.test(symbol)) return 0.003
  return null
}

export function deductSellingFees(summary: PortfolioSummary, date: string): PortfolioSummary {
  const holdings = summary.holdings.map(row => {
    const rate = sellingTaxRate(row.holding.symbol, date)
    const value = row.marketValue
    const fees = value !== null && rate !== null ? Math.max(20, Math.round(value * 0.001425)) + Math.floor(value * rate) : null
    const marketValue = value !== null && fees !== null ? value - fees : null
    const dailyPnL = row.dailyPnL !== null && fees !== null ? row.dailyPnL - fees : null
    const previous = value !== null && row.dailyPnL !== null ? value - row.dailyPnL : null
    const dailyChangePercentage = dailyPnL !== null && previous !== null && previous > 0 ? dailyPnL / previous * 100 : null
    return { ...row, ...calculateReturn(marketValue, row.costBasis), marketValue, dailyPnL, dailyChangePercentage }
  })
  const sum = (key: 'marketValue' | 'dailyPnL') => summary[key] !== null && holdings.every(row => row[key] !== null)
    ? holdings.reduce((total, row) => total + row[key]!, 0) : null
  const marketValue = sum('marketValue'), dailyPnL = sum('dailyPnL')
  const previous = summary.marketValue !== null && summary.dailyPnL !== null ? summary.marketValue - summary.dailyPnL : null
  return { ...summary, ...calculateReturn(marketValue, summary.costBasis), holdings, marketValue, dailyPnL,
    dailyChangePercentage: dailyPnL !== null && previous !== null && previous > 0 ? dailyPnL / previous * 100 : null,
    isComplete: marketValue !== null && dailyPnL !== null }
}
