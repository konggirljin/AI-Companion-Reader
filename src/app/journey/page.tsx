'use client';
import { useEffect, useMemo, useState } from 'react';
import { RangeTabs, type Range } from '@/components/journey/range-tabs';
import { StreakStrip } from '@/components/journey/streak-strip';
import { SummaryCards } from '@/components/journey/summary-cards';
import { ReadingTimeChart, fmtDuration } from '@/components/journey/reading-time-chart';
import { BookTimeChart } from '@/components/journey/book-time-chart';
import { CompanionStat } from '@/components/journey/companion-stat';
import { getJourneyStats } from '@/lib/journey-stats';

const RANGE_LABEL: Record<Range, string> = {
  day: 'Today',
  week: 'This week',
  month: 'This month',
};

export default function JourneyPage() {
  const [range, setRange] = useState<Range>('week');
  const [tick, setTick] = useState(0);

  // Re-read stats whenever this page mounts or the user returns to it
  // (the journey route is a separate page from /read — each navigation re-mounts
  // and triggers this useMemo again, picking up freshly flushed sessions).
  useEffect(() => {
    setTick((t) => t + 1);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => getJourneyStats(range), [range, tick]);
  const readDates = useMemo(() => new Set(stats.readDates), [stats.readDates]);

  // Empty-state: brand new users see a friendly prompt rather than a wall of zeros
  const noData = stats.summary.totalMinutes === 0
    && stats.streakDays.every((d) => d.minutes === 0)
    && stats.bookSeries.length === 0
    && stats.companion === null;

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <header className="flex items-end justify-between px-4 pb-3 pt-6">
        <div>
          <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
            Journey
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {noData
              ? 'Open a book to start tracking your journey.'
              : `${fmtDuration(stats.summary.totalMinutes)} read across ${stats.summary.booksInProgress + stats.summary.booksRead} books`}
          </p>
        </div>
        <RangeTabs value={range} onChange={setRange} />
      </header>

      {noData ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            No reading recorded yet.
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Pick a book from your shelf and a session will start tracking automatically when you read.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 px-4 pb-10">
          <StreakStrip streak={stats.streak} readDates={readDates} totalMinutesLabel={fmtDuration(stats.summary.totalMinutes)} />
          <SummaryCards data={stats.summary} />
          <ReadingTimeChart points={stats.readingPoints} rangeLabel={RANGE_LABEL[range]} />
          <BookTimeChart
            mode={stats.bookChartMode}
            columns={stats.bookColumns}
            series={stats.bookSeries}
            rangeLabel={RANGE_LABEL[range]}
          />
          <CompanionStat data={stats.companion} rangeLabel={RANGE_LABEL[range]} />
        </div>
      )}
    </div>
  );
}