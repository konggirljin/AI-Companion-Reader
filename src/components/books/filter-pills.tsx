'use client';
import { BookMarked, Heart, Bookmark, Check } from 'lucide-react';
import { comingSoon } from '@/lib/coming-soon';

export type FilterId = 'all' | 'favorites' | 'toread' | 'finished';

const PILLS: { id: FilterId; label: string; icon: typeof BookMarked }[] = [
  { id: 'all',       label: 'All Books', icon: BookMarked },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'toread',    label: 'To Read',   icon: Bookmark },
  { id: 'finished',  label: 'Finished',  icon: Check },
];

export function FilterPills({ value, onChange }: { value: FilterId; onChange: (id: FilterId) => void }) {
  return (
    <div className="flex flex-shrink-0 gap-2 overflow-x-auto px-4 pb-3" style={{ scrollbarWidth: 'none' }}>
      {PILLS.map((p) => {
        const active = value === p.id;
        const Icon = p.icon;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => (p.id === 'all' ? onChange('all') : comingSoon(p.label))}
            className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-colors"
            style={{
              padding: '6px 14px',
              fontSize: 13,
              background: active ? 'hsl(var(--accent))' : 'rgba(255,255,255,0.065)',
              color: active ? 'hsl(var(--accent-foreground))' : '#9A7048',
              border: active ? 'none' : '1px solid rgba(200,150,75,0.18)',
            }}
          >
            <Icon size={13} strokeWidth={active ? 2.5 : 2} />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
