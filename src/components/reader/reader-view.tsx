'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Book, ParsedChapter, Paragraph, ReaderPrefs } from '@/lib/types';
import { idbGet, idbKeys } from '@/lib/storage/idb';
import { saveProgress } from '@/lib/storage/books';
import { getPrefs, savePrefs } from '@/lib/storage/settings';
import { addBookmark } from '@/lib/storage/bookmarks';
import { ReaderTopbar } from './reader-topbar';
import { TocDrawer } from './toc-drawer';
import { BookmarksPanel } from './bookmarks-panel';
import { ReaderSettings } from './reader-settings';

function ParagraphBlock({ p, imageUrls }: { p: Paragraph; imageUrls: Map<string, string> }) {
  if (p.tag.startsWith('h')) {
    const Tag = p.tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    return <Tag data-pid={p.id} className="mb-4 mt-8 font-semibold">{p.text}</Tag>;
  }
  return (
    <p data-pid={p.id} className={p.tag === 'blockquote' ? 'mb-4 border-l-2 pl-4 italic text-muted-foreground' : 'mb-4'}>
      {p.text}
      {p.images?.map((img) => {
        const url = imageUrls.get(img.path);
        return url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={img.path} src={url} alt={img.alt ?? ''} className="my-3 max-h-80 rounded-md object-contain" />
        ) : null;
      })}
    </p>
  );
}

export function ReaderView({ book }: { book: Book }) {
  const [chapterId, setChapterId] = useState<string>(book.progress?.chapterId ?? book.toc[0]?.chapterId ?? '0');
  const [chapter, setChapter] = useState<ParsedChapter | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const restorePidRef = useRef<string | null>(book.progress?.paragraphId ?? null);
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => getPrefs());
  const [tocOpen, setTocOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const updatePrefs = (next: ReaderPrefs) => { setPrefs(next); savePrefs(next); };

  // Load chapter from IndexedDB
  useEffect(() => {
    let cancelled = false;
    setChapter(null);
    void idbGet<ParsedChapter>(idbKeys.chapter(book.id, chapterId)).then((c) => {
      if (!cancelled) setChapter(c ?? null);
    });
    return () => { cancelled = true; };
  }, [book.id, chapterId]);

  // Object URLs for chapter images
  const imageUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const img of chapter?.images ?? []) map.set(img.path, URL.createObjectURL(img.blob));
    return map;
  }, [chapter]);
  useEffect(() => () => { for (const url of imageUrls.values()) URL.revokeObjectURL(url); }, [imageUrls]);

  // Restore scroll position when a chapter finishes loading (if a restore target is set)
  useEffect(() => {
    if (!chapter) return;
    const targetPid = restorePidRef.current;
    restorePidRef.current = null;
    if (targetPid) {
      requestAnimationFrame(() => {
        document.querySelector(`[data-pid="${CSS.escape(targetPid)}"]`)?.scrollIntoView({ block: 'start' });
      });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [chapter]);

  // Save progress on scroll (debounced)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const blocks = document.querySelectorAll('[data-pid]');
        for (const el of Array.from(blocks)) {
          if (el.getBoundingClientRect().top >= 0) {
            saveProgress(book.id, chapterId, el.getAttribute('data-pid')!);
            break;
          }
        }
      }, 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(timer); };
  }, [book.id, chapterId]);

  const chapterIndex = Number(chapterId);
  const goChapter = useCallback((delta: number) => {
    const next = chapterIndex + delta;
    if (next >= 0 && next < book.chapterCount) setChapterId(String(next));
  }, [chapterIndex, book.chapterCount]);

  const firstVisiblePid = (): string | null => {
    for (const el of Array.from(document.querySelectorAll('[data-pid]'))) {
      if (el.getBoundingClientRect().top >= 0) return el.getAttribute('data-pid');
    }
    return null;
  };

  const addBookmarkHere = () => {
    const pid = firstVisiblePid();
    if (!pid) return;
    addBookmark({ bookId: book.id, chapterId, paragraphId: pid });
    toast.success('Bookmark added');
  };

  const jumpTo = (targetChapterId: string, paragraphId: string) => {
    if (targetChapterId === chapterId) {
      document.querySelector(`[data-pid="${CSS.escape(paragraphId)}"]`)?.scrollIntoView({ block: 'start' });
    } else {
      restorePidRef.current = paragraphId;
      saveProgress(book.id, targetChapterId, paragraphId);
      setChapterId(targetChapterId);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <ReaderTopbar
        title={book.title}
        onToc={() => setTocOpen(true)}
        onBookmarks={() => setBookmarksOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />
      <div
        id="reader-content"
        ref={containerRef}
        className="mx-auto w-full max-w-2xl flex-1 px-5 py-6"
        style={{ fontSize: prefs.fontSize, lineHeight: prefs.lineSpacing, fontFamily: prefs.fontFamily }}
      >
        {!chapter ? (
          <div className="space-y-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
        ) : (
          <>
            <h2 className="mb-6 text-xl font-bold">{chapter.title}</h2>
            {chapter.paragraphs.map((p) => (
              <ParagraphBlock key={p.id} p={p} imageUrls={imageUrls} />
            ))}
            <div className="mt-10 flex items-center justify-between border-t pt-6">
              <Button variant="outline" disabled={chapterIndex <= 0} onClick={() => goChapter(-1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />Previous
              </Button>
              <span className="text-xs text-muted-foreground">{chapterIndex + 1} / {book.chapterCount}</span>
              <Button variant="outline" disabled={chapterIndex >= book.chapterCount - 1} onClick={() => goChapter(1)}>
                Next<ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
      <TocDrawer open={tocOpen} onOpenChange={setTocOpen} toc={book.toc} currentChapterId={chapterId} onSelect={(cid) => { window.scrollTo({ top: 0 }); setChapterId(cid); }} />
      <BookmarksPanel
        open={bookmarksOpen} onOpenChange={setBookmarksOpen} bookId={book.id}
        tocTitles={new Map(book.toc.map((t) => [t.chapterId, t.title]))}
        onJump={jumpTo}
      />
      <ReaderSettings open={settingsOpen} onOpenChange={setSettingsOpen} prefs={prefs} onChange={updatePrefs} />
      <Button
        variant="secondary" size="icon"
        className="fixed bottom-6 right-6 z-40 h-11 w-11 rounded-full shadow-lg"
        onClick={addBookmarkHere} aria-label="Bookmark here"
      >
        <BookmarkPlus className="h-5 w-5" />
      </Button>
    </div>
  );
}
