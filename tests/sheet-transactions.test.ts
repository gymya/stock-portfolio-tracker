import { test } from "node:test";
import assert from "node:assert/strict";
import { sheetIdFromInput, sheetTransactionsToHoldings } from "../app/services/portfolio/sheetTransactions.ts";
import { calculatePortfolio } from "../app/services/portfolio/calculatePortfolio.ts";

const headers = ["交易日期", "股票代號", "交易類型", "股數", "成交單價（元）", "手續費（元）"];
test("Sheets sorts ROC/Gregorian dates and applies moving average to remaining holdings", () => {
  const holdings = sheetTransactionsToHoldings([headers,
    ["2026/11/23", "2330", "買進", 100, 300],
    ["2026/11/22", "2330", "賣出", 150, 999],
    ["115/11/21", "2330", "買入", 100, 200],
    ["", "2330", "買進", 100, 100, "ignored"],
  ]);
  assert.deepEqual(holdings, [{ symbol: "2330", shares: 150, averageCost: 250 }]);
  const summary = calculatePortfolio(holdings, [{ symbol: "2330", name: "台積電", date: "2026-11-26", close: 300, previousClose: 290, change: 10, changePercentage: 10 / 290 * 100 }]);
  assert.equal(summary.costBasis, 37500);
  assert.equal(summary.unrealizedPnL, 7500);
  assert.equal(summary.returnPercentage, 20);
});

test("Sheets supports row-six headers, blank seed dates, fractional shares and resets cost after closing", () => {
  const rows = [["標題"], [], [], [], [], headers,
    ["", "0050", "買進", "0.1", "1,000.25"],
    ["2026/11/20", "0050", "買進", "0.2", "1,000.25"],
    ["2026/11/21", "0050", "賣出", "0.3", 2000],
    ["2026/11/21", "0050", "買進", 2, 500],
    ["formula", "", "", "", "ignored"],
  ];
  assert.deepEqual(sheetTransactionsToHoldings(rows), [{ symbol: "0050", shares: 2, averageCost: 500 }]);
  assert.deepEqual(sheetTransactionsToHoldings(rows.slice(0, 9)), []);
  assert.deepEqual(sheetTransactionsToHoldings([headers]), []);
  assert.deepEqual(sheetTransactionsToHoldings([["股數", "交易類型", "股票代號", "交易日期", "成交單價（元）"], [10, "買進", "0050", "", 100]]), [{ symbol: "0050", shares: 10, averageCost: 100 }]);
});

test("Sheets rejects missing costs, invalid dates, overselling at any point and invalid rows atomically", () => {
  for (const row of [
    ["", "50", "買進", 1, 10], ["", "2330", "轉入", 1, 10],
    ["", "2330", "買進", "1,00", 10], ["", "2330", "買進", 0, 10],
    ["", "2330", "買進", "Infinity", 10], ["", "2330", "買進", "9007199254740991", 10],
    ["", "2330", "買進", "0.0000001", 10], ["", "2330", "買進", 1, ""],
    ["", "2330", "買進", 1, 0], ["", "2330", "買進", 1, "Infinity"],
    ["", "2330", "買進", 1, "1,00"], ["2026/2/30", "2330", "買進", 1, 10],
    ["", "2330", "賣出", 1, 10],
  ]) assert.throws(() => sheetTransactionsToHoldings([headers, row]));
  assert.throws(() => sheetTransactionsToHoldings([headers, ["2026/11/20", "2330", "賣出", 1, 10], ["2026/11/21", "2330", "買進", 2, 10]]), /當時持股/);
  assert.throws(() => sheetTransactionsToHoldings([]), /標題/);
  assert.throws(() => sheetTransactionsToHoldings([[...headers, "成交單價（元）"]]), /唯一/);
  assert.throws(() => sheetTransactionsToHoldings([headers, ...Array(10001).fill([])]), /10,000/);
  assert.throws(() => sheetTransactionsToHoldings([...Array(20).fill([]), headers]), /前 20 列/);
});

test("only Google spreadsheet IDs or canonical HTTPS links are accepted", () => {
  const id = "aB0123456789012345678901234567890_-";
  assert.equal(sheetIdFromInput(id), id);
  assert.equal(sheetIdFromInput(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`), id);
  for (const input of [null, "", "https://evil.example/sheet", `https://docs.google.com.evil.example/spreadsheets/d/${id}`, `http://docs.google.com/spreadsheets/d/${id}`, `https://user@docs.google.com/spreadsheets/d/${id}`, "../secret"])
    assert.throws(() => sheetIdFromInput(input));
});
