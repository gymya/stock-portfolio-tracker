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

`useStockQuotes` 共用單一進行中的請求，只查持股代碼，於首次載入、持股代碼變更或使用者手動更新時查詢，沒有定時更新。伺服器按代碼快取 60 秒並共用進行中請求，手動更新仍可能命中快取。快取僅限各執行個體記憶體，Vercel 不同實例不共用。失敗保留上次成功資料並顯示警告，不存行情至 localStorage。

新增持股支援代碼及股票簡稱的部分搜尋。`/api/stocks` 使用 Fugle `/intraday/tickers?type=EQUITY&exchange=TWSE` 取得上市股票與 ETF 清單，未排除注意、處置或暫停交易股票。進入管理持股頁時載入，依取得時間快取 24 小時；伺服器記憶體與瀏覽器 localStorage 都保留清單，搜尋不呼叫行情 API。更新失敗時沿用瀏覽器舊清單，無清單時仍可輸入代碼；新增持股仍透過報價驗證。清單快取不含 API Key 或使用者持股。

使用 Fugle `/intraday/quote/{symbol}`，適用個股報價權限；不使用需較高方案的全市場 snapshot。每輪每檔最多一次上游請求，請依帳號額度控制持股數。API Key、方案錯誤與額度耗盡會顯示提示，不自動重試該次請求。正式網頁應搭配 Vercel 存取保護，避免公開訪客耗用你的個人 API 配額。

採用 `lastTrade.price`，缺少時使用 `closePrice`，不使用包含試撮的 `lastPrice` 或 `change`。損益自行計算為 `(實際成交價 - previousClose) × 股數`。Fugle 微秒時間轉為 ISO，畫面以臺北時間顯示。`StockQuote.close` 為相容既有計算介面的估值價格，盤中代表最近實際成交價，並非僅代表收盤價。

`portfolioLocal` 管理手動持股的 localStorage，key 為 `tw-portfolio:v1`，儲存 `{ symbol, shares, averageCost? }[]`。初始讀取失敗會鎖定寫入，避免覆寫損毀資料。儲存不可用時仍可在記憶體操作，畫面會提醒重新整理可能遺失變更。

`rocDateTranslator` 將民國日期（1150929、115/09/29）及西元日期轉為 yyyy-mm-dd，拒絕不存在的日期。

無效或缺失價格保留為 null；不補零、不沿用其他股票價格。日期不一致不合計。缺少漲跌時可顯示完整市值，但不顯示不完整的漲跌總額。百分比以先前市值為分母；分母無效或非正數時顯示「—」。

## 目前限制

手動持股模式僅傳送查詢股票代碼至同源代理，手動持有股數不離開瀏覽器。Google Sheets 模式由後端以使用者授權讀取 A–D 欄，只解析代號、類型與股數，計算剩餘股數後回傳，不保存交易紀錄。伺服器以 `X-API-KEY` 呼叫固定的 Fugle 網址，不轉送瀏覽器 cookies 或其他 headers。單檔 12 秒逾時，任一檔失敗時該輪更新失敗並保留舊行情。未提供 Key 時無法驗證真實行情，沒有以示範資料替代正式行情。

部署必須執行 Nuxt server（`npm run build` 後執行 `node .output/server/index.mjs`）或支援 Nitro 的平台。純靜態部署無法提供此代理。

持股只在目前瀏覽器；不同分頁不即時同步。股數接受有限正數，包括小數。不支援上櫃、含股息的總報酬、交易歷史管理或資料庫。Google 帳號僅用於授權讀取試算表，手動持股不會隨 Google 帳號同步。行情透過 REST 請求取得；資料時效依 Fugle 方案及個股最後成交時間而定。

測試涵蓋日期轉換、數值正規化、計算、缺值、溢位、日期不一致、損毀儲存與存取失敗。

## PWA

正式建置包含 Web App Manifest、Service Worker、192/512px 安裝圖示及 180px Apple touch icon，主色為 #08192D。以 HTTPS 部署（本機 localhost 亦可）後，在支援的瀏覽器使用「安裝台股手帳」或瀏覽器的安裝功能；iPhone/iPad 可用 Safari 分享選單的「加入主畫面」。

第一次連線成功並完成 Service Worker 資源下載後，可離線開啟兩個頁面、查看與修改既有持股。所有 API 採 NetworkOnly，不快取行情或 Google 私人資料；離線重新開啟時沒有價格，顯示讀取失敗及「—」，不會以假資料補值。新增股票仍需連線驗證代碼。PWA 不會增加持股同步或伺服器儲存。

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


### 購買均價與持股報酬

