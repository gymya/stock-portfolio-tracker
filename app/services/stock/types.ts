export interface StockQuote {
  symbol: string;
  name: string;
  date: string;
  close: number | null;
  change: number | null;
  previousClose: number | null;
  /** Actual trade time in ISO format, not the time the browser fetched data. */
  quoteTime?: string | null;
}
export interface StockQuoteProvider {
  fetchQuotes(symbols?: string[]): Promise<StockQuote[]>;
}
