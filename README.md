# 台股手帳

Nuxt 4、Vue 3、TypeScript、Tailwind CSS、Nuxt UI 實作的台灣上市證券持股工具。

## 開發

需要 Node.js 22.18+（建議 Node.js 24）。

```sh
npm install
npm run dev
```

- `/portfolio`：持股市值、最新交易日漲跌及持股明細。
- `/holdings`：新增、修改股數與移除持股。
- `/`：透過 router.options.ts 導向 `/portfolio`，沒有 index.vue。

```sh
npm test
npm run typecheck
npm run build
```

## 資料流程

TWSE → Nuxt `/api/quotes` 公開行情代理 → adapter → StockQuote[] → 純函式計算 → 共用 composables → Vue 頁面。

`useStockQuotes` 共用單一進行中的請求，行情在記憶體快取五分鐘，使用者可手動更新。失敗會保留上次成功資料並顯示警告。不自動輪詢、不存行情至 localStorage。

`portfolioLocal` 是唯一存取 localStorage 的位置，key 為 `tw-portfolio:v1`，只儲存 `{ symbol, shares }[]`。初始讀取失敗會鎖定寫入，避免覆寫損毀資料。儲存不可用時仍可在記憶體操作，畫面會提醒重新整理可能遺失變更。

`rocDateTranslator` 將民國日期（1150929、115/09/29）及西元日期轉為 yyyy-mm-dd，拒絕不存在的日期。

無效或缺失價格保留為 null；不補零、不沿用其他股票價格。日期不一致不合計。缺少漲跌時可顯示完整市值，但不顯示不完整的漲跌總額。百分比以先前市值為分母；分母無效或非正數時顯示「—」。

## 目前限制

官方 STOCK_DAY_ALL 回應未提供 Access-Control-Allow-Origin，因此瀏覽器透過同源 GET `/api/quotes` 取得行情。代理只請求固定的官方網址，不轉送瀏覽器 cookies、headers、查詢參數或持股；15 秒逾時後回傳 502，前端保留既有行情並提示重試。不新增伺服器儲存或快取，沿用五分鐘前端快取。沒有使用非官方行情或示範價格替代真實資料。

部署必須執行 Nuxt server（`npm run build` 後執行 `node .output/server/index.mjs`）或支援 Nitro 的平台。純靜態部署無法提供此代理。

持股只在目前瀏覽器；不同分頁不即時同步。股數接受有限正數，包括小數。不支援上櫃、即時行情、成本、總報酬、交易歷史、帳號或資料庫。

測試涵蓋日期轉換、數值正規化、計算、缺值、溢位、日期不一致、損毀儲存與存取失敗。
