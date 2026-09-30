# 台股手帳

Nuxt 4、Vue 3、TypeScript、Tailwind CSS、Nuxt UI 實作的台灣上市證券持股工具。

## 開發

需要 Node.js 22.18+（建議 Node.js 24）。

```sh
npm install
cp .env.example .env
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

## PWA

正式建置包含 Web App Manifest、Service Worker、192/512px 安裝圖示及 180px Apple touch icon，主色為 #08192D。以 HTTPS 部署（本機 localhost 亦可）後，在支援的瀏覽器使用「安裝台股手帳」或瀏覽器的安裝功能；iPhone/iPad 可用 Safari 分享選單的「加入主畫面」。

第一次連線成功並完成 Service Worker 資源下載後，可離線開啟兩個頁面、查看與修改既有持股。行情 API 採 NetworkOnly，不快取行情；離線重新開啟時沒有價格，顯示讀取失敗及「—」，不會以假資料補值。新增股票仍需連線驗證代碼。PWA 不會增加持股同步或伺服器儲存。

新版本下載完成後會顯示更新按鈕，由使用者確認重新載入，避免中斷輸入。開發模式不啟用 Service Worker，請使用正式建置驗證：

```sh
npm run build
PORT=3001 node .output/server/index.mjs
```

圖示可用 `python3 scripts/generate-pwa-icons.py` 重新產生（不需要額外套件）。


## 環境變數

`NUXT_TWSE_API_BASE_URL` 為必要的伺服器端設定，範例值見 `.env.example`。值應為 HTTPS 網域（不含 API 路徑、帳密、query 或 hash）。應用程式使用私有 `runtimeConfig.twseApiBaseUrl` 讀取，不暴露給瀏覽器，程式碼沒有預設證交所網域。缺少或無效設定時 `/api/quotes` 回傳 503。

本機開發：複製 `.env.example` 為 `.env`，重新啟動 Nuxt。`.env` 不納入 Git。

Vercel：在 Project Settings → Environment Variables 新增 `NUXT_TWSE_API_BASE_URL`，值依 `.env.example` 設定，套用至需要的 Production / Preview 環境後重新部署。

正式 Node 預覽不會自動載入 `.env`，請改用：

```sh
PORT=3001 node --env-file=.env .output/server/index.mjs
```
