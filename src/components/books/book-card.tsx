'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Book } from '@/lib/types';
import { idbGet } from '@/lib/storage/idb';
import { BookMenu } from './book-menu';

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

  const chapterNum = book.progress ? Number(book.progress.chapterId) + 1 : 0;
  const progressText = book.progress ? `Ch. ${chapterNum}/${book.chapterCount}` : 'Not started';

  return (
    <Card className="group relative transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/read?id=${book.id}`} className="block">
        <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-t-lg bg-muted">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <BookOpen className="h-10 w-10 text-muted-foreground/50" />
          )}
        </div>
        <CardContent className="p-3">
          <p className="line-clamp-2 text-sm font-medium">{book.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{book.author || book.format.toUpperCase()}</p>
          <p className="mt-1 text-xs text-muted-foreground">{progressText}</p>
        </CardContent>
      </Link>
      <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
        <BookMenu book={book} onChanged={onChanged} />
      </div>
    </Card>
  );
}
