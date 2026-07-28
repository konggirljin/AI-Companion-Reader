'use client';
import { Clock, Library, Star, BookOpen } from 'lucide-react';
type IconType = typeof Clock;

export interface SummaryData {
  totalMinutes: number;
  booksRead: number;
  booksInProgress: number;
  topBook: { title: string; minutes: number } | null;
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: IconType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="truncate text-lg font-extrabold leading-tight" style={{ color: 'hsl(var(--foreground))' }} title={value}>
        {value}
      </div>
      {sub ? <div className="truncate text-xs text-muted-foreground" title={sub}>{sub}</div> : null}
    </div>
  );
}

export function SummaryCards({ data }: { data: SummaryData }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        icon={Clock}
        label="Reading time"
        value={formatDuration(data.totalMinutes)}
        sub="All time"
      />
      <StatCard
        icon={Library}
        label="Books read"
        value={String(data.booksRead)}
        sub="Finished"
      />
      <StatCard
        icon={BookOpen}
        label="Books in progress"
        value={String(data.booksInProgress)}
        sub="Currently reading"
      />
      <StatCard
        icon={Star}
        label="Most-read book"
        value={data.topBook?.title ?? '—'}
        sub={data.topBook ? formatDuration(data.topBook.minutes) : undefined}
      />
    </div>
  );
}