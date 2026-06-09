import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en";
import fr from "./locales/fr";
import ar from "./locales/ar";
import es from "./locales/es";
import dr from "./locales/dr";

export const LANGS = [
  { code: "en", label: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "fr", label: "Français", flag: "🇫🇷", dir: "ltr" },
  { code: "es", label: "Español", flag: "🇪🇸", dir: "ltr" },
  { code: "ar", label: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "dr", label: "الدارجة", flag: "🇲🇦", dir: "rtl" },
] as const;

export type LangCode = (typeof LANGS)[number]["code"];

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        fr: { translation: fr },
        ar: { translation: ar },
        es: { translation: es },
        dr: { translation: dr },
      },
      fallbackLng: "en",
      supportedLngs: ["en", "fr", "ar", "es", "dr"],
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "blood-moon-lang",
      },
      interpolation: { escapeValue: false },
    });
}

export function setLanguage(code: LangCode) {
  i18n.changeLanguage(code);
  const lang = LANGS.find((l) => l.code === code);
  if (typeof document !== "undefined") {
    document.documentElement.lang = code;
    document.documentElement.dir = lang?.dir ?? "ltr";
  }
}

export function applyDirFromCurrent() {
  if (typeof document === "undefined") return;
  const code = (i18n.language || "en").slice(0, 2) as LangCode;
  const lang = LANGS.find((l) => l.code === code) ?? LANGS[0];
  document.documentElement.lang = lang.code;
  document.documentElement.dir = lang.dir;
}

export default i18n;
