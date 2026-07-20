'use client';
import { UserCircle2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import type { Persona, Thread } from '@/lib/types';
import { CommentBubble } from './comment-bubble';

interface CommentPopoverProps {
  threads: Thread[];
  pending: boolean;
  personas: Persona[];
}

export function CommentPopover({ threads, pending, personas }: CommentPopoverProps) {
  if (pending && threads.length === 0) {
    return (
      <div className="-mt-3 mb-4 flex justify-end">
        <CommentBubble count={0} pending />
      </div>
    );
  }
  if (threads.length === 0) return null;

  const total = threads.reduce((n, t) => n + t.comments.length, 0);
  const sorted = [...threads].sort((a, b) => b.createdAt - a.createdAt);
  const personaById = new Map(personas.map((p) => [p.id, p]));

  return (
    <div className="-mt-3 mb-4 flex justify-end">
      <Popover>
        <PopoverTrigger asChild>
          <span><CommentBubble count={total} /></span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 max-w-[85vw] space-y-3 p-4">
          {sorted.map((thread, ti) => (
            <div key={thread.id} className="space-y-3">
              {ti > 0 && <Separator />}
              {thread.comments.map((comment, ci) => {
                const persona = personaById.get(comment.personaId);
                return (
                  <div key={`${thread.id}-${ci}`} className="flex gap-2.5 animate-fade-in">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                      {persona?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={persona.avatar} alt={persona.name} className="h-full w-full object-cover" />
                      ) : (
                        <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{persona?.name ?? 'Former companion'}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm">{comment.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
