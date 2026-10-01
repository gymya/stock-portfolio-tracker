import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeStockList,
  searchStocks,
  STOCK_LIST_TTL,
} from "../app/services/stock/catalog.ts";

test("stock search supports codes, partial names, ETF letters and ambiguous names", () => {
  const stocks = normalizeStockList([
    { symbol: "2330", name: "台積電" },
    { symbol: "0050", name: "元大台灣50" },
    { symbol: "00631L", name: "元大台灣50正2" },
  ]);
  assert.equal(searchStocks(stocks, "台積")[0]?.symbol, "2330");
  assert.equal(searchStocks(stocks, " 00631l ")[0]?.symbol, "00631L");
  assert.equal(searchStocks(stocks, "233")[0]?.name, "台積電");
  assert.equal(searchStocks(stocks, "元大").length, 2);
  assert.deepEqual(searchStocks(stocks, ""), []);
  assert.deepEqual(searchStocks(stocks, "不存在"), []);
  assert.throws(() => normalizeStockList([{ symbol: "2330", name: "" }]));
  assert.throws(() => normalizeStockList([stocks[0], stocks[0]]));
  assert.deepEqual(
    normalizeStockList([...stocks, { symbol: "000110" }]),
    stocks,
  );
});

test("stock list proxy deduplicates requests and refreshes after 24 hours", async () => {
  let now = Date.now(),
    calls = 0,
    fail = false;
  const originalNow = Date.now;
  Date.now = () => now;
  Object.assign(globalThis, {
    defineEventHandler: (fn: unknown) => fn,
    setHeader: () => {},
    useRuntimeConfig: () => ({
      fugleApiBaseUrl: "https://api.fugle.tw/marketdata/v1.0/stock",
      fugleApiKey: "fake-test-key",
    }),
    createError: (options: object) =>
      Object.assign(new Error("Safe upstream error"), options),
    $fetch: async (
      path: string,
      options: { query: object; headers: Record<string, string> },
    ) => {
      calls++;
      assert.equal(path, "/intraday/tickers");
      assert.deepEqual(options.query, { type: "EQUITY", exchange: "TWSE" });
      assert.equal(options.headers["X-API-KEY"], "fake-test-key");
      if (fail) throw Object.assign(new Error("secret"), { statusCode: 429 });
      return { data: [{ symbol: "2330", name: "台積電" }] };
    },
  });
  try {
    const { default: handler } = await import("../server/api/stocks.get.ts");
    const [a, b] = await Promise.all([
      handler({} as never),
      handler({} as never),
    ]);
    assert.deepEqual(a, b);
    assert.equal(calls, 1);
    now += STOCK_LIST_TTL - 1;
    await handler({} as never);
    assert.equal(calls, 1);
    now++;
    const refreshed = await handler({} as never);
    assert.equal(calls, 2);
    assert.equal(refreshed.fetchedAt, now);
    now += STOCK_LIST_TTL;
    fail = true;
    await assert.rejects(handler({} as never), { statusCode: 429 });
  } finally {
    Date.now = originalNow;
  }
});
