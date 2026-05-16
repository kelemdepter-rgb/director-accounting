import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type Theme = 'system' | 'light' | 'dark';
export type Language = 'en' | 'tr' | 'ug';

const STORAGE_KEY = '@directorbook/settings/v2';

// Falls back to Turkish Lira because the primary audience for this app is
// Turkey-based small-business directors. Override at deploy time via the
// EXPO_PUBLIC_DEFAULT_CURRENCY env var when shipping to other markets.
const ENV_DEFAULT_CURRENCY = process.env.EXPO_PUBLIC_DEFAULT_CURRENCY?.trim() || 'TRY';

export interface PersistedSettings {
  theme: Theme;
  language: Language;
  defaultCurrency: string;
}

export interface SettingsState extends PersistedSettings {
  initialized: boolean;
  hydrate: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  setDefaultCurrency: (currency: string) => Promise<void>;
  reset: () => Promise<void>;
}

const DEFAULTS: PersistedSettings = {
  theme: 'system',
  language: 'en',
  defaultCurrency: ENV_DEFAULT_CURRENCY,
};

async function persistSnapshot(state: PersistedSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Swallow: settings will simply revert to defaults on next launch.
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  initialized: false,

  hydrate: async () => {
    if (get().initialized) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
        set({
          theme: parsed.theme ?? DEFAULTS.theme,
          language: parsed.language ?? DEFAULTS.language,
          defaultCurrency: parsed.defaultCurrency?.trim() || DEFAULTS.defaultCurrency,
          initialized: true,
        });
        return;
      }
    } catch {
      // Storage failed (e.g. private-mode browser) — fall through to defaults.
    }
    set({ initialized: true });
  },

  setTheme: async (theme) => {
    set({ theme });
    await persistSnapshot(snapshot(get()));
  },

  setLanguage: async (language) => {
    set({ language });
    await persistSnapshot(snapshot(get()));
  },

  setDefaultCurrency: async (currency) => {
    const trimmed = currency.trim().toUpperCase();
    if (trimmed.length !== 3) return;
    set({ defaultCurrency: trimmed });
    await persistSnapshot(snapshot(get()));
  },

  reset: async () => {
    set({ ...DEFAULTS, initialized: true });
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  },
}));

function snapshot(state: SettingsState): PersistedSettings {
  return {
    theme: state.theme,
    language: state.language,
    defaultCurrency: state.defaultCurrency,
  };
}
