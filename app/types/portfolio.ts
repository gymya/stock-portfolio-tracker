import type { StockQuote } from "../services/stock/types.ts";
export interface Holding {
  symbol: string;
  shares: number;
}
export interface HoldingValuation {
  holding: Holding;
  quote: StockQuote | null;
  marketValue: number | null;
  dailyPnL: number | null;
  dailyChangePercentage: number | null;
}
export interface PortfolioSummary {
  holdings: HoldingValuation[];
  marketValue: number | null;
  dailyPnL: number | null;
  dailyChangePercentage: number | null;
  tradingDate: string | null;
  isComplete: boolean;
}
