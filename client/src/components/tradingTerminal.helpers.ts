export function formatPrice(value: number, symbol?: string): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const decimals = symbol?.includes("JPY") ? 3 : value >= 100 ? 2 : value >= 1 ? 4 : 5;
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatMoney(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount)
    ? `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";
}

export function filterTerminalSymbols(symbols: string[], query: string): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  return normalizedQuery ? symbols.filter((symbol) => symbol.toLowerCase().includes(normalizedQuery)) : symbols;
}

export function getQuoteSides(price: number, spread: number): { bid: number; ask: number } {
  if (!Number.isFinite(price) || price <= 0) return { bid: 0, ask: 0 };
  const safeSpread = Number.isFinite(spread) && spread > 0 ? spread : 0;
  return { bid: price - safeSpread / 2, ask: price + safeSpread / 2 };
}
