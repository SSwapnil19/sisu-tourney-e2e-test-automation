import { createContext, useContext, useState, useMemo } from "react";
import en from "./en";
import fr from "./fr";

const DICTIONARIES = { en, fr };

const DEFAULT_LOCALE =
  import.meta.env.VITE_DEFAULT_LOCALE && DICTIONARIES[import.meta.env.VITE_DEFAULT_LOCALE]
    ? import.meta.env.VITE_DEFAULT_LOCALE
    : "fr";

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(DEFAULT_LOCALE);

  const value = useMemo(() => {
    const dict = DICTIONARIES[locale] || DICTIONARIES.en;
    const t = (key, vars) => {
      let str = dict[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, v);
        }
      }
      return str;
    };
    return { locale, setLocale, t, available: Object.keys(DICTIONARIES) };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
