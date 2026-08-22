export type IndicatorSettings = {
  showEma: boolean;
  emaPeriod: number;
  showSma: boolean;
  smaPeriod: number;
  showRsi: boolean;
  rsiPeriod: number;
  showVolume: boolean;
};

export type IndicatorPreset = IndicatorSettings & {
  id: string;
  name: string;
};

export const DEFAULT_INDICATOR_SETTINGS: IndicatorSettings = {
  showEma: false,
  emaPeriod: 20,
  showSma: false,
  smaPeriod: 50,
  showRsi: false,
  rsiPeriod: 14,
  showVolume: true,
};

const STORAGE_KEY = "tradeflow_indicator_presets_v1";
const MIN_PERIOD = 2;
const MAX_PERIOD = 200;

export function normalizeIndicatorSettings(input: Partial<IndicatorSettings> | null | undefined): IndicatorSettings {
  const source = input ?? {};
  const period = (value: unknown, fallback: number) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(MAX_PERIOD, Math.max(MIN_PERIOD, Math.round(numeric)));
  };

  return {
    showEma: Boolean(source.showEma),
    emaPeriod: period(source.emaPeriod, DEFAULT_INDICATOR_SETTINGS.emaPeriod),
    showSma: Boolean(source.showSma),
    smaPeriod: period(source.smaPeriod, DEFAULT_INDICATOR_SETTINGS.smaPeriod),
    showRsi: Boolean(source.showRsi),
    rsiPeriod: period(source.rsiPeriod, DEFAULT_INDICATOR_SETTINGS.rsiPeriod),
    showVolume: source.showVolume === undefined ? DEFAULT_INDICATOR_SETTINGS.showVolume : Boolean(source.showVolume),
  };
}

export function loadIndicatorPresets(): IndicatorPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((preset) => preset && typeof preset.name === "string")
      .map((preset) => ({
        id: typeof preset.id === "string" && preset.id ? preset.id : `preset-${Date.now()}-${Math.random()}`,
        name: preset.name.trim().slice(0, 40),
        ...normalizeIndicatorSettings(preset),
      }))
      .filter((preset) => preset.name.length > 0);
  } catch {
    return [];
  }
}

export function saveIndicatorPresets(presets: IndicatorPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Ignore storage restrictions while keeping the current session usable.
  }
}

export function createIndicatorPreset(name: string, settings: IndicatorSettings): IndicatorPreset | null {
  const trimmedName = name.trim().slice(0, 40);
  if (!trimmedName) return null;
  return {
    id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmedName,
    ...normalizeIndicatorSettings(settings),
  };
}

export function calculateEma(values: number[], period: number): number[] {
  if (!values.length) return [];
  const safePeriod = Math.min(MAX_PERIOD, Math.max(MIN_PERIOD, Math.round(period)));
  const multiplier = 2 / (safePeriod + 1);
  let previous = values[0];
  return values.map((value, index) => {
    if (index === 0) return previous;
    previous = (value - previous) * multiplier + previous;
    return previous;
  });
}

export function calculateSma(values: number[], period: number): number[] {
  if (!values.length) return [];
  const safePeriod = Math.min(MAX_PERIOD, Math.max(MIN_PERIOD, Math.round(period)));
  return values.map((_, index) => {
    const start = Math.max(0, index - safePeriod + 1);
    const window = values.slice(start, index + 1);
    return window.reduce((sum, value) => sum + value, 0) / window.length;
  });
}

export function calculateRsi(values: number[], period: number): number[] {
  if (!values.length) return [];
  const safePeriod = Math.min(MAX_PERIOD, Math.max(MIN_PERIOD, Math.round(period)));
  return values.map((_, index) => {
    if (index === 0) return 50;
    const start = Math.max(1, index - safePeriod + 1);
    let gains = 0;
    let losses = 0;
    for (let cursor = start; cursor <= index; cursor += 1) {
      const change = values[cursor] - values[cursor - 1];
      if (change >= 0) gains += change;
      else losses += Math.abs(change);
    }
    if (losses === 0) return gains === 0 ? 50 : 100;
    const relativeStrength = gains / losses;
    return 100 - 100 / (1 + relativeStrength);
  });
}
