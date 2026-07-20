import type { Book } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';
import { idbDelMany, idbKeys } from './idb';
import { deleteThreadsForBook } from './threads';
import { deleteBookmarksForBook } from './bookmarks';

export function listBooks(): Book[] {
  return readJson<Book[]>(K.books, []).sort((a, b) => a.order - b.order);
}

function writeBooks(books: Book[]): void {
  writeJson(K.books, books);
}

export function getBook(id: string): Book | undefined {
  return listBooks().find((b) => b.id === id);
}

export function createBook(meta: Omit<Book, 'addedAt' | 'order'>): Book {
  const books = listBooks();
  const book: Book = {
    ...meta,
    addedAt: Date.now(),
    order: books.length ? Math.max(...books.map((b) => b.order)) + 1 : 0,
  };
  writeBooks([...books, book]);
  return book;
}

export function renameBook(id: string, title: string): void {
  writeBooks(listBooks().map((b) => (b.id === id ? { ...b, title } : b)));
}

export async function deleteBook(id: string): Promise<void> {
  const book = getBook(id);
  writeBooks(listBooks().filter((b) => b.id !== id));
  deleteThreadsForBook(id);
  deleteBookmarksForBook(id);
  const chapterKeys = Array.from({ length: book?.chapterCount ?? 0 }, (_, i) => idbKeys.chapter(id, String(i)));
  await idbDelMany([idbKeys.file(id), idbKeys.cover(id), ...chapterKeys]).catch(() => {});
}

export function reorderBooks(orderedIds: string[]): void {
  const books = listBooks();
  writeBooks(
    orderedIds
      .map((id, i) => {
        const b = books.find((x) => x.id === id);
        return b ? { ...b, order: i } : undefined;
      })
      .filter((b): b is Book => Boolean(b)),
  );
}

export function saveProgress(bookId: string, chapterId: string, paragraphId: string): void {
  writeBooks(listBooks().map((b) => (b.id === bookId ? { ...b, progress: { chapterId, paragraphId } } : b)));
}
