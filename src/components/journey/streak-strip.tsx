'use client';
import { useMemo, useState } from 'react';
import { useLang } from '@/lib/lang-context';
import { Flame, ChevronLeft, ChevronRight } from 'lucide-react';

export interface StreakDay {
  iso: string;
  minutes: number;
}

const WEEKDAY = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function StreakStrip({
  streak,
  readDates,
  totalMinutesLabel,
}: {
  streak: number;
  readDates: Set<string>;
  totalMinutesLabel: string;
}) {
  const { t } = useLang();
  const MONTH_NAMES = useMemo(() => [
    t('journey.months.0'), t('journey.months.1'), t('journey.months.2'), t('journey.months.3'),
    t('journey.months.4'), t('journey.months.5'), t('journey.months.6'), t('journey.months.7'),
    t('journey.months.8'), t('journey.months.9'), t('journey.months.10'), t('journey.months.11'),
  ], [t]);
  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();

  const [viewYear, setViewYear] = useState(todayY);
  const [viewMonth, setViewMonth] = useState(todayM); // 0-indexed

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayWk = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const firstDayMonIdx = (firstDayWk + 6) % 7; // Mon-first offset

  const canGoNext = viewYear < todayY
    || (viewYear === todayY && viewMonth < todayM);

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const goNext = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  // Build cells: nulls for padded empty slots
  const cells: (null | {
    dateNum: number;
    iso: string;
    isToday: boolean;
    isFuture: boolean;
    read: boolean;
  })[] = [];

  for (let i = 0; i < firstDayMonIdx; i++) cells.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isFuture =
      viewYear > todayY
      || (viewYear === todayY && viewMonth > todayM)
      || (viewYear === todayY && viewMonth === todayM && d > todayD);
    const isToday = viewYear === todayY && viewMonth === todayM && d === todayD;
    cells.push({ dateNum: d, iso, isToday, isFuture, read: readDates.has(iso) });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Streak counter header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          <Flame className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
              {streak}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">{t('journey.streakSuffix')}</span>
          </div>
          <div className="text-xs text-muted-foreground">{t('journey.keepItLit')}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{t('journey.total')}</div>
          <div className="text-sm font-bold text-primary">{totalMinutesLabel}</div>
        </div>
      </div>

      {/* Month navigation */}
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          aria-label={t('journey.prevMonth')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-primary/10 disabled:opacity-30"
          style={{ color: canGoNext ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))' }}
          aria-label={t('journey.nextMonth')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="mt-3">
        <div className="grid grid-cols-7 gap-y-1.5 gap-x-1">
          {WEEKDAY.map((w, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground">
              {w}
            </div>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <div key={`pad-${i}`} className="h-9" />;
            return (
              <div
                key={cell.iso}
                title={`${cell.iso}${cell.read ? ` \u00b7 ${t('journey.read')}` : ''}`}
                className="flex h-9 flex-col items-center justify-center gap-0.5 rounded-md transition-colors hover:bg-primary/10"
              >
                <span
                  className={`text-xs font-semibold leading-none ${cell.isToday ? 'rounded-full bg-primary/20 px-1.5 py-0.5' : ''}`}
                  style={{
                    color: cell.isFuture
                      ? 'hsl(var(--muted-foreground))'
                      : 'hsl(var(--foreground))',
                    opacity: cell.isFuture ? 0.25 : 1,
                  }}
                >
                  {cell.dateNum}
                </span>
                {cell.isFuture ? (
                  <span className="block h-1.5 w-1.5" />
                ) : cell.read ? (
                  <span className="block h-1.5 w-1.5 rounded-full bg-primary" />
                ) : (
                  <span className="block h-1.5 w-1.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}