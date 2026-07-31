import { importBook } from '@/lib/import-book';
import { listBooks } from '@/lib/storage/books';

let seeding = false;

export async function seedDefaultBook(): Promise<void> {
  if (seeding) return;
  if (listBooks().some((b) => b.title === 'The Adventures of Sherlock Holmes')) return;

  seeding = true;
  try {
    const res = await fetch('/books/The Adventures of Sherlock Holmes.epub');
    if (!res.ok) return;
    const blob = await res.blob();
    const file = new File([blob], 'The Adventures of Sherlock Holmes.epub', { type: 'application/epub+zip' });
    await importBook(file);
  } catch {
    // silently fail — user can import manually
  } finally {
    seeding = false;
  }
}
