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
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold">Edit companion</h1>
      <PersonaForm persona={persona} />
    </div>
  );
}

export default function EditPersonaPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-lg" />}><EditInner /></Suspense>;
}
