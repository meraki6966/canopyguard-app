import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import translationEN from "./locales/en.json";

// English-only. LanguageDetector was removed so i18n initializes cleanly under
// SSR/prerender (it touched navigator/localStorage, which do not exist in Node).
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: translationEN },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
