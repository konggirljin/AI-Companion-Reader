'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { Book, NumberedParagraph, ParsedChapter, Persona, ReaderPrefs, Thread } from '@/lib/types';
import { idbGet, idbKeys } from '@/lib/storage/idb';
import { saveProgress, updateBookStatus } from '@/lib/storage/books';
import { useReadingSession } from '@/lib/use-reading-session';
import { seedDefaultPersonas } from '@/lib/storage/seed-personas';
import { getPrefs, savePrefs } from '@/lib/storage/settings';
import { addBookmark, listHighlights } from '@/lib/storage/bookmarks';
import { listPersonas } from '@/lib/storage/personas';
import { getSettings } from '@/lib/storage/settings';
import { useLang } from '@/lib/lang-context';
import { addThreads, listThreads } from '@/lib/storage/threads';
import { countWords } from '@/lib/word-count';
import { sendToPersonas } from '@/lib/ai';
import type { ResolvedSelection } from '@/lib/selection';
import { ReaderTopbar } from './reader-topbar';
import { TocDrawer } from './toc-drawer';
import { BookmarksPanel } from './bookmarks-panel';
import { CommentsDrawer } from './comments-drawer';
import { SelectionToolbar } from './selection-toolbar';
import { PersonaPicker } from './persona-picker';
import { PaginatedChapter, PAGE_FLIP_EVENT } from './paginated-chapter';
import { getActiveUserPersonaId, getUserPersona } from '@/lib/storage/user-personas';
import type { UserPersona } from '@/lib/types';



