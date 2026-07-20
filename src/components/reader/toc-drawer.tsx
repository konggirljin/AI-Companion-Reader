'use client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { TocEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TocDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toc: TocEntry[];
  currentChapterId: string;
  onSelect: (chapterId: string) => void;
}

export function TocDrawer({ open, onOpenChange, toc, currentChapterId, onSelect }: TocDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader><SheetTitle>Contents</SheetTitle></SheetHeader>
        <nav className="mt-4 space-y-0.5">
          {toc.map((entry, i) => (
            <button
              key={`${entry.chapterId}-${i}`}
              onClick={() => { onSelect(entry.chapterId); onOpenChange(false); }}
              className={cn(
                'block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                entry.chapterId === currentChapterId && 'bg-accent font-medium',
              )}
              style={{ paddingLeft: `${12 + entry.level * 16}px` }}
            >
              {entry.title}
            </button>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
