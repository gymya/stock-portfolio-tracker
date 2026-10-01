export interface StockEntry {
  symbol: string;
  name: string;
}
export const STOCK_LIST_TTL = 24 * 60 * 60 * 1000;
export function normalizeStockList(value: unknown): StockEntry[] {
  if (!Array.isArray(value) || !value.length)
    throw new Error("股票清單格式異常。");
  const seen = new Set<string>();
  const rows = value.filter(
    (row) =>
      !(
        row &&
        typeof row.symbol === "string" &&
        /^[A-Z0-9]{4,10}$/.test(row.symbol) &&
        row.name === undefined
      ),
  );
  if (!rows.length) throw new Error("股票清單格式異常。");
  return rows.map((row) => {
    if (
      !row ||
      typeof row.symbol !== "string" ||
      !/^[A-Z0-9]{4,10}$/.test(row.symbol) ||
      typeof row.name !== "string" ||
      !row.name.trim() ||
      seen.has(row.symbol)
    )
      throw new Error("股票清單格式異常。");
    seen.add(row.symbol);
    return { symbol: row.symbol, name: row.name.trim() };
  });
}
export function searchStocks(stocks: StockEntry[], term: string): StockEntry[] {
  const query = term.trim().toUpperCase();
  if (!query) return [];
  return stocks
    .filter(
      (s) => s.symbol.includes(query) || s.name.toUpperCase().includes(query),
    )
    .sort(
      (a, b) =>
        Number(b.symbol === query || b.name === query) -
        Number(a.symbol === query || a.name === query),
    )
    .slice(0, 20);
}
