import type { Range } from '@/components/journey/range-tabs';
import type { StreakDay } from '@/components/journey/streak-strip';
import type { SummaryData } from '@/components/journey/summary-cards';
import type { BarPoint } from '@/components/journey/reading-time-chart';
import type { BookSeries, BookChartColumn } from '@/components/journey/book-time-chart';
import type { CompanionStatData } from '@/components/journey/companion-stat';
import { listSessions } from '@/lib/storage/journey-sessions';
import { listBooks } from '@/lib/storage/books';
import { listAllThreads } from '@/lib/storage/threads';
import { listPersonas } from '@/lib/storage/personas';

export interface JourneyStats {
  streakDays: StreakDay[];
  streak: number;
  readDates: string[];      // every iso date with at least one session (all time)
  summary: SummaryData;
  readingPoints: BarPoint[];
  bookChartMode: 'stacked' | 'rows';
  bookColumns: BookChartColumn[];
  bookSeries: BookSeries[];
  companion: CompanionStatData | null;
}

const PALETTE = ['#C89060', '#9A6535', '#E8B870', '#D8A878', '#A87545', '#BF9F7A'];
const WEEKDAY_MON_FIRST = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function todayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isToday(iso: string): boolean {
  return iso === todayIso();
}

function weekdayMonLabel(iso: string): string {
  const wd = (new Date(iso + 'T00:00:00').getDay() + 6) % 7;
  return WEEKDAY_MON_FIRST[wd];
}

function dayOfMonthLabel(iso: string): string {
  return String(Number(iso.slice(8, 10)));
}

