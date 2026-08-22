import axios from "axios";
import { BINANCE_HTTPS_AGENT } from "./binanceTransport";

// Market-data-only endpoint avoids Binance account/API restrictions while preserving public prices.
const BINANCE_API_BASE = "https://data-api.binance.vision/api/v3";

export interface MarketPrice {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

// Map trading symbols to Binance symbols
export const SYMBOL_MAP: Record<string, string> = {
  "BTCUSD": "BTCUSDT",
  "ETHUSD": "ETHUSDT",
  "BNBUSD": "BNBUSDT",
  "XRPUSD": "XRPUSDT",
  "ADAUSD": "ADAUSDT",
  "SOLUSD": "SOLUSDT",
  "DOGEUSD": "DOGEUSDT",
  "AVAXUSD": "AVAXUSDT",
  "LINKUSD": "LINKUSDT",
  "DOTUSD": "DOTUSDT",
  "LTCUSD": "LTCUSDT",
  "BCHUSD": "BCHUSDT",
  "TRXUSD": "TRXUSDT",
  "UNIUSD": "UNIUSDT",
  "AAVEUSD": "AAVEUSDT",
};

/**
 * Fetch current price and 24h stats from Binance for a symbol
 */
export async function getBinancePrice(symbol: string): Promise<MarketPrice | null> {
  try {
    const normalized = symbol.toUpperCase();
    const binanceSymbol = SYMBOL_MAP[normalized] ?? (/^[A-Z0-9]+USDT$/.test(normalized) ? normalized : null);
    if (!binanceSymbol) return null;
    
    const response = await axios.get(`${BINANCE_API_BASE}/ticker/24hr`, {
      params: { symbol: binanceSymbol },
      timeout: 5000,
      httpsAgent: BINANCE_HTTPS_AGENT,
    });

    const data = response.data;
    
    return {
      symbol,
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChange),
      changePercent24h: parseFloat(data.priceChangePercent),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      volume24h: parseFloat(data.volume),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch multiple prices in parallel
 */
export async function getBinancePrices(symbols: string[]): Promise<MarketPrice[]> {
  const prices = await Promise.all(
    symbols.map((symbol) => getBinancePrice(symbol))
  );
  return prices.filter((p) => p !== null) as MarketPrice[];
}

/**
 * Get price for a single symbol with caching (simple in-memory cache)
 */
const priceCache = new Map<string, { price: MarketPrice; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

export async function getCachedPrice(symbol: string): Promise<MarketPrice | null> {
  const cached = priceCache.get(symbol);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  const price = await getBinancePrice(symbol);
  if (price) {
    priceCache.set(symbol, { price, timestamp: Date.now() });
  }
  return price;
}

/**
 * Get multiple cached prices
 */
export async function getCachedPrices(symbols: string[]): Promise<MarketPrice[]> {
  const prices = await Promise.all(
    symbols.map((symbol) => getCachedPrice(symbol))
  );
  return prices.filter((p) => p !== null) as MarketPrice[];
}
