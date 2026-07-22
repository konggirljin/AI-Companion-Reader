import type { ApiProfile } from '@/lib/types';
import { K } from './keys';
import { readJson, writeJson } from './local';

export function listApiProfiles(): ApiProfile[] {
  return readJson<ApiProfile[]>(K.apiProfiles, []);
}

export function saveApiProfile(p: Omit<ApiProfile, 'id' | 'createdAt'> & { id?: string }): ApiProfile {
  const profiles = listApiProfiles();
  if (p.id) {
    const existing = profiles.find((x) => x.id === p.id);
    const updated: ApiProfile = { ...existing!, ...p, id: p.id, createdAt: existing?.createdAt ?? Date.now() };
    writeJson(K.apiProfiles, profiles.map((x) => (x.id === p.id ? updated : x)));
    return updated;
  }
  const created: ApiProfile = { ...p, id: crypto.randomUUID(), createdAt: Date.now() };
  writeJson(K.apiProfiles, [...profiles, created]);
  return created;
}

export function deleteApiProfile(id: string): void {
  writeJson(K.apiProfiles, listApiProfiles().filter((p) => p.id !== id));
  if (getActiveApiProfileId() === id) setActiveApiProfileId(null);
}

export function getActiveApiProfileId(): string | null {
  return readJson<string | null>(K.activeApiProfile, null);
}

export function setActiveApiProfileId(id: string | null): void {
  writeJson(K.activeApiProfile, id);
}
