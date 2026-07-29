'use client';
import { useEffect, useState } from 'react';
import { Highlighter, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { Bookmark } from '@/lib/types';
import { deleteBookmark, listBookmarks, listHighlights } from '@/lib/storage/bookmarks';
import { useLang } from '@/lib/lang-context';

interface BookmarksPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  tocTitles: Map<string, string>;
  onJump: (chapterId: string, paragraphId: string) => void;
}

export function BookmarksPanel({ open, onOpenChange, bookId, tocTitles, onJump }: BookmarksPanelProps) {
  const { t } = useLang();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Bookmark[]>([]);
  useEffect(() => { if (open) { setBookmarks(listBookmarks(bookId)); setHighlights(listHighlights(bookId)); } }, [open, bookId]);

  const refresh = () => { setBookmarks(listBookmarks(bookId)); setHighlights(listHighlights(bookId)); };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80">
        <SheetHeader><SheetTitle>{t('reader.highlightsAndBookmarks')}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Highlighter className="h-4 w-4" />{t('reader.highlights')}</h3>
            <div className="mt-2 space-y-2">
              {highlights.length === 0 && <p className="text-sm text-muted-foreground">{t('reader.noHighlights')}</p>}
              {highlights.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-md border p-3">
                  <button
                    className="text-left text-sm hover:underline"
                    onClick={() => { onJump(h.chapterId, h.paragraphId); onOpenChange(false); }}
                  >
                    <span className="line-clamp-2 italic">
                      {(h.text ?? '').length > 80 ? `${(h.text ?? '').slice(0, 80)}…` : (h.text ?? '')}
                    </span>
                    <span className="block text-xs mt-1">{tocTitles.get(h.chapterId) ?? `Chapter ${Number(h.chapterId) + 1}`}</span>
                    <span className="block text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleDateString()}</span>
                  </button>
                  <Button
                    variant="ghost" size="icon" aria-label={t('reader.deleteHighlight')}
                    onClick={() => { deleteBookmark(h.id); refresh(); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold">{t('reader.bookmarks')}</h3>
            <div className="mt-2 space-y-2">
              {bookmarks.length === 0 && <p className="text-sm text-muted-foreground">{t('reader.noBookmarks')}</p>}
              {bookmarks.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-md border p-3">
                  <button
                    className="text-left text-sm hover:underline"
                    onClick={() => { onJump(b.chapterId, b.paragraphId); onOpenChange(false); }}
                  >
                    {tocTitles.get(b.chapterId) ?? `Chapter ${Number(b.chapterId) + 1}`}
                    <span className="block text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</span>
                  </button>
                  <Button
                    variant="ghost" size="icon" aria-label={t('reader.deleteBookmark')}
                    onClick={() => { deleteBookmark(b.id); refresh(); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
