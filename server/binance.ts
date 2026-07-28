import axios from "axios";

const BINANCE_API_BASE = "https://api.binance.com/api/v3";

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
const SYMBOL_MAP: Record<string, string> = {
  "EURUSD": "EURUSDT",
  "BTCUSD": "BTCUSDT",
  "ETHUSD": "ETHUSDT",
  "XAUUSD": "XAUUSDT",
  "GBPUSD": "GBPUSDT",
  "USDJPY": "JPYUSDT",
  "XAGUSD": "XAGUUSDT",
  "US500": "SPYUSDT",
};

/**
 * Fetch current price and 24h stats from Binance for a symbol
 */
export async function getBinancePrice(symbol: string): Promise<MarketPrice | null> {
  try {
    const binanceSymbol = SYMBOL_MAP[symbol] || symbol;
    
    const response = await axios.get(`${BINANCE_API_BASE}/ticker/24hr`, {
      params: { symbol: binanceSymbol },
      timeout: 5000,
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
