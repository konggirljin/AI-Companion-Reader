'use client';
import { PersonaForm } from '@/components/persona/persona-form';

export default function NewPersonaPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold">New companion</h1>
      <PersonaForm />
    </div>
  );
}
