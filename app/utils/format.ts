export const money = (value: number | null, maximumFractionDigits = 2) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("zh-TW", { maximumFractionDigits }).format(
        value,
      );
export const signedMoney = (value: number | null, maximumFractionDigits = 2) =>
  value === null
    ? "—"
    : `${value > 0 ? "+" : value < 0 ? "−" : ""}NT$ ${money(Math.abs(value), maximumFractionDigits)}`;
export const percentage = (value: number | null) =>
  value === null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
export const direction = (value: number | null) =>
  value === null || value === 0 ? "" : value > 0 ? "gain" : "loss";
export const quoteTime = (value?: string | null) =>
  !value
    ? "成交時間未提供"
    : new Intl.DateTimeFormat("zh-TW", {
        timeZone: "Asia/Taipei",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(value));

export const averagePrice = (value?: number) => value === undefined ? "尚未設定均價" : new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 4 }).format(value);
