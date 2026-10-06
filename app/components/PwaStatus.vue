<script setup lang="ts">
const { $pwa } = useNuxtApp();
const offline = ref(false);
function updateConnection() {
  offline.value = !navigator.onLine;
}
onMounted(() => {
  updateConnection();
  window.addEventListener("online", updateConnection);
  window.addEventListener("offline", updateConnection);
});
onBeforeUnmount(() => {
  window.removeEventListener("online", updateConnection);
  window.removeEventListener("offline", updateConnection);
});
</script>
<template>
  <div
    v-if="
      offline ||
      $pwa?.needRefresh ||
      $pwa?.showInstallPrompt ||
      $pwa?.registrationError
    "
    class="mb-6 space-y-3"
  >
    <UAlert
      v-if="offline"
      color="warning"
      variant="soft"
      title="目前處於離線狀態"
      description="仍可查看與修改已儲存持股。行情需連線取得；已載入的價格不會自動更新。"
    />
    <UAlert
      v-if="$pwa?.registrationError"
      color="warning"
      variant="soft"
      title="離線功能尚未就緒"
      description="離線資源下載失敗，請確認連線後重新整理。"
    />
    <div
      v-if="$pwa?.needRefresh"
      class="flex flex-wrap items-center gap-3 rounded-lg border border-default bg-white p-4"
      role="status"
    >
      <p>有新版本可用，請先完成目前的輸入。</p>
      <UButton class="ml-auto" @click="$pwa.updateServiceWorker(true)">更新並重新載入</UButton>
    </div>
    <UButton
      v-if="$pwa?.showInstallPrompt"
      class="flex w-fit ml-auto"
      color="primary"
      variant="outline"
      @click="$pwa.install()"
      >安裝台股手帳</UButton
    >
  </div>
</template>
