import type { Thread } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';

export function listThreads(bookId: string, chapterId?: string): Thread[] {
  return readJson<Thread[]>(K.threads, []).filter(
    (t) => t.bookId === bookId && (chapterId === undefined || t.chapterId === chapterId),
  );
}

export function addThreads(threads: Thread[]): void {
  writeJson(K.threads, [...readJson<Thread[]>(K.threads, []), ...threads]);
}

export function deleteThreadsForBook(bookId: string): void {
  writeJson(K.threads, readJson<Thread[]>(K.threads, []).filter((t) => t.bookId !== bookId));
}
