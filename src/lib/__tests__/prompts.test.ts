import { describe, it, expect } from 'vitest';
import { DEFAULT_SYSTEM_PROMPT_TEMPLATE, renderSystemPrompt } from '@/lib/prompts';
import type { Persona, UserPersona } from '@/lib/types';

const holmes: Persona = {
  id: 'p1', name: 'Sherlock Holmes', avatar: '',
  characterDescription: 'A witty and sarcastic detective.', language: 'English', createdAt: 0,
};

describe('renderSystemPrompt', () => {
  it('replaces {{personas}} with formatted persona blocks', () => {
    const out = renderSystemPrompt(DEFAULT_SYSTEM_PROMPT_TEMPLATE, [holmes]);
    expect(out).not.toContain('{{personas}}');
    expect(out).toContain('id: "p1"');
    expect(out).toContain('Sherlock Holmes');
    expect(out).toContain('witty and sarcastic');
    expect(out).toContain('language: English');
  });
  it('default template enforces selectivity and JSON shape', () => {
    expect(DEFAULT_SYSTEM_PROMPT_TEMPLATE).toContain('{{personas}}');
    expect(DEFAULT_SYSTEM_PROMPT_TEMPLATE).toContain('paragraph_index');
    expect(DEFAULT_SYSTEM_PROMPT_TEMPLATE).toContain('selectively');
  });
  it('appends reader context when userPersona is provided', () => {
    const user: UserPersona = { id: 'u1', name: 'Alice', personality: 'A curious reader who loves mysteries.', createdAt: 0 };
    const out = renderSystemPrompt(DEFAULT_SYSTEM_PROMPT_TEMPLATE, [holmes], user);
    expect(out).toContain('The reader you are conversing with');
    expect(out).toContain('Alice');
    expect(out).toContain('A curious reader who loves mysteries.');
  });
  it('omits reader context when userPersona is undefined', () => {
    const out = renderSystemPrompt(DEFAULT_SYSTEM_PROMPT_TEMPLATE, [holmes]);
    expect(out).not.toContain('The reader you are conversing with');
  });
});
