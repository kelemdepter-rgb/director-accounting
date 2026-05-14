import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import ug from './ug.json';

const SUPPORTED_LANGS = ['en', 'ug'] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

function detectInitialLanguage(): SupportedLang {
  const deviceLang = Localization.getLocales()[0]?.languageCode;
  if (deviceLang && (SUPPORTED_LANGS as readonly string[]).includes(deviceLang)) {
    return deviceLang as SupportedLang;
  }
  return 'en';
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ug: { translation: ug },
    },
    lng: detectInitialLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
    returnNull: false,
  });
}

export { SUPPORTED_LANGS };
export type { SupportedLang };
export default i18n;
