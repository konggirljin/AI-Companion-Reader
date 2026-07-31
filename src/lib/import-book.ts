import type { Book, ParsedBook } from './types';
import { parseEpub } from './epub';
import { parsePdf, getPdfMeta } from './pdf';
import { parseTxt } from './txt';
import { idbDelMany, idbKeys, idbSet } from './storage/idb';
import { createBook } from './storage/books';
import { detectBookFormat } from './book-format';

export async function importBook(file: File, pdfMode?: 'native' | 'text'): Promise<Book> {
  const data = await file.arrayBuffer();
  const format = await detectBookFormat(file, data);

  const bookId = crypto.randomUUID();
  const writtenKeys: string[] = [];

  if (format === 'pdf' && pdfMode === 'native') {
    const meta = await getPdfMeta(data);
    try {
      await idbSet(idbKeys.file(bookId), file);
      writtenKeys.push(idbKeys.file(bookId));
      if (meta.cover) {
        await idbSet(idbKeys.cover(bookId), meta.cover);
        writtenKeys.push(idbKeys.cover(bookId));
      }
    } catch (err) {
      await idbDelMany(writtenKeys).catch(() => {});
      throw new Error('STORAGE_FULL');
    }

    return createBook({
      id: bookId,
      title: meta.title,
      author: meta.author,
      format,
      pdfMode: 'native',
      coverRef: meta.cover ? idbKeys.cover(bookId) : undefined,
      toc: [],
      chapterCount: 0,
      pageCount: meta.pageCount,
      progress: undefined,
    });
  }

  const parsed: ParsedBook = format === 'epub' ? await parseEpub(data)
    : format === 'pdf' ? await parsePdf(data)
    : await parseTxt(data, file.name);

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
    pdfMode: format === 'pdf' ? 'text' : undefined,
    coverRef: parsed.cover ? idbKeys.cover(bookId) : undefined,
    toc: parsed.toc,
    chapterCount: parsed.chapters.length,
    progress: undefined,
  });
}
