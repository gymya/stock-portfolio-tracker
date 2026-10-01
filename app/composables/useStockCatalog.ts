import {
  normalizeStockList,
  STOCK_LIST_TTL,
  type StockEntry,
} from "~/services/stock/catalog";
const KEY = "tw-stock-catalog:v1";
let pending: Promise<void> | null = null;
export function useStockCatalog() {
  const stocks = useState<StockEntry[]>("stock-catalog", () => []);
  const fetchedAt = useState("stock-catalog-time", () => 0);
  const loading = useState("stock-catalog-loading", () => false);
  const warning = useState("stock-catalog-warning", () => "");
  async function load() {
    if (pending) return pending;
    if (!stocks.value.length) {
      try {
        const cached = JSON.parse(localStorage.getItem(KEY) ?? "null");
        if (
          cached &&
          Number.isFinite(cached.fetchedAt) &&
          cached.fetchedAt > 0 &&
          cached.fetchedAt <= Date.now()
        ) {
          stocks.value = normalizeStockList(cached.stocks);
          fetchedAt.value = cached.fetchedAt;
        }
      } catch {
        /* Missing or corrupt cache does not block online lookup. */
      }
    }
    if (stocks.value.length && Date.now() - fetchedAt.value < STOCK_LIST_TTL)
      return;
    loading.value = true;
    warning.value = "";
    pending = (async () => {
      try {
        const data = await $fetch<{ stocks: unknown; fetchedAt: number }>(
          "/api/stocks",
          { timeout: 15000, retry: 0 },
        );
        if (
          !Number.isFinite(data.fetchedAt) ||
          data.fetchedAt <= 0 ||
          data.fetchedAt > Date.now()
        )
          throw new Error();
        stocks.value = normalizeStockList(data.stocks);
        fetchedAt.value = data.fetchedAt;
        try {
          localStorage.setItem(
            KEY,
            JSON.stringify({
              stocks: stocks.value,
              fetchedAt: fetchedAt.value,
            }),
          );
        } catch {
          /* In-memory search remains available. */
        }
      } catch {
        warning.value = stocks.value.length
          ? "股票清單更新失敗，暫時使用舊清單；新增時會驗證代碼。"
          : "名稱搜尋暫時無法使用，仍可直接輸入股票代碼。";
      } finally {
        loading.value = false;
        pending = null;
      }
    })();
    return pending;
  }
  return { stocks, loading, warning, load };
}
