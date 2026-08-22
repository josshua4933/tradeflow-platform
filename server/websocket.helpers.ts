export function getKlineSubscriptionErrorMessage(streamConnected: boolean): string {
  return streamConnected
    ? "This symbol is not available on Binance spot markets."
    : "Live Binance candle stream is temporarily unavailable. Retry in a moment.";
}
