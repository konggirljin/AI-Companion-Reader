'use client';
import { Search, MoreVertical } from 'lucide-react';
import { ImportButton } from './import-button';
import { comingSoon } from '@/lib/coming-soon';

export function BookHeader({ onImported }: { onImported: () => void }) {
  return (
    <header className="flex flex-shrink-0 items-center px-4 pb-3 pt-6">
      <div className="flex-1 px-1">
        <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))', letterSpacing: '-0.01em' }}>
          My Bookshelf
        </h1>
        <p className="mt-0.5 text-xs font-medium" style={{ color: '#8A6038' }}>
          Your journey begins here
        </p>
      </div>
      <div className="flex items-center gap-1">
        <ImportButton onImported={onImported} />
        <button
          type="button"
          aria-label="Search (coming soon)"
          onClick={() => comingSoon('Search')}
          className="p-2 transition-colors hover:text-foreground"
          style={{ color: '#C89060' }}
        >
          <Search size={18} />
        </button>
        <button
          type="button"
          aria-label="More (coming soon)"
          onClick={() => comingSoon('More')}
          className="p-2 transition-colors hover:text-foreground"
          style={{ color: '#C89060' }}
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </header>
  );
}
