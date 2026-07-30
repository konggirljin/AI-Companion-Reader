'use client';
import { useCallback, useEffect, useRef } from 'react';
import type { ParsedChapter, Paragraph, Persona, ReaderPrefs, Thread } from '@/lib/types';
import type { ResolvedSelection } from '@/lib/selection';
import { readerContentStyle } from '@/lib/reader-themes';
import { resolveSelection } from '@/lib/selection';
import { countWords } from '@/lib/word-count';
import { t as translate } from '@/lib/i18n';
import { getSettings } from '@/lib/storage/settings';
import { Button } from '@/components/ui/button';
import { CommentPopover } from './comment-popover';

export const PAGE_FLIP_EVENT = 'arc:page-flip';

const GAP = 40;
const PAGE_ANIMATION_MS: Record<ReaderPrefs['pageAnimation'], number> = {
  none: 0,
  fast: 150,
  normal: 250,
  slow: 450,
};

const HIGHLIGHT_STYLE: React.CSSProperties = { textDecoration: 'underline', textDecorationStyle: 'dotted', textDecorationColor: 'hsl(var(--primary))', textUnderlineOffset: '4px' };

function HighlightedText({ text, ranges }: { text: string; ranges: { start: number; end: number }[] }) {
  if (!ranges.length) return <>{text}</>;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const r of sorted) {
    const s = Math.max(0, r.start);
    const e = Math.min(text.length, r.end);
    if (s > cursor) parts.push(<span key={`t${cursor}`}>{text.slice(cursor, s)}</span>);
    if (e > s) parts.push(<span key={`h${s}`} style={HIGHLIGHT_STYLE}>{text.slice(s, e)}</span>);
    cursor = e;
  }
  if (cursor < text.length) parts.push(<span key={`t${cursor}`}>{text.slice(cursor)}</span>);
  return <>{parts}</>;
}

function ParagraphBlock({ p, imageUrls, highlightRanges }: { p: Paragraph; imageUrls: Map<string, string>; highlightRanges: { start: number; end: number }[] }) {
  const hasHighlights = highlightRanges.length > 0;
  const textContent = (
    <>
      <HighlightedText text={p.text} ranges={highlightRanges} />
      {p.images?.map((img) => {
        const url = imageUrls.get(img.path);
        return url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={img.path} src={url} alt={img.alt ?? ''} className="my-3 max-h-[60vh] rounded-md object-contain" />
        ) : null;
      })}
    </>
  );
  if (p.tag.startsWith('h')) {
    const Tag = p.tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    return <Tag data-pid={p.id} className="mb-4 mt-8 font-semibold" style={hasHighlights ? HIGHLIGHT_STYLE : undefined}>{textContent}</Tag>;
  }
  return (
    <p data-pid={p.id} className={p.tag === 'blockquote' ? 'mb-4 border-l-2 pl-4 italic' : 'mb-4'}>
      {textContent}
    </p>
  );
}

interface PaginatedChapterProps {
  chapter: ParsedChapter;
  imageUrls: Map<string, string>;
  prefs: ReaderPrefs;
  pageIndex: number;
  pageCount: number;
  onPageCountChange: (n: number) => void;
  onFirstVisiblePidChange: (pid: string) => void;
  chapterThreads: Thread[];
  pendingPids: string[];
  personas: Persona[];
  replyingThreadId: string | null;
  onContinueThread: (threadId: string, personaId: string, question: string) => Promise<boolean>;
  registerSelectionContainer: (el: HTMLDivElement | null) => void;
  onSelectionResolve: (resolved: ResolvedSelection | null) => void;
  onToolbarPos: (pos: { x: number; y: number } | null) => void;
  registerBackNav: (goDelta: (d: number) => void) => void;
  onOpenSettings?: () => void;
  onInteraction?: () => void;
  highlightedPids: Map<string, { start: number; end: number }[]>;
}

