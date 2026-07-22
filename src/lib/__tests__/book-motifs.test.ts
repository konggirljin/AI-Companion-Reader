import { describe, it, expect } from 'vitest';
import { pickCoverStyle, MOTIF_TYPES } from '../book-motifs';

describe('pickCoverStyle', () => {
  it('returns the same style for the same seed every time', () => {
    const a = pickCoverStyle('book-1');
    const b = pickCoverStyle('book-1');
    expect(a).toEqual(b);
  });

  it('spreads across different seeds', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seen.add(pickCoverStyle(`book-${i}`).motif);
    }
    expect(seen.size).toBeGreaterThanOrEqual(MOTIF_TYPES.length / 2);
  });

  it('every style has valid fields', () => {
    for (const m of MOTIF_TYPES) {
      const s = pickCoverStyle(`seed-${m}`);
      expect(s.bg).toMatch(/^#/);
      expect(s.textColor.length).toBeGreaterThan(0);
      expect(s.accentColor.length).toBeGreaterThan(0);
      expect(MOTIF_TYPES).toContain(s.motif);
    }
  });
});
