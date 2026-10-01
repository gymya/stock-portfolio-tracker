<script setup lang="ts">
import { searchStocks, type StockEntry } from '~/services/stock/catalog'
const { add } = usePortfolio()
const { loading } = useStockQuotes()
const { stocks, loading: catalogLoading, warning: catalogWarning, load } = useStockCatalog()
const symbol = ref(''), shares = ref(''), lots = ref(''), error = ref(''), success = ref(''), saving = ref(false)
const searchOpen = ref(false), activeIndex = ref(-1)
const suggestions = computed(() => searchStocks(stocks.value, symbol.value))
const selectedName = computed(() => stocks.value.find(s => s.symbol === symbol.value.trim().toUpperCase())?.name)
watch(symbol, () => { activeIndex.value = -1 })
onMounted(() => { void load() })
function selectStock(stock: StockEntry) { symbol.value = stock.symbol; searchOpen.value = false; activeIndex.value = -1 }
function searchKey(event: KeyboardEvent) {
  if (event.key === 'Escape') { searchOpen.value = false; return }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault(); searchOpen.value = true
    if (suggestions.value.length) activeIndex.value = (activeIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.value.length) % suggestions.value.length
  } else if (event.key === 'Enter' && searchOpen.value && activeIndex.value >= 0) {
    event.preventDefault()
    const stock = suggestions.value[activeIndex.value]
    if (stock) selectStock(stock)
  }
}
const totalShares = computed(() => Number(lots.value) * 1000 + Number(shares.value))
async function submit() {
  error.value = ''; success.value = ''; saving.value = true
  try {
    const lotCount = Number(lots.value), shareCount = Number(shares.value)
    if (!Number.isSafeInteger(lotCount) || lotCount < 0) throw new Error('張數必須為 0 或正整數。')
    if (!Number.isFinite(shareCount) || shareCount < 0) throw new Error('股數必須為 0 或正數。')
    const input = symbol.value.trim()
    let code = input
    if (!/^[A-Z0-9]{4,10}$/i.test(input)) {
      const matches = stocks.value.filter(s => s.name === input)
      if (matches.length !== 1) throw new Error('請從搜尋結果選擇股票，或輸入完整股票代碼。')
      code = matches[0]!.symbol
    }
    await add(code, totalShares.value)
    success.value = '已加入持股；相同股票的股數會累加。'; symbol.value = ''; shares.value = ''; lots.value = ''
  }
  catch (e) { error.value = e instanceof Error ? e.message : '新增失敗。' }
  finally { saving.value = false }
}
</script>
<template>
  <section class="panel add-panel"><div class="panel-heading"><h2>新增持股</h2><span class="subtle">僅支援 TWSE 上市證券</span></div>
    <form class="add-form" @submit.prevent="submit">
      <UFormField label="股票代碼或名稱" name="symbol" required :help="selectedName" @focusout="searchOpen = false">
        <div class="stock-search">
        <UInput v-model="symbol" placeholder="例如 2330、台積電" size="lg" class="w-full" maxlength="40" autocomplete="off" role="combobox" aria-label="股票代碼或名稱" aria-autocomplete="list" aria-controls="stock-suggestions" :aria-expanded="searchOpen && !!symbol.trim()" :aria-activedescendant="activeIndex >= 0 ? `stock-option-${activeIndex}` : undefined" @focus="searchOpen = true" @update:model-value="searchOpen = true" @keydown="searchKey" />
        <div v-if="searchOpen && symbol.trim()" class="stock-suggestions">
          <ul id="stock-suggestions" role="listbox" aria-label="股票搜尋結果">
            <li v-for="(stock, index) in suggestions" :id="`stock-option-${index}`" :key="stock.symbol" role="option" :aria-selected="index === activeIndex" :class="{ active: index === activeIndex }" @mousedown.prevent @click="selectStock(stock)">{{ stock.symbol }} {{ stock.name }}</li>
          </ul>
          <p v-if="!suggestions.length">{{ catalogLoading ? '載入股票清單中…' : '查無符合結果，可直接輸入股票代碼。' }}</p>
          <p v-if="suggestions.length === 20">最多顯示 20 筆，請輸入更多文字縮小範圍。</p>
        </div>
        </div>
      </UFormField>
      <UFormField label="整張張數" name="lots" help="1 張 = 1,000 股，可留空"><UInput v-model="lots" type="number" min="0" step="1" placeholder="例如 2" size="lg" class="w-full" aria-label="整張張數" /></UFormField>
      <UFormField label="股數" name="shares" help="可單獨輸入，或加上整張以外的股數"><UInput v-model="shares" type="number" min="0" step="any" placeholder="例如 100" size="lg" class="w-full" aria-label="股數" /></UFormField>
      <UButton type="submit" size="lg" :loading="saving" :disabled="loading" class="add-button">新增持股</UButton>
    </form>
    <p v-if="catalogWarning" role="status" class="form-notice">{{ catalogWarning }}</p>
    <p class="form-notice">張數與股數會合併儲存為股數。<span v-if="Number.isFinite(totalShares) && totalShares > 0">合計 {{ totalShares.toLocaleString('zh-TW') }} 股。</span>新增時會向 Fugle 驗證股票代碼並取得成交行情。</p>
    <p v-if="error" role="alert" class="form-error">{{ error }}</p><p v-if="success" role="status" class="form-success">{{ success }}</p>
  </section>
</template>
