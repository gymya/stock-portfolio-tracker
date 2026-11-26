import { addPurchase, validateCost } from "~/services/portfolio/purchase";
import type { Holding } from "~/types/portfolio";
import { createPortfolioLocal } from "~/repositories/portfolioLocal";
import { calculatePortfolio } from "~/services/portfolio/calculatePortfolio";
const repository = createPortfolioLocal(() => window.localStorage);
export function usePortfolio() {
  const { holdings, manualHoldings, source } = usePortfolioSource();
  const initialized = useState("portfolio-initialized", () => false);
  const storageError = useState<string | null>("storage-error", () => null);
  const { quotes, lookup } = useStockQuotes();
  const summary = computed(() =>
    calculatePortfolio(holdings.value, quotes.value),
  );
  async function initialize() {
    if (initialized.value) return;
    initialized.value = true;
    try {
      manualHoldings.value = await repository.load();
    } catch {
      storageError.value =
        "無法讀取瀏覽器持股資料（可能已損毀或禁止存取）。原有資料不會被覆寫；本次變更僅保留在此頁，重新整理後會消失。";
    }
  }
  async function persist(next: Holding[]) {
    if (source.value !== "manual") throw new Error("請切換至手動持股模式再編輯。");
    manualHoldings.value = next;
    try {
      await repository.save(next);
      storageError.value = null;
    } catch {
      storageError.value =
        "持股已在此頁更新，但無法儲存至瀏覽器。重新整理後，本次變更可能遺失；原有資料未被覆寫。";
    }
  }
  async function add(symbolInput: string, shares: number, averageCost: number) {
    const symbol = symbolInput.replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z0-9]{4,10}$/.test(symbol))
      throw new Error("請輸入有效的股票代碼。");
    if (!Number.isFinite(shares) || shares <= 0)
      throw new Error("股數必須為大於 0 的數字。");
    validateCost(shares, averageCost);
    const original = manualHoldings.value.find(h => h.symbol === symbol);
    if (original?.averageCost === undefined && original)
      throw new Error("請先在下方「修改持股」補上原有購買均價，再加碼。");
    await lookup(symbol);
    const existing = manualHoldings.value.find((h) => h.symbol === symbol);
    const next = addPurchase(symbol, existing, shares, averageCost);
    await persist(existing
      ? manualHoldings.value.map(h => h.symbol === symbol ? next : h)
      : [...manualHoldings.value, next]);
  }
  async function update(symbol: string, shares: number, averageCost?: number) {
    if (!Number.isFinite(shares) || shares <= 0)
      throw new Error("股數必須為大於 0 的數字。");
    if (averageCost !== undefined) validateCost(shares, averageCost);
    await persist(manualHoldings.value.map(h => h.symbol === symbol ? { ...h, shares, averageCost } : h));
  }

  async function remove(symbol: string) {
    await persist(manualHoldings.value.filter((h) => h.symbol !== symbol));
  }
  return {
    holdings,
    summary,
    storageError,
    initialized,
    initialize,
    add,
    update,
    remove,
  };
}
