import {
  DEFAULT_CONFIG,
  DEFAULT_EXPORT,
  DEFAULT_FIELDS,
  type ContentType,
  type ExportSettings,
  type QRConfig,
} from "./types";

const KEY = "qr-studio:v1";
export const THEME_KEY = "qr-studio:theme";

export type SavedState = { config: QRConfig; exportSettings: ExportSettings };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Lay saved values over the defaults so settings added later still get a value. */
function mergeConfig(saved: unknown): QRConfig {
  if (!isObject(saved)) return DEFAULT_CONFIG;
  const merged: Record<string, unknown> = { ...DEFAULT_CONFIG };

  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof QRConfig)[]) {
    const fallback = DEFAULT_CONFIG[key];
    const value = saved[key];
    if (value === undefined) continue;
    merged[key] = isObject(fallback) && isObject(value) ? { ...fallback, ...value } : value;
  }

  const savedFields = isObject(saved.fields) ? saved.fields : {};
  const fields = {} as QRConfig["fields"];
  for (const type of Object.keys(DEFAULT_FIELDS) as ContentType[]) {
    const value = savedFields[type];
    fields[type] = { ...DEFAULT_FIELDS[type], ...(isObject(value) ? (value as Record<string, string>) : {}) };
  }
  merged.fields = fields;
  const logo = merged.logo as QRConfig["logo"];
  merged.logo = { ...logo, size: Math.min(Math.max(logo.size, 0.15), 0.6) };
  if (!(merged.contentType as string in DEFAULT_FIELDS)) merged.contentType = DEFAULT_CONFIG.contentType;

  return merged as QRConfig;
}

export function loadState(): SavedState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { config: DEFAULT_CONFIG, exportSettings: DEFAULT_EXPORT };
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) throw new Error("Unexpected saved state");
    return {
      config: mergeConfig(parsed.config),
      exportSettings: { ...DEFAULT_EXPORT, ...(isObject(parsed.exportSettings) ? parsed.exportSettings : {}) },
    };
  } catch {
    return { config: DEFAULT_CONFIG, exportSettings: DEFAULT_EXPORT };
  }
}

export function saveState(state: SavedState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Most likely the logo pushed us over the storage quota: keep everything else.
    try {
      const config = { ...state.config, logo: { ...state.config.logo, src: null } };
      window.localStorage.setItem(KEY, JSON.stringify({ ...state, config }));
    } catch {
      // Storage is unavailable (private window, blocked): the app still works.
    }
  }
}
