<script setup lang="ts">
const { initialize, storageError, holdings, initialized } = usePortfolio();
const { refresh } = useStockQuotes();
watch(
  () =>
    holdings.value
      .map((h) => h.symbol)
      .sort()
      .join(","),
  () => {
    if (initialized.value) void refresh();
  },
);
onMounted(async () => {
  await initialize();
  await refresh();
});
</script>
<template>
  <UApp>
    <VitePwaManifest />
    <div class="app-shell">
      <a class="skip-link" href="#main-content">跳至主要內容</a>
      <header class="topbar">
        <NuxtLink to="/portfolio" class="brand"
          ><img
            class="brand-mark"
            src="/icons/notebook-full-192.png"
            alt=""
            width="39"
            height="39"
          /><span>台股手帳<small>臺灣上市證券</small></span></NuxtLink
        >
        <nav aria-label="主要導覽">
          <NuxtLink to="/portfolio">投資組合</NuxtLink
          ><NuxtLink to="/holdings">管理持股</NuxtLink>
        </nav>
        <span class="local-label"><span class="dot" /> 本機儲存</span>
      </header>
      <main id="main-content" tabindex="-1">
        <UAlert
          v-if="storageError"
          color="warning"
          variant="soft"
          title="瀏覽器儲存提醒"
          :description="storageError"
          class="mb-6"
        />
        <PwaStatus />
        <NuxtPage />
      </main>
      <footer><span>資料來源：Fugle</span></footer>
    </div>
  </UApp>
</template>