export function ReaderView({ book }: { book: Book }) {
  const router = useRouter();
  const { t } = useLang();
  useReadingSession(book.id);
  const [chapterId, setChapterId] = useState<string>(book.progress?.chapterId ?? book.toc[0]?.chapterId ?? '0');
  const [chapter, setChapter] = useState<ParsedChapter | null>(null);

  const restorePidRef = useRef<string | null>(book.progress?.paragraphId ?? null);
  const restorePageRef = useRef<number>(book.progress?.pageIndex ?? 0);
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => getPrefs());
  const [tocOpen, setTocOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const [barsVisible, setBarsVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barsVisibleRef = useRef(barsVisible);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
  }, []);

  const resetHideTimer = useCallback(() => {
    clearHideTimer();
    if (barsVisible) {
      hideTimerRef.current = setTimeout(() => setBarsVisible(false), 5000);
    }
  }, [barsVisible, clearHideTimer]);

  const toggleBars = useCallback(() => {
    setBarsVisible((v) => !v);
  }, []);

  useEffect(() => {
    if (barsVisible) resetHideTimer();
    return () => clearHideTimer();
  }, [barsVisible, resetHideTimer, clearHideTimer]);

  useEffect(() => { barsVisibleRef.current = barsVisible; }, [barsVisible]);

  // Android back button: show bars first, then navigate back
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      if (!barsVisibleRef.current) {
        setBarsVisible(true);
        clearHideTimer();
        window.history.pushState(null, '', window.location.href);
      } else {
        window.removeEventListener('popstate', onPopState);
        window.location.href = '/';
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  const [pageIndex, setPageIndex] = useState(restorePageRef.current);
  const [pageCount, setPageCount] = useState(1);
  const [selection, setSelection] = useState<ResolvedSelection | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingPids, setPendingPids] = useState<string[]>([]);
  const [threadsVersion, setThreadsVersion] = useState(0);
  const [highlightsVersion, setHighlightsVersion] = useState(0);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserPersonaId, setActiveUserPersonaId] = useState<string | null>(() => getActiveUserPersonaId());
  const [chapterExcerpt, setChapterExcerpt] = useState<NumberedParagraph[] | null>(null);
  const [chapterContextOpen, setChapterContextOpen] = useState(false);
  const [chapterContextWords, setChapterContextWords] = useState(0);
  const [chapterContextMode, setChapterContextMode] = useState<'chapter_start' | 'double_click'>('chapter_start');

  const updatePrefs = (next: ReaderPrefs) => { setPrefs(next); savePrefs(next); };

  // Seed + load personas
  useEffect(() => {
    seedDefaultPersonas();
    setPersonas(listPersonas());
  }, []);

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
    resetHideTimer();
    const next = chapterIndex + delta;
    if (next >= 0 && next < book.chapterCount) {
      setChapterId(String(next));
      setPageIndex(0);
    } else if (delta > 0 && next >= book.chapterCount) {
      updateBookStatus(book.id, 'finished');
      toast.success(t('reader.finished'));
    }
  }, [chapterIndex, book.chapterCount, book.id, resetHideTimer, t]);

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
    resetHideTimer();
    if (delta < 0 && pageIndex === 0) { goChapter(-1); return; }
    if (delta > 0 && pageIndex >= pageCount - 1) { goChapter(1); return; }
    setPageIndex((i) => Math.min(Math.max(0, i + delta), Math.max(0, pageCount - 1)));
  }, [pageIndex, pageCount, goChapter, resetHideTimer]);

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
    toast.success(t('reader.bookmarkAdded'));
  };

  const handleDoubleClickParagraph = useCallback((pid: string) => {
    if (!chapter) return;
    const idx = chapter.paragraphs.findIndex((p) => p.id === pid);
    if (idx === -1) return;
    const sliced = chapter.paragraphs.slice(0, idx + 1);
    const excerpt: NumberedParagraph[] = sliced.map((p, i) => ({ index: i, pid: p.id, text: p.text }));
    const words = excerpt.reduce((sum, p) => sum + countWords(p.text), 0);
    if (words > 7000) {
      toast.error(t('reader.tooLong', { words }));
      return;
    }
    setChapterExcerpt(excerpt);
    setChapterContextWords(words);
    setChapterContextOpen(true);
    setChapterContextMode('double_click');
    window.getSelection()?.removeAllRanges();
  }, [chapter, t]);

  const handleSendChapterStart = useCallback(() => {
    if (!chapter) return;
    let words = 0;
    const excerpt: NumberedParagraph[] = [];
    for (let i = 0; i < chapter.paragraphs.length; i++) {
      const p = chapter.paragraphs[i];
      const w = countWords(p.text);
      if (words + w > 7000) break;
      excerpt.push({ index: i, pid: p.id, text: p.text });
      words += w;
    }
    if (excerpt.length === 0) return;
    setChapterExcerpt(excerpt);
    setChapterContextWords(words);
    setChapterContextOpen(true);
    setChapterContextMode('chapter_start');
  }, [chapter]);

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

  // Highlight text → save as a bookmark with kind='highlight'
  const handleHighlight = useCallback(() => {
    if (!selection) return;
    setToolbarPos(null);
    for (const r of selection.ranges) {
      addBookmark({
        bookId: book.id,
        chapterId,
        paragraphId: r.pid,
        kind: 'highlight',
        text: selection.text,
        startOffset: r.start,
        endOffset: r.end,
      });
    }
    setSelection(null);
    setHighlightsVersion((v) => v + 1);
  }, [selection, book.id, chapterId]);

  // Send to AI
  const handleSend = async (personaIds: string[]) => {
    if (!selection) return;
    setPickerOpen(false);
    setToolbarPos(null);

    const settings = getSettings();
    if (!settings.apiKey) {
      toast.error(t('reader.setupAi'));
      router.push('/settings');
      return;
    }
    const chosen = personas.filter((p) => personaIds.includes(p.id));
    const isChapterContext = chapterExcerpt !== null;
    const useExcerpt = isChapterContext ? chapterExcerpt : selection?.excerpt;
    const usePids = isChapterContext ? chapterExcerpt.map((p) => p.pid) : selection?.pids;
    if (!useExcerpt) return;
    const anchorPid = usePids[usePids.length - 1];
    setSending(true);
    setPendingPids([anchorPid]);
    window.getSelection()?.removeAllRanges();

    let userPersona: UserPersona | undefined;
    const activeId = getActiveUserPersonaId();
    if (activeId) userPersona = getUserPersona(activeId);

    try {
      const comments = await sendToPersonas(useExcerpt, chosen, settings, userPersona);
      const byPid = new Map<string, { personaId: string; text: string }[]>();
      for (const c of comments) {
        const para = useExcerpt[c.paragraphIndex];
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
        selectedText: isChapterContext ? useExcerpt.map((p) => p.text).join('\n\n') : selection!.text,
        comments: threadComments,
        createdAt: Date.now(),
      }));
      if (threads.length) {
        addThreads(threads);
        setThreadsVersion((v) => v + 1);
        toast.success(chosen.length === 1 ? t('reader.commented', { name: chosen[0].name }) : t('reader.companionsCommented'));
      } else {
        toast.info(t('reader.nothingCaught'));
      }
      setSelection(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const friendly =
        msg === 'CORS_NETWORK_ERROR' ? t('reader.error.cors')
        : msg === 'TIMEOUT' ? t('reader.error.timeout')
        : msg.startsWith('API_ERROR_429') ? t('reader.error.rateLimit')
        : msg === 'API_ERROR_503' ? t('reader.error.overloaded')
        : msg.startsWith('API_ERROR_') ? t('reader.error.provider', { msg: msg.replace('API_ERROR_', '') })
        : msg === 'NO_JSON' || msg === 'BAD_SHAPE' ? t('reader.error.distracted')
        : t('reader.error.network');
      toast.error(friendly, {
        action: { label: t('reader.retry'), onClick: () => void handleSend(personaIds) },
      });
    } finally {
      setSending(false);
      setPendingPids([]);
      setChapterExcerpt(null);
    }
  };

  const chapterThreads = useMemo(
    () => listThreads(book.id, chapterId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.id, chapterId, threadsVersion],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const highlightedPids = useMemo(() => {
    const map = new Map<string, { start: number; end: number }[]>();
    for (const h of listHighlights(book.id)) {
      const arr = map.get(h.paragraphId) ?? [];
      if (h.startOffset != null && h.endOffset != null) {
        arr.push({ start: h.startOffset, end: h.endOffset });
      }
      map.set(h.paragraphId, arr);
    }
    return map;
  }, [book.id, highlightsVersion]);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div
        className={`absolute left-0 right-0 top-0 z-50 transition-opacity duration-300 ${barsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onPointerDown={resetHideTimer}
      >
        <ReaderTopbar
        title={book.title}
        onToc={() => setTocOpen(true)}
        onBookmarks={() => setBookmarksOpen(true)}
        onComments={() => setCommentsOpen(true)}
        activeUserPersonaId={activeUserPersonaId}
        onUserPersonaActivate={(id) => setActiveUserPersonaId(id)}
        prefs={prefs}
        onChange={updatePrefs}
        />
      </div>
      {!chapter ? (
        <div className="absolute inset-0 p-6 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      ) : (
        <div className="absolute inset-0">
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
          onDoubleClickParagraph={handleDoubleClickParagraph}
          onSendChapterStart={handleSendChapterStart}
          onToggleBars={toggleBars}
          onInteraction={resetHideTimer}
          highlightedPids={highlightedPids}
        />
        </div>
      )}
      {/* Chapter footer nav uses page-flip */}
      {book.chapterCount > 1 && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-50 transition-opacity duration-300 ${barsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onPointerDown={resetHideTimer}
        >
          <div className="mx-auto w-full max-w-2xl px-5 pb-4 flex items-center justify-center">
          <span className="text-xs" style={{ color: 'var(--reader-muted, #8A6038)' }}>
            {pageIndex + 1} / {pageCount} · Ch {chapterIndex + 1}/{book.chapterCount}
          </span>
          </div>
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
      <div
        className={`fixed bottom-6 right-6 z-40 transition-opacity duration-300 ${barsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onPointerDown={resetHideTimer}
      >
        <Button
          variant="secondary" size="icon"
          className="h-11 w-11 rounded-full shadow-lg"
          onClick={addBookmarkHere} aria-label={t('reader.bookmarkHere')}
        >
          <BookmarkPlus className="h-5 w-5" />
        </Button>
      </div>
      <SelectionToolbar position={toolbarPos && !sending ? toolbarPos : null} onSend={() => setPickerOpen(true)} onHighlight={handleHighlight} />
      <PersonaPicker open={pickerOpen && !chapterContextOpen} onOpenChange={setPickerOpen} personas={personas} onConfirm={(ids) => void handleSend(ids)} />
      <Dialog open={chapterContextOpen} onOpenChange={setChapterContextOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('reader.sendTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {chapterContextMode === 'chapter_start'
              ? t('reader.shareFullChapter')
              : t('reader.shareChapter')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChapterContextOpen(false)}>{t('reader.cancel')}</Button>
            <Button onClick={() => { setChapterContextOpen(false); setPickerOpen(true); }}>{t('reader.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
