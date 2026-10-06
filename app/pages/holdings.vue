<script setup lang="ts">
const { holdings } = usePortfolio();
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
        <p class="subtitle">新增買入紀錄，或調整目前的股數與均價。</p>
      </div>
      <UButton to="/portfolio" color="neutral" variant="outline"
        >查看投資組合</UButton
      >
    </div>
    <MarketStatus /><AddHoldingForm />
    <section class="panel">
      <div class="panel-heading">
        <h2>
          我的持股 <span class="count">{{ holdings.length }}</span>
        </h2>
        <span class="subtle">股數與均價儲存在此瀏覽器</span>
      </div>
      <div v-if="!holdings.length" class="empty-state compact">
        <h3>尚未加入持股</h3>
        <p>在上方輸入股票代碼與張數或股數，建立你的持股清單。</p>
      </div>
      <HoldingEditor
        v-for="holding in holdings"
        :key="holding.symbol"
        :holding="holding"
        :name="names.get(holding.symbol) ?? '尚無股票名稱'"
      />
    </section>
    <div class="info-note">
      <p>
        持股只儲存在這個瀏覽器，不會傳送至我們的伺服器。清除瀏覽器資料、使用無痕模式或更換裝置，可能讓持股資料消失。
      </p>
    </div>
  </section>
</template>
