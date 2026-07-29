'use client';
import { useMemo } from 'react';
import { useLang } from '@/lib/lang-context';

export type Range = 'day' | 'week' | 'month';

export function RangeTabs({ value, onChange }: { value: Range; onChange: (v: Range) => void }) {
  const { t } = useLang();
  const LABELS: Record<Range, string> = useMemo(() => ({
    day: t('journey.range.day'),
    week: t('journey.range.week'),
    month: t('journey.range.month'),
  }), [t]);
  const tabs: Range[] = ['day', 'week', 'month'];
  return (
    <div className="inline-flex rounded-full border border-border bg-card/70 p-1 shadow-sm">
      {tabs.map((t) => {
        const active = t === value;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            aria-pressed={active}
            className="rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors"
            style={{
              background: active ? 'hsl(var(--secondary))' : 'transparent',
              color: active ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--muted-foreground))',
            }}
          >
            {LABELS[t]}
          </button>
        );
      })}
    </div>
  );
}