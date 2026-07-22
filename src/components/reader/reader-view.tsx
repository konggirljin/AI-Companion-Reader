'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Book, ParsedChapter, Persona, ReaderPrefs, Thread } from '@/lib/types';
import { idbGet, idbKeys } from '@/lib/storage/idb';
import { saveProgress } from '@/lib/storage/books';
import { getPrefs, savePrefs } from '@/lib/storage/settings';
import { addBookmark } from '@/lib/storage/bookmarks';
import { listPersonas } from '@/lib/storage/personas';
import { getSettings } from '@/lib/storage/settings';
import { addThreads, listThreads } from '@/lib/storage/threads';
import { sendToPersonas } from '@/lib/ai';
import type { ResolvedSelection } from '@/lib/selection';
import { ReaderTopbar } from './reader-topbar';
import { TocDrawer } from './toc-drawer';
import { BookmarksPanel } from './bookmarks-panel';
import { CommentsDrawer } from './comments-drawer';
import { ReaderSettings } from './reader-settings';
import { SelectionToolbar } from './selection-toolbar';
import { PersonaPicker } from './persona-picker';
import { PaginatedChapter, PAGE_FLIP_EVENT } from './paginated-chapter';
import { getActiveUserPersonaId, getUserPersona } from '@/lib/storage/user-personas';
import type { UserPersona } from '@/lib/types';



