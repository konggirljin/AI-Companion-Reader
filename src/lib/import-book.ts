import type { Book, ParsedBook } from './types';
import { parseEpub } from './epub';
import { parseTxt } from './txt';
import { idbDelMany, idbKeys, idbSet } from './storage/idb';
import { createBook, listBooks } from './storage/books';
import { detectBookFormat } from './book-format';

async function fingerprintFile(file: File, data: ArrayBuffer): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export async function importBook(file: File): Promise<Book> {
  const data = await file.arrayBuffer();
  const sourceFingerprint = await fingerprintFile(file, data);
  if (listBooks().some((book) => book.sourceFingerprint === sourceFingerprint)) {
    throw new Error('DUPLICATE_BOOK');
  }
  const format = await detectBookFormat(file, data);
  const parsed: ParsedBook = format === 'epub' ? await parseEpub(data) : await parseTxt(data, file.name);

  const bookId = crypto.randomUUID();
  const writtenKeys: string[] = [];
  try {
    await idbSet(idbKeys.file(bookId), file);
    writtenKeys.push(idbKeys.file(bookId));
    if (parsed.cover) {
      await idbSet(idbKeys.cover(bookId), parsed.cover);
      writtenKeys.push(idbKeys.cover(bookId));
    }
    for (const chapter of parsed.chapters) {
      await idbSet(idbKeys.chapter(bookId, chapter.id), chapter);
      writtenKeys.push(idbKeys.chapter(bookId, chapter.id));
    }
  } catch (err) {
    // Likely QuotaExceededError — roll back partial writes (spec §5: no partial entries)
    await idbDelMany(writtenKeys).catch(() => {});
    throw new Error('STORAGE_FULL');
  }

  return createBook({
    id: bookId,
    title: parsed.title,
    author: parsed.author,
    format,
    coverRef: parsed.cover ? idbKeys.cover(bookId) : undefined,
    toc: parsed.toc,
    chapterCount: parsed.chapters.length,
    sourceFingerprint,
    progress: undefined,
  });
}
