import { translateMarketDate } from "../date/rocDateTranslator.ts";
import type { StockQuote, StockQuoteProvider } from "./types.ts";
interface TwseStockResponse {
  Date: string;
  Code: string;
  Name: string;
  ClosingPrice: string;
  Change: string;
}
export function parseMarketNumber(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .replaceAll(",", "")
    .replaceAll("−", "-")
    .replaceAll("＋", "+")
    .replaceAll("－", "-");
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}
export function normalizeTwseResponse(data: unknown): StockQuote[] {
  if (!Array.isArray(data) || data.length === 0)
    throw new Error("證交所尚未提供行情資料，請稍後重試。");
  const quotes: StockQuote[] = [];
  const symbols = new Set<string>();
  for (const item of data) {
    if (!item || typeof item !== "object")
      throw new Error("行情資料格式異常。");
    const row = item as Partial<TwseStockResponse>;
    if (
      typeof row.Code !== "string" ||
      typeof row.Name !== "string" ||
      typeof row.Date !== "string" ||
      !row.Code.trim() ||
      !row.Name.trim()
    )
      throw new Error("行情資料格式異常。");
    const symbol = row.Code.trim();
    if (symbols.has(symbol)) throw new Error("行情資料含重複代碼。");
    symbols.add(symbol);
    const parsedClose = parseMarketNumber(row.ClosingPrice);
    const close = parsedClose !== null && parsedClose > 0 ? parsedClose : null;
    const change = parseMarketNumber(row.Change);
    const previous = close !== null && change !== null ? close - change : null;
    quotes.push({
      symbol,
      name: row.Name.trim(),
      date: translateMarketDate(row.Date),
      close,
      change,
      previousClose: previous !== null && previous > 0 ? previous : null,
    });
  }
  return quotes;
}
export const twseProvider: StockQuoteProvider = {
  async fetchQuotes() {
    const response = await fetch("/api/quotes", {
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new Error(`證交所暫時無法提供行情（${response.status}）。`);
    return normalizeTwseResponse(await response.json());
  },
};
