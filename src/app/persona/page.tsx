'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Persona } from '@/lib/types';
import { listPersonas } from '@/lib/storage/personas';
import { PersonaCard } from '@/components/persona/persona-card';

export default function PersonaListPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const refresh = useCallback(() => setPersonas(listPersonas()), []);
  useEffect(refresh, [refresh]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Companions</h1>
        <Button asChild><Link href="/persona/new"><Plus className="mr-1.5 h-4 w-4" />New persona</Link></Button>
      </div>
      {personas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
          <Users className="h-12 w-12" />
          <p>No companions yet. Create one — a detective, a poet, a grumpy cat — anyone you&apos;d like to read with.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {personas.map((p) => <PersonaCard key={p.id} persona={p} onChanged={refresh} />)}
        </div>
      )}
    </div>
  );
}
