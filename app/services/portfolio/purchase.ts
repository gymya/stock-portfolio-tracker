import type { Holding } from '../../types/portfolio.ts';

export function validateCost(shares: number, averageCost: number) {
  if (!Number.isFinite(shares) || shares <= 0) throw new Error('股數必須為大於 0 的數字。');
  if (!Number.isFinite(averageCost) || averageCost <= 0) throw new Error('購買均價必須為大於 0 的數字。');
  if (!Number.isFinite(shares * averageCost)) throw new Error('購買成本過大，請調整輸入。');
}

export function addPurchase(symbol: string, existing: Holding | undefined, shares: number, averageCost: number): Holding {
  validateCost(shares, averageCost);
  if (!existing) return { symbol, shares, averageCost };
  if (existing.averageCost === undefined) throw new Error('請先在下方「修改持股」補上原有購買均價，再加碼。');
  validateCost(existing.shares, existing.averageCost);
  const total = existing.shares + shares;
  const cost = existing.shares * existing.averageCost + shares * averageCost;
  if (!Number.isFinite(total) || !Number.isFinite(cost)) throw new Error('合計股數或成本過大，請調整輸入。');
  const average = cost / total;
  validateCost(total, average);
  return { ...existing, shares: total, averageCost: average };
}
