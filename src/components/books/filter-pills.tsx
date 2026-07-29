'use client';
import { BookMarked, Heart, Bookmark, Check } from 'lucide-react';
import { useLang } from '@/lib/lang-context';

export type FilterId = 'all' | 'favorites' | 'toread' | 'finished';

const PILLS: { id: FilterId; labelKey: string; icon: typeof BookMarked }[] = [
  { id: 'all',       labelKey: 'bookshelf.filter.all',       icon: BookMarked },
  { id: 'favorites', labelKey: 'bookshelf.filter.favorites',  icon: Heart },
  { id: 'toread',    labelKey: 'bookshelf.filter.toRead',     icon: Bookmark },
  { id: 'finished',  labelKey: 'bookshelf.filter.finished',   icon: Check },
];

export function FilterPills({ value, onChange }: { value: FilterId; onChange: (id: FilterId) => void }) {
  const { t } = useLang();
  return (
    <div className="flex flex-shrink-0 gap-2 overflow-x-auto px-4 pb-3" style={{ scrollbarWidth: 'none' }}>
      {PILLS.map((p) => {
        const active = value === p.id;
        const Icon = p.icon;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
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
            {t(p.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
