'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Book } from '@/lib/types';
import { listBooks } from '@/lib/storage/books';
import { Bookshelf } from '@/components/books/bookshelf';
import { ImportButton } from '@/components/books/import-button';
import { BookOpen } from 'lucide-react';

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const refresh = useCallback(() => setBooks(listBooks()), []);
  useEffect(refresh, [refresh]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookshelf</h1>
        <ImportButton onImported={refresh} />
      </div>
      {books.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12" />
          <p>No books yet. Import an EPUB or TXT file to start reading.</p>
        </div>
      ) : (
        <Bookshelf books={books} onChanged={refresh} />
      )}
    </div>
  );
}
