<script setup lang="ts">
const { initialize, storageError, holdings, initialized } = usePortfolio()
const { refresh } = useStockQuotes()
let quoteTimer: ReturnType<typeof setInterval> | undefined
function refreshVisible() { if (!document.hidden && navigator.onLine) void refresh() }
watch(() => holdings.value.map(h => h.symbol).sort().join(','), () => { if (initialized.value) refreshVisible() })
onMounted(async () => {
  quoteTimer = setInterval(refreshVisible, 60000)
  document.addEventListener('visibilitychange', refreshVisible)
  window.addEventListener('online', refreshVisible)
  await initialize()
  await refresh()
})
onBeforeUnmount(() => {
  clearInterval(quoteTimer)
  document.removeEventListener('visibilitychange', refreshVisible)
  window.removeEventListener('online', refreshVisible)
})
</script>
<template>
  <UApp>
    <VitePwaManifest />
    <div class="app-shell">
      <header class="topbar">
        <NuxtLink to="/portfolio" class="brand"><img class="brand-mark" src="/icons/notebook-full-192.png" alt="" width="39" height="39"><span>台股手帳<small>臺灣上市證券</small></span></NuxtLink>
        <nav aria-label="主要導覽"><NuxtLink to="/portfolio">投資組合</NuxtLink><NuxtLink to="/holdings">管理持股</NuxtLink></nav>
        <span class="local-label"><span class="dot" /> 本機儲存</span>
      </header>
      <main>
        <UAlert v-if="storageError" color="warning" variant="soft" title="瀏覽器儲存提醒" :description="storageError" class="mb-6" />
        <PwaStatus />
        <NuxtPage />
      </main>
      <footer><span>台股手帳 <span class="footer-separator">/</span> 讓每一股，都清楚。</span><span>資料來源：Fugle · 每分鐘更新成交行情</span></footer>
    </div>
  </UApp>
</template>
