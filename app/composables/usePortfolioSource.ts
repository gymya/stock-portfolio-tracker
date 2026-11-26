import type { Holding } from "~/types/portfolio";

export function usePortfolioSource() {
  const source = useState<"manual" | "google">("portfolio-source", () => "manual");
  const manualHoldings = useState<Holding[]>("holdings", () => []);
  const sheetHoldings = useState<Holding[]>("sheet-holdings", () => []);
  const holdings = computed(() => source.value === "google" ? sheetHoldings.value : manualHoldings.value);
  return { source, manualHoldings, sheetHoldings, holdings };
}
