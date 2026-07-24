'use client';
import { useCallback, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import type { ParsedChapter, Paragraph, Persona, ReaderPrefs, Thread } from '@/lib/types';
import type { ResolvedSelection } from '@/lib/selection';
import { readerContentStyle } from '@/lib/reader-themes';
import { resolveSelection } from '@/lib/selection';
import { countWords } from '@/lib/word-count';
import { CommentPopover } from './comment-popover';
import { Button } from '@/components/ui/button';

export const PAGE_FLIP_EVENT = 'arc:page-flip';

const GAP = 40;

function ParagraphBlock({ p, imageUrls }: { p: Paragraph; imageUrls: Map<string, string> }) {
  if (p.tag.startsWith('h')) {
    const Tag = p.tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    return <Tag data-pid={p.id} className="mb-4 mt-8 font-semibold">{p.text}</Tag>;
  }
  return (
    <p data-pid={p.id} className={p.tag === 'blockquote' ? 'mb-4 border-l-2 pl-4 italic' : 'mb-4'}>
      {p.text}
      {p.images?.map((img) => {
        const url = imageUrls.get(img.path);
        return url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={img.path} src={url} alt={img.alt ?? ''} className="my-3 max-h-[60vh] rounded-md object-contain" />
        ) : null;
      })}
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
  registerSelectionContainer: (el: HTMLDivElement | null) => void;
  onSelectionResolve: (resolved: ResolvedSelection | null) => void;
  onToolbarPos: (pos: { x: number; y: number } | null) => void;
  onSend: () => void;
  registerBackNav: (goDelta: (d: number) => void) => void;
  onDoubleClickParagraph?: (paragraphId: string) => void;
  onSendChapterStart?: () => void;
  onLongPress?: () => void;
}

export function PaginatedChapter(props: PaginatedChapterProps) {
  const { chapter, imageUrls, prefs, pageIndex, pageCount, onPageCountChange, onFirstVisiblePidChange,
    chapterThreads, pendingPids, personas, registerSelectionContainer, onSelectionResolve,
    onToolbarPos, registerBackNav, onDoubleClickParagraph, onSendChapterStart, onLongPress } = props;

  const viewportRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const pageIndexRef = useRef(pageIndex);
  pageIndexRef.current = pageIndex;
  const overLimitNotifiedRef = useRef(false);

  const pageWidthRef = useRef(GAP);

  const reflow = useCallback(() => {
    const flow = flowRef.current, vp = viewportRef.current;
    if (!flow || !vp) return;
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
  }, [onPageCountChange, onFirstVisiblePidChange]);

  // reflow on chapter + prefs change
  useEffect(() => {
    const raf = requestAnimationFrame(reflow);
    return () => cancelAnimationFrame(raf);
  }, [chapter, prefs.fontSize, prefs.lineSpacing, prefs.fontFamily, prefs.theme, reflow]);

  // reflow on resize (debounced)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(t); t = setTimeout(reflow, 250); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
  }, [reflow]);

  // expose navigation
  useEffect(() => {
    registerBackNav((d: number) => {
      // handled by parent; this is a no-op placeholder so parent owns state
      void d;
    });
  }, [registerBackNav]);

  // keyboard arrows
  useEffect(() => {
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
  }, []);

  // swipe via pointer events
  useEffect(() => {
    let startX = 0, startY = 0, active = false;
    const vp = viewportRef.current;
    if (!vp) return;
    const down = (e: PointerEvent) => { active = true; startX = e.clientX; startY = e.clientY; };
    const up = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        window.dispatchEvent(new CustomEvent(PAGE_FLIP_EVENT, { detail: dx < 0 ? 1 : -1 }));
      }
    };
    vp.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    return () => { vp.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); };
  }, [chapter]);

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
          import('sonner').then(({ toast }) => toast.error('Select a shorter passage (max 7000 words)'));
        }
        return;
      }
      onSelectionResolve(resolved);
      const rects = range.getClientRects();
      const lastRect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();
      const vp = viewportRef.current;
      const vpRect = vp?.getBoundingClientRect();
      const offset = pageIndexRef.current * pageWidthRef.current;
      let x = lastRect.right + offset;
      const y = lastRect.bottom + 4;
      if (vpRect) x = Math.min(Math.max(x, vpRect.left + 60), vpRect.right - 60);
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
  }, [chapter, onSelectionResolve, onToolbarPos, registerSelectionContainer]);

  // Long-press to toggle bars
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !onLongPress) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0, startY = 0;
    const down = (e: PointerEvent) => {
      startX = e.clientX; startY = e.clientY;
      timer = setTimeout(() => { onLongPress(); timer = null; }, 2000);
    };
    const up = () => { if (timer) { clearTimeout(timer); timer = null; } };
    const move = (e: PointerEvent) => {
      if (timer && (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10)) {
        clearTimeout(timer); timer = null;
      }
    };
    vp.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointermove', move);
    return () => {
      vp.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointermove', move);
      if (timer) clearTimeout(timer);
    };
  }, [chapter, onLongPress]);

  return (
    <div
      ref={viewportRef}
      className="relative mx-auto w-full max-w-2xl flex-1 px-5 py-6 overflow-hidden"
      style={{ ...readerContentStyle(prefs.theme), fontSize: prefs.fontSize, lineHeight: prefs.lineSpacing, fontFamily: prefs.fontFamily }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.tagName === 'BUTTON' || target.tagName === 'A') return;
        const vp = viewportRef.current;
        if (!vp) return;
        const rect = vp.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const w = rect.width;
        if (x > w * 0.7) {
          window.dispatchEvent(new CustomEvent(PAGE_FLIP_EVENT, { detail: 1 }));
        } else if (x < w * 0.3) {
          window.dispatchEvent(new CustomEvent(PAGE_FLIP_EVENT, { detail: -1 }));
        }
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-xl font-bold">{chapter.title}</h2>
        {onSendChapterStart && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onSendChapterStart} aria-label="Send chapter to companions">
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div
        ref={flowRef}
        style={{
          columnWidth: '100%',
          columnGap: `${GAP}px`,
          columnFill: 'auto',
          height: '100%',
          willChange: 'transform',
          transform: `translateX(${-(pageIndex * (pageWidthRef.current || GAP))}px)`,
          transition: 'transform 250ms ease-out',
        } as React.CSSProperties}
      >
        {chapter.paragraphs.map((p) => (
          <div key={p.id} className="break-inside-avoid-column" onDoubleClick={() => onDoubleClickParagraph?.(p.id)}>
            <ParagraphBlock p={p} imageUrls={imageUrls} />
            <CommentPopover
              threads={chapterThreads.filter((t) => t.paragraphId === p.id)}
              pending={pendingPids.includes(p.id)}
              personas={personas}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
