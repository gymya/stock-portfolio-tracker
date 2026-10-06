import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculatePortfolio } from '../app/services/portfolio/calculatePortfolio.ts'
import { deductSellingFees, sellingTaxRate } from '../app/services/portfolio/sellingFees.ts'

const quote = { symbol: '2330', name: '台積電', date: '2026-10-06', close: 100, previousClose: 95, change: 5 }
test('selling fees deduct once from value and P/L, preserving the previous-day percentage baseline', () => {
  const original = calculatePortfolio([{ symbol: '2330', shares: 1000 }], [quote])
  const net = deductSellingFees(original, '2026-10-06')
  assert.equal(net.marketValue, 99557) // 143 commission + 300 tax
  assert.equal(net.dailyPnL, 4557)
  assert.equal(net.dailyChangePercentage, 4557 / 95000 * 100)
  assert.equal(net.holdings[0]?.dailyChangePercentage, net.dailyChangePercentage)
  assert.equal(original.marketValue, 100000)
  assert.equal(original.dailyPnL, 5000)
})
test('minimum commission applies per holding and ETF tax differs from stock tax', () => {
  const original = calculatePortfolio([{ symbol: '2330', shares: 10 }, { symbol: '0050', shares: 10 }], [quote, { ...quote, symbol: '0050' }])
  const net = deductSellingFees(original, '2026-10-06')
  assert.equal(net.marketValue, 1956) // 20+3 and 20+1
  assert.equal(net.dailyPnL, 56)
  assert.equal(sellingTaxRate('00631L', '2026-10-06'), 0.001)
  assert.equal(sellingTaxRate('00679B', '2026-10-06'), 0)
  assert.equal(sellingTaxRate('00679B', '2027-01-01'), null)
})
test('missing prices and unsupported tax categories remain unavailable', () => {
  const unknown = calculatePortfolio([{ symbol: '00980D', shares: 100 }], [{ ...quote, symbol: '00980D' }])
  assert.equal(deductSellingFees(unknown, '2026-10-06').marketValue, null)
  assert.equal(deductSellingFees(calculatePortfolio([{ symbol: '2330', shares: 10 }], []), '2026-10-06').dailyPnL, null)
  assert.equal(deductSellingFees(calculatePortfolio([], []), '2026-10-06').marketValue, 0)
})