export function ReaderView({ book }: { book: Book }) {
  const router = useRouter();
  const [chapterId, setChapterId] = useState<string>(book.progress?.chapterId ?? book.toc[0]?.chapterId ?? '0');
  const [chapter, setChapter] = useState<ParsedChapter | null>(null);

  const restorePidRef = useRef<string | null>(book.progress?.paragraphId ?? null);
  const restorePageRef = useRef<number>(book.progress?.pageIndex ?? 0);
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => getPrefs());
  const [tocOpen, setTocOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const [pageIndex, setPageIndex] = useState(restorePageRef.current);
  const [pageCount, setPageCount] = useState(1);
  const [selection, setSelection] = useState<ResolvedSelection | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingPids, setPendingPids] = useState<string[]>([]);
  const [threadsVersion, setThreadsVersion] = useState(0);
  const personas: Persona[] = useMemo(() => listPersonas(), []);
  const [activeUserPersonaId, setActiveUserPersonaId] = useState<string | null>(() => getActiveUserPersonaId());

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

  // Restore page on chapter load
  useEffect(() => {
    if (!chapter) return;
    const targetPid = restorePidRef.current;
    restorePidRef.current = null;
    if (targetPid) {
      requestAnimationFrame(() => {
        const flow = document.querySelector('[data-pid]')?.parentElement;
        // find column containing pid → compute pageIndex
        const el = document.querySelector(`[data-pid="${CSS.escape(targetPid)}"]`) as HTMLElement | null;
        if (el) {
          const flowEl = el.parentElement?.parentElement as HTMLElement; // .break-inside wrapper → flow
          if (flowEl) {
            const pageWidth = (flowEl.parentElement as HTMLElement).clientWidth + 40;
            const colIdx = Math.round(el.offsetLeft / pageWidth);
            setPageIndex(Math.max(0, colIdx));
          }
        }
      });
    }
  }, [chapter]);



  const chapterIndex = Number(chapterId);
  const goChapter = useCallback((delta: number) => {
    const next = chapterIndex + delta;
    if (next >= 0 && next < book.chapterCount) setChapterId(String(next));
  }, [chapterIndex, book.chapterCount]);

  const firstVisiblePidRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePageCount = useCallback((n: number) => {
    setPageCount(n);
    setPageIndex((i) => Math.min(i, Math.max(0, n - 1)));
  }, []);

  const handleFirstVisiblePid = useCallback((pid: string) => {
    firstVisiblePidRef.current = pid;
    // debounced save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (firstVisiblePidRef.current) saveProgress(book.id, chapterId, firstVisiblePidRef.current, pageIndex);
    }, 800);
  }, [book.id, chapterId, pageIndex]);

  const goPage = useCallback((delta: number) => {
    setPageIndex((i) => {
      const next = Math.min(Math.max(0, i + delta), Math.max(0, pageCount - 1));
      return next;
    });
  }, [pageCount]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === 'number') goPage(detail);
    };
    window.addEventListener(PAGE_FLIP_EVENT, handler);
    return () => window.removeEventListener(PAGE_FLIP_EVENT, handler);
  }, [goPage]);

  const addBookmarkHere = () => {
    const pid = firstVisiblePidRef.current;
    if (!pid) return;
    addBookmark({ bookId: book.id, chapterId, paragraphId: pid });
    toast.success('Bookmark added');
  };

  const jumpTo = (targetChapterId: string, paragraphId: string) => {
    if (targetChapterId === chapterId) {
      const el = document.querySelector(`[data-pid="${CSS.escape(paragraphId)}"]`) as HTMLElement | null;
      if (el) {
        const flowEl = el.parentElement?.parentElement as HTMLElement;
        if (flowEl) {
          const pageWidth = (flowEl.parentElement as HTMLElement).clientWidth + 40;
          const colIdx = Math.round(el.offsetLeft / pageWidth);
          setPageIndex(Math.max(0, colIdx));
        }
      }
    } else {
      restorePidRef.current = paragraphId;
      saveProgress(book.id, targetChapterId, paragraphId, 0);
      setChapterId(targetChapterId);
      setPageIndex(0);
    }
  };

  // Send to AI
  const handleSend = async (personaIds: string[]) => {
    if (!selection) return;
    setPickerOpen(false);
    setToolbarPos(null);

    const settings = getSettings();
    if (!settings.apiKey) {
      toast.error('Set up your AI provider first');
      router.push('/settings');
      return;
    }
    const chosen = personas.filter((p) => personaIds.includes(p.id));
    const sentSelection = selection;
    const anchorPid = sentSelection.pids[sentSelection.pids.length - 1];
    setSending(true);
    setPendingPids([anchorPid]);
    window.getSelection()?.removeAllRanges();

    let userPersona: UserPersona | undefined;
    const activeId = getActiveUserPersonaId();
    if (activeId) userPersona = getUserPersona(activeId);

    try {
      const comments = await sendToPersonas(sentSelection.excerpt, chosen, settings, userPersona);
      const byPid = new Map<string, { personaId: string; text: string }[]>();
      for (const c of comments) {
        const para = sentSelection.excerpt[c.paragraphIndex];
        if (!para) continue;
        const arr = byPid.get(para.pid) ?? [];
        arr.push({ personaId: c.personaId, text: c.text });
        byPid.set(para.pid, arr);
      }
      const threads: Thread[] = Array.from(byPid.entries()).map(([pid, threadComments]) => ({
        id: crypto.randomUUID(),
        bookId: book.id,
        chapterId,
        paragraphId: pid,
        selectedText: sentSelection.text,
        comments: threadComments,
        createdAt: Date.now(),
      }));
      if (threads.length) {
        addThreads(threads);
        setThreadsVersion((v) => v + 1);
        toast.success(`${chosen.length === 1 ? chosen[0].name : 'Companions'} commented`);
      } else {
        toast.info('Nothing caught their attention this time');
      }
      setSelection(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const friendly =
        msg === 'CORS_NETWORK_ERROR' ? 'Connection blocked — the API may not support browser requests (CORS)'
        : msg === 'TIMEOUT' ? 'Request timed out'
        : msg.startsWith('API_ERROR_429') ? 'Rate limited — wait a moment'
        : msg === 'API_ERROR_503' ? 'Service unavailable (503) — the API is temporarily down'
        : msg.startsWith('API_ERROR_') ? `Provider error (${msg.replace('API_ERROR_', '')})`
        : msg === 'NO_JSON' || msg === 'BAD_SHAPE' ? 'Your companion got distracted'
        : 'Network error — check your connection';
      toast.error(friendly, {
        action: { label: 'Retry', onClick: () => void handleSend(personaIds) },
      });
    } finally {
      setSending(false);
      setPendingPids([]);
    }
  };

  const chapterThreads = useMemo(
    () => listThreads(book.id, chapterId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.id, chapterId, threadsVersion],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <ReaderTopbar
        title={book.title}
        onToc={() => setTocOpen(true)}
        onBookmarks={() => setBookmarksOpen(true)}
        onComments={() => setCommentsOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        activeUserPersonaId={activeUserPersonaId}
      />
      {!chapter ? (
        <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-6 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      ) : (
        <PaginatedChapter
          chapter={chapter}
          imageUrls={imageUrls}
          prefs={prefs}
          pageIndex={pageIndex}
          pageCount={pageCount}
          onPageCountChange={handlePageCount}
          onFirstVisiblePidChange={handleFirstVisiblePid}
          chapterThreads={chapterThreads}
          pendingPids={pendingPids}
          personas={personas}
          registerSelectionContainer={() => {}}
          onSelectionResolve={setSelection}
          onToolbarPos={(pos) => setToolbarPos(pos && !sending ? pos : null)}
          onSend={() => setPickerOpen(true)}
          registerBackNav={() => {}}
        />
      )}
      {/* Chapter footer nav uses page-flip */}
      {book.chapterCount > 1 && (
        <div className="mx-auto w-full max-w-2xl px-5 pb-4 flex items-center justify-between">
          <Button variant="outline" disabled={chapterIndex <= 0 && pageIndex === 0} onClick={() => {
            if (pageIndex === 0) goChapter(-1);
            else goPage(-1);
          }}>
            <ChevronLeft className="mr-1 h-4 w-4" />Back
          </Button>
          <span className="text-xs" style={{ color: 'var(--reader-muted, #8A6038)' }}>
            {pageIndex + 1} / {pageCount} · Ch {chapterIndex + 1}/{book.chapterCount}
          </span>
          <Button variant="outline" disabled={chapterIndex >= book.chapterCount - 1 && pageIndex >= pageCount - 1} onClick={() => {
            if (pageIndex >= pageCount - 1) goChapter(1);
            else goPage(1);
          }}>
            Next<ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
      <TocDrawer open={tocOpen} onOpenChange={setTocOpen} toc={book.toc} currentChapterId={chapterId} onSelect={(cid) => { window.scrollTo({ top: 0 }); setChapterId(cid); }} />
      <BookmarksPanel
        open={bookmarksOpen} onOpenChange={setBookmarksOpen} bookId={book.id}
        tocTitles={new Map(book.toc.map((t) => [t.chapterId, t.title]))}
        onJump={jumpTo}
      />
      <CommentsDrawer
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        bookId={book.id}
        personas={personas}
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
      <SelectionToolbar position={toolbarPos && !sending ? toolbarPos : null} onSend={() => setPickerOpen(true)} />
      <PersonaPicker open={pickerOpen} onOpenChange={setPickerOpen} personas={personas} onConfirm={(ids) => void handleSend(ids)} />
    </div>
  );
}
