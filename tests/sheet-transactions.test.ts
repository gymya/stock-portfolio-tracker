import { test } from "node:test";
import assert from "node:assert/strict";
import { sheetIdFromInput, sheetTransactionsToHoldings } from "../app/services/portfolio/sheetTransactions.ts";

const headers = ["交易日期", "股票代號", "交易類型", "股數", "成交單價（元）", "手續費（元）"];
test("Sheets aggregates transactions regardless of dates and order, preserves leading zeros, ignores cost and removes closed positions", () => {
  const values = [headers,
    ["2026/11/26", "2330", "賣出", "400", "ignored"],
    ["115/11/20", "2330", "買進", "1,000", "ignored", "ignored"],
    ["2026/11/21", "2330", "買進", "200"],
    ["2026/11/20", "0050", "買進", "0.1"],
    [],
    ["2026/11/21", "0050", "買進", "0.2"],
    ["2026/11/22", "0050", "賣出", "0.3"],
  ];
  assert.deepEqual(sheetTransactionsToHoldings(values), [{ symbol: "2330", shares: 800 }]);
  assert.deepEqual(sheetTransactionsToHoldings(values), [{ symbol: "2330", shares: 800 }]);
  assert.deepEqual(sheetTransactionsToHoldings([headers]), []);
  assert.deepEqual(sheetTransactionsToHoldings([["股數", "交易類型", "股票代號", "交易日期"], [10, "買進", "0050", "2026-11-20"]]), [{ symbol: "0050", shares: 10 }]);
});

test("Sheets rejects incomplete or invalid transactions instead of silently importing partial holdings", () => {
  for (const row of [
    ["2026/11/20", "50", "買進", 1],
    ["2026/11/20", "2330", "轉入", 1],
    ["2026/11/20", "2330", "買進", "1,00"],
    ["2026/11/20", "2330", "買進", 0],
    ["2026/11/20", "2330", "買進", "Infinity"],
    ["2026/11/20", "2330", "買進", "9007199254740991"],
    ["2026/11/20", "2330", "買進", "0.0000001"],
    ["2026/11/20", "2330", "賣出", 1],
  ]) assert.throws(() => sheetTransactionsToHoldings([headers, row]));
  assert.deepEqual(sheetTransactionsToHoldings([headers, ["", "2330", "賣出", 1], ["", "2330", "買入", 1]]), []);
  assert.throws(() => sheetTransactionsToHoldings([]), /標題/);
  assert.throws(() => sheetTransactionsToHoldings([[...headers, "股數"]]), /唯一/);
  assert.throws(() => sheetTransactionsToHoldings([headers, ...Array(10001).fill([])]), /10,000/);
});

test("only Google spreadsheet IDs or canonical HTTPS links are accepted", () => {
  const id = "aB0123456789012345678901234567890_-";
  assert.equal(sheetIdFromInput(id), id);
  assert.equal(sheetIdFromInput(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`), id);
  for (const input of [null, "", "https://evil.example/sheet", `https://docs.google.com.evil.example/spreadsheets/d/${id}`, `http://docs.google.com/spreadsheets/d/${id}`, `https://user@docs.google.com/spreadsheets/d/${id}`, "../secret"])
    assert.throws(() => sheetIdFromInput(input));
});


test("finds row-six headers and includes undated opening holdings without reading dates or costs", () => {
  const rows = [["投資紀錄"], ["說明"], [], ["合計"], [], headers,
    ["", "0050", "買入", 100],
    ["", "2330", "買入", 20],
    ["not a date", "0050", "賣出", 30],
    ["2026/11/26", "0050", "買進", 5],
    ["ignored", "", "", "", "ignored formula"],
  ];
  assert.deepEqual(sheetTransactionsToHoldings(rows), [{ symbol: "0050", shares: 75 }, { symbol: "2330", shares: 20 }]);
  assert.deepEqual(sheetTransactionsToHoldings([["股數", "股票代號", "交易類型"], [5, "0050", "買入"]]), [{ symbol: "0050", shares: 5 }]);
  assert.throws(() => sheetTransactionsToHoldings([...rows, ["", "2330", "買入", ""]]), /第 12 列/);
  assert.throws(() => sheetTransactionsToHoldings([...Array(20).fill([]), headers]), /前 20 列/);
});
