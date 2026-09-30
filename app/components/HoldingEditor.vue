<script setup lang="ts">
import type { Holding } from '~/types/portfolio'
import { money } from '~/utils/format'
const props = defineProps<{ holding: Holding; name: string }>()
const { update, remove } = usePortfolio()
const editing = ref(false), removing = ref(false), draft = ref(String(props.holding.shares)), error = ref('')
async function save() {
  try { await update(props.holding.symbol, Number(draft.value)); editing.value = false; error.value = '' }
  catch (e) { error.value = e instanceof Error ? e.message : '更新失敗。' }
}
function startEdit() { draft.value = String(props.holding.shares); error.value = ''; editing.value = true; removing.value = false }
</script>
<template>
  <div class="holding-editor">
    <div class="stock-identity"><span class="stock-code">{{ holding.symbol }}</span><div><strong>{{ name }}</strong><small>上市證券</small></div></div>
    <form v-if="editing" class="edit-controls" @submit.prevent="save"><UInput v-model="draft" type="number" step="any" :aria-label="`${holding.symbol} 持有股數`" class="share-input" /><span class="subtle">股</span><UButton type="submit">儲存</UButton><UButton color="neutral" variant="ghost" @click="editing = false">取消</UButton><p v-if="error" role="alert" class="form-error">{{ error }}</p></form>
    <div v-else-if="removing" class="edit-controls"><span>確定移除 {{ holding.symbol }}？</span><UButton color="error" @click="remove(holding.symbol)">確認移除</UButton><UButton color="neutral" variant="ghost" @click="removing = false">取消</UButton></div>
    <div v-else class="edit-controls"><span class="share-count">{{ money(holding.shares) }} <span class="subtle">股</span></span><UButton color="neutral" variant="outline" :aria-label="`修改 ${holding.symbol} 股數`" @click="startEdit">修改股數</UButton><UButton color="neutral" variant="ghost" :aria-label="`移除 ${holding.symbol}`" @click="removing = true">移除</UButton></div>
  </div>
</template>
