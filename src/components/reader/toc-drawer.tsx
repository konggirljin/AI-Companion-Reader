'use client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { TocEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/lang-context';

interface TocDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toc: TocEntry[];
  currentChapterId: string;
  currentAnchorPid: string | null;
  onSelect: (entry: TocEntry) => void;
}

export function TocDrawer({ open, onOpenChange, toc, currentChapterId, currentAnchorPid, onSelect }: TocDrawerProps) {
  const { t } = useLang();
  const isCurrent = (entry: TocEntry) =>
    entry.chapterId === currentChapterId &&
    (entry.anchorPid == null ? currentAnchorPid == null : entry.anchorPid === currentAnchorPid);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader><SheetTitle>{t('reader.contents')}</SheetTitle></SheetHeader>
        <nav className="mt-4 space-y-0.5">
          {toc.map((entry, i) => (
            <button
              key={`${entry.chapterId}-${entry.anchorPid ?? ''}-${i}`}
              onClick={() => { onSelect(entry); onOpenChange(false); }}
              className={cn(
                'block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                isCurrent(entry) && 'bg-accent font-medium',
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
