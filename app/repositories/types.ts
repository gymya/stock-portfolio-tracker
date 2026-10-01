import type { Holding } from "../types/portfolio.ts";
export interface PortfolioRepository {
  load(): Promise<Holding[]>;
  save(holdings: Holding[]): Promise<void>;
}
