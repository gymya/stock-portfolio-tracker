import { sheetIdFromInput, sheetTransactionsToHoldings } from "../../../app/services/portfolio/sheetTransactions.ts";
import { requireGoogleOrigin, requireGoogleSession } from "../../utils/googleSession.ts";

export default defineEventHandler(async event => {
  requireGoogleOrigin(event);
  const session = await requireGoogleSession(event);
  const body = await readBody(event);
  let id: string;
  try {
    id = sheetIdFromInput(body?.spreadsheet);
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: "Invalid spreadsheet", data: { message: (error as Error).message } });
  }
  let values: unknown;
  try {
    const range = "'交易紀錄'!A1:E10022";
    const result = await $fetch<{ values?: unknown }>(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}`, {
      headers: { Authorization: `Bearer ${session.data.accessToken}` },
      query: { valueRenderOption: "FORMATTED_VALUE" }, timeout: 15000, retry: 0,
    });
    values = result.values;
  } catch (error) {
    const upstream = error as { statusCode?: number; data?: { error?: { message?: unknown } } };
    const status = upstream.statusCode;
    const reason = typeof upstream.data?.error?.message === "string" ? upstream.data.error.message : "";
    if (status === 401) await session.clear();
    const message = status === 401 ? "Google 連線已失效，請重新連接。"
      : status === 403 ? "沒有讀取權限，請確認登入帳號、試算表分享權限與 Google Sheets API 設定。"
      : status === 404 ? "找不到試算表，或目前帳號無權存取。"
      : status === 400 && /not supported for this document/i.test(reason)
        ? "Google Sheets API 不支援此檔案格式。若為 Excel（.xlsx／.xlsm），請在 Google 試算表選「檔案 → 另存為 Google 試算表」，再貼上新檔案的連結同步。"
      : status === 400 && /unable to parse range/i.test(reason)
        ? "找不到固定的「交易紀錄」工作表，請確認試算表包含此分頁。"
      : status === 400 ? "Google 無法讀取此檔案或範圍。請確認檔案已轉為 Google 試算表，且包含「交易紀錄」分頁。"
      : "Google 試算表暫時無法讀取，請稍後重試。";
    throw createError({ statusCode: status && [400, 401, 403, 404, 429].includes(status) ? status : 502,
      statusMessage: "Google Sheets unavailable", data: { message } });
  }
  try {
    return { accountId: session.data.accountId!, holdings: sheetTransactionsToHoldings(values), syncedAt: Date.now() };
  } catch (error) {
    throw createError({ statusCode: 422, statusMessage: "Invalid transactions", data: { message: (error as Error).message } });
  }
});
