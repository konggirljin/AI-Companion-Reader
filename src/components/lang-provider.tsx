'use client';
import { LanguageProvider } from '@/lib/lang-context';

export function ClientLangProvider({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