- 新增持股填入本次股數及買入均價；相同股票依股數加權計算新均價。
- 「修改持股」直接修正整筆股數與均價；加碼請用新增持股，減少股數不計算已實現損益。
- 舊版資料保留，均價尚未設定時可至管理持股補上。缺少成本的個股與整體報酬率顯示「—」，且須先補上原均價才能加碼。
- 持股報酬率為未實現損益 ÷ 購買成本；整體以總損益 ÷ 總成本計算，不含股息、已實現損益及買進手續費。扣費選項另扣預估賣出稅費。
- 均價顯示最多 4 位小數，儲存及計算不預先四捨五入。均價不必符合成交升降單位。
- 均價旁 ± 按鈕依股票／新臺幣 ETF 價格級距切換至相鄰成交價，跨級距向下使用較低級距。無法識別的證券不提供調價按鈕，仍可手動輸入均價。規則來源：[證交所集中市場交易制度](https://wwwc.twse.com.tw/zh/products/system/trading.html)。


## Google Sheets 持股來源

管理持股頁面可切換「手動持股／Google Sheets」，只計算選用的來源，兩者不合併。原有手動持股與成本仍保留在瀏覽器，Sheets 不會覆寫它。重新整理會恢復來源偏好，Google 授權完成後則進入 Sheets 模式。

1. 選 Google Sheets 並連接自己的 Google 帳號，授予試算表唯讀權限。試算表不需公開。
   僅支援原生 Google 試算表。若檔名旁顯示 Microsoft Excel 格式（`.xlsx`／`.xlsm`），請先選「檔案 → 另存為 Google 試算表」，再使用新檔案的連結；原始 Excel 檔保留。Excel 巨集不會隨轉檔在 Sheets 執行。
2. 貼上試算表連結或 ID，按「同步持股」。固定讀取「交易紀錄」分頁，不需輸入分頁名稱。
3. 後端讀取 A–E 欄，前 20 列需包含唯一的 `交易日期`、`股票代號`、`交易類型`、`股數`、`成交單價（元）` 標題；五欄可調換順序。其他費用與損益欄位不讀取。
4. 依交易日期由早到晚計算（支援西元與民國年），同一天依表格列順序。日期空白的買進視為期初持股，先於所有有日期交易；賣出必須填日期。交易類型支援 `買入`、`買進`、`賣出`。股數單位為股，可有千分位及最多六位小數；成交單價須為正數，期初也需提供成本單價。股票代號需保留前導零，例如 `0050`。
5. 成本採移動加權平均：買進依股數加權，賣出扣除當時平均成本，全數賣出後重設成本。歸零持股不列入；任何時間點超賣、無效日期或單價、不完整交易會拒絕整次同步並指出問題列。最多 10,000 列交易；分割、配股、轉入等公司行動尚未支援。

每次同步都從整份交易紀錄重建剩餘股數與成本，不重複累加。一般同步失敗保留上次成功資料；帳號變更、登出或連線到期會清除 Sheets 資料。只有目前頁面的記憶體保存同步結果與連結，重新整理後需重新貼上連結並同步。行情仍走 Fugle；Sheets 模式顯示市值、交易日漲跌、剩餘成本與持股總報酬（未實現損益及其報酬率），不含股息、已實現損益與手續費，也不提供預估賣出稅費選項。

### OAuth 設定

在 Google Cloud 建立「網頁應用程式」OAuth 用戶端並啟用 Google Sheets API，使用 `openid`、`email`、`https://www.googleapis.com/auth/spreadsheets.readonly` scopes。測試狀態需將試用帳號加入測試使用者；正式對外提供服務前，依 Google 要求完成同意畫面與敏感權限驗證。

- `NUXT_GOOGLE_CLIENT_ID`、`NUXT_GOOGLE_CLIENT_SECRET`：本機放 `.env`，Vercel 設在伺服器環境變數並重新部署。不可加 `NUXT_PUBLIC_` 前綴。
- 正式回呼預設：`https://stock-portfolio-tracker-bay.vercel.app/api/auth/google/callback`。
- 開發回呼預設：`http://localhost:3000/api/auth/google/callback`。請使用 `localhost` 存取，而非 `127.0.0.1` 或區網 IP。
- 可用 `NUXT_GOOGLE_REDIRECT_URI` 覆寫部署或預覽網址，必須與 Google Cloud 已授權重新導向 URI 完全一致。正式 Node 預覽需用 `node --env-file=.env .output/server/index.mjs`，本機預覽時另設定 localhost 回呼。

授權使用 state 與 PKCE；access token 只存於加密、HttpOnly、SameSite=Lax 的一小時 cookie，HTTPS 下加上 Secure，前端無法讀取 token。加密金鑰由 OAuth 密鑰經用途隔離的 SHA-256 導出，輪替密鑰會使舊連線失效。API 只用該請求的 Google token 讀取試算表，不共用使用者資料快取；所有回應不快取，寫入類請求檢查同源與自訂 header。

第一版不保存 refresh token、不做背景同步，連線最長一小時，到期後需重新連接。登出清除本網站連線與頁面資料，不會登出整個 Google 帳號或撤銷 Google 帳號中的應用程式授權。未建立伺服器 session 資料庫，因此複製出去的有效 session cookie 只能等到期或輪替密鑰失效。手動持股是此瀏覽器共用資料，不屬於 Google 帳號，切換 Google 帳號不會刪除手動持股。

測試使用模擬 Google 回應，涵蓋授權 state/PKCE、同源檢查、帳號隔離、錯誤去敏、買賣彙總、重複同步、同步失敗與來源切換；真實 OAuth 同意與私人試算表需部署後由持有人驗證。
