'use client';
import { useEffect, useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCircle2 } from 'lucide-react';
import type { Persona, Thread } from '@/lib/types';
import { listThreads } from '@/lib/storage/threads';
import { useLang } from '@/lib/lang-context';

interface CommentsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  personas: Persona[];
  tocTitles: Map<string, string>;
  onJump: (chapterId: string, paragraphId: string) => void;
}

function avatarFor(persona: Persona | undefined) {
  if (!persona) return <UserCircle2 className="h-5 w-5 text-muted-foreground" />;
  return persona.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={persona.avatar} alt={persona.name} className="h-full w-full object-cover" />
  ) : <UserCircle2 className="h-5 w-5 text-muted-foreground" />;
}

export function CommentsDrawer({ open, onOpenChange, bookId, personas, tocTitles, onJump }: CommentsDrawerProps) {
  const { t: tFn } = useLang();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => { if (open) setThreads(listThreads(bookId)); }, [open, bookId]);
  const personaById = useMemo(() => new Map(personas.map((p) => [p.id, p])), [personas]);

  const activePersonaIds = useMemo(() => {
    const ids = new Set<string>();
    for (const thread of threads) {
      for (const comment of thread.comments) {
        if (comment.personaId) ids.add(comment.personaId);
      }
    }
    return Array.from(ids);
  }, [threads]);

  const filtered = filter ? threads.filter((t) => t.comments.some((c) => c.personaId === filter)) : threads;
  const byChapter = useMemo(() => {
    const map = new Map<string, Thread[]>();
    for (const t of filtered) {
      const arr = map.get(t.chapterId) ?? [];
      arr.push(t);
      map.set(t.chapterId, arr);
    }
    return Array.from(map.entries()).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [filtered]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader><SheetTitle>{tFn('reader.comments')}</SheetTitle></SheetHeader>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button size="sm" variant={filter === null ? 'secondary' : 'outline'} onClick={() => setFilter(null)}>{tFn('reader.all')}</Button>
          {activePersonaIds.map((id) => {
            const p = personaById.get(id);
            return (
              <Button key={id} size="sm" variant={filter === id ? 'secondary' : 'outline'} onClick={() => setFilter(filter === id ? null : id)}>
                {p?.name ?? tFn('reader.formerCompanion')}
              </Button>
            );
          })}
        </div>
        <div className="mt-4 space-y-4">
          {threads.length === 0 && <p className="text-sm text-muted-foreground">{tFn('reader.noComments')}</p>}
          {byChapter.map(([chapterId, group]) => (
            <div key={chapterId} className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {tocTitles.get(chapterId) ?? `Chapter ${Number(chapterId) + 1}`}
              </p>
              {group.map((thread) => {
                const firstPersonaComment = thread.comments.find((comment) => comment.role !== 'user' && comment.personaId);
                const firstPersona = firstPersonaComment?.personaId ? personaById.get(firstPersonaComment.personaId) : undefined;
                return (
                  <button key={thread.id} className="w-full rounded-md border p-3 text-left hover:bg-muted/50"
                    onClick={() => { onJump(thread.chapterId, thread.paragraphId); onOpenChange(false); }}>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 overflow-hidden rounded-full bg-muted">{avatarFor(firstPersona)}</span>
                      <span className="text-xs font-medium">{firstPersona?.name ?? tFn('reader.formerCompanion')}</span>
                      {thread.comments.length > 1 && <Badge variant="outline" className="ml-auto">+{thread.comments.length - 1}</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">&ldquo;{thread.selectedText.slice(0, 80)}{thread.selectedText.length > 80 ? '…' : ''}&rdquo;</p>
                    <p className="mt-1 line-clamp-3 text-sm">{firstPersonaComment?.text ?? thread.comments[0]?.text}</p>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
