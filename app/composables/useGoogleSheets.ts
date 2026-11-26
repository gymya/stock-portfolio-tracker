import type { Holding } from "~/types/portfolio";

type Account = { id: string; email: string; expiresAt: number };
const headers = { "X-Portfolio-Request": "1" };

export function useGoogleSheets() {
  const { sheetHoldings, source } = usePortfolioSource();
  const account = useState<Account | null>("google-account", () => null);
  const configured = useState("google-configured", () => true);
  const checking = useState("google-checking", () => 0);
  const busy = useState("google-busy", () => false);
  const error = useState("google-error", () => "");
  const spreadsheet = useState("google-spreadsheet", () => "");
  const syncedAt = useState<number | null>("google-synced-at", () => null);
  const revision = useState("google-revision", () => 0);

  function clearData() {
    revision.value++;
    sheetHoldings.value = [];
    spreadsheet.value = "";
    syncedAt.value = null;
  }
  function forgetAccount() {
    clearData();
    account.value = null;
  }
  function announceChange() {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("portfolio-google-account");
      channel.postMessage("changed");
      channel.close();
    }
  }
  async function checkAccount() {
    const version = revision.value;
    checking.value++;
    try {
    const result = await $fetch<{ configured: boolean; account: Account | null }>("/api/auth/google/status");
    if (version !== revision.value) return;
    configured.value = result.configured;
    if (account.value && !result.account) error.value = "Google 連線已到期，請重新連接並同步。";
    if (account.value?.id !== result.account?.id) clearData();
    account.value = result.account;
    } finally { checking.value--; }
  }
  async function connect() {
    busy.value = true;
    error.value = "";
    forgetAccount();
    announceChange();
    try {
      const { url } = await $fetch<{ url: string }>("/api/auth/google/start", { method: "POST", headers });
      window.location.assign(url);
    } catch {
      error.value = "無法開始 Google 授權，請確認 OAuth 設定後重試。";
      busy.value = false;
    }
  }
  async function logout() {
    busy.value = true;
    error.value = "";
    forgetAccount();
    announceChange();
    try {
      await $fetch("/api/auth/google/logout", { method: "POST", headers });
      announceChange();
    } catch {
      error.value = "畫面資料已清除，但登出請求失敗，請重試登出。";
    } finally { busy.value = false; }
  }
  async function sync() {
    if (busy.value) return;
    busy.value = true;
    error.value = "";
    const requestedSpreadsheet = spreadsheet.value;
    const version = revision.value;
    try {
      await checkAccount();
      if (!account.value) throw new Error("請先連接 Google 帳號。");
      if (version !== revision.value) {
        error.value = "Google 帳號已變更，請重新輸入該帳號的試算表並同步。";
        return;
      }
      const accountId = account.value.id;
      const result = await $fetch<{ accountId: string; holdings: Holding[]; syncedAt: number }>("/api/google/holdings", {
        method: "POST", headers, body: { spreadsheet: requestedSpreadsheet },
      });
      await checkAccount();
      if (version !== revision.value || account.value?.id !== accountId || result.accountId !== accountId) return;
      sheetHoldings.value = result.holdings;
      syncedAt.value = result.syncedAt;
    } catch (cause) {
      const e = cause as { statusCode?: number; data?: { data?: { message?: string } }; message?: string };
      if (e.statusCode === 401) forgetAccount();
      error.value = e.data?.data?.message ?? (e.statusCode ? "同步失敗，請確認網路與 Google 連線後重試。" : "同步失敗，請確認已連接 Google 帳號及網路。" );
    } finally { busy.value = false; }
  }
  return { source, account, configured, checking, busy, error, spreadsheet, syncedAt,
    checkAccount, connect, logout, sync, forgetAccount, announceChange };
}
