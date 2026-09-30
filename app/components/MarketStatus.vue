<script setup lang="ts">
const { loading, error, quotes, refresh } = useStockQuotes()
</script>
<template>
  <div v-if="error" class="mb-6" role="status">
    <UAlert color="warning" variant="soft" title="行情更新失敗" :description="error + (quotes.length ? ' 目前顯示上次成功載入的行情。' : ' 載入成功後即可計算市值與新增持股。')" />
    <UButton class="mt-3" color="neutral" variant="outline" :loading="loading" @click="refresh(true)">重新載入行情</UButton>
  </div>
  <p v-else-if="loading && !quotes.length" role="status" class="loading-note">正在讀取證交所最新交易日行情…</p>
</template>
