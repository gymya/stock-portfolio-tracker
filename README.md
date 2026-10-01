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

Fugle 個股即時報價 → Nuxt `/api/quotes?symbols=2330,0050` → adapter → StockQuote[] → 純函式計算 → 共用 composables → Vue 頁面。

`useStockQuotes` 共用單一進行中的請求，只查持股代碼，每 60 秒更新；背景分頁或離線時暫停自動查詢，回到前景或恢復連線時更新。使用者可手動更新。伺服器按代碼快取 60 秒並共用進行中請求，手動更新仍可能命中快取。快取僅限各執行個體記憶體，Vercel 不同實例不共用。失敗保留上次成功資料並顯示警告，不存行情至 localStorage。

使用 Fugle `/intraday/quote/{symbol}`，適用個股報價權限；不使用需較高方案的全市場 snapshot。每輪每檔最多一次上游請求，請依帳號額度控制持股數。API Key、方案錯誤與額度耗盡會顯示提示，不自動重試該次請求。正式網頁應搭配 Vercel 存取保護，避免公開訪客耗用你的個人 API 配額。

採用 `lastTrade.price`，缺少時使用 `closePrice`，不使用包含試撮的 `lastPrice` 或 `change`。損益自行計算為 `(實際成交價 - previousClose) × 股數`。Fugle 微秒時間轉為 ISO，畫面以臺北時間顯示。`StockQuote.close` 為相容既有計算介面的估值價格，盤中代表最近實際成交價，並非僅代表收盤價。

`portfolioLocal` 是唯一存取 localStorage 的位置，key 為 `tw-portfolio:v1`，只儲存 `{ symbol, shares }[]`。初始讀取失敗會鎖定寫入，避免覆寫損毀資料。儲存不可用時仍可在記憶體操作，畫面會提醒重新整理可能遺失變更。

`rocDateTranslator` 將民國日期（1150929、115/09/29）及西元日期轉為 yyyy-mm-dd，拒絕不存在的日期。

無效或缺失價格保留為 null；不補零、不沿用其他股票價格。日期不一致不合計。缺少漲跌時可顯示完整市值，但不顯示不完整的漲跌總額。百分比以先前市值為分母；分母無效或非正數時顯示「—」。

## 目前限制

瀏覽器僅傳送查詢股票代碼至同源代理，持有股數不離開瀏覽器。伺服器以 `X-API-KEY` 呼叫固定的 Fugle 網址，不轉送瀏覽器 cookies 或其他 headers。單檔 12 秒逾時，任一檔失敗時該輪更新失敗並保留舊行情。未提供 Key 時無法驗證真實行情，沒有以示範資料替代正式行情。

部署必須執行 Nuxt server（`npm run build` 後執行 `node .output/server/index.mjs`）或支援 Nitro 的平台。純靜態部署無法提供此代理。

持股只在目前瀏覽器；不同分頁不即時同步。股數接受有限正數，包括小數。不支援上櫃、成本、總報酬、交易歷史、帳號或資料庫。這是每分鐘抓取即時報價的 REST 輪詢，不是逐筆 WebSocket 串流；資料時效依 Fugle 方案及個股最後成交時間而定。

測試涵蓋日期轉換、數值正規化、計算、缺值、溢位、日期不一致、損毀儲存與存取失敗。

## PWA

正式建置包含 Web App Manifest、Service Worker、192/512px 安裝圖示及 180px Apple touch icon，主色為 #08192D。以 HTTPS 部署（本機 localhost 亦可）後，在支援的瀏覽器使用「安裝台股手帳」或瀏覽器的安裝功能；iPhone/iPad 可用 Safari 分享選單的「加入主畫面」。

第一次連線成功並完成 Service Worker 資源下載後，可離線開啟兩個頁面、查看與修改既有持股。行情 API 採 NetworkOnly，不快取行情；離線重新開啟時沒有價格，顯示讀取失敗及「—」，不會以假資料補值。新增股票仍需連線驗證代碼。PWA 不會增加持股同步或伺服器儲存。

新版本下載完成後會顯示更新按鈕，由使用者確認重新載入，避免中斷輸入。開發模式不啟用 Service Worker，請使用正式建置驗證：

```sh
npm run build
PORT=3001 node .output/server/index.mjs
```

頁首、PWA 與 Apple 主畫面統一使用 `public/icons/notebook-full-*.png` 記事本圖示，藏青底延伸至圖片邊緣，沒有外圍白邊。Manifest 使用 `any`，由作業系統處理外框；頁首圓角由 CSS 呈現。`scripts/generate-pwa-icons.py` 是舊版「台」字圖示產生器，不適用目前圖示。


## 環境變數

必要設定：`NUXT_FUGLE_API_BASE_URL=https://api.fugle.tw/marketdata/v1.0/stock` 及 `NUXT_FUGLE_API_KEY`。兩者皆使用私有 runtimeConfig；Key 不可使用 `NUXT_PUBLIC_` 前綴。缺少設定回傳 503，舊的 `NUXT_TWSE_API_BASE_URL` 不再使用。

本機開發：複製 `.env.example` 為 `.env`，重新啟動 Nuxt。`.env` 不納入 Git。

Vercel：在 Project Settings → Environment Variables 新增 `NUXT_FUGLE_API_BASE_URL` 與 `NUXT_FUGLE_API_KEY`，套用至需要的 Production / Preview 環境後重新部署。

正式 Node 預覽不會自動載入 `.env`，請改用：

```sh
PORT=3001 node --env-file=.env .output/server/index.mjs
```
