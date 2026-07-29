'use client';
import { useState, useEffect } from 'react';
import { UserCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Persona } from '@/lib/types';
import { useLang } from '@/lib/lang-context';

const MAX_PERSONAS = 5;

interface PersonaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personas: Persona[];
  defaultPersonaIds: string[];
  onConfirm: (mode: 'from_start' | 'to_end', personaIds: string[]) => void;
}

export function PersonaPicker({ open, onOpenChange, personas, defaultPersonaIds, onConfirm }: PersonaPickerProps) {
  const { t } = useLang();
  const [mode, setMode] = useState<'from_start' | 'to_end'>('from_start');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setMode('from_start');
      setSelected(defaultPersonaIds.filter(id => personas.some(p => p.id === id)));
    }
  }, [open, defaultPersonaIds, personas]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_PERSONAS ? [...prev, id] : prev,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('reader.sendChapterQuestion', { n: MAX_PERSONAS })}</DialogTitle>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">{t('reader.sendMode')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('from_start')}
                className={cn(
                  'flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors',
                  mode === 'from_start' ? 'border-primary bg-accent text-foreground' : 'hover:bg-muted',
                )}
              >
                {t('reader.fromStart')}
              </button>
              <button
                type="button"
                onClick={() => setMode('to_end')}
                className={cn(
                  'flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors',
                  mode === 'to_end' ? 'border-primary bg-accent text-foreground' : 'hover:bg-muted',
                )}
              >
                {t('reader.toEnd')}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t('reader.maxWords', { n: 7000 })}</p>
          </div>
        </DialogHeader>
        <div className="space-y-2">
          {personas.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('reader.noPersonas')}</p>
          )}
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                selected.includes(p.id) ? 'border-primary bg-accent' : 'hover:bg-accent',
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted">
                {p.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <UserCircle2 className="h-5 w-5 text-muted-foreground" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{p.name}</span>
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button
            disabled={selected.length === 0}
            onClick={() => { onConfirm(mode, selected); setSelected([]); }}
          >
            {t('reader.sendBtnWithCount', { n: selected.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
