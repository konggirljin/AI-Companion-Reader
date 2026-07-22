import { describe, it, expect, beforeEach } from 'vitest';
import { readJson, writeJson, removeKey } from '@/lib/storage/local';
import { listBooks, createBook, renameBook, reorderBooks, saveProgress, getBook } from '@/lib/storage/books';
import { savePersona, listPersonas, deletePersona } from '@/lib/storage/personas';
import {
  listUserPersonas, getUserPersona, saveUserPersona, deleteUserPersona,
  getActiveUserPersonaId, setActiveUserPersonaId,
} from '@/lib/storage/user-personas';
import { addThreads, listThreads, deleteThreadsForBook } from '@/lib/storage/threads';
import { addBookmark, listBookmarks } from '@/lib/storage/bookmarks';
import { getSettings, saveSettings, getPrefs, savePrefs, DEFAULT_SETTINGS, DEFAULT_PREFS } from '@/lib/storage/settings';
import type { Thread } from '@/lib/types';

beforeEach(() => localStorage.clear());

describe('local.ts', () => {
  it('round-trips JSON values', () => {
    writeJson('arc:test', { a: 1 });
    expect(readJson('arc:test', null)).toEqual({ a: 1 });
  });
  it('returns fallback on missing or corrupt JSON', () => {
    expect(readJson('arc:missing', 'fb')).toBe('fb');
    localStorage.setItem('arc:bad', '{not json');
    expect(readJson('arc:bad', 'fb')).toBe('fb');
  });
  it('removeKey deletes', () => {
    writeJson('arc:x', 1);
    removeKey('arc:x');
    expect(readJson('arc:x', null)).toBeNull();
  });
});

describe('books.ts', () => {
  it('creates books with increasing order and renames', () => {
    const a = createBook({ id: 'b1', title: 'A', author: '', format: 'txt', toc: [], coverRef: undefined, chapterCount: 1, progress: undefined });
    const b = createBook({ id: 'b2', title: 'B', author: '', format: 'epub', toc: [], coverRef: undefined, chapterCount: 1, progress: undefined });
    expect(listBooks().map((x) => x.id)).toEqual(['b1', 'b2']);
    expect(b.order).toBeGreaterThan(a.order);
    renameBook('b1', 'A2');
    expect(getBook('b1')!.title).toBe('A2');
  });
  it('reorders and saves progress', () => {
    createBook({ id: 'b1', title: 'A', author: '', format: 'txt', toc: [], coverRef: undefined, chapterCount: 1, progress: undefined });
    createBook({ id: 'b2', title: 'B', author: '', format: 'txt', toc: [], coverRef: undefined, chapterCount: 1, progress: undefined });
    reorderBooks(['b2', 'b1']);
    expect(listBooks().map((x) => x.id)).toEqual(['b2', 'b1']);
    saveProgress('b1', '3', '3:12', 5);
    expect(getBook('b1')!.progress).toEqual({ chapterId: '3', paragraphId: '3:12', pageIndex: 5 });
  });
});

describe('personas.ts', () => {
  it('creates, updates, deletes personas', () => {
    const p = savePersona({ name: 'Holmes', avatar: '', characterDescription: 'witty detective', language: 'English' });
    expect(listPersonas()).toHaveLength(1);
    savePersona({ ...p, name: 'Sherlock' });
    expect(listPersonas()[0].name).toBe('Sherlock');
    expect(listPersonas()).toHaveLength(1);
    deletePersona(p.id);
    expect(listPersonas()).toHaveLength(0);
  });
});

describe('threads.ts', () => {
  const t: Thread = {
    id: 't1', bookId: 'b1', chapterId: '0', paragraphId: '0:3',
    selectedText: 'excerpt', comments: [{ personaId: 'p1', text: 'ha!' }], createdAt: 1,
  };
  it('appends and queries by book/chapter', () => {
    addThreads([t]);
    expect(listThreads('b1')).toHaveLength(1);
    expect(listThreads('b1', '0')).toHaveLength(1);
    expect(listThreads('b1', '1')).toHaveLength(0);
    expect(listThreads('b2')).toHaveLength(0);
  });
  it('deleteThreadsForBook removes only that book', () => {
    addThreads([t, { ...t, id: 't2', bookId: 'b2' }]);
    deleteThreadsForBook('b1');
    expect(listThreads('b1')).toHaveLength(0);
    expect(listThreads('b2')).toHaveLength(1);
  });
});

describe('bookmarks.ts + settings.ts', () => {
  it('bookmarks CRUD', () => {
    addBookmark({ bookId: 'b1', chapterId: '0', paragraphId: '0:1' });
    expect(listBookmarks('b1')).toHaveLength(1);
  });
  it('settings/prefs defaults and persistence', () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    saveSettings({ baseUrl: 'https://api.example.com/v1', apiKey: 'k', model: 'm', systemPromptTemplate: 'tpl {{personas}}', proxyUrl: '' });
    expect(getSettings().model).toBe('m');
    expect(getPrefs()).toEqual(DEFAULT_PREFS);
    savePrefs({ fontSize: 20, fontFamily: 'serif', lineSpacing: 2.0, theme: 'amber' });
    expect(getPrefs().fontSize).toBe(20);
  });
});

describe('user-personas.ts', () => {
  it('creates, updates, deletes personas and manages active id', () => {
    const p = saveUserPersona({ name: 'Alice', personality: 'Curious reader who loves mysteries.' });
    expect(listUserPersonas()).toHaveLength(1);
    saveUserPersona({ ...p, name: 'Alicia' });
    expect(listUserPersonas()[0].name).toBe('Alicia');
    expect(listUserPersonas()).toHaveLength(1);

    setActiveUserPersonaId(p.id);
    expect(getActiveUserPersonaId()).toBe(p.id);
    deleteUserPersona(p.id);
    expect(listUserPersonas()).toHaveLength(0);
    expect(getActiveUserPersonaId()).toBeNull();
  });

  it('getUserPersona returns undefined for missing id', () => {
    expect(getUserPersona('nope')).toBeUndefined();
  });
});

describe('settings.ts theme backward-compat', () => {
  it('getPrefs fills in theme default when saved prefs lack it', () => {
    localStorage.setItem('arc:prefs', JSON.stringify({ fontSize: 20, fontFamily: 'serif', lineSpacing: 2.0 }));
    const prefs = getPrefs();
    expect(prefs.theme).toBe('amber');
    expect(prefs.fontSize).toBe(20);
  });
});
