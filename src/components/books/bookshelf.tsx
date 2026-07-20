'use client';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Book } from '@/lib/types';
import { reorderBooks } from '@/lib/storage/books';
import { BookCard } from './book-card';

function SortableBook({ book, onChanged }: { book: Book; onChanged: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: book.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
      <BookCard book={book} onChanged={onChanged} />
    </div>
  );
}

export function Bookshelf({ books, onChanged }: { books: Book[]; onChanged: () => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = books.map((b) => b.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    reorderBooks(next);
    onChanged();
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={books.map((b) => b.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {books.map((book) => (
            <SortableBook key={book.id} book={book} onChanged={onChanged} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
