import { test } from "node:test";
import assert from "node:assert/strict";
import { ref, computed } from "vue";
import { usePortfolioSource } from "../app/composables/usePortfolioSource.ts";
import { useGoogleSheets } from "../app/composables/useGoogleSheets.ts";

test("modes stay separate, sync replaces rather than adds, failure preserves data and account switches clear it", async () => {
  const state = new Map();
  let currentAccount = { id: "A", email: "a@example.test", expiresAt: Date.now() + 3600000 };
  let fail = false;
  let switchDuringSync = false;
  let syncCalls = 0;
  Object.assign(globalThis, {
    useState: (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()));
      return state.get(key);
    }, computed, usePortfolioSource,
    $fetch: async (url: string) => {
      if (url.endsWith("status")) return { configured: true, account: currentAccount };
      syncCalls++;
      if (fail) throw new Error("network failure");
      if (switchDuringSync) currentAccount = { ...currentAccount, id: "B" };
      return { accountId: "A", holdings: [{ symbol: "0050", shares: 20 }], syncedAt: Date.now() };
    },
  });
  const portfolio = usePortfolioSource();
  const google = useGoogleSheets();
  portfolio.manualHoldings.value = [{ symbol: "2330", shares: 10, averageCost: 100 }];
  await google.checkAccount();
  google.spreadsheet.value = "test";
  portfolio.source.value = "google";
  assert.deepEqual(portfolio.holdings.value, []);
  await google.sync();
  await google.sync();
  assert.deepEqual(portfolio.holdings.value, [{ symbol: "0050", shares: 20 }]);
  fail = true;
  await google.sync();
  assert.deepEqual(portfolio.holdings.value, [{ symbol: "0050", shares: 20 }]);
  assert.ok(google.error.value);
  fail = false;
  switchDuringSync = true;
  await google.sync();
  assert.deepEqual(portfolio.holdings.value, []);
  assert.equal(google.spreadsheet.value, "");
  assert.equal(google.syncedAt.value, null);
  const previousCalls = syncCalls;
  currentAccount = { ...currentAccount, id: "C" };
  await google.sync();
  assert.equal(syncCalls, previousCalls, "an account change before syncing must not reuse the previous user's sheet selection");
  assert.match(google.error.value, /帳號已變更/);
  portfolio.source.value = "manual";
  assert.deepEqual(portfolio.holdings.value, [{ symbol: "2330", shares: 10, averageCost: 100 }]);
});

test("account checks show progress, clear expired holdings and recover after network errors", async () => {
  const state = new Map();
  let finish!: (value: unknown) => void;
  let fail = false;
  Object.assign(globalThis, {
    useState: (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()));
      return state.get(key);
    }, computed, usePortfolioSource,
    $fetch: () => fail ? Promise.reject(new Error("offline")) : new Promise(resolve => { finish = resolve; }),
  });
  const google = useGoogleSheets();
  const portfolio = usePortfolioSource();
  google.account.value = { id: "A", email: "a@example.test", expiresAt: Date.now() + 1000 };
  portfolio.source.value = "google";
  portfolio.sheetHoldings.value = [{ symbol: "0050", shares: 10 }];
  google.syncedAt.value = Date.now();
  const checking = google.checkAccount();
  assert.equal(google.checking.value, 1);
  finish({ configured: true, account: null });
  await checking;
  assert.equal(google.checking.value, 0);
  assert.equal(google.account.value, null);
  assert.equal(google.syncedAt.value, null);
  assert.deepEqual(portfolio.sheetHoldings.value, []);
  assert.equal(portfolio.source.value, "google");
  assert.match(google.error.value, /到期/);
  fail = true;
  await assert.rejects(google.checkAccount(), /offline/);
  assert.equal(google.checking.value, 0);
});
