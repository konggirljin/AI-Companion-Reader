import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PaginatedChapter } from '@/components/reader/paginated-chapter';
import type { ReaderPrefs } from '@/lib/types';

const chapter = {
  id: '0',
  title: 'Chapter 1',
  paragraphs: [{ id: '0:0', text: 'Hello world', tag: 'p' as const }],
  images: [],
};

const basePrefs: ReaderPrefs = {
  fontSize: 18,
  fontFamily: 'serif',
  lineSpacing: 1.8,
  theme: 'amber',
  readingMode: 'paginated',
  pageAnimation: 'normal',
};

function renderReader(prefs: ReaderPrefs): string {
  return renderToStaticMarkup(
    <PaginatedChapter
      chapter={chapter}
      imageUrls={new Map()}
      prefs={prefs}
      pageIndex={1}
      pageCount={3}
      onPageCountChange={() => {}}
      onFirstVisiblePidChange={() => {}}
      chapterThreads={[]}
      pendingPids={[]}
      personas={[]}
      registerSelectionContainer={() => {}}
      onSelectionResolve={() => {}}
      onToolbarPos={() => {}}
      onSend={() => {}}
      registerBackNav={() => {}}
      highlightedPids={new Set()}
    />,
  );
}

describe('reader modes', () => {
  it('renders vertical scrolling with chapter navigation', () => {
    const html = renderReader({ ...basePrefs, readingMode: 'scroll' });
    expect(html).toContain('overflow-y-auto');
    expect(html).toContain('Previous chapter');
    expect(html).toContain('Next chapter');
    expect(html).toContain('transition:none');
  });

  it('renders the selected page animation speed', () => {
    expect(renderReader(basePrefs)).toContain('transition:transform 250ms ease-out');
    expect(renderReader({ ...basePrefs, pageAnimation: 'none' })).toContain('transition:none');
    expect(renderReader({ ...basePrefs, pageAnimation: 'slow' })).toContain('transition:transform 450ms ease-out');
  });
});
