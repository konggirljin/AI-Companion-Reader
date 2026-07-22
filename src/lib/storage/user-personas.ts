import type { UserPersona } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';

export function listUserPersonas(): UserPersona[] {
  return readJson<UserPersona[]>(K.userPersonas, []);
}

export function getUserPersona(id: string): UserPersona | undefined {
  return listUserPersonas().find((p) => p.id === id);
}

export function saveUserPersona(p: Omit<UserPersona, 'id' | 'createdAt'> & { id?: string }): UserPersona {
  const personas = listUserPersonas();
  if (p.id) {
    const existing = personas.find((x) => x.id === p.id);
    const updated: UserPersona = { ...existing!, ...p, id: p.id, createdAt: existing?.createdAt ?? Date.now() };
    writeJson(K.userPersonas, personas.map((x) => (x.id === p.id ? updated : x)));
    return updated;
  }
  const created: UserPersona = { ...p, id: crypto.randomUUID(), createdAt: Date.now() };
  writeJson(K.userPersonas, [...personas, created]);
  return created;
}

export function deleteUserPersona(id: string): void {
  writeJson(K.userPersonas, listUserPersonas().filter((p) => p.id !== id));
  if (getActiveUserPersonaId() === id) setActiveUserPersonaId(null);
}

export function getActiveUserPersonaId(): string | null {
  return readJson<string | null>(K.activeUserPersona, null);
}

export function setActiveUserPersonaId(id: string | null): void {
  writeJson(K.activeUserPersona, id);
}
