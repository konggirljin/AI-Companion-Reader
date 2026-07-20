'use client';
import Link from 'next/link';
import { ChevronLeft, List, Bookmark, Type, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReaderTopbarProps {
  title: string;
  onToc: () => void;
  onBookmarks: () => void;
  onSettings: () => void;
}

export function ReaderTopbar({ title, onToc, onBookmarks, onSettings }: ReaderTopbarProps) {
  const { setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-2">
        <Button variant="ghost" size="icon" asChild aria-label="Back to shelf">
          <Link href="/"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <p className="mx-2 flex-1 truncate text-center text-sm font-medium">{title}</p>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onBookmarks} aria-label="Bookmarks">
            <Bookmark className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onToc} aria-label="Table of contents">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Reader settings">
            <Type className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Theme">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}><Sun className="mr-2 h-4 w-4" />Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}><Moon className="mr-2 h-4 w-4" />Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}><Monitor className="mr-2 h-4 w-4" />System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
