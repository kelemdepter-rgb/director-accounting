import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import tr from './tr.json';
import ug from './ug.json';

const SUPPORTED_LANGS = ['en', 'tr', 'ug'] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

function detectInitialLanguage(): SupportedLang {
  const deviceLang = Localization.getLocales()[0]?.languageCode;
  if (deviceLang && (SUPPORTED_LANGS as readonly string[]).includes(deviceLang)) {
    return deviceLang as SupportedLang;
  }
  return 'en';
}

if (!i18n.isInitialized) {
  // eslint-disable-next-line import/no-named-as-default-member -- i18next exposes .use as an instance method
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
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
