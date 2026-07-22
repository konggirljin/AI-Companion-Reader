'use client';
import { useCallback, useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { Book } from '@/lib/types';
import { listBooks } from '@/lib/storage/books';
import { Bookshelf } from '@/components/books/bookshelf';
import { BookHeader } from '@/components/books/book-header';
import { FilterPills, type FilterId } from '@/components/books/filter-pills';
import { VaseDecoration } from '@/components/books/motifs';

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filter, setFilter] = useState<FilterId>('all');
  const refresh = useCallback(() => setBooks(listBooks()), []);
  useEffect(refresh, [refresh]);

  return (
    <div className="mx-auto flex w-full max-w-[1024px] flex-1 flex-col">
      <BookHeader onImported={refresh} />
      <FilterPills value={filter} onChange={setFilter} />
      <div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: 'none' }}>
        {books.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="w-full max-w-[160px]" style={{ aspectRatio: '2 / 3' }}>
              <VaseDecoration />
            </div>
            <BookOpen className="h-10 w-10" style={{ color: '#C89060' }} />
            <p style={{ color: '#9A7048' }}>No books yet. Import an EPUB or TXT file to start reading.</p>
          </div>
        ) : (
          <Bookshelf books={books} onChanged={refresh} />
        )}
      </div>
    </div>
  );
}
