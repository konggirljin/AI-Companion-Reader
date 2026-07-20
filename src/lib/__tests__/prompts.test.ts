import { describe, it, expect } from 'vitest';
import { DEFAULT_SYSTEM_PROMPT_TEMPLATE, renderSystemPrompt } from '@/lib/prompts';
import type { Persona } from '@/lib/types';

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
});
