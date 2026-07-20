'use client';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentBubbleProps {
  count: number;
  pending?: boolean;
  onClick?: () => void;
}

export function CommentBubble({ count, pending, onClick }: CommentBubbleProps) {
  if (pending) {
    return (
      <span className="inline-flex h-6 items-center gap-1 rounded-full border bg-muted px-2 text-xs text-muted-foreground animate-pulse">
        <MessageCircle className="h-3 w-3" />
        companion is reading…
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full border bg-accent px-2 text-xs font-medium',
        'transition-all duration-200 hover:shadow-sm',
      )}
      aria-label={`${count} comments`}
    >
      <MessageCircle className="h-3 w-3" />
      {count}
    </button>
  );
}
