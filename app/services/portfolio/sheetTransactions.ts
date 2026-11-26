import { translateMarketDate } from "../date/rocDateTranslator.ts";
import type { Holding } from "../../types/portfolio.ts";

export function sheetTransactionsToHoldings(values: unknown): Holding[] {
  const required = ["股票代號", "交易類型", "股數", "成交單價（元）", "交易日期"];
  if (!Array.isArray(values)) throw new Error("試算表資料格式錯誤。");
  const headerIndex = values.slice(0, 20).findIndex(row => Array.isArray(row) &&
    required.every(name => row.some(value => String(value).trim() === name)));
  if (headerIndex < 0) throw new Error("前 20 列找不到包含交易日期、股票代號、交易類型、股數、成交單價（元）的標題列。");
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
    const [symbol, type, sharesText, priceText, dateText] = columns.map(i => String(row[i] ?? "").trim());
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
    const price = Number(priceText!.replaceAll(",", ""));
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(priceText!) || !Number.isFinite(price) || price <= 0)
      throw new Error(`第 ${line} 列成交單價須為正數，期初持股也需填入成本單價。`);
    let date = "";
    if (dateText) {
      try { date = translateMarketDate(dateText); }
      catch { throw new Error(`第 ${line} 列交易日期無效，請使用 YYYY/MM/DD 或民國年日期。`); }
    } else if (type === "賣出") {
      throw new Error(`第 ${line} 列賣出交易須填日期；只有期初買進可留白。`);
    }
    return [{ symbol: symbol!, type, units, price, date, line }];
  });
  transactions.sort((a, b) => a.date.localeCompare(b.date) || a.line - b.line);
  const totals = new Map<string, { units: bigint; averageCost: number }>();
  for (const tx of transactions) {
    const previous = totals.get(tx.symbol) ?? { units: BigInt(0), averageCost: 0 };
    const selling = tx.type === "賣出";
    const units = previous.units + (selling ? -tx.units : tx.units);
    if (units < BigInt(0)) throw new Error(`第 ${tx.line} 列 ${tx.symbol} 賣出股數超過當時持股，請檢查日期與期初紀錄。`);
    if (units > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${tx.symbol} 股數總計超出有效範圍。`);
    const averageCost = units === BigInt(0) ? 0 : selling ? previous.averageCost
      : previous.averageCost * (Number(previous.units) / Number(units)) + tx.price * (Number(tx.units) / Number(units));
    if (!Number.isFinite(averageCost) || !Number.isFinite(Number(units) / 1000000 * averageCost))
      throw new Error(`第 ${tx.line} 列成本超出有效範圍。`);
    totals.set(tx.symbol, { units, averageCost });
  }
  return [...totals].filter(([, holding]) => holding.units > BigInt(0))
    .map(([symbol, holding]) => ({ symbol, shares: Number(holding.units) / 1000000, averageCost: holding.averageCost }));
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
