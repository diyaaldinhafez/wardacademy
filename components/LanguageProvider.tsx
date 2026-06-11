"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { dictionaries, type Dict, type Lang } from "@/lib/i18n";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Dict };

const LanguageContext = createContext<Ctx>({
  lang: "ar",
  setLang: () => {},
  t: dictionaries.ar,
});

const STORAGE_KEY = "wa-lang";

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar"); // Arabic is the default

  // restore a previously chosen language (one-time, on mount)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "ar") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(saved);
    }
  }, []);

  // keep <html lang/dir> in sync with the active language
  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable — fine for the prototype */
    }
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: dictionaries[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useT = () => useContext(LanguageContext).t;
export const useLang = () => {
  const { lang, setLang } = useContext(LanguageContext);
  return { lang, setLang };
};
