'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Persona } from '@/lib/types';
import { getPersona } from '@/lib/storage/personas';
import { PersonaForm } from '@/components/persona/persona-form';
import { Skeleton } from '@/components/ui/skeleton';

function EditInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null | undefined>(undefined);
  useEffect(() => {
    setPersona(getPersona(params.get('id') ?? '') ?? null);
  }, [params]);
  if (persona === undefined) return <Skeleton className="mx-auto h-96 max-w-lg" />;
  if (persona === null) { router.replace('/persona'); return null; }
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <header className="px-4 pb-4 pt-6">
        <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
          Edit companion
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto px-4 pb-24" style={{ scrollbarWidth: 'none' }}>
        <PersonaForm persona={persona} />
      </div>
    </div>
  );
}

export default function EditPersonaPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-lg" />}><EditInner /></Suspense>;
}
