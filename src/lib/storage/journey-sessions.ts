import { K } from './keys';
import { readJson, writeJson } from './local';

export interface ReadingSession {
  id: string;
  bookId: string;
  date: string;            // YYYY-MM-DD (local calendar day)
  durationSeconds: number;
  startedAt: number;       // ms timestamp
}

export function listSessions(): ReadingSession[] {
  return readJson<ReadingSession[]>(K.journeySessions, []);
}

export function addSession(s: Omit<ReadingSession, 'id'>): void {
  const session: ReadingSession = { ...s, id: crypto.randomUUID() };
  writeJson(K.journeySessions, [...listSessions(), session]);
}

export function deleteSessionsForBook(bookId: string): void {
  writeJson(K.journeySessions, listSessions().filter((s) => s.bookId !== bookId));
}

export function clearAllSessions(): void {
  writeJson(K.journeySessions, []);
}