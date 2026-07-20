'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Book } from '@/lib/types';
import { getBook } from '@/lib/storage/books';
import { ReaderView } from '@/components/reader/reader-view';
import { Skeleton } from '@/components/ui/skeleton';

function ReaderPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get('id') ?? '';
  const [book, setBook] = useState<Book | null | undefined>(undefined);

  useEffect(() => {
    const found = getBook(id);
    setBook(found ?? null);
  }, [id]);

  if (book === undefined) return <div className="container mx-auto max-w-2xl p-8"><Skeleton className="h-96 w-full" /></div>;
  if (book === null) {
    router.replace('/');
    return null;
  }
  return <ReaderView book={book} />;
}

export default function ReaderPage() {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-2xl p-8"><Skeleton className="h-96 w-full" /></div>}>
      <ReaderPageInner />
    </Suspense>
  );
}
