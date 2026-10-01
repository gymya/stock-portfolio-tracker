import { test } from "node:test";
import assert from "node:assert/strict";
import { translateMarketDate } from "../app/services/date/rocDateTranslator.ts";
import {
  normalizeTwseResponse,
  parseMarketNumber,
} from "../app/services/stock/twse.ts";
import { calculatePortfolio } from "../app/services/portfolio/calculatePortfolio.ts";
import { createPortfolioLocal } from "../app/repositories/portfolioLocal.ts";
const quote = {
  symbol: "2330",
  name: "台積電",
  date: "2026-09-29",
  close: 100,
  change: 5,
  previousClose: 95,
};
test("ROC and Gregorian dates normalize without rolling invalid dates forward", () => {
  for (const date of ["1150929", "115/09/29", "20260929", "2026-09-29"])
    assert.equal(translateMarketDate(date), "2026-09-29");
  assert.equal(translateMarketDate("1130229"), "2024-02-29");
  for (const date of ["1150229", "1151330", "", "0000101"])
    assert.throws(() => translateMarketDate(date));
});
test("market adapter preserves missing values, handles signed numeric strings, rejects empty data", () => {
  assert.equal(parseMarketNumber("1,234.50"), 1234.5);
  assert.equal(parseMarketNumber("−5.00"), -5);
  for (const value of ["", "--", "X0.00", "NaN", null])
    assert.equal(parseMarketNumber(value), null);
  const [result] = normalizeTwseResponse([
    {
      Date: "1150929",
      Code: "0050",
      Name: "元大台灣50",
      ClosingPrice: "--",
      Change: "0.00",
    },
  ]);
  assert.equal(result?.symbol, "0050");
  assert.equal(result?.close, null);
  assert.equal(result?.previousClose, null);
  assert.throws(() => normalizeTwseResponse([]));
  assert.throws(() => normalizeTwseResponse([{ Code: "2330" }]));
});
test("portfolio uses previous portfolio value, supports losses and unchanged prices", () => {
  const result = calculatePortfolio([{ symbol: "2330", shares: 100 }], [quote]);
  assert.equal(result.marketValue, 10000);
  assert.equal(result.dailyPnL, 500);
  assert.equal(result.dailyChangePercentage, (500 / 9500) * 100);
  assert.equal(result.holdings[0]?.dailyChangePercentage, (5 / 95) * 100);
  const loss = calculatePortfolio(
    [{ symbol: "2330", shares: 10 }],
    [{ ...quote, change: -5, previousClose: 105 }],
  );
  assert.equal(loss.dailyPnL, -50);
  assert.equal(loss.holdings[0]?.dailyChangePercentage, (-5 / 105) * 100);
  const unchanged = calculatePortfolio(
    [{ symbol: "2330", shares: 10 }],
    [{ ...quote, change: 0, previousClose: 100 }],
  );
  assert.equal(unchanged.dailyChangePercentage, 0);
  assert.equal(unchanged.holdings[0]?.dailyChangePercentage, 0);
});
test("missing prices, zero baselines, mismatched dates and overflow never produce misleading totals", () => {
  assert.equal(calculatePortfolio([], []).dailyChangePercentage, null);
  const missing = calculatePortfolio(
    [{ symbol: "0000", shares: 100 }],
    [quote],
  );
  assert.equal(missing.marketValue, null);
  assert.equal(missing.isComplete, false);
  const partial = calculatePortfolio(
    [{ symbol: "2330", shares: 100 }],
    [{ ...quote, change: null, previousClose: null }],
  );
  assert.equal(partial.marketValue, 10000);
  assert.equal(partial.dailyPnL, null);
  assert.equal(partial.holdings[0]?.dailyChangePercentage, null);
  const mixed = calculatePortfolio(
    [
      { symbol: "2330", shares: 1 },
      { symbol: "0050", shares: 1 },
    ],
    [quote, { ...quote, symbol: "0050", date: "2026-09-28" }],
  );
  assert.equal(mixed.marketValue, null);
  assert.equal(mixed.tradingDate, null);
  assert.equal(
    calculatePortfolio([{ symbol: "2330", shares: Number.MAX_VALUE }], [quote])
      .marketValue,
    null,
  );
});
test("repository persists only user data and refuses corrupt or duplicate holdings", async () => {
  let raw: string | null = null;
  const repo = createPortfolioLocal(() => ({
    getItem: () => raw,
    setItem: (_key, value) => {
      raw = value;
    },
  }));
  assert.deepEqual(await repo.load(), []);
  await repo.save([{ symbol: "0050", shares: 300 }]);
  assert.equal(raw, '[{"symbol":"0050","shares":300}]');
  assert.deepEqual(await repo.load(), [{ symbol: "0050", shares: 300 }]);
  await assert.rejects(repo.save([{ symbol: "0050", shares: 0 }]));
  await assert.rejects(
    repo.save([
      { symbol: "0050", shares: 1 },
      { symbol: "0050", shares: 2 },
    ]),
  );
  raw = "{bad json";
  await assert.rejects(repo.load());
  await assert.rejects(repo.save([]));
  assert.equal(raw, "{bad json");
});
test("blocked browser storage rejects cleanly", async () => {
  const repo = createPortfolioLocal(() => {
    throw new Error("SecurityError");
  });
  await assert.rejects(repo.load());
  await assert.rejects(repo.save([]));
});
