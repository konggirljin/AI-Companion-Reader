import type { Persona } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';

export function listPersonas(): Persona[] {
  return readJson<Persona[]>(K.personas, []);
}

export function getPersona(id: string): Persona | undefined {
  return listPersonas().find((p) => p.id === id);
}

export function savePersona(p: Omit<Persona, 'id' | 'createdAt'> & { id?: string }): Persona {
  const personas = listPersonas();
  if (p.id) {
    const existing = personas.find((x) => x.id === p.id);
    const updated: Persona = { ...existing!, ...p, id: p.id, createdAt: existing?.createdAt ?? Date.now() };
    writeJson(K.personas, personas.map((x) => (x.id === p.id ? updated : x)));
    return updated;
  }
  const created: Persona = { ...p, id: crypto.randomUUID(), createdAt: Date.now() };
  writeJson(K.personas, [...personas, created]);
  return created;
}

export function deletePersona(id: string): void {
  writeJson(K.personas, listPersonas().filter((p) => p.id !== id));
}
