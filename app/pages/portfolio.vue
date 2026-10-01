<script setup lang="ts">
import { money, signedMoney, percentage, direction, quoteTime } from '~/utils/format'
const { holdings, summary } = usePortfolio()
const { quotes, loading, refresh, error } = useStockQuotes()
const marketTime = computed(() => {
  const latest = quotes.value
    .filter(q => q.quoteTime && Number.isFinite(Date.parse(q.quoteTime)))
    .sort((a, b) => Date.parse(b.quoteTime!) - Date.parse(a.quoteTime!))[0]
  return latest ? `${latest.date} ${quoteTime(latest.quoteTime)}` : null
})
</script>
<template>
  <section>
    <div class="page-heading"><div><p class="eyebrow">持股一覽</p><h1>投資組合總覽</h1><p class="subtitle">掌握持股價值，從最新交易日開始。</p></div><UButton color="neutral" variant="outline" :loading="loading" @click="refresh(true)">更新行情</UButton></div>
    <MarketStatus />
    <div class="market-caption"><span class="dot" :class="{ muted: !quotes.length || error }" />行情時間 <strong>{{ marketTime ?? '尚未取得' }}</strong><span class="caption-divider" />Fugle 成交行情</div>
    <div class="summary-grid">
      <div class="value-card"><p class="metric-label">持股總市值</p><div class="portfolio-value"><span>NT$</span> {{ money(summary.marketValue) }}</div><p class="value-footnote">{{ holdings.length }} 檔持股 <span>·</span> 以最近成交價計算</p></div>
      <div class="change-card"><p class="metric-label">最新交易日損益</p><p class="change-value" :class="direction(summary.dailyPnL)">{{ signedMoney(summary.dailyPnL) }}</p><span class="change-pill" :class="direction(summary.dailyChangePercentage)">{{ percentage(summary.dailyChangePercentage) }}</span><p class="metric-note">相較前一交易日持股市值</p></div>
    </div>
    <UAlert v-if="holdings.length && !summary.isComplete && !loading" class="mb-6" color="warning" variant="soft" title="部分行情無法計算" description="持股可能缺少價格、漲跌資料或交易日期不一致。無法完整計算的總額以「—」顯示。" />
    <section class="panel"><div class="panel-heading"><h2>持股明細 <span class="count">{{ holdings.length }}</span></h2><NuxtLink to="/holdings" class="text-link">管理持股</NuxtLink></div>
      <div v-if="!holdings.length" class="empty-state"><h3>從第一檔持股開始</h3><p>新增股票代碼與股數，查看你的投資組合市值。</p><UButton to="/holdings" size="lg">新增持股</UButton></div>
<div v-else class="table-scroll"><table><thead><tr><th>股票</th><th class="numeric">持有股數</th><th class="numeric">最近成交價</th><th class="numeric">市值</th><th class="numeric">交易日損益</th><th class="numeric">損益 %</th></tr></thead><tbody><tr v-for="row in summary.holdings" :key="row.holding.symbol"><td><strong>{{ row.quote?.name ?? '查無行情' }}</strong><small>{{ row.holding.symbol }} <span v-if="row.quote">· {{ row.quote.date }} {{ quoteTime(row.quote.quoteTime) }}</span></small></td><td class="numeric">{{ money(row.holding.shares) }}<span class="unit"> 股</span></td><td class="numeric">{{ row.quote?.close == null ? '—' : `NT$ ${money(row.quote.close)}` }}</td><td class="numeric">{{ row.marketValue === null ? '—' : `NT$ ${money(row.marketValue)}` }}</td><td class="numeric" :class="direction(row.dailyPnL)">{{ signedMoney(row.dailyPnL) }}</td><td class="numeric" :class="direction(row.dailyChangePercentage)">{{ percentage(row.dailyChangePercentage) }}</td></tr></tbody></table></div>
    </section>
    <div class="info-note"><p>損益以最近實際成交價相較前一交易日收盤價計算，不含試撮，並非投資總報酬。可點選「更新行情」取得報價，實際時效依 Fugle 方案與個股成交情況而定；休市、暫停交易或尚無成交時請留意行情時間。</p></div>
  </section>
</template>
