'use client';
import Link from 'next/link';
import { ChevronLeft, List, Bookmark, Type, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReaderTopbarProps {
  title: string;
  onToc: () => void;
  onBookmarks: () => void;
  onComments: () => void;
  onSettings: () => void;
  activeUserPersonaId: string | null;
}

export function ReaderTopbar({ title, onToc, onBookmarks, onComments, onSettings, activeUserPersonaId }: ReaderTopbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-2">
        <Button variant="ghost" size="icon" asChild aria-label="Back to shelf">
          <Link href="/"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <p className="mx-2 flex-1 truncate text-center text-sm font-medium">{title}</p>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onComments} aria-label="Comments">
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onBookmarks} aria-label="Bookmarks">
            <Bookmark className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onToc} aria-label="Table of contents">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Reader settings">
            <Type className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
