<script setup lang="ts">
import type { Holding } from "~/types/portfolio";
import { money } from "~/utils/format";
const props = defineProps<{ holding: Holding; name: string }>();
const { update, remove } = usePortfolio();
const editing = ref(false),
  removing = ref(false),
  draft = ref(""),
  lots = ref(""),
  error = ref("");
const totalShares = computed(
  () => Number(lots.value) * 1000 + Number(draft.value),
);
async function save() {
  try {
    const lotCount = Number(lots.value),
      shareCount = Number(draft.value);
    if (!Number.isSafeInteger(lotCount) || lotCount < 0)
      throw new Error("張數必須為 0 或正整數。");
    if (!Number.isFinite(shareCount) || shareCount < 0)
      throw new Error("股數必須為 0 或正數。");
    await update(props.holding.symbol, totalShares.value);
    editing.value = false;
    error.value = "";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "更新失敗。";
  }
}
function startEdit() {
  const wholeLots = Math.floor(props.holding.shares / 1000);
  lots.value = String(wholeLots);
  draft.value = String(props.holding.shares - wholeLots * 1000);
  error.value = "";
  editing.value = true;
  removing.value = false;
}
</script>
<template>
  <div class="holding-editor">
    <div class="stock-identity">
      <span class="stock-code">{{ holding.symbol }}</span>
      <div>
        <strong>{{ name }}</strong
        ><small>上市證券</small>
      </div>
    </div>
    <form v-if="editing" class="edit-controls" @submit.prevent="save">
      <UFormField label="張數"
        ><UInput
          v-model="lots"
          type="number"
          min="0"
          step="1"
          :aria-label="`${holding.symbol} 張數`"
          class="share-input"
      /></UFormField>
      <UFormField label="股數"
        ><UInput
          v-model="draft"
          type="number"
          min="0"
          step="any"
          :aria-label="`${holding.symbol} 股數`"
          class="share-input"
      /></UFormField>
      <span
        class="subtle"
        v-if="Number.isFinite(totalShares) && totalShares > 0"
        >合計 {{ money(totalShares) }} 股</span
      >
      <UButton type="submit">儲存</UButton
      ><UButton color="neutral" variant="ghost" @click="editing = false"
        >取消</UButton
      >
      <p v-if="error" role="alert" class="form-error">{{ error }}</p>
    </form>
    <div v-else-if="removing" class="edit-controls">
      <span>確定移除 {{ holding.symbol }}？</span
      ><UButton color="error" @click="remove(holding.symbol)">確認移除</UButton
      ><UButton color="neutral" variant="ghost" @click="removing = false"
        >取消</UButton
      >
    </div>
    <div v-else class="edit-controls">
      <span class="share-count"
        >{{ money(holding.shares) }} <span class="subtle">股</span></span
      ><UButton
        color="neutral"
        variant="outline"
        :aria-label="`修改 ${holding.symbol} 股數`"
        @click="startEdit"
        >修改股數</UButton
      ><UButton
        color="neutral"
        variant="ghost"
        :aria-label="`移除 ${holding.symbol}`"
        @click="removing = true"
        >移除</UButton
      >
    </div>
  </div>
</template>
