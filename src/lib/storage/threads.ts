import type { Thread, ThreadComment } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';

export function listThreads(bookId: string, chapterId?: string): Thread[] {
  return readJson<Thread[]>(K.threads, []).filter(
    (t) => t.bookId === bookId && (chapterId === undefined || t.chapterId === chapterId),
  );
}

export function listAllThreads(): Thread[] {
  return readJson<Thread[]>(K.threads, []);
}

export function addThreads(threads: Thread[]): void {
  writeJson(K.threads, [...readJson<Thread[]>(K.threads, []), ...threads]);
}

export function appendThreadComments(threadId: string, comments: ThreadComment[]): Thread | undefined {
  let updated: Thread | undefined;
  const threads = readJson<Thread[]>(K.threads, []).map((thread) => {
    if (thread.id !== threadId) return thread;
    updated = { ...thread, comments: [...thread.comments, ...comments] };
    return updated;
  });
  writeJson(K.threads, threads);
  return updated;
}

export function deleteThreadsForBook(bookId: string): void {
  writeJson(K.threads, readJson<Thread[]>(K.threads, []).filter((t) => t.bookId !== bookId));
}
