import type { NumberedParagraph } from './types';

export interface ResolvedSelection {
  pids: string[];
  excerpt: NumberedParagraph[];
  text: string;
  ranges: { pid: string; start: number; end: number }[];
}

function getTextOffset(container: HTMLElement, targetNode: Node, targetOffset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node === targetNode) {
      return offset + targetOffset;
    }
    offset += node.textContent?.length ?? 0;
  }
  return offset;
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
  const ranges: { pid: string; start: number; end: number }[] = selected.map((el) => {
    const pid = el.getAttribute('data-pid')!;
    const text = (el.textContent ?? '').trim();
    const containsStart = el === range.startContainer || el.contains(range.startContainer);
    const containsEnd = el === range.endContainer || el.contains(range.endContainer);
    const start = containsStart ? getTextOffset(el, range.startContainer, range.startOffset) : 0;
    const end = containsEnd ? getTextOffset(el, range.endContainer, range.endOffset) : text.length;
    return { pid, start, end };
  });
  return { pids: excerpt.map((p) => p.pid), excerpt, text: range.toString().trim(), ranges };
}
