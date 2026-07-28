'use client';
import { useState } from 'react';

export interface BarPoint {
  key: string;
  label: string;       // short label, e.g. "M", "12"
  minutes: number;
  fullLabel?: string;  // longer tooltip label, e.g. "Mon · 45m"
}

export function fmtDuration(m: number): string {
  if (m <= 0) return '0m';
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return h ? (mm ? `${h}h ${mm}m` : `${h}h`) : `${mm}m`;
}

export function ReadingTimeChart({
  points,
  rangeLabel,
}: {
  points: BarPoint[];
  rangeLabel: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.minutes));
  const [active, setActive] = useState<number | null>(null);
  const total = points.reduce((s, p) => s + p.minutes, 0);
  const step = points.length > 24 ? 6 : points.length > 12 ? 3 : 1;
  const activePoint = active !== null ? points[active] : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Reading time
        </h2>
        <div className="text-xs text-muted-foreground">
          {rangeLabel}:{' '}
          <span className="font-semibold text-primary">{fmtDuration(total)}</span>
        </div>
      </div>

      <div className="mt-4 flex h-28 items-end gap-1">
        {points.map((p, i) => {
          const h = Math.max(2, (p.minutes / max) * 100);
          const isActive = active === i;
          return (
            <button
              key={p.key}
              type="button"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="flex flex-1 flex-col items-center justify-end"
              title={`${p.fullLabel ?? p.label} · ${fmtDuration(p.minutes)}`}
              aria-label={`${p.fullLabel ?? p.label}: ${fmtDuration(p.minutes)}`}
            >
              <div
                className="w-full rounded-[3px] transition-colors"
                style={{
                  height: `${h}%`,
                  background: isActive
                    ? 'hsl(28 70% 66%)'
                    : p.minutes > 0
                      ? 'hsl(28 55% 50%)'
                      : 'hsl(var(--muted))',
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1">
        {points.map((p, i) => (
          <div key={p.key} className="flex-1 text-center">
            {i % step === 0 ? (
              <span className="text-[9px] font-medium text-muted-foreground">{p.label}</span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-3 min-h-[28px]">
        {activePoint ? (
          <div className="inline-flex items-center rounded-md bg-secondary/50 px-2.5 py-1.5 text-xs text-secondary-foreground">
            <span className="font-semibold">{activePoint.fullLabel ?? activePoint.label}</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="font-semibold text-primary">{fmtDuration(activePoint.minutes)}</span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Tap a bar for details</div>
        )}
      </div>
    </div>
  );
}