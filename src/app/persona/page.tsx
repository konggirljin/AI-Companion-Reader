'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Persona } from '@/lib/types';
import { listPersonas } from '@/lib/storage/personas';
import { seedDefaultPersonas } from '@/lib/storage/seed-personas';
import { PersonaCard } from '@/components/persona/persona-card';

export default function PersonaListPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const refresh = useCallback(() => {
    seedDefaultPersonas();
    setPersonas(listPersonas());
  }, []);
  useEffect(refresh, [refresh]);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <header className="flex flex-shrink-0 items-center justify-between px-4 pb-4 pt-6">
        <div className="px-1">
          <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
            Persona
          </h1>
          <p className="mt-0.5 text-xs font-medium" style={{ color: '#8A6038' }}>
            Your reading companions
          </p>
        </div>
        <Button asChild>
          <Link href="/persona/new"><Plus className="mr-1.5 h-4 w-4" />New persona</Link>
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 pb-24" style={{ scrollbarWidth: 'none' }}>
        {personas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Users className="h-10 w-10" style={{ color: '#C89060' }} />
            <p>No companions yet. Create one, a detective, a poet, a grumpy cat, anyone you would like to read with.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {personas.map((p) => <PersonaCard key={p.id} persona={p} onChanged={refresh} />)}
          </div>
        )}
      </div>
    </div>
  );
}