function hourFullLabel(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export function getJourneyStats(range: Range): JourneyStats {
  let sessions = listSessions();
  let books = listBooks();
  let threads = listAllThreads();
  let personas = listPersonas();

  if (!Array.isArray(sessions)) sessions = [];
  if (!Array.isArray(books)) books = [];
  if (!Array.isArray(threads)) threads = [];
  if (!Array.isArray(personas)) personas = [];

  // ----- per-date seconds map (over all sessions) -----
  const secondsByDate = new Map<string, number>();
  const secondsByBookAllTime = new Map<string, number>();
  let totalAllTimeSeconds = 0;
  for (const s of sessions) {
    if (!s || typeof s.durationSeconds !== 'number') continue;
    totalAllTimeSeconds += s.durationSeconds;
    secondsByDate.set(s.date, (secondsByDate.get(s.date) ?? 0) + s.durationSeconds);
    secondsByBookAllTime.set(s.bookId, (secondsByBookAllTime.get(s.bookId) ?? 0) + s.durationSeconds);
  }

  const readDates = Array.from(secondsByDate.entries())
    .filter(([, secs]) => secs > 0)
    .map(([date]) => date)
    .sort();

  // ----- streakDays (30 entries oldest->newest) -----
  const streakDays: StreakDay[] = [];
  for (let i = 29; i >= 0; i--) {
    const iso = isoDaysAgo(i);
    const secs = secondsByDate.get(iso) ?? 0;
    streakDays.push({ iso, minutes: Math.round(secs / 60) });
  }

  // ----- streak -----
  let streak = 0;
  for (let i = streakDays.length - 1; i >= 0; i--) {
    if (streakDays[i].minutes > 0) streak++;
    else break;
  }

  // ----- SummaryData (all-time) -----
  const booksRead = books.filter((b) => b && b.status === 'finished').length;
  let booksInProgress = 0;
  for (const b of books) {
    if (!b) continue;
    if (b.status === 'finished') continue;
    const secs = secondsByBookAllTime.get(b.id) ?? 0;
    if (secs >= 30) booksInProgress++;
  }

  let topBook: { title: string; minutes: number } | null = null;
  let topBookSeconds = 0;
  let topBookTitle = '';
  for (const b of books) {
    if (!b) continue;
    const secs = secondsByBookAllTime.get(b.id) ?? 0;
    if (secs > topBookSeconds) {
      topBookSeconds = secs;
      topBookTitle = b.title;
    }
  }
  if (topBookSeconds > 0) {
    topBook = { title: topBookTitle, minutes: Math.round(topBookSeconds / 60) };
  }

  const summary: SummaryData = {
    totalMinutes: Math.round(totalAllTimeSeconds / 60),
    booksRead,
    booksInProgress,
    topBook,
  };

  // ----- readingPoints -----
  const readingPoints: BarPoint[] = [];
  if (range === 'day') {
    const today = todayIso();
    const secondsByHour = new Array(24).fill(0) as number[];
    for (const s of sessions) {
      if (!s || s.date !== today) continue;
      const h = new Date(s.startedAt).getHours();
      secondsByHour[h] += s.durationSeconds;
    }
    for (let h = 0; h < 24; h++) {
      readingPoints.push({
        key: `h${h}`,
        label: h % 6 === 0 ? String(h) : '',
        minutes: Math.round(secondsByHour[h] / 60),
        fullLabel: hourFullLabel(h),
      });
    }
  } else if (range === 'week') {
    for (let i = 6; i >= 0; i--) {
      const iso = isoDaysAgo(i);
      const secs = secondsByDate.get(iso) ?? 0;
      readingPoints.push({
        key: iso,
        label: weekdayMonLabel(iso),
        minutes: Math.round(secs / 60),
        fullLabel: iso,
      });
    }
  } else {
    for (let i = 29; i >= 0; i--) {
      const iso = isoDaysAgo(i);
      const secs = secondsByDate.get(iso) ?? 0;
      readingPoints.push({
        key: iso,
        label: dayOfMonthLabel(iso),
        minutes: Math.round(secs / 60),
        fullLabel: iso,
      });
    }
  }

  // ----- book columns & series -----
  let bookChartMode: 'stacked' | 'rows';
  let bookColumns: BookChartColumn[];
  let columnIsos: string[];

  if (range === 'day') {
    bookChartMode = 'rows';
    bookColumns = [{ key: 'today', label: 'Today', fullLabel: 'Today' }];
    columnIsos = [todayIso()];
  } else if (range === 'week') {
    bookChartMode = 'stacked';
    bookColumns = [];
    columnIsos = [];
    for (let i = 6; i >= 0; i--) {
      const iso = isoDaysAgo(i);
      columnIsos.push(iso);
      bookColumns.push({ key: iso, label: weekdayMonLabel(iso), fullLabel: iso });
    }
  } else {
    bookChartMode = 'stacked';
    bookColumns = [];
    columnIsos = [];
    for (let i = 29; i >= 0; i--) {
      const iso = isoDaysAgo(i);
      columnIsos.push(iso);
      bookColumns.push({ key: iso, label: dayOfMonthLabel(iso), fullLabel: iso });
    }
  }

  // Build per-book per-column seconds map: bookId -> columnIndex -> seconds
  // For day mode, columnIndex 0 corresponds to today's iso.
  const bookColSeconds = new Map<string, number[]>(); // bookId -> array aligned to columnIsos
  for (const s of sessions) {
    if (!s) continue;
    let colIdx: number;
    if (range === 'day') {
      if (s.date !== columnIsos[0]) continue;
      colIdx = 0;
    } else {
      colIdx = columnIsos.indexOf(s.date);
      if (colIdx < 0) continue;
    }
    let arr = bookColSeconds.get(s.bookId);
    if (!arr) {
      arr = new Array(columnIsos.length).fill(0);
      bookColSeconds.set(s.bookId, arr);
    }
    arr[colIdx] += s.durationSeconds;
  }

  // Only books with at least one session anywhere in history (global total > 0)
  const sortedBookIds = Array.from(secondsByBookAllTime.entries())
    .filter(([, secs]) => secs > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const bookSeries: BookSeries[] = sortedBookIds.map((id, idx) => {
    const book = books.find((b) => b && b.id === id);
    const arr = bookColSeconds.get(id) ?? new Array(columnIsos.length).fill(0);
    return {
      id,
      title: book?.title ?? 'Unknown',
      color: PALETTE[idx % PALETTE.length],
      minutesByCol: arr.map((secs) => Math.round(secs / 60)),
    };
  });

  // ----- companion stats -----
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const todayMs = todayMidnight.getTime();
  let rangeStartMs: number;
  if (range === 'day') {
    rangeStartMs = todayMs;
  } else if (range === 'week') {
    rangeStartMs = todayMs - 6 * 24 * 60 * 60 * 1000;
  } else {
    rangeStartMs = todayMs - 29 * 24 * 60 * 60 * 1000;
  }

  // personaId -> { count, latestText, latestBookId, latestCreatedAt }
  const personaAgg = new Map<
    string,
    { count: number; latestText: string | null; latestBookId: string | null; latestCreatedAt: number }
  >();

  for (const t of threads) {
    if (!t || typeof t.createdAt !== 'number') continue;
    if (t.createdAt < rangeStartMs) continue;
    const comments = Array.isArray(t.comments) ? t.comments : [];
    for (const c of comments) {
      if (!c || typeof c.personaId !== 'string') continue;
      const entry = personaAgg.get(c.personaId) ?? {
        count: 0,
        latestText: null,
        latestBookId: null,
        latestCreatedAt: -1,
      };
      entry.count += 1;
      if (t.createdAt >= entry.latestCreatedAt) {
        entry.latestCreatedAt = t.createdAt;
        entry.latestText = typeof c.text === 'string' ? c.text : null;
        entry.latestBookId = t.bookId ?? null;
      }
      personaAgg.set(c.personaId, entry);
    }
  }

  let companion: CompanionStatData | null = null;
  if (personaAgg.size > 0) {
    let bestId: string | null = null;
    let bestCount = -1;
    let bestLatest = -1;
    for (const [pid, entry] of personaAgg.entries()) {
      if (entry.count > bestCount || (entry.count === bestCount && entry.latestCreatedAt > bestLatest)) {
        bestCount = entry.count;
        bestLatest = entry.latestCreatedAt;
        bestId = pid;
      }
    }
    if (bestId !== null) {
      const persona = personas.find((p) => p && p.id === bestId);
      if (persona) {
        const entry = personaAgg.get(bestId)!;
        let quote: string | null = null;
        if (entry.latestText) {
          const trimmed = entry.latestText.trim();
          quote = trimmed.length > 200 ? trimmed.slice(0, 200) : trimmed;
          if (quote.length === 0) quote = null;
        }
        let bookTitle: string | undefined;
        if (entry.latestBookId) {
          const book = books.find((b) => b && b.id === entry.latestBookId);
          bookTitle = book?.title;
        }
        companion = {
          name: persona.name,
          avatar: persona.avatar,
          calls: entry.count,
          quote,
          bookTitle,
        };
      }
    }
  }
  void isToday;

  return {
    streakDays,
    streak,
    readDates,
    summary,
    readingPoints,
    bookChartMode,
    bookColumns,
    bookSeries,
    companion,
  };
}