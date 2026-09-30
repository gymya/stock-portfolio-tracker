export interface StockQuote {
  symbol: string
  name: string
  date: string
  close: number | null
  change: number | null
  previousClose: number | null
}
export interface StockQuoteProvider { fetchQuotes(): Promise<StockQuote[]> }
