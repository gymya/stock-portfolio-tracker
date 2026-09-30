/** Accept ROC YYYMMDD / YYY/MM/DD and Gregorian YYYYMMDD / YYYY-MM-DD. */
export function translateMarketDate(input: string): string {
  const value = input.trim()
  const parts = /^(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(value)
    ?? /^(\d{3,4})(\d{2})(\d{2})$/.exec(value)
  if (!parts) throw new Error('行情日期格式無效')
  const rawYear = Number(parts[1])
  const year = parts[1]!.length < 4 ? rawYear + 1911 : rawYear
  const month = Number(parts[2]), day = Number(parts[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (rawYear <= 0 || year < 1912 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('行情日期無效')
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
