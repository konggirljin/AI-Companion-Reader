'use client';
import { PersonaForm } from '@/components/persona/persona-form';

export default function NewPersonaPage() {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <header className="px-4 pb-4 pt-6">
        <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
          New companion
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto px-4 pb-24" style={{ scrollbarWidth: 'none' }}>
        <PersonaForm />
      </div>
    </div>
  );
}
