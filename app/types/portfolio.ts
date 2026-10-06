import type { StockQuote } from "../services/stock/types.ts";
export interface Holding {
  symbol: string;
  shares: number;
  averageCost?: number;
}
export interface HoldingValuation {
  holding: Holding;
  quote: StockQuote | null;
  costBasis: number | null;
  unrealizedPnL: number | null;
  returnPercentage: number | null;
  marketValue: number | null;
  dailyPnL: number | null;
  dailyChangePercentage: number | null;
}
export interface PortfolioSummary {
  holdings: HoldingValuation[];
  costBasis: number | null;
  unrealizedPnL: number | null;
  returnPercentage: number | null;
  marketValue: number | null;
  dailyPnL: number | null;
  dailyChangePercentage: number | null;
  tradingDate: string | null;
  isComplete: boolean;
}
