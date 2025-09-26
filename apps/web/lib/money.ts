const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency: string = "THB", locale: string = "th-TH") {
  const key = `${locale}-${currency}`;
  if (!formatters.has(key)) {
    formatters.set(
      key,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "symbol",
        minimumFractionDigits: 2
      })
    );
  }
  return formatters.get(key)!.format(amount);
}
