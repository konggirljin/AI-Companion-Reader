import { describe, it, expect, beforeEach } from 'vitest';
import { resolveSelection } from '@/lib/selection';

function setup(): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <p data-pid="0:0">First paragraph.</p>
    <p data-pid="0:1">Second paragraph here.</p>
    <p data-pid="0:2">Third one.</p>`;
  document.body.appendChild(container);
  return container;
}

beforeEach(() => { document.body.innerHTML = ''; });

describe('resolveSelection', () => {
  it('resolves a range spanning two paragraphs to their pids and numbered excerpt', () => {
    const container = setup();
    const range = document.createRange();
    const p0 = container.querySelector('[data-pid="0:0"]')!.firstChild!;
    const p1 = container.querySelector('[data-pid="0:1"]')!.firstChild!;
    range.setStart(p0, 6);            // middle of first paragraph
    range.setEnd(p1, 6);              // into second paragraph
    const result = resolveSelection(range, container)!;
    expect(result.pids).toEqual(['0:0', '0:1']);
    expect(result.excerpt).toEqual([
      { index: 0, pid: '0:0', text: 'First paragraph.' },
      { index: 1, pid: '0:1', text: 'Second paragraph here.' },
    ]);
  });

  it('returns null for collapsed range or outside selection', () => {
    const container = setup();
    const collapsed = document.createRange();
    collapsed.setStart(container.querySelector('[data-pid="0:0"]')!.firstChild!, 2);
    collapsed.collapse(true);
    expect(resolveSelection(collapsed, container)).toBeNull();
    const outside = document.createRange();
    outside.selectNodeContents(document.body);
    const detached = document.createElement('div');
    expect(resolveSelection(outside, detached)).toBeNull();
  });
});
