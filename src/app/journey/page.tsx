'use client';
import { Compass } from 'lucide-react';

export default function JourneyPage() {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <header className="px-4 pb-4 pt-6">
        <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
          Journey
        </h1>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <Compass size={56} strokeWidth={1.5} style={{ color: '#C89060' }} />
        <p className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          Journey is coming soon
        </p>
        <p className="max-w-sm text-sm" style={{ color: '#8A6038' }}>
          Your reading path and milestones will live here. For now, pick a book from the shelf and start reading.
        </p>
      </div>
    </div>
  );
}
