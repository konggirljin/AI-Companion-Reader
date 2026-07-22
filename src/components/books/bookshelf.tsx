'use client';
import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Book } from '@/lib/types';
import { reorderBooks } from '@/lib/storage/books';
import { BookCard } from './book-card';
import { VaseDecoration } from './motifs';

const WALL_BG =
  'repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,190,80,0.012) 60px, rgba(255,190,80,0.012) 61px), hsl(var(--background))';

const PLANK_BG =
  'linear-gradient(90deg, rgba(255,200,100,0.06) 0%, rgba(255,200,100,0) 25%, rgba(255,200,100,0.04) 50%, rgba(255,200,100,0) 75%, rgba(255,200,100,0.05) 100%),' +
  'linear-gradient(to bottom, #9A5A28 0%, #7A4020 35%, #8C5028 65%, #632E14 100%)';

function useBooksPerRow() {
  const [n, setN] = useState(3);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setN(w >= 1280 ? 6 : w >= 1024 ? 5 : w >= 640 ? 4 : 3);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return n;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function SortableBook({ book, onChanged }: { book: Book; onChanged: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: book.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className="flex-1 min-w-0"
    >
      <BookCard book={book} onChanged={onChanged} />
    </div>
  );
}

export function Bookshelf({ books, onChanged }: { books: Book[]; onChanged: () => void }) {
  const perRow = useBooksPerRow();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = books.map((b) => b.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    reorderBooks(next);
    onChanged();
  };

  if (books.length === 0) return null;

  const rows = chunk(books, perRow);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={books.map((b) => b.id)} strategy={rectSortingStrategy}>
        <div style={{ background: WALL_BG }}>
          {rows.map((row, ri) => {
            const isLast = ri === rows.length - 1;
            const empties = perRow - row.length;
            return (
              <div key={ri} style={{ background: WALL_BG }}>
                <div className="flex items-end gap-2.5 px-3 pb-0 pt-4">
                  {row.map((b) => (
                    <SortableBook key={b.id} book={b} onChanged={onChanged} />
                  ))}
                  {isLast && empties > 0 ? (
                    <>
                      {Array.from({ length: Math.max(0, empties - 1) }).map((_, i) => (
                        <div key={`e-${i}`} className="flex-1" style={{ aspectRatio: '2 / 3' }} />
                      ))}
                      <VaseDecoration />
                    </>
                  ) : null}
                </div>
                <div
                  aria-hidden="true"
                  style={{
                    height: 20,
                    marginTop: 2,
                    background: PLANK_BG,
                    boxShadow:
                      '0 7px 20px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,195,100,0.18), inset 0 -1px 0 rgba(0,0,0,0.4)',
                  }}
                />
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
