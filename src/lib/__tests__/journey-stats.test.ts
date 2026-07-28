import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReadingSession } from '@/lib/storage/journey-sessions';
import type { Book } from '@/lib/types';
import type { Thread } from '@/lib/types';
import type { Persona } from '@/lib/types';

vi.mock('@/lib/storage/journey-sessions', () => ({ listSessions: vi.fn() }));
vi.mock('@/lib/storage/books', () => ({ listBooks: vi.fn() }));
vi.mock('@/lib/storage/threads', () => ({ listAllThreads: vi.fn() }));
vi.mock('@/lib/storage/personas', () => ({ listPersonas: vi.fn() }));

import { listSessions } from '@/lib/storage/journey-sessions';
import { listBooks } from '@/lib/storage/books';
import { listAllThreads } from '@/lib/storage/threads';
import { listPersonas } from '@/lib/storage/personas';
import { getJourneyStats } from '@/lib/journey-stats';

function iso(daysAgo: number): string {
  const d = new Date('2026-07-28T10:00:00Z');
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

beforeEach(() => {
  vi.setSystemTime(new Date('2026-07-28T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('getJourneyStats', () => {
  it('returns zeros/everything for a brand-new user with no data', () => {
    vi.mocked(listSessions).mockReturnValue([]);
    vi.mocked(listBooks).mockReturnValue([]);
    vi.mocked(listAllThreads).mockReturnValue([]);
    vi.mocked(listPersonas).mockReturnValue([]);

    const s = getJourneyStats('week');
    expect(s.streak).toBe(0);
    expect(s.streakDays).toHaveLength(30);
    expect(s.streakDays[29].iso).toBe(iso(0));   // today at end
    expect(s.summary.totalMinutes).toBe(0);
    expect(s.summary.booksRead).toBe(0);
    expect(s.summary.booksInProgress).toBe(0);
    expect(s.summary.topBook).toBeNull();
    expect(s.readingPoints).toHaveLength(7);      // week mode
    expect(s.readingPoints.every((p) => p.minutes === 0)).toBe(true);
    expect(s.bookSeries).toEqual([]);
    expect(s.companion).toBeNull();
  });

  it('computes streak from a run of consecutive days', () => {
    const sessions: ReadingSession[] = [
      { id: 's1', bookId: 'b1', date: iso(0), durationSeconds: 600, startedAt: Date.now() - 600_000 },
      { id: 's2', bookId: 'b1', date: iso(1), durationSeconds: 300, startedAt: Date.now() - 900_000 },
      { id: 's3', bookId: 'b1', date: iso(2), durationSeconds: 200, startedAt: Date.now() - 1200_000 },
      // iso(3) intentionally missed -> streak should be 3
      { id: 's4', bookId: 'b1', date: iso(4), durationSeconds: 100, startedAt: Date.now() - 2400_000 },
    ];
    vi.mocked(listSessions).mockReturnValue(sessions);
    vi.mocked(listBooks).mockReturnValue([]);
    vi.mocked(listAllThreads).mockReturnValue([]);
    vi.mocked(listPersonas).mockReturnValue([]);

    const s = getJourneyStats('month');
    expect(s.streak).toBe(3);
  });

  it('computes streak as 0 when today has no reading', () => {
    const sessions: ReadingSession[] = [
      { id: 's1', bookId: 'b1', date: iso(1), durationSeconds: 600, startedAt: Date.now() - 900_000 },
    ];
    vi.mocked(listSessions).mockReturnValue(sessions);
    vi.mocked(listBooks).mockReturnValue([]);
    vi.mocked(listAllThreads).mockReturnValue([]);
    vi.mocked(listPersonas).mockReturnValue([]);

    const s = getJourneyStats('month');
    expect(s.streak).toBe(0);
  });

  it('counts books read (finished) and books in progress', () => {
    const sessions: ReadingSession[] = [
      { id: 's1', bookId: 'b1', date: iso(0), durationSeconds: 1200, startedAt: Date.now() },
      { id: 's2', bookId: 'b2', date: iso(0), durationSeconds: 40, startedAt: Date.now() },
      { id: 's3', bookId: 'b3', date: iso(0), durationSeconds: 20, startedAt: Date.now() },
      // b4 has no sessions
    ];
    const books: Book[] = [
      { id: 'b1', title: 'Finished', author: '', format: 'txt', toc: [], addedAt: 0, order: 0, chapterCount: 1, status: 'finished' },
      { id: 'b2', title: 'In progress 40s', author: '', format: 'txt', toc: [], addedAt: 0, order: 1, chapterCount: 1 },
      { id: 'b3', title: 'Not enough', author: '', format: 'txt', toc: [], addedAt: 0, order: 2, chapterCount: 1 },
      { id: 'b4', title: 'Never opened', author: '', format: 'txt', toc: [], addedAt: 0, order: 3, chapterCount: 1 },
    ];
    vi.mocked(listSessions).mockReturnValue(sessions);
    vi.mocked(listBooks).mockReturnValue(books);
    vi.mocked(listAllThreads).mockReturnValue([]);
    vi.mocked(listPersonas).mockReturnValue([]);

    const s = getJourneyStats('month');
    expect(s.summary.booksRead).toBe(1);           // only b1 is finished
    expect(s.summary.booksInProgress).toBe(1);      // b2 has >=30s, not finished
    expect(s.summary.topBook!.title).toBe('Finished');
  });

  it('picks the top book by total reading time', () => {
    const sessions: ReadingSession[] = [
      { id: 's1', bookId: 'b1', date: iso(0), durationSeconds: 600, startedAt: Date.now() },
      { id: 's2', bookId: 'b2', date: iso(0), durationSeconds: 3600, startedAt: Date.now() },
      { id: 's3', bookId: 'b2', date: iso(1), durationSeconds: 3600, startedAt: Date.now() },
    ];
    const books: Book[] = [
      { id: 'b1', title: 'Less', author: '', format: 'txt', toc: [], addedAt: 0, order: 0, chapterCount: 1 },
      { id: 'b2', title: 'More', author: '', format: 'txt', toc: [], addedAt: 0, order: 1, chapterCount: 1 },
    ];
    vi.mocked(listSessions).mockReturnValue(sessions);
    vi.mocked(listBooks).mockReturnValue(books);
    vi.mocked(listAllThreads).mockReturnValue([]);
    vi.mocked(listPersonas).mockReturnValue([]);

    const s = getJourneyStats('month');
    expect(s.summary.topBook!.title).toBe('More');
    expect(s.summary.totalMinutes).toBe(10 + 60 + 60); // (600+3600+3600)/60 = 130
  });

  it('builds readingPoints for day/week/month correctly', () => {
    const today = iso(0);
    // Build startedAt timestamps in LOCAL time to match getHours() in journey-stats
    const dayStart = new Date('2026-07-28T00:00:00').getTime();
    const sessions: ReadingSession[] = [
      { id: 's1', bookId: 'b1', date: today, durationSeconds: 3600, startedAt: dayStart + 12 * 3600_000 + 30 * 60_000 },
      { id: 's2', bookId: 'b1', date: today, durationSeconds: 3600, startedAt: dayStart + 19 * 3600_000 + 15 * 60_000 },
    ];
    vi.mocked(listSessions).mockReturnValue(sessions);
    vi.mocked(listBooks).mockReturnValue([]);
    vi.mocked(listAllThreads).mockReturnValue([]);
    vi.mocked(listPersonas).mockReturnValue([]);

    // Day mode: 24 hourly bars
    const sDay = getJourneyStats('day');
    expect(sDay.readingPoints).toHaveLength(24);
    expect(sDay.readingPoints[12].minutes).toBe(60);  // hour 12 has 3600s = 60m
    expect(sDay.readingPoints[19].minutes).toBe(60);  // hour 19 has 3600s = 60m

    // Week mode: 7 daily bars
    const sWeek = getJourneyStats('week');
    expect(sWeek.readingPoints).toHaveLength(7);
    // Month mode: 30 daily bars
    const sMonth = getJourneyStats('month');
    expect(sMonth.readingPoints).toHaveLength(30);
  });

  it('builds book series with correct per-book per-day breakdown', () => {
    const today = iso(0);
    const yesterday = iso(1);
    const sessions: ReadingSession[] = [
      { id: 's1', bookId: 'b1', date: today, durationSeconds: 600, startedAt: Date.now() },
      { id: 's2', bookId: 'b2', date: yesterday, durationSeconds: 600, startedAt: Date.now() - 86400000 },
      { id: 's3', bookId: 'b2', date: today, durationSeconds: 900, startedAt: Date.now() },
    ];
    const books: Book[] = [
      { id: 'b1', title: 'Book A', author: '', format: 'txt', toc: [], addedAt: 0, order: 0, chapterCount: 1 },
      { id: 'b2', title: 'Book B', author: '', format: 'txt', toc: [], addedAt: 0, order: 1, chapterCount: 1 },
    ];
    vi.mocked(listSessions).mockReturnValue(sessions);
    vi.mocked(listBooks).mockReturnValue(books);
    vi.mocked(listAllThreads).mockReturnValue([]);
    vi.mocked(listPersonas).mockReturnValue([]);

    const s = getJourneyStats('week');
    expect(s.bookSeries.length).toBeGreaterThanOrEqual(2);
    // Book B has higher total → appears first (sorted desc)
    expect(s.bookSeries[0].title).toBe('Book B');
    expect(s.bookColumns).toHaveLength(7);
    // Last column is today's iso
    expect(s.bookColumns[6].key).toBe(today);
  });

  it('picks the top companion by comment count in range', () => {
    const todayMs = new Date('2026-07-28T10:00:00Z').getTime();
    const threads: Thread[] = [
      {
        id: 't1', bookId: 'b1', chapterId: '0', paragraphId: '0:1', selectedText: 'hi',
        comments: [
          { personaId: 'p1', text: 'Elementary!' },
          { personaId: 'p1', text: 'Indeed' },
          { personaId: 'p2', text: 'Brilliant' },
        ],
        createdAt: todayMs - 1000, // today
      },
    ];
    const personas: Persona[] = [
      { id: 'p1', name: 'Sherlock', avatar: '', characterDescription: '', language: 'English', createdAt: 0 },
      { id: 'p2', name: 'Watson', avatar: '', characterDescription: '', language: 'English', createdAt: 0 },
    ];
    vi.mocked(listSessions).mockReturnValue([]);
    vi.mocked(listBooks).mockReturnValue([]);
    vi.mocked(listAllThreads).mockReturnValue(threads);
    vi.mocked(listPersonas).mockReturnValue(personas);

    const s = getJourneyStats('day');
    expect(s.companion).not.toBeNull();
    expect(s.companion!.name).toBe('Sherlock');
    expect(s.companion!.calls).toBe(2);
    expect(s.companion!.quote).toBe('Indeed');
  });

  it('returns null companion when no threads in range', () => {
    const oldMs = new Date('2026-06-01T10:00:00Z').getTime();
    const threads: Thread[] = [{
      id: 't1', bookId: 'b1', chapterId: '0', paragraphId: '0:1', selectedText: 'old',
      comments: [{ personaId: 'p1', text: 'too old' }],
      createdAt: oldMs,
    }];
    const personas: Persona[] = [{ id: 'p1', name: 'OldWatson', avatar: '', characterDescription: '', language: 'English', createdAt: 0 }];
    vi.mocked(listSessions).mockReturnValue([]);
    vi.mocked(listBooks).mockReturnValue([]);
    vi.mocked(listAllThreads).mockReturnValue(threads);
    vi.mocked(listPersonas).mockReturnValue(personas);

    const s = getJourneyStats('week');
    expect(s.companion).toBeNull();
  });

  it('day mode produces rows bookChartMode', () => {
    vi.mocked(listSessions).mockReturnValue([]);
    vi.mocked(listBooks).mockReturnValue([]);
    vi.mocked(listAllThreads).mockReturnValue([]);
    vi.mocked(listPersonas).mockReturnValue([]);

    const s = getJourneyStats('day');
    expect(s.bookChartMode).toBe('rows');
    expect(s.bookColumns).toHaveLength(1);
  });

  it('week/month mode produces stacked bookChartMode', () => {
    vi.mocked(listSessions).mockReturnValue([]);
    vi.mocked(listBooks).mockReturnValue([]);
    vi.mocked(listAllThreads).mockReturnValue([]);
    vi.mocked(listPersonas).mockReturnValue([]);

    expect(getJourneyStats('week').bookChartMode).toBe('stacked');
    expect(getJourneyStats('month').bookChartMode).toBe('stacked');
  });
});
