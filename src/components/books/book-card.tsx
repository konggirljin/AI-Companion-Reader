'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { idbGet } from '@/lib/storage/idb';
import type { Book } from '@/lib/types';
import { BookMenu } from './book-menu';
import { GeneratedCover } from './generated-cover';

export function BookCard({ book, onChanged }: { book: Book; onChanged: () => void }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (book.coverRef) {
      void idbGet<Blob>(book.coverRef).then((blob) => {
        if (blob && !cancelled) {
          url = URL.createObjectURL(blob);
          setCoverUrl(url);
        }
      });
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [book.coverRef]);

  const progressFraction = book.progress && book.chapterCount > 0
    ? (Number(book.progress.chapterId) + 1) / book.chapterCount
    : 0;

  return (
    <div className="group relative flex-1 min-w-0" style={{ aspectRatio: '2 / 3' }}>
      <Link
        href={`/read?id=${book.id}`}
        className="absolute inset-0 block overflow-hidden transition-transform duration-200 hover:-translate-y-2 active:translate-y-0"
        style={{
          borderRadius: '2px 5px 5px 2px',
          boxShadow: '3px 0 6px rgba(0,0,0,0.45), inset -2px 0 4px rgba(0,0,0,0.25)',
        }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={book.title} className="h-full w-full object-cover" />
        ) : (
          <GeneratedCover seed={book.id} title={book.title} tag={book.author || book.format.toUpperCase()} />
        )}
        <span
          className="pointer-events-none absolute bottom-0 left-0 block h-[3px]"
          style={{
            width: `${Math.min(100, Math.max(0, progressFraction * 100))}%`,
            background: 'hsl(var(--secondary-foreground))',
          }}
          aria-hidden="true"
        />
      </Link>
      <div className="absolute right-1 top-1 z-20 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <BookMenu book={book} onChanged={onChanged} />
      </div>
    </div>
  );
}
