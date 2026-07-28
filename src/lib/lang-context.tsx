'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Lang } from '@/lib/i18n';
import { t as translate } from '@/lib/i18n';
import { getSettings, saveSettings } from '@/lib/storage/settings';

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => getSettings().language);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveSettings({ ...getSettings(), language: l });
  }, []);

  const tFn = useCallback((k: string) => translate(lang, k), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: tFn }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider');
  return ctx;
}
