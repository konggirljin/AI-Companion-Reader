import type { ReaderPrefs, Settings } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';
import { DEFAULT_SYSTEM_PROMPT_TEMPLATE } from '@/lib/prompts';

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  systemPromptTemplate: DEFAULT_SYSTEM_PROMPT_TEMPLATE,
};

export const DEFAULT_PREFS: ReaderPrefs = { fontSize: 18, fontFamily: 'var(--font-geist-sans)', lineSpacing: 1.8 };

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<Settings>>(K.settings, {}) };
}

export function saveSettings(s: Settings): void {
  writeJson(K.settings, s);
}

export function getPrefs(): ReaderPrefs {
  return { ...DEFAULT_PREFS, ...readJson<Partial<ReaderPrefs>>(K.prefs, {}) };
}

export function savePrefs(p: ReaderPrefs): void {
  writeJson(K.prefs, p);
}
