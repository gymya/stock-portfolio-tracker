<script setup lang="ts">
import {
  money,
  averagePrice,
  signedMoney,
  percentage,
  direction,
  quoteTime,
} from "~/utils/format";
import { deductSellingFees } from '~/services/portfolio/sellingFees';
const { holdings, summary: originalSummary } = usePortfolio();
const deductFees = ref(false);
const summary = computed(() => deductFees.value
  ? deductSellingFees(originalSummary.value, new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10))
  : originalSummary.value);
const { quotes, loading, refresh, error } = useStockQuotes();
const marketTime = computed(() => {
  const latest = quotes.value
    .filter((q) => q.quoteTime && Number.isFinite(Date.parse(q.quoteTime)))
    .sort((a, b) => Date.parse(b.quoteTime!) - Date.parse(a.quoteTime!))[0];
  return latest ? `${latest.date} ${quoteTime(latest.quoteTime)}` : null;
});
</script>
<template>
  <section>
    <div class="page-heading">
      <div>
        <h1>投資組合總覽</h1>
        <p class="subtitle">市值、交易日損益與持股報酬，一目了然。</p>
      </div>
      <UButton
        color="neutral"
        variant="outline"
        :loading="loading"
        @click="refresh(true)"
        >更新行情</UButton
      >
    </div>
    <MarketStatus />
    <div class="market-caption">
      <span class="dot" :class="{ muted: !quotes.length || error }" />行情時間
      <strong>{{ marketTime ?? "尚未取得" }}</strong
      ><span class="caption-divider" />Fugle 成交行情
    </div>
    <div class="fee-options">
      <UCheckbox v-model="deductFees" label="扣除預估稅費（假設全部賣出）" />
      <p class="mt-2 text-xs text-muted leading-relaxed">手續費 0.1425%（每檔最低 NT$20），證交稅依證券類型計算。僅供估算，以券商交割明細為準。</p>
      <p v-if="deductFees" class="mt-1 text-xs text-muted">損益扣除本次賣出稅費，不含買進費用。</p>
    </div>
    <div class="summary-grid" aria-label="投資組合摘要">
      <div class="value-card">
        <p class="metric-label">{{ deductFees ? '預估賣出淨額' : '持股總市值' }}</p>
        <div class="portfolio-value">
          <span>NT$</span> {{ money(summary.marketValue) }}
        </div>
        <p class="value-footnote">
          {{ holdings.length }} 檔持股 <span>·</span> 以最近成交價計算
        </p>
      </div>
      <div class="change-card">
        <p class="metric-label">{{ deductFees ? '預估扣費後損益' : '最新交易日損益' }}</p>
        <p class="change-value" :class="direction(summary.dailyPnL)">
          {{ signedMoney(summary.dailyPnL) }}
        </p>
        <span
          class="change-pill"
          :class="direction(summary.dailyChangePercentage)"
          >{{ percentage(summary.dailyChangePercentage) }}</span
        >
        <p class="metric-note">相較前一交易日持股市值</p>
      </div>
      <div class="change-card">
        <p class="metric-label">{{ deductFees ? '扣費後持股報酬' : '持股報酬' }}</p>
        <p class="change-value" :class="direction(summary.unrealizedPnL)">{{ signedMoney(summary.unrealizedPnL, 0) }}</p>
        <span class="change-pill" :class="direction(summary.returnPercentage)">{{ percentage(summary.returnPercentage) }}</span>
        <p class="metric-note">總購買成本 NT$ {{ money(summary.costBasis, 0) }} · 依成本加權</p>
      </div>
    </div>
    <UAlert v-if="holdings.some(h => h.averageCost === undefined)" class="mb-6" color="warning" variant="soft" title="部分持股尚未設定均價" description="請至管理持股補上購買均價；補齊前，缺少成本的個股及整體報酬率以「—」顯示。" />
    <UAlert
      v-if="holdings.length && !summary.isComplete && !loading"
      class="mb-6"
      color="warning"
      variant="soft"
      title="部分行情無法計算"
      description="持股可能缺少價格、漲跌資料、交易日期不一致，或無法確認適用稅率。無法完整計算的總額以「—」顯示。"
    />
    <section class="panel">
      <div class="panel-heading">
        <h2>
          持股明細 <span class="count">{{ holdings.length }}</span>
        </h2>
        <NuxtLink to="/holdings" class="text-link">管理持股</NuxtLink>
      </div>
      <div v-if="!holdings.length" class="empty-state">
        <h3>從第一檔持股開始</h3>
        <p>新增股票代碼與股數，查看你的投資組合市值。</p>
        <UButton to="/holdings" size="lg">新增持股</UButton>
      </div>
      <div v-else class="table-scroll">
        <table class="holdings-table">
          <caption class="sr-only">持股股數、價格、市值與損益明細</caption>
          <thead>
            <tr>
              <th>股票</th>
              <th class="numeric">持有股數</th>
              <th class="numeric">購買均價</th>
              <th class="numeric">最近成交價</th>
              <th class="numeric">{{ deductFees ? '預估賣出淨額' : '市值' }}</th>
              <th class="numeric">{{ deductFees ? '扣費後損益' : '交易日損益' }}</th>
              <th class="numeric">{{ deductFees ? '扣費後損益 %' : '損益 %' }}</th>
              <th class="numeric">{{ deductFees ? '扣費後未實現損益' : '未實現損益' }}</th>
              <th class="numeric">{{ deductFees ? '扣費後報酬率' : '持股報酬率' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary.holdings" :key="row.holding.symbol">
              <td>
                <strong>{{ row.quote?.name ?? "查無行情" }}</strong
                ><small>{{ row.holding.symbol }} </small>
              </td>
              <td class="numeric" data-label="持有股數">
                {{ money(row.holding.shares) }}<span class="unit"> 股</span>
              </td>
              <td class="numeric" data-label="購買均價">{{ averagePrice(row.holding.averageCost) }}</td>
              <td class="numeric" data-label="最近成交價">
                {{
                  row.quote?.close == null
                    ? "—"
                    : `NT$ ${money(row.quote.close)}`
                }}
              </td>
              <td class="numeric" :data-label="deductFees ? '預估賣出淨額' : '市值'">
                {{
                  row.marketValue === null
                    ? "—"
                    : `NT$ ${money(row.marketValue)}`
                }}
              </td>
              <td class="numeric" :data-label="deductFees ? '扣費後交易日損益' : '交易日損益'" :class="direction(row.dailyPnL)">
                {{ signedMoney(row.dailyPnL) }}
              </td>
              <td class="numeric" data-label="交易日損益 %" :class="direction(row.dailyChangePercentage)">
                {{ percentage(row.dailyChangePercentage) }}
              </td>
              <td class="numeric" :data-label="deductFees ? '扣費後未實現損益' : '未實現損益'" :class="direction(row.unrealizedPnL)">{{ signedMoney(row.unrealizedPnL, 0) }}</td>
              <td class="numeric" :data-label="deductFees ? '扣費後報酬率' : '持股報酬率'" :class="direction(row.returnPercentage)">{{ percentage(row.returnPercentage) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <div class="info-note">
      <p>
        交易日損益比較最近成交價與前一交易日收盤價。持股報酬率 =（市值 − 購買成本）÷ 購買成本；整體以總損益除以總成本，不含股息、已實現損益與買進手續費。勾選扣費時，另扣預估賣出稅費。
      </p>
    </div>
  </section>
</template>
