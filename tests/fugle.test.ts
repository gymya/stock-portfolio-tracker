import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFugleQuote,
  fugleProvider,
} from "../app/services/stock/fugle.ts";
import { calculatePortfolio } from "../app/services/portfolio/calculatePortfolio.ts";
const fixture = {
  symbol: "2330",
  name: "台積電",
  date: "2023-05-29",
  exchange: "TWSE",
  type: "EQUITY",
  previousClose: 566,
  closePrice: 568,
  closeTime: 1685338200000000,
  lastTrade: { price: 568, time: 1685338200000000 },
  lastPrice: 600,
  change: 34,
  isTrial: true,
};
test("Fugle values actual trades rather than trial prices and converts microsecond timestamps", () => {
  const q = normalizeFugleQuote(fixture);
  assert.equal(q.close, 568);
  assert.equal(q.change, 2);
  assert.equal(q.quoteTime, "2023-05-29T05:30:00.000Z");
  const p = calculatePortfolio([{ symbol: "2330", shares: 100 }], [q]);
  assert.equal(p.marketValue, 56800);
  assert.equal(p.dailyPnL, 200);
  assert.equal(p.dailyChangePercentage, (200 / 56600) * 100);
});
test("Fugle missing trades never substitutes previous close or a trial-only price", () => {
  const q = normalizeFugleQuote({
    ...fixture,
    lastTrade: undefined,
    closePrice: undefined,
    closeTime: undefined,
  });
  assert.equal(q.close, null);
  assert.equal(q.change, null);
  assert.equal(q.quoteTime, null);
  const fallback = normalizeFugleQuote({ ...fixture, lastTrade: undefined });
  assert.equal(fallback.close, 568);
});
test("Fugle missing previous close preserves price but prevents P/L calculation", () => {
  const q = normalizeFugleQuote({ ...fixture, previousClose: undefined });
  assert.equal(q.close, 568);
  assert.equal(q.change, null);
  assert.equal(
    calculatePortfolio([{ symbol: "2330", shares: 1 }], [q]).dailyPnL,
    null,
  );
});
test("Fugle rejects invalid identities, unsupported markets and mismatched trade dates", () => {
  for (const row of [
    null,
    {},
    { ...fixture, exchange: "TPEx" },
    { ...fixture, type: "INDEX" },
    { ...fixture, date: "2023-05-30" },
    { ...fixture, date: "2023-02-30" },
  ])
    assert.throws(() => normalizeFugleQuote(row));
});
test("Fugle handles negative and flat changes, and excludes invalid prices", () => {
  assert.equal(
    normalizeFugleQuote({ ...fixture, previousClose: 570 }).change,
    -2,
  );
  assert.equal(
    normalizeFugleQuote({ ...fixture, previousClose: 568 }).change,
    0,
  );
  assert.equal(
    normalizeFugleQuote({ ...fixture, lastTrade: undefined, closePrice: NaN })
      .close,
    null,
  );
});
test("Fugle client only transmits requested symbols and provides safe configuration/limit errors", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (input) => {
      assert.equal(String(input), "/api/quotes?symbols=2330");
      return new Response(JSON.stringify([fixture]), { status: 200 });
    };
    assert.equal((await fugleProvider.fetchQuotes(["2330"]))[0]?.close, 568);
    globalThis.fetch = async () =>
      new Response("private upstream details", { status: 503 });
    await assert.rejects(fugleProvider.fetchQuotes(["2330"]), /尚未設定/);
    globalThis.fetch = async () => new Response("", { status: 429 });
    await assert.rejects(fugleProvider.fetchQuotes(["2330"]), /額度/);
    globalThis.fetch = async () =>
      new Response(JSON.stringify([]), { status: 200 });
    await assert.rejects(fugleProvider.fetchQuotes(["2330"]), /不完整/);
  } finally {
    globalThis.fetch = original;
  }
});
