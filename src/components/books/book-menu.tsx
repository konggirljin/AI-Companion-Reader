'use client';
import { useState } from 'react';
import { MoreVertical, Pencil, Trash2, Heart, Bookmark, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Book } from '@/lib/types';
import { deleteBook, renameBook, updateBookStatus } from '@/lib/storage/books';

export function BookMenu({ book, onChanged }: { book: Book; onChanged: () => void }) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState(book.title);

  const doRename = () => {
    if (title.trim()) {
      renameBook(book.id, title.trim());
      toast.success('Renamed');
      onChanged();
    }
    setRenaming(false);
  };

  const doDelete = async () => {
    await deleteBook(book.id);
    toast.success('Deleted');
    setDeleting(false);
    onChanged();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="h-8 w-8" aria-label="Book menu">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { updateBookStatus(book.id, book.status === 'favorites' ? undefined : 'favorites'); onChanged(); }}>
            <Heart className="mr-2 h-4 w-4" />{book.status === 'favorites' ? 'Unfavorite' : 'Favorite'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { updateBookStatus(book.id, book.status === 'toRead' ? undefined : 'toRead'); onChanged(); }}>
            <Bookmark className="mr-2 h-4 w-4" />{book.status === 'toRead' ? 'Remove from To Read' : 'Mark as To Read'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { updateBookStatus(book.id, book.status === 'finished' ? undefined : 'finished'); onChanged(); }}>
            <Check className="mr-2 h-4 w-4" />{book.status === 'finished' ? 'Unmark finished' : 'Mark as Finished'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { setTitle(book.title); setRenaming(true); }}>
            <Pencil className="mr-2 h-4 w-4" />Rename
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(true)}>
            <Trash2 className="mr-2 h-4 w-4" />Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename book</DialogTitle></DialogHeader>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doRename()} />
          <DialogFooter><Button onClick={doRename}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete &ldquo;{book.title}&rdquo;?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This removes the book, its comments, and bookmarks from this device.</p>
          <DialogFooter>
            <Button variant="destructive" onClick={() => void doDelete()}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
