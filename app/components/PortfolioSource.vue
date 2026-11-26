<script setup lang="ts">
const { source, account, configured, checking, busy, error, spreadsheet, syncedAt,
  checkAccount, connect, logout, sync, forgetAccount, announceChange } = useGoogleSheets();
const route = useRoute();
const router = useRouter();
let channel: BroadcastChannel | undefined;
let receivedOAuth = false;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
async function verifyAccount() {
  try { await checkAccount(); }
  catch { error.value = "無法確認 Google 連線，請檢查網路後重試。"; }
}
function onVisibility() {
  if (document.visibilityState === "visible") void verifyAccount();
}
watch(() => account.value?.expiresAt, expires => {
  clearTimeout(expiryTimer);
  if (expires) expiryTimer = setTimeout(() => {
    forgetAccount();
    error.value = "Google 連線已到期，請重新連接並同步。";
  }, Math.max(0, expires - Date.now()));
});
onMounted(async () => {
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel("portfolio-google-account");
    channel.onmessage = () => { forgetAccount(); error.value = "Google 帳號已在其他分頁變更，請重新確認連線並同步。"; };
  }
  window.addEventListener("focus", verifyAccount);
  document.addEventListener("visibilitychange", onVisibility);
  if (!receivedOAuth && !route.query.google) {
    try {
      const saved = localStorage.getItem("portfolio-source-preference");
      if (saved === "manual" || saved === "google") source.value = saved;
    } catch { /* Source selection still works when storage is unavailable. */ }
  }
  await verifyAccount();
});
watch(source, value => {
  try { localStorage.setItem("portfolio-source-preference", value); } catch { /* Optional preference only. */ }
});
watch(() => route.query.google, async result => {
  if (import.meta.client && result) {
    receivedOAuth = true;
    source.value = "google";
    forgetAccount();
    announceChange();
    if (result !== "connected") error.value = result === "denied" ? "Google 授權已取消，請重新連接。" : "Google 授權未完成或已過期，請重新連接。";
    const query = { ...route.query };
    delete query.google;
    await router.replace({ path: '/holdings', query });
    await verifyAccount();
  }
}, { immediate: true });
onBeforeUnmount(() => {
  channel?.close();
  clearTimeout(expiryTimer);
  window.removeEventListener("focus", verifyAccount);
  document.removeEventListener("visibilitychange", onVisibility);
});
</script>

<template>
  <section v-show="route.path.replace(/\/$/, '') === '/holdings'" class="panel mb-6" aria-labelledby="source-title">
    <div class="panel-heading flex-wrap gap-3">
      <h2 id="source-title">持股資料來源</h2>
      <div class="flex flex-wrap gap-2" role="group" aria-label="選擇持股資料來源">
        <UButton class="min-h-11" :variant="source === 'manual' ? 'solid' : 'outline'" :aria-pressed="source === 'manual'" @click="source = 'manual'">手動持股</UButton>
        <UButton class="min-h-11" :variant="source === 'google' ? 'solid' : 'outline'" :aria-pressed="source === 'google'" @click="source = 'google'">Google Sheets</UButton>
      </div>
    </div>
    <div class="px-5 py-5 space-y-4">
      <p class="text-sm text-muted">{{ source === 'manual' ? '只計算此瀏覽器的手動持股；Google Sheets 資料不列入。' : '依試算表計算持股與成本；手動持股不列入，股價由 Fugle 提供。' }}</p>
      <template v-if="source === 'google'">
        <UAlert v-if="!configured" color="warning" variant="soft" :ui="{ title: 'text-highlighted', description: 'text-default' }" title="尚未設定 Google OAuth" description="請設定伺服器的 Google 用戶端 ID 與密鑰，並重新部署。" />
        <p v-if="checking" role="status">正在確認 Google 連線…</p>
        <div class="flex flex-wrap items-center gap-3">
          <span v-if="account" class="text-sm break-all">已連接：{{ account.email }}</span>
          <UButton class="min-h-11" :disabled="busy || checking > 0 || !configured" :variant="account ? 'outline' : 'solid'" @click="connect">{{ account ? '切換 Google 帳號' : '連接 Google 試算表' }}</UButton>
          <UButton v-if="account || error" class="min-h-11" color="neutral" variant="outline" :disabled="busy || checking > 0 || !configured" @click="logout">中斷連線</UButton>
        </div>
        <form v-if="account" class="grid gap-4" @submit.prevent="sync">
          <UFormField label="試算表連結或 ID" name="spreadsheet" required help="固定讀取「交易紀錄」分頁，私人試算表不需公開。">
            <UInput v-model="spreadsheet" class="w-full" size="lg" required :disabled="busy" maxlength="2048" aria-label="試算表連結或 ID" placeholder="https://docs.google.com/spreadsheets/d/…" />
          </UFormField>
          <UButton type="submit" class="min-h-11 w-fit" :loading="busy">同步持股</UButton>
        </form>
        <UAlert v-if="error" color="warning" variant="soft" :ui="{ title: 'text-highlighted', description: 'text-default' }" title="Google Sheets 提醒" :description="error + (syncedAt ? ' 目前仍顯示上次成功同步的持股。' : '')" role="alert" />
        <p v-if="syncedAt" class="text-sm" role="status">已同步「交易紀錄」· {{ new Date(syncedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) }}（臺北時間）</p>
        <details>
          <summary class="cursor-pointer py-3">試算表怎麼準備？</summary>
          <ul class="list-disc space-y-2 pl-5 text-sm text-muted">
            <li>分頁用「交易紀錄」，前五欄為交易日期、股票代號、交易類型、股數、成交單價（元）。</li>
            <li>交易填「買進」或「賣出」，數量以股計。</li>
            <li>期初持股填買進，日期可留白。</li>
          </ul>
        </details>
        <p class="text-sm text-muted">重新整理後需再次同步；Google 連線最長一小時。</p>
      </template>
    </div>
  </section>
</template>
