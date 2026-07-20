import type { Bookmark } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';

export function listBookmarks(bookId: string): Bookmark[] {
  return readJson<Bookmark[]>(K.bookmarks, []).filter((b) => b.bookId === bookId);
}

export function addBookmark(b: Omit<Bookmark, 'id' | 'createdAt'>): Bookmark {
  const bookmark: Bookmark = { ...b, id: crypto.randomUUID(), createdAt: Date.now() };
  writeJson(K.bookmarks, [...readJson<Bookmark[]>(K.bookmarks, []), bookmark]);
  return bookmark;
}

export function deleteBookmark(id: string): void {
  writeJson(K.bookmarks, readJson<Bookmark[]>(K.bookmarks, []).filter((b) => b.id !== id));
}

export function deleteBookmarksForBook(bookId: string): void {
  writeJson(K.bookmarks, readJson<Bookmark[]>(K.bookmarks, []).filter((b) => b.bookId !== bookId));
}
