import type { Holding } from "../../types/portfolio.ts";

export function sheetTransactionsToHoldings(values: unknown): Holding[] {
  const required = ["股票代號", "交易類型", "股數"];
  if (!Array.isArray(values)) throw new Error("試算表資料格式錯誤。");
  const headerIndex = values.slice(0, 20).findIndex(row => Array.isArray(row) &&
    required.every(name => row.some(value => String(value).trim() === name)));
  if (headerIndex < 0) throw new Error("前 20 列找不到包含股票代號、交易類型、股數的標題列。");
  if (values.length - headerIndex - 1 > 10000) throw new Error("資料超過 10,000 列，未匯入任何資料。");
  const headers = values[headerIndex].map((v: unknown) => String(v).trim());
  const columns = required.map(name => {
    if (headers.filter((h: string) => h === name).length !== 1)
      throw new Error(`標題列必須包含唯一的「${name}」欄位。`);
    return headers.indexOf(name);
  });
  const transactions = values.slice(headerIndex + 1).flatMap((row: unknown, index: number) => {
    const line = headerIndex + index + 2;
    if (!Array.isArray(row)) throw new Error(`第 ${line} 列格式錯誤。`);
    const [symbol, type, sharesText] = columns.map(i => String(row[i] ?? "").trim());
    if (!symbol && !type && !sharesText) return [];
    if (!/^[A-Z0-9]{4,10}$/.test(symbol!))
      throw new Error(`第 ${line} 列股票代號無效，請保留 0050 等代號的前導零。`);
    if (type !== "買進" && type !== "買入" && type !== "賣出") throw new Error(`第 ${line} 列交易類型必須為買入、買進或賣出。`);
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,6})?$/.test(sharesText!))
      throw new Error(`第 ${line} 列股數須為正數，最多六位小數（單位為股）。`);
    const [whole, fraction = ""] = sharesText!.replaceAll(",", "").split(".");
    const units = BigInt(whole!) * BigInt(1000000) + BigInt(fraction.padEnd(6, "0"));
    if (units <= BigInt(0) || units > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`第 ${line} 列股數超出有效範圍。`);
    return [{ symbol: symbol!, type, units }];
  });
  const totals = new Map<string, bigint>();
  for (const tx of transactions) {
    const next = (totals.get(tx.symbol) ?? BigInt(0)) + (tx.type === "賣出" ? -tx.units : tx.units);
    totals.set(tx.symbol, next);
  }
  for (const [symbol, units] of totals) {
    if (units < BigInt(0)) throw new Error(`${symbol} 賣出總股數超過買入與期初股數，請檢查缺漏紀錄。`);
    if (units > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${symbol} 股數總計超出有效範圍。`);
  }
  return [...totals].filter(([, units]) => units > BigInt(0))
    .map(([symbol, units]) => ({ symbol, shares: Number(units) / 1000000 }));
}

export function sheetIdFromInput(input: unknown): string {
  if (typeof input !== "string" || input.length > 2048) throw new Error("請輸入有效的 Google 試算表連結或 ID。");
  const value = input.trim();
  if (/^[a-zA-Z0-9_-]{20,200}$/.test(value)) return value;
  try {
    const url = new URL(value);
    const match = /^\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,200})(?:\/|$)/.exec(url.pathname);
    if (url.origin === "https://docs.google.com" && !url.username && !url.password && match) return match[1]!;
  } catch { /* Report the same validation error for malformed URLs. */ }
  throw new Error("請貼上 docs.google.com/spreadsheets/d/ 開頭的試算表連結。");
}
