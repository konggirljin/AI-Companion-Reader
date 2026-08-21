'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Skeleton } from '@/components/ui/skeleton';
import { idbGet, idbKeys } from '@/lib/storage/idb';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface RenderedPage {
  index: number;
  url: string;
}

export function PdfNativeReader({
  bookId,
  pageCount,
  onPageChange,
}: {
  bookId: string;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [visiblePage, setVisiblePage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const blob = await idbGet<Blob>(idbKeys.file(bookId));
        if (!blob || cancelled) return;

        const buf = await blob.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) return;

        const rendered: RenderedPage[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          const url = canvas.toDataURL('image/jpeg', 0.85);
          rendered.push({ index: i, url });
        }

        if (!cancelled) {
          setPages(rendered);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [bookId]);

  useEffect(() => {
    if (loading || !containerRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.pageIndex);
            if (!isNaN(idx)) {
              setVisiblePage(idx);
              onPageChange(idx);
            }
          }
        }
      },
      { root: containerRef.current, threshold: 0.5 },
    );
    observerRef.current = obs;

    const currentPages = pageRefs.current;
    for (const [, el] of currentPages) obs.observe(el);

    return () => obs.disconnect();
  }, [loading, pages, onPageChange]);

  const setPageRef = useCallback((idx: number, el: HTMLDivElement | null) => {
    if (el) {
      pageRefs.current.set(idx, el);
      observerRef.current?.observe(el);
    } else {
      const old = pageRefs.current.get(idx);
      if (old) observerRef.current?.unobserve(old);
      pageRefs.current.delete(idx);
    }
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: pageCount }).map((_, i) => (
          <Skeleton key={i} className="w-full" style={{ aspectRatio: '3/4' }} />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      style={{ scrollbarWidth: 'thin' }}
    >
      <div className="flex flex-col items-center gap-4 px-2 py-4">
        {pages.map((p) => (
          <div
            key={p.index}
            ref={(el) => setPageRef(p.index, el)}
            data-page-index={p.index}
            className="w-full max-w-2xl shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={`Page ${p.index}`}
              className="w-full h-auto select-none"
              draggable={false}
              style={{
                boxShadow: '0 1px 8px rgba(0,0,0,0.25)',
                borderRadius: 2,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function usePdfNativePage(): [number, number, (page: number) => void] {
  // Placeholder for compatibility — native reader handles page tracking internally
  return [1, 1, () => {}];
}
