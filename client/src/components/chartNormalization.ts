export type RawCandle = {
  time: number | string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume?: number | string | null;
};

export type NormalizedCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export function normalizeHistoricalCandles(rawCandles: RawCandle[] | undefined | null): NormalizedCandle[] {
  if (!Array.isArray(rawCandles) || rawCandles.length === 0) return [];

  const parsed = rawCandles
    .map((c) => {
      const rawTime = Number(c.time);
      const time = Math.floor(rawTime > 1e12 ? rawTime / 1000 : rawTime);
      const open = Number(c.open);
      const high = Number(c.high);
      const low = Number(c.low);
      const close = Number(c.close);
      const volume = Number(c.volume ?? 0);
      return { time, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 };
    })
    .filter((c) => c.time > 0 && [c.open, c.high, c.low, c.close].every(Number.isFinite))
    .sort((a, b) => a.time - b.time);

  // Deduplicate timestamps, keeping the latest data point for any duplicate time
  const deduplicated: NormalizedCandle[] = [];
  for (const candle of parsed) {
    const last = deduplicated[deduplicated.length - 1];
    if (last && last.time === candle.time) {
      deduplicated[deduplicated.length - 1] = candle;
    } else {
      deduplicated.push(candle);
    }
  }

  return deduplicated;
}

export class LiveCandleGuard {
  private lastTime = 0;

  public reset(initialTime = 0) {
    this.lastTime = initialTime;
  }

  public accept(rawTime: number | string): boolean {
    const num = Number(rawTime);
    const time = Math.floor(num > 1e12 ? num / 1000 : num);
    if (!Number.isFinite(time) || time <= 0) return false;
    if (time < this.lastTime) return false;
    this.lastTime = time;
    return true;
  }
}
