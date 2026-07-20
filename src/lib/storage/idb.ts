import { createStore, get, set, del, delMany } from 'idb-keyval';

const store = createStore('arc-books', 'kv');

export function idbSet(key: string, value: unknown): Promise<void> {
  return set(key, value, store);
}
export function idbGet<T>(key: string): Promise<T | undefined> {
  return get<T>(key, store);
}
export function idbDel(key: string): Promise<void> {
  return del(key, store);
}
export function idbDelMany(keys: string[]): Promise<void> {
  return delMany(keys, store);
}

// Key conventions:
//   book:{bookId}:file            → original File/Blob
//   book:{bookId}:cover           → cover Blob
//   book:{bookId}:chapter:{cid}   → ParsedChapter
export const idbKeys = {
  file: (bookId: string) => `book:${bookId}:file`,
  cover: (bookId: string) => `book:${bookId}:cover`,
  chapter: (bookId: string, chapterId: string) => `book:${bookId}:chapter:${chapterId}`,
};
