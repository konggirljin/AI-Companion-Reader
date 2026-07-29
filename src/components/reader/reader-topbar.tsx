'use client';
import Link from 'next/link';
import { ChevronLeft, List, Bookmark, Type, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserPersonaSwitcher } from './user-persona-switcher';
import { useLang } from '@/lib/lang-context';
import type { ReaderPrefs } from '@/lib/types';

const FONT_OPTIONS = [
  { value: 'var(--font-geist-sans)', label: 'Geist Sans' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Serif' },
  { value: 'var(--font-geist-mono)', label: 'Mono' },
  { value: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif', label: '黑體' },
  { value: '"Noto Serif SC", "STSong", "SimSun", serif', label: '宋體' },
  { value: '"KaiTi", "STKaiti", "Noto Serif SC", serif', label: '楷體' },
];

interface ReaderTopbarProps {
  title: string;
  onToc: () => void;
  onBookmarks: () => void;
  onComments: () => void;
  activeUserPersonaId: string | null;
  onUserPersonaActivate: (id: string | null) => void;
  prefs: ReaderPrefs;
  onChange: (prefs: ReaderPrefs) => void;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
}

export function ReaderTopbar({ title, onToc, onBookmarks, onComments, activeUserPersonaId, onUserPersonaActivate, prefs, onChange, settingsOpen, onSettingsOpenChange }: ReaderTopbarProps) {
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-2">
        <Button variant="ghost" size="icon" asChild aria-label={t('reader.backToShelf')}>
          <Link href="/"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <p className="mx-2 flex-1 truncate text-center text-sm font-medium">{title}</p>
        <div className="flex items-center">
          <UserPersonaSwitcher activeId={activeUserPersonaId} onActivate={onUserPersonaActivate} />
          <Button variant="ghost" size="icon" onClick={onComments} aria-label={t('reader.comments')}>
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onBookmarks} aria-label={t('reader.bookmarks')}>
            <Bookmark className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onToc} aria-label={t('reader.tableOfContents')}>
            <List className="h-4 w-4" />
          </Button>
          <Popover open={settingsOpen} onOpenChange={onSettingsOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('reader.settings')}>
                <Type className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="max-h-[calc(100dvh-4rem)] w-72 space-y-4 overflow-y-auto p-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{t('reader.settings.popover')}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('reader.fontSize')} — {prefs.fontSize}px</Label>
                <Slider
                  min={14} max={26} step={1} value={[prefs.fontSize]}
                  onValueChange={([v]) => onChange({ ...prefs, fontSize: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('reader.lineSpacing')} — {prefs.lineSpacing.toFixed(1)}</Label>
                <Slider
                  min={1.4} max={2.4} step={0.1} value={[prefs.lineSpacing]}
                  onValueChange={([v]) => onChange({ ...prefs, lineSpacing: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('reader.fontFamily')}</Label>
                <Select value={prefs.fontFamily} onValueChange={(v) => onChange({ ...prefs, fontFamily: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('reader.readingTheme')}</Label>
                <Select value={prefs.theme} onValueChange={(v) => onChange({ ...prefs, theme: v as ReaderPrefs['theme'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amber">{t('reader.theme.amber')}</SelectItem>
                    <SelectItem value="warmWhite">{t('reader.theme.warmWhite')}</SelectItem>
                    <SelectItem value="sepia">{t('reader.theme.sepia')}</SelectItem>
                    <SelectItem value="green">{t('reader.theme.green')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reading mode</Label>
                <Select value={prefs.readingMode} onValueChange={(v) => onChange({ ...prefs, readingMode: v as ReaderPrefs['readingMode'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paginated">Paginated</SelectItem>
                    <SelectItem value="scroll">Vertical scroll</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Page animation</Label>
                <Select
                  value={prefs.pageAnimation}
                  disabled={prefs.readingMode === 'scroll'}
                  onValueChange={(v) => onChange({ ...prefs, pageAnimation: v as ReaderPrefs['pageAnimation'] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Off</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="slow">Slow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
