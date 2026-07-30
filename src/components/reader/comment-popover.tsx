'use client';
import { useState, type FormEvent } from 'react';
import { Loader2, Reply, Send, UserCircle2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Persona, Thread } from '@/lib/types';
import { CommentBubble } from './comment-bubble';
import { useLang } from '@/lib/lang-context';

interface CommentPopoverProps {
  threads: Thread[];
  pending: boolean;
  personas: Persona[];
  replyingThreadId?: string | null;
  onContinue: (threadId: string, personaId: string, question: string) => Promise<boolean>;
}

export function CommentPopover({ threads, pending, personas, replyingThreadId, onContinue }: CommentPopoverProps) {
  const { t } = useLang();
  const [replyTarget, setReplyTarget] = useState<{ threadId: string; personaId: string } | null>(null);
  const [question, setQuestion] = useState('');
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

  const submitReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!replyTarget || !question.trim() || replyingThreadId) return;
    const succeeded = await onContinue(replyTarget.threadId, replyTarget.personaId, question.trim());
    if (succeeded) {
      setQuestion('');
      setReplyTarget(null);
    }
  };

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
                const isUser = comment.role === 'user';
                const persona = comment.personaId ? personaById.get(comment.personaId) : undefined;
                return (
                  <div key={`${thread.id}-${comment.createdAt ?? 'legacy'}-${ci}`} className={`flex gap-2.5 animate-fade-in ${isUser ? 'justify-end' : ''}`}>
                    {!isUser && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                        {persona?.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={persona.avatar} alt={persona.name} className="h-full w-full object-cover" />
                        ) : (
                          <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </span>
                    )}
                    <div className={`min-w-0 ${isUser ? 'max-w-[85%] rounded-lg bg-primary/15 px-3 py-2 text-right' : ''}`}>
                      <p className="text-xs font-semibold">{isUser ? t('reader.you') : persona?.name ?? t('reader.formerCompanion')}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-left">{comment.text}</p>
                      {!isUser && persona && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-7 px-2 text-xs"
                          disabled={Boolean(replyingThreadId)}
                          onClick={() => {
                            setReplyTarget({ threadId: thread.id, personaId: persona.id });
                            setQuestion('');
                          }}
                        >
                          <Reply className="mr-1 h-3 w-3" />
                          {t('reader.reply')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {replyTarget?.threadId === thread.id && (
                <form className="space-y-2 rounded-md border bg-background/60 p-2" onSubmit={(event) => void submitReply(event)}>
                  <p className="text-xs font-semibold">
                    {t('reader.replyTo', { name: personaById.get(replyTarget.personaId)?.name ?? t('reader.formerCompanion') })}
                  </p>
                  <Textarea
                    autoFocus
                    rows={2}
                    value={question}
                    disabled={Boolean(replyingThreadId)}
                    placeholder={t('reader.replyPlaceholder')}
                    className="min-h-16 resize-none text-sm"
                    onChange={(event) => setQuestion(event.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={Boolean(replyingThreadId)}
                      onClick={() => {
                        setReplyTarget(null);
                        setQuestion('');
                      }}
                    >
                      {t('reader.cancel')}
                    </Button>
                    <Button type="submit" size="sm" disabled={!question.trim() || Boolean(replyingThreadId)}>
                      {replyingThreadId === thread.id
                        ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        : <Send className="mr-1 h-3.5 w-3.5" />}
                      {t('reader.replySend')}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
