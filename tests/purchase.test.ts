import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addPurchase } from '../app/services/portfolio/purchase.ts';
import { priceTick, adjacentPrice } from '../app/services/stock/priceTick.ts';
import { calculatePortfolio } from '../app/services/portfolio/calculatePortfolio.ts';
import { deductSellingFees } from '../app/services/portfolio/sellingFees.ts';
import { createPortfolioLocal, validateHoldings } from '../app/repositories/portfolioLocal.ts';
const quote = { symbol: '2330', name: '台積電', date: '2026-10-06', close: 110, previousClose: 100, change: 10 };

test('purchases weight by shares, retain off-tick precision and reject unknown original costs', () => {
  const first = addPurchase('2330', undefined, 1000, 100);
  const next = addPurchase('2330', first, 1000, 100.5);
  assert.equal(next.averageCost, 100.25);
  assert.equal(first.shares, 1000);
  const third = addPurchase('2330', next, 500, 102);
  assert.equal(third.averageCost, 100.6);
  assert.equal(third.shares, 2500);
  assert.throws(() => addPurchase('2330', { symbol: '2330', shares: 1 }, 1, 100), /先/);
  for (const cost of [0, -1, NaN, Infinity]) assert.throws(() => addPurchase('2330', first, 1, cost));
  assert.throws(() => addPurchase('2330', first, Number.MAX_VALUE, 100));
});

test('stock and ETF tick boundaries and downward stepping use the correct price band', () => {
  const boundaries = [[10, .05, 9.99], [50, .1, 49.95], [100, .5, 99.9], [500, 1, 499.5], [1000, 5, 999]];
  for (const [price, tick, below] of boundaries) {
    assert.equal(priceTick('2330', price!), tick);
    assert.equal(adjacentPrice('2330', price!, -1), below);
    assert.equal(adjacentPrice('2330', below!, 1), price);
  }
  for (const symbol of ['0050', '00981A', '00631L', '00679B']) {
    assert.equal(priceTick(symbol, 49.99), .01);
    assert.equal(priceTick(symbol, 50), .05);
    assert.equal(adjacentPrice(symbol, 50, -1), 49.99);
    assert.equal(adjacentPrice(symbol, 49.99, 1), 50);
  }
  assert.equal(adjacentPrice('2330', 100.25, -1), 100);
  assert.equal(adjacentPrice('2330', 100.25, 1), 100.5);
  assert.equal(adjacentPrice('2330', .01, -1), null);
  assert.equal(priceTick('UNKNOWN', 100), null);
});

test('returns use total cost rather than averaging percentages and fees reduce unrealized gain once', () => {
  const summary = calculatePortfolio([{ symbol: '2330', shares: 1000, averageCost: 100 }, { symbol: '0050', shares: 100, averageCost: 50 }], [quote, { ...quote, symbol: '0050', close: 40 }]);
  assert.equal(summary.costBasis, 105000);
  assert.equal(summary.unrealizedPnL, 9000);
  assert.equal(summary.returnPercentage, 9000 / 105000 * 100);
  assert.equal(summary.holdings[0]?.returnPercentage, 10);
  assert.equal(summary.holdings[1]?.returnPercentage, -20);
  const net = deductSellingFees(summary, '2026-10-06');
  assert.equal(net.unrealizedPnL, 9000 - 157 - 330 - 20 - 4);
  assert.equal(net.returnPercentage, net.unrealizedPnL! / 105000 * 100);
  assert.equal(summary.unrealizedPnL, 9000);
  assert.equal(net.holdings[0]?.unrealizedPnL, 10000 - 157 - 330);
});

test('missing costs, quotes, mixed dates and empty portfolio never invent a return', () => {
  const old = calculatePortfolio([{ symbol: '2330', shares: 1000 }], [quote]);
  assert.equal(old.returnPercentage, null);
  assert.equal(old.marketValue, 110000);
  assert.equal(old.dailyPnL, 10000);
  const holdings = [{ symbol: '2330', shares: 10, averageCost: 100 }];
  assert.equal(calculatePortfolio(holdings, []).returnPercentage, null);
  assert.equal(calculatePortfolio([], []).returnPercentage, null);
  assert.equal(calculatePortfolio(holdings, [{ ...quote, previousClose: null, change: null }]).returnPercentage, 10);
  const partial = calculatePortfolio([...holdings, { symbol: '0050', shares: 1 }], [quote, { ...quote, symbol: '0050' }]);
  assert.equal(partial.returnPercentage, null);
  assert.equal(partial.holdings[0]?.returnPercentage, 10);
  const mixed = calculatePortfolio([...holdings, { symbol: '0050', shares: 1, averageCost: 100 }], [quote, { ...quote, symbol: '0050', date: '2026-10-05' }]);
  assert.equal(mixed.returnPercentage, null);
});

test('legacy holdings load unchanged; precise cost survives saving and reload; invalid cost is rejected', async () => {
  let raw = '[{"symbol":"2330","shares":1000}]';
  const repo = createPortfolioLocal(() => ({ getItem: () => raw, setItem: (_, value) => { raw = value; } }));
  const old = await repo.load();
  assert.equal(old[0]?.averageCost, undefined);
  const updated = [{ ...old[0]!, averageCost: 100.123456789 }];
  await repo.save(updated);
  assert.deepEqual(await repo.load(), updated);
  for (const averageCost of [null, '100', 0, -1, Infinity, NaN]) assert.throws(() => validateHoldings([{ symbol: '2330', shares: 1, averageCost }]));
});
