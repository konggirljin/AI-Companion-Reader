'use client';
import { BookmarkPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReaderBottomBarProps {
  pageIndex: number;
  pageCount: number;
  onPageIndexChange: (index: number) => void;
  onBookmark: () => void;
  onInteraction: () => void;
  visible: boolean;
  paginated: boolean;
}

export function ReaderBottomBar({ pageIndex, pageCount, onPageIndexChange, onBookmark, onInteraction, visible, paginated }: ReaderBottomBarProps) {
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onPointerDown={onInteraction}
    >
      <div className="mx-auto w-full max-w-2xl px-5 pb-2 pt-1.5">
        <div className="grid grid-cols-3 items-center">
          <div />
          {paginated ? (
            <span className="text-center text-xs text-foreground">
              Page {pageIndex + 1} / {pageCount}
            </span>
          ) : (
            <div />
          )}
          <div className="flex justify-end">
            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full" onClick={onBookmark} aria-label="Bookmark">
              <BookmarkPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {paginated && pageCount > 1 && (
          <input
            type="range"
            min={0}
            max={pageCount - 1}
            value={pageIndex}
            onChange={(e) => onPageIndexChange(Number(e.target.value))}
            className="w-full h-1 mt-1 appearance-none rounded-full cursor-pointer"
            style={{
              background: 'var(--reader-muted, #8A6038)',
              opacity: 0.3,
              accentColor: 'var(--reader-muted, #8A6038)',
            }}
          />
        )}
        {paginated && pageCount <= 1 && <div className="h-1 mt-1" />}
      </div>
    </div>
  );
}
