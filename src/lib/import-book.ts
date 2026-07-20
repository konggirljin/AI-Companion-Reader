import type { Book, ParsedBook } from './types';
import { parseEpub } from './epub';
import { parseTxt } from './txt';
import { idbDelMany, idbKeys, idbSet } from './storage/idb';
import { createBook } from './storage/books';

export async function importBook(file: File): Promise<Book> {
  const data = await file.arrayBuffer();
  const isEpub = /\.epub$/i.test(file.name);
  const parsed: ParsedBook = isEpub ? await parseEpub(data) : await parseTxt(data, file.name);

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
    format: isEpub ? 'epub' : 'txt',
    coverRef: parsed.cover ? idbKeys.cover(bookId) : undefined,
    toc: parsed.toc,
    chapterCount: parsed.chapters.length,
    progress: undefined,
  });
}
