<script setup lang="ts">
const { initialize, storageError } = usePortfolio()
const { refresh } = useStockQuotes()
onMounted(() => { void initialize(); void refresh() })
</script>
<template>
  <UApp>
    <VitePwaManifest />
    <div class="app-shell">
      <header class="topbar">
        <NuxtLink to="/portfolio" class="brand"><span class="brand-mark">台</span><span>台股手帳<small>臺灣上市證券</small></span></NuxtLink>
        <nav aria-label="主要導覽"><NuxtLink to="/portfolio">投資組合</NuxtLink><NuxtLink to="/holdings">管理持股</NuxtLink></nav>
        <span class="local-label"><span class="dot" /> 本機儲存</span>
      </header>
      <main>
        <UAlert v-if="storageError" color="warning" variant="soft" title="瀏覽器儲存提醒" :description="storageError" class="mb-6" />
        <PwaStatus />
        <NuxtPage />
      </main>
      <footer><span>台股手帳 <span class="footer-separator">/</span> 讓每一股，都清楚。</span><span>資料來源：臺灣證券交易所 · 非即時行情</span></footer>
    </div>
  </UApp>
</template>
