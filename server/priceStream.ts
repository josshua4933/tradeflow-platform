import { getWebSocket, broadcastPriceUpdate } from "./websocket";
import { getCachedPrices } from "./binance";

interface PriceStreamConfig {
  symbols: string[];
  interval: number; // milliseconds
}

let streamInterval: NodeJS.Timeout | null = null;
let isStreaming = false;

/**
 * Start streaming prices for specific symbols
 */
export async function startPriceStream(config: PriceStreamConfig) {
  if (isStreaming) {
    console.warn("[PriceStream] Stream already running");
    return;
  }

  isStreaming = true;
  const io = getWebSocket();

  if (!io) {
    console.error("[PriceStream] WebSocket not initialized");
    isStreaming = false;
    return;
  }

  console.log(`[PriceStream] Starting stream for: ${config.symbols.join(", ")}`);

  streamInterval = setInterval(async () => {
    try {
      const prices = await getCachedPrices(config.symbols);

      prices.forEach((price) => {
        broadcastPriceUpdate(price.symbol, price);
      });
    } catch (error) {
      console.error("[PriceStream] Error fetching prices:", error);
    }
  }, config.interval);
}

/**
 * Stop price streaming
 */
export function stopPriceStream() {
  if (streamInterval) {
    clearInterval(streamInterval);
    streamInterval = null;
    isStreaming = false;
    console.log("[PriceStream] Stream stopped");
  }
}

/**
 * Check if streaming is active
 */
export function isStreamingActive(): boolean {
  return isStreaming;
}

/**
 * Get current streaming status
 */
export function getStreamStatus() {
  return {
    isStreaming,
    interval: streamInterval ? "active" : "inactive",
  };
}
