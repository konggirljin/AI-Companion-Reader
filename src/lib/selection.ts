import type { NumberedParagraph } from './types';

export interface ResolvedSelection {
  pids: string[];
  excerpt: NumberedParagraph[];
  text: string;
}

export function resolveSelection(range: Range, container: HTMLElement): ResolvedSelection | null {
  if (range.collapsed) return null;
  const blocks = Array.from(container.querySelectorAll<HTMLElement>('[data-pid]'));
  const selected = blocks.filter((el) => {
    try {
      return range.intersectsNode(el);
    } catch {
      return false;
    }
  });
  if (!selected.length) return null;
  const excerpt: NumberedParagraph[] = selected.map((el, index) => ({
    index,
    pid: el.getAttribute('data-pid')!,
    text: (el.textContent ?? '').trim(),
  }));
  return { pids: excerpt.map((p) => p.pid), excerpt, text: range.toString().trim() };
}
