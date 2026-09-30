<script setup lang="ts">
const { add } = usePortfolio()
const { quotes, loading } = useStockQuotes()
const symbol = ref(''), shares = ref(''), error = ref(''), success = ref(''), saving = ref(false)
async function submit() {
  error.value = ''; success.value = ''; saving.value = true
  try { await add(symbol.value, Number(shares.value)); success.value = '已新增持股。'; symbol.value = ''; shares.value = '' }
  catch (e) { error.value = e instanceof Error ? e.message : '新增失敗。' }
  finally { saving.value = false }
}
</script>
<template>
  <section class="panel add-panel"><div class="panel-heading"><h2>新增持股</h2><span class="subtle">僅支援 TWSE 上市證券</span></div>
    <form class="add-form" @submit.prevent="submit">
      <UFormField label="股票代碼" name="symbol" required><UInput v-model="symbol" placeholder="例如 2330、0050" size="lg" class="w-full" maxlength="20" aria-label="股票代碼" /></UFormField>
      <UFormField label="持有股數" name="shares" required help="以股為單位，1 張 = 1,000 股"><UInput v-model="shares" type="number" step="any" placeholder="例如 100" size="lg" class="w-full" aria-label="持有股數" /></UFormField>
      <UButton type="submit" size="lg" :loading="saving" :disabled="!quotes.length || loading" class="add-button">新增持股</UButton>
    </form>
    <p v-if="!quotes.length" class="form-notice">成功載入行情後，即可驗證股票代碼並新增持股。</p>
    <p v-if="error" role="alert" class="form-error">{{ error }}</p><p v-if="success" role="status" class="form-success">{{ success }}</p>
  </section>
</template>
