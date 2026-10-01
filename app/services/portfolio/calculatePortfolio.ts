import type { Holding, PortfolioSummary } from "../../types/portfolio.ts";
import type { StockQuote } from "../stock/types.ts";
const finite = (n: number | null): n is number =>
  n !== null && Number.isFinite(n);
export function calculatePortfolio(
  holdings: Holding[],
  quotes: StockQuote[],
): PortfolioSummary {
  const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const rows = holdings.map((holding) => {
    const quote = bySymbol.get(holding.symbol) ?? null;
    const validShares = Number.isFinite(holding.shares) && holding.shares > 0;
    const value =
      validShares && quote && finite(quote.close) && quote.close > 0
        ? holding.shares * quote.close
        : null;
    const pnl =
      value !== null &&
      quote &&
      finite(quote.change) &&
      finite(quote.previousClose) &&
      quote.previousClose > 0
        ? holding.shares * quote.change
        : null;
    const percent =
      finite(pnl) &&
      quote &&
      finite(quote.change) &&
      finite(quote.previousClose) &&
      quote.previousClose > 0
        ? (quote.change / quote.previousClose) * 100
        : null;
    return {
      holding,
      quote,
      marketValue: finite(value) ? value : null,
      dailyPnL: finite(pnl) ? pnl : null,
      dailyChangePercentage: finite(percent) ? percent : null,
    };
  });
  const dates = new Set(
    rows.flatMap((row) => (row.quote ? [row.quote.date] : [])),
  );
  const sameDate = dates.size <= 1;
  const sum = (values: (number | null)[]) =>
    values.every(finite) && sameDate
      ? values.reduce<number>((a, b) => a + b!, 0)
      : null;
  const value = sum(rows.map((row) => row.marketValue));
  const pnl = sum(rows.map((row) => row.dailyPnL));
  const marketValue = finite(value) ? value : null;
  const dailyPnL = finite(pnl) ? pnl : null;
  const previous =
    marketValue !== null && dailyPnL !== null ? marketValue - dailyPnL : null;
  const percent =
    previous !== null && previous > 0 && dailyPnL !== null
      ? (dailyPnL / previous) * 100
      : null;
  return {
    holdings: rows,
    marketValue,
    dailyPnL,
    dailyChangePercentage: finite(percent) ? percent : null,
    tradingDate: dates.size === 1 ? [...dates][0]! : null,
    isComplete: marketValue !== null && dailyPnL !== null,
  };
}