export function PaginatedChapter(props: PaginatedChapterProps) {
  const { chapter, imageUrls, prefs, pageIndex, pageCount, onPageCountChange, onFirstVisiblePidChange,
    chapterThreads, pendingPids, personas, replyingThreadId, onContinueThread, registerSelectionContainer, onSelectionResolve,
    onToolbarPos, registerBackNav, onOpenSettings, onInteraction,
    highlightedPids } = props;

  const viewportRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const pageIndexRef = useRef(pageIndex);
  pageIndexRef.current = pageIndex;
  const overLimitNotifiedRef = useRef(false);
  const swipeFiredRef = useRef(false);

  const pageWidthRef = useRef(GAP);

  const reportFirstVisibleScrollPid = useCallback(() => {
    const flow = flowRef.current, vp = viewportRef.current;
    if (!flow || !vp) return;
    const viewportTop = vp.getBoundingClientRect().top;
    const firstVisible = Array.from(flow.querySelectorAll<HTMLElement>('[data-pid]'))
      .find((el) => el.getBoundingClientRect().bottom > viewportTop + 8);
    const pid = firstVisible?.getAttribute('data-pid');
    if (pid) onFirstVisiblePidChange(pid);
  }, [onFirstVisiblePidChange]);

  const reflow = useCallback(() => {
    const flow = flowRef.current, vp = viewportRef.current;
    if (!flow || !vp) return;
    if (prefs.readingMode === 'scroll') {
      flow.style.height = 'auto';
      flow.style.columnWidth = 'auto';
      flow.style.columnGap = '0px';
      pageWidthRef.current = vp.clientWidth;
      onPageCountChange(1);
      reportFirstVisibleScrollPid();
      return;
    }
    vp.scrollTop = 0;
    const displayHeight = (flow.parentNode as HTMLElement).clientHeight;
    flow.style.height = `${displayHeight}px`;
    const colWidth = flow.clientWidth || vp.clientWidth - 40;
    flow.style.columnWidth = `${colWidth}px`;
    flow.style.columnGap = `${GAP}px`;
    const pageWidth = colWidth + GAP;
    pageWidthRef.current = pageWidth;
    // images capped relative to flow height
    const n = Math.max(1, Math.round(flow.scrollWidth / pageWidth));
    onPageCountChange(n);
    // report first visible pid on current page
    const leftBoundary = pageIndexRef.current * pageWidth;
    const rightBoundary = leftBoundary + pageWidth;
    let firstPid: string | null = null;
    for (const el of Array.from(flow.querySelectorAll<HTMLElement>('[data-pid]'))) {
      const left = el.offsetLeft;
      const right = left + el.offsetWidth;
      if (right > leftBoundary && left < rightBoundary) { firstPid = el.getAttribute('data-pid'); break; }
    }
    if (firstPid) onFirstVisiblePidChange(firstPid);
  }, [onPageCountChange, onFirstVisiblePidChange, prefs.readingMode, reportFirstVisibleScrollPid]);

  // reflow on chapter + prefs change
  useEffect(() => {
    const raf = requestAnimationFrame(reflow);
    return () => cancelAnimationFrame(raf);
  }, [chapter, prefs.fontSize, prefs.lineSpacing, prefs.fontFamily, prefs.theme, prefs.readingMode, reflow]);

  // reflow on resize (debounced)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(t); t = setTimeout(reflow, 250); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
  }, [reflow]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || prefs.readingMode !== 'scroll') return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(reportFirstVisibleScrollPid);
      onInteraction?.();
    };
    vp.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      vp.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [prefs.readingMode, reportFirstVisibleScrollPid, onInteraction]);

  // expose navigation
  useEffect(() => {
    registerBackNav((d: number) => {
      // handled by parent; this is a no-op placeholder so parent owns state
      void d;
    });
  }, [registerBackNav]);

  // keyboard arrows
  useEffect(() => {
    if (prefs.readingMode !== 'paginated') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        window.dispatchEvent(new CustomEvent(PAGE_FLIP_EVENT, { detail: -1 }));
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        window.dispatchEvent(new CustomEvent(PAGE_FLIP_EVENT, { detail: 1 }));
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prefs.readingMode]);

  // swipe via pointer events — works anywhere on screen, skips interactive elements
  useEffect(() => {
    if (prefs.readingMode !== 'paginated') return;
    let startX = 0, startY = 0, active = false;
    const down = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, select, textarea, [role="button"]')) return;
      active = true; startX = e.clientX; startY = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        swipeFiredRef.current = true;
        setTimeout(() => { swipeFiredRef.current = false; }, 500);
        window.dispatchEvent(new CustomEvent(PAGE_FLIP_EVENT, { detail: dx < 0 ? 1 : -1 }));
      }
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); };
  }, [chapter, prefs.readingMode]);

  // selection tracking (delegated to reader-view via callbacks)
  useEffect(() => {
    const container = flowRef.current;
    if (!container) return;
    registerSelectionContainer(container);
    const update = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        onToolbarPos(null);
        overLimitNotifiedRef.current = false;
        return;
      }
      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) { onToolbarPos(null); return; }
      const resolved = resolveSelection(range, container);
      if (!resolved) { onToolbarPos(null); return; }
      if (countWords(resolved.text) > 7000) {
        onToolbarPos(null); onSelectionResolve(null);
        if (!overLimitNotifiedRef.current) {
          overLimitNotifiedRef.current = true;
          import('sonner').then(({ toast }) => { const lang = getSettings().language; toast.error(translate(lang, 'reader.selectShorter')); });
        }
        return;
      }
      onSelectionResolve(resolved);
      const rects = range.getClientRects();
      const lastRect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();
      const vp = viewportRef.current;
      const vpRect = vp?.getBoundingClientRect();
      const offset = prefs.readingMode === 'paginated' ? pageIndexRef.current * pageWidthRef.current : 0;
      let x = lastRect.right + offset;
      const y = lastRect.bottom + 4;
      if (vpRect) {
        // clamp so toolbar stays visible within the reader column
        x = Math.min(Math.max(x, vpRect.left + 20), vpRect.right - 20);
      }
      onToolbarPos({ x, y });
    };
    let t: ReturnType<typeof setTimeout>;
    const onChange = () => update();
    const onTouchEnd = () => { clearTimeout(t); t = setTimeout(update, 350); };
    document.addEventListener('selectionchange', onChange);
    container.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('selectionchange', onChange);
      container.removeEventListener('touchend', onTouchEnd);
      clearTimeout(t);
      registerSelectionContainer(null);
    };
  }, [chapter, onSelectionResolve, onToolbarPos, prefs.readingMode, registerSelectionContainer]);

  return (
    <div
      ref={viewportRef}
      className={`relative mx-auto h-full w-full max-w-2xl px-5 ${prefs.readingMode === 'scroll' ? 'overflow-y-auto pb-24 pt-6' : 'overflow-hidden py-6'}`}
      style={{ ...readerContentStyle(prefs.theme), fontSize: prefs.fontSize, lineHeight: prefs.lineSpacing, fontFamily: prefs.fontFamily }}
      onClick={(e) => {
        if (prefs.readingMode !== 'paginated') return;
        if (swipeFiredRef.current) { swipeFiredRef.current = false; return; }
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.tagName === 'BUTTON' || target.tagName === 'A') return;
        const vp = viewportRef.current;
        if (!vp) return;
        const rect = vp.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const w = rect.width;
        if (x > w * 0.675) {
          window.dispatchEvent(new CustomEvent(PAGE_FLIP_EVENT, { detail: 1 }));
        } else if (x < w * 0.325) {
          window.dispatchEvent(new CustomEvent(PAGE_FLIP_EVENT, { detail: -1 }));
        } else {
          onOpenSettings?.();
        }
      }}
    >
      <h2 className="mb-2 text-xl font-bold">{chapter.title}</h2>
      <div
        ref={flowRef}
        style={prefs.readingMode === 'paginated' ? {
          columnWidth: '100%',
          columnGap: `${GAP}px`,
          columnFill: 'auto',
          height: '100%',
          willChange: 'transform',
          transform: `translateX(${-(pageIndex * (pageWidthRef.current || GAP))}px)`,
          transition: PAGE_ANIMATION_MS[prefs.pageAnimation] === 0
            ? 'none'
            : `transform ${PAGE_ANIMATION_MS[prefs.pageAnimation]}ms ease-out`,
        } : {
          width: '100%',
          height: 'auto',
          transform: 'none',
          transition: 'none',
        }}
      >
        {chapter.paragraphs.map((p) => (
          <div key={p.id} className="break-inside-avoid-column">
            <ParagraphBlock p={p} imageUrls={imageUrls} highlightRanges={highlightedPids.get(p.id) ?? []} />
            <CommentPopover
              threads={chapterThreads.filter((t) => t.paragraphId === p.id)}
              pending={pendingPids.includes(p.id)}
              personas={personas}
              replyingThreadId={replyingThreadId}
              onContinue={onContinueThread}
            />
          </div>
        ))}
        {prefs.readingMode === 'scroll' && (
          <div className="flex items-center justify-between gap-3 border-t border-current/15 py-6">
            <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent(PAGE_FLIP_EVENT, { detail: -1 }))}>
              Previous chapter
            </Button>
            <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent(PAGE_FLIP_EVENT, { detail: 1 }))}>
              Next chapter
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
