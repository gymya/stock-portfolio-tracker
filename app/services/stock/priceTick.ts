// TWSE regular trading increments (NTD):
// https://wwwc.twse.com.tw/zh/products/system/trading.html
// Keep unknown instruments unclassified rather than applying stock rules to them.
export function priceTick(symbol: string, price: number): number | null {
  if (!Number.isFinite(price) || price <= 0) return null;
  if (/^00\d{2,4}[ABLRTU]?$/.test(symbol.replace(/\s/g, ''))) return price < 50 ? 0.01 : 0.05;
  if (!/^[1-9]\d{3}$/.test(symbol) && !/^91\d{2,4}$/.test(symbol)) return null;
  return price < 10 ? 0.01 : price < 50 ? 0.05 : price < 100 ? 0.1 : price < 500 ? 0.5 : price < 1000 ? 1 : 5;
}

// Move to the adjacent valid quote; downward moves at a boundary use the lower band.
// This is an optional input helper. Average costs themselves need not lie on a tick.
export function adjacentPrice(symbol: string, price: number, direction: 1 | -1): number | null {
  const cents = price * 100;
  if (!Number.isSafeInteger(Math.ceil(cents))) return null;
  const tick = priceTick(symbol, direction === -1 ? (Math.ceil(cents - 1e-7) - 1) / 100 : price);
  if (tick === null) return null;
  const step = Math.round(tick * 100);
  const next = (direction === 1 ? Math.floor(cents / step + 1e-9) + 1 : Math.ceil(cents / step - 1e-9) - 1) * step / 100;
  return next > 0 && Number.isFinite(next) ? next : null;
}
