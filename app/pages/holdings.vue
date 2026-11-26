<script setup lang="ts">
const { holdings } = usePortfolio();
const { source } = usePortfolioSource();
const { account, checking, syncedAt } = useGoogleSheets();
const { quotes } = useStockQuotes();
const names = computed(
  () => new Map(quotes.value.map((q) => [q.symbol, q.name])),
);
</script>
<template>
  <section>
    <div class="page-heading">
      <div>
        <h1>管理持股</h1>
        <p class="subtitle">{{ source === 'manual' ? '新增買入紀錄，或調整目前的股數與均價。' : '持股由 Google Sheets 計算，請在試算表編輯交易後重新同步。' }}</p>
      </div>
      <UButton to="/portfolio" color="neutral" variant="outline"
        >查看投資組合</UButton
      >
    </div>
    <MarketStatus /><AddHoldingForm v-if="source === 'manual'" />
    <section class="panel">
      <div class="panel-heading">
        <h2>
          我的持股 <span class="count">{{ holdings.length }}</span>
        </h2>
        <span class="subtle">{{ source === 'manual' ? '股數與均價儲存在此瀏覽器' : 'Sheets 持股唯讀' }}</span>
      </div>
      <div v-if="!holdings.length" class="empty-state compact">
        <h3>{{ source === 'manual' ? '尚未加入持股' : (syncedAt ? '已同步，目前沒有持股' : checking ? '正在確認連線' : account ? '尚未同步持股' : '尚未連接 Google Sheets') }}</h3>
        <p>{{ source === 'manual' ? '在上方輸入股票代碼與張數或股數，建立你的持股清單。' : (syncedAt ? '試算表的買進減去賣出後，沒有剩餘股數。' : '請在上方連接 Google，貼上試算表網址並同步。') }}</p>
      </div>
      <template v-if="source === 'manual'">
      <HoldingEditor
        v-for="holding in holdings"
        :key="holding.symbol"
        :holding="holding"
        :name="names.get(holding.symbol) ?? '尚無股票名稱'"
      />
      </template>
      <ul v-else class="divide-y divide-default px-5">
        <li v-for="holding in holdings" :key="holding.symbol" class="flex flex-wrap justify-between gap-3 py-4">
          <span>{{ holding.symbol }} · {{ names.get(holding.symbol) ?? '尚無股票名稱' }}</span>
          <strong>{{ holding.shares.toLocaleString('zh-TW', { maximumFractionDigits: 6 }) }} 股</strong>
        </li>
      </ul>
    </section>
    <div v-if="source === 'manual'" class="info-note">
      <p>
        持股只儲存在這個瀏覽器，不會傳送至我們的伺服器。清除瀏覽器資料、使用無痕模式或更換裝置，可能讓持股資料消失。
      </p>
    </div>
  </section>
</template>
