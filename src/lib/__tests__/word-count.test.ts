import { describe, it, expect } from 'vitest';
import { countWords } from '@/lib/word-count';

describe('countWords', () => {
  it('counts English words', () => {
    expect(countWords('the quick brown fox')).toBe(4);
  });
  it('counts each CJK character as one word', () => {
    expect(countWords('你好世界')).toBe(4);
  });
  it('counts mixed text', () => {
    expect(countWords('hello 你好 world')).toBe(4);
  });
});
