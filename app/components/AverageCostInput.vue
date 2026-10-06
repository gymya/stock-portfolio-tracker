<script setup lang="ts">
import { adjacentPrice, priceTick } from '~/services/stock/priceTick';
const props = defineProps<{ symbol: string; label: string; required?: boolean }>();
const model = defineModel<string>({ required: true });
const code = computed(() => props.symbol.trim().toUpperCase());
const tick = computed(() => priceTick(code.value, Number(model.value)));
function next(direction: 1 | -1) { return adjacentPrice(code.value, Number(model.value), direction); }
function adjust(direction: 1 | -1) {
  const value = next(direction);
  if (value !== null) model.value = String(value);
}
</script>
<template>
  <UFormField :label="label" :required="required" class="average-cost-field">
    <div class="price-input-controls">
      <UInput :model-value="model" @update:model-value="model = String($event)" type="number" min="0" step="any" :required="required" :aria-label="label" placeholder="例如 100.25" class="w-full" />
      <UButton type="button" color="neutral" variant="outline" :disabled="next(-1) === null" :aria-label="`${label}減一檔`" @click="adjust(-1)">−</UButton>
      <UButton type="button" color="neutral" variant="outline" :disabled="next(1) === null" :aria-label="`${label}加一檔`" @click="adjust(1)">＋</UButton>
    </div>
    <p class="price-help">{{ tick === null ? '均價可輸入小數，不強制對齊成交價。' : `此價位成交升降單位 NT$ ${tick}；± 可調至相鄰成交價，均價不受限制。` }}</p>
  </UFormField>
</template>
