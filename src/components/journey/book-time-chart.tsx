'use client';
import { useState } from 'react';
import { useLang } from '@/lib/lang-context';
import { fmtDuration } from './reading-time-chart';

export interface BookSeries {
  id: string;
  title: string;
  color: string;          // HEX/HSL string for bar segment
  minutesByCol: number[]; // aligned to columns
}

export interface BookChartColumn {
  key: string;
  label: string;
  fullLabel?: string;
}

export function BookTimeChart({
  mode,                 // 'stacked' for week/month, 'rows' for day
  columns,              // x-axis (days) — for 'stacked'; ignored for 'rows'
  series,               // books
  rangeLabel,
}: {
  mode: 'stacked' | 'rows';
  columns: BookChartColumn[];
  series: BookSeries[];
  rangeLabel: string;
}) {
  const { t } = useLang();
  const [active, setActive] = useState<number | null>(null);

  if (mode === 'rows') {
    const maxRow = Math.max(1, ...series.map((s) => s.minutesByCol[0] ?? 0));
    const totalRow = series.reduce((s, x) => s + (x.minutesByCol[0] ?? 0), 0);
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            {t('journey.readingTimePerBook')}
          </h2>
          <div className="text-xs text-muted-foreground">
            {rangeLabel}:{' '}
            <span className="font-semibold text-primary">{fmtDuration(totalRow)}</span>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {series.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">{t('journey.noReadingLogged')}</div>
          ) : (
            series.map((s) => {
              const mins = s.minutesByCol[0] ?? 0;
              const w = Math.max(2, (mins / maxRow) * 100);
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div className="flex w-28 shrink-0 items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="truncate text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }} title={s.title}>
                      {s.title}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${w}%`, background: s.color }} />
                    </div>
                  </div>
                  <div className="w-12 shrink-0 text-right text-xs font-semibold text-muted-foreground">
                    {fmtDuration(mins)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // stacked (week / month)
  const totalsByCol = columns.map((_, ci) => series.reduce((s, x) => s + (x.minutesByCol[ci] ?? 0), 0));
  const max = Math.max(1, ...totalsByCol);
  const grandTotal = totalsByCol.reduce((s, x) => s + x, 0);
  const step = columns.length > 12 ? 3 : 1;
  const activeCol = active !== null ? columns[active] : null;
  const activeBooks = active !== null
    ? series.filter((s) => (s.minutesByCol[active] ?? 0) > 0)
    : [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          {t('journey.readingTimePerBook')}
        </h2>
        <div className="text-xs text-muted-foreground">
          {rangeLabel}:{' '}
          <span className="font-semibold text-primary">{fmtDuration(grandTotal)}</span>
        </div>
      </div>

      <div className="mt-4 flex h-32 items-end gap-1">
        {columns.map((c, ci) => {
          const total = totalsByCol[ci];
          const h = total > 0 ? Math.max(4, (total / max) * 100) : 0;
          const isActive = active === ci;
          return (
            <button
              key={c.key}
              type="button"
              onMouseEnter={() => setActive(ci)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(ci)}
              onBlur={() => setActive(null)}
              className="flex flex-1 flex-col items-stretch justify-end"
              title={`${c.fullLabel ?? c.label} · ${fmtDuration(total)}`}
              aria-label={`${c.fullLabel ?? c.label}: ${fmtDuration(total)}`}
              style={{ height: '100%' }}
            >
              <div
                className="flex w-full flex-col justify-end rounded-[3px] transition-opacity"
                style={{
                  height: `${h}%`,
                  opacity: isActive ? 1 : 0.9,
                }}
              >
                {series.map((s) => {
                  const mins = s.minutesByCol[ci] ?? 0;
                  if (mins <= 0) return null;
                  const segH = total ? (mins / total) * 100 : 0;
                  return (
                    <div
                      key={s.id}
                      style={{ height: `${segH}%`, background: s.color }}
                      className="w-full"
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1">
        {columns.map((c, i) => (
          <div key={c.key} className="flex-1 text-center">
            {i % step === 0 ? (
              <span className="text-[9px] font-medium text-muted-foreground">{c.label}</span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-3 min-h-[44px] rounded-md bg-secondary/30 px-3 py-2 text-xs">
        {activeCol ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-secondary-foreground">
                {activeCol.fullLabel ?? activeCol.label}
              </span>
              <span className="font-semibold text-primary">{fmtDuration(totalsByCol[active ?? 0])}</span>
            </div>
            {activeBooks.length > 0 ? (
              <div className="mt-1 space-y-0.5">
                {activeBooks.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    <span className="truncate text-muted-foreground" title={s.title}>{s.title}</span>
                    <span className="ml-auto font-semibold text-secondary-foreground">
                      {fmtDuration(s.minutesByCol[active ?? 0] ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-muted-foreground">{t('journey.tapColumn')}</div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {series.map((s) => {
          const total = s.minutesByCol.reduce((a, b) => a + b, 0);
          return (
            <div key={s.id} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              <span className="max-w-[120px] truncate text-[11px] text-muted-foreground" title={s.title}>
                {s.title}
              </span>
              <span className="text-[11px] font-semibold text-primary">{fmtDuration(total)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}