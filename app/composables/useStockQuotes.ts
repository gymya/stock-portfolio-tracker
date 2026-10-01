import type { StockQuote } from "~/services/stock/types";
import type { Holding } from "~/types/portfolio";
import { fugleProvider } from "~/services/stock/fugle";
const CACHE_MS = 60000;
let pending: Promise<void> | null = null;
export function useStockQuotes() {
  const quotes = useState<StockQuote[]>("quotes", () => []);
  const holdings = useState<Holding[]>("holdings", () => []);
  const loading = useState("quotes-loading", () => false);
  const error = useState<string | null>("quotes-error", () => null);
  const fetchedAt = useState<number | null>("quotes-fetched-at", () => null);
  const lastSymbols = useState("quotes-symbols", () => "");
  async function refresh(force = false) {
    if (pending) {
      await pending;
      return;
    }
    const symbols = holdings.value.map((h) => h.symbol).sort();
    if (!symbols.length) {
      quotes.value = [];
      error.value = null;
      fetchedAt.value = null;
      lastSymbols.value = "";
      return;
    }
    const key = symbols.join(",");
    if (
      !force &&
      key === lastSymbols.value &&
      fetchedAt.value &&
      Date.now() - fetchedAt.value < CACHE_MS
    )
      return;
    loading.value = true;
    error.value = null;
    pending = (async () => {
      try {
        const result: StockQuote[] = [];
        for (let i = 0; i < symbols.length; i += 20)
          result.push(
            ...(await fugleProvider.fetchQuotes(symbols.slice(i, i + 20))),
          );
        quotes.value = result;
        fetchedAt.value = Date.now();
        lastSymbols.value = key;
      } catch (e) {
        error.value =
          e instanceof TypeError ||
          (e instanceof Error && e.name === "TimeoutError")
            ? "無法連線至 Fugle，請確認網路後重試。"
            : e instanceof Error
              ? e.message
              : "行情讀取失敗，請稍後重試。";
      } finally {
        loading.value = false;
        pending = null;
      }
    })();
    await pending;
    if (
      holdings.value
        .map((h) => h.symbol)
        .sort()
        .join(",") !== key
    )
      await refresh();
  }
  async function lookup(symbol: string) {
    const [quote] = await fugleProvider.fetchQuotes([symbol]);
    if (!quote) throw new Error("找不到此股票代碼。");
    quotes.value = [...quotes.value.filter((q) => q.symbol !== symbol), quote];
    return quote;
  }
  return { quotes, loading, error, fetchedAt, refresh, lookup };
}
