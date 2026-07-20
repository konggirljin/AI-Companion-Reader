'use client';
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { Bookmark } from '@/lib/types';
import { deleteBookmark, listBookmarks } from '@/lib/storage/bookmarks';

interface BookmarksPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  tocTitles: Map<string, string>;
  onJump: (chapterId: string, paragraphId: string) => void;
}

export function BookmarksPanel({ open, onOpenChange, bookId, tocTitles, onJump }: BookmarksPanelProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  useEffect(() => { if (open) setBookmarks(listBookmarks(bookId)); }, [open, bookId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80">
        <SheetHeader><SheetTitle>Bookmarks</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-2">
          {bookmarks.length === 0 && <p className="text-sm text-muted-foreground">No bookmarks yet.</p>}
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
                variant="ghost" size="icon" aria-label="Delete bookmark"
                onClick={() => { deleteBookmark(b.id); setBookmarks(listBookmarks(bookId)); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
