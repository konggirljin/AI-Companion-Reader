import type { ReaderTheme } from './types';

export interface ReaderThemeVars { bg: string; text: string; muted: string }

export const READER_THEMES: Record<ReaderTheme, ReaderThemeVars> = {
  amber: { bg: '#26180A', text: '#F0DCC0', muted: '#8A6038' },
  warmWhite: { bg: '#FAF4E8', text: '#2A1F0E', muted: '#7A6448' },
  sepia: { bg: '#F5E8C4', text: '#3D2B1F', muted: '#8B7355' },
  green: { bg: '#C8D8C8', text: '#1E3A2E', muted: '#5A7A5E' },
};

export function readerContentStyle(theme: ReaderTheme): React.CSSProperties {
  const v = READER_THEMES[theme];
  return {
    ['--reader-bg' as string]: v.bg,
    ['--reader-text' as string]: v.text,
    ['--reader-muted' as string]: v.muted,
    backgroundColor: 'var(--reader-bg)',
    color: 'var(--reader-text)',
  } as React.CSSProperties;
}
