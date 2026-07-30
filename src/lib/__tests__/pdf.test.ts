import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('pdfjs-dist', () => {
  const createMockDoc = (numPages: number, pageItems: Array<Array<{ str: string; transform: number[]; width: number; height: number; fontName: string }>>, metadata: Record<string, unknown>) => ({
    numPages,
    promise: undefined as unknown as Promise<any>,
    getPage: vi.fn((i: number) => {
      const items = pageItems[i - 1] || [];
      return {
        getTextContent: vi.fn().mockResolvedValue({ items, styles: {} }),
        getViewport: vi.fn(() => ({ width: 612, height: 792 })),
        render: vi.fn(() => ({
          promise: Promise.resolve(),
        })),
      };
    }),
    getMetadata: vi.fn().mockResolvedValue({ info: metadata }),
  });

  let mockDoc: ReturnType<typeof createMockDoc>;

  return {
    version: '4.10.38',
    default: {},
    getDocument: vi.fn(() => {
      const doc = mockDoc;
      doc.promise = Promise.resolve(doc);
      return doc;
    }),
    GlobalWorkerOptions: { workerSrc: '' },
    __setMockDoc: (doc: ReturnType<typeof createMockDoc>) => { mockDoc = doc; },
  };
});

import * as pdfjsLib from 'pdfjs-dist';
import { parsePdf } from '@/lib/pdf';

const makeTextItem = (str: string, y: number, x: number = 100, fontSize: number = 12, fontName: string = 'Helvetica'): { str: string; transform: number[]; width: number; height: number; fontName: string } => ({
  str,
  transform: [fontSize, 0, 0, fontSize, x, y],
  width: str.length * fontSize * 0.6,
  height: fontSize,
  fontName,
});

describe('parsePdf', () => {
  beforeEach(() => {
    (pdfjsLib as any).__setMockDoc(null);
  });

  it('extracts text from a single-page PDF', async () => {
    const items = [makeTextItem('Hello World', 700)];
    const mockDoc = {
      numPages: 1,
      getPage: vi.fn((_i: number) => ({
        getTextContent: vi.fn().mockResolvedValue({ items, styles: {} }),
        getViewport: vi.fn(() => ({ width: 612, height: 792 })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      })),
      getMetadata: vi.fn().mockResolvedValue({ info: { Title: 'Test PDF' } }),
    };

    (mockDoc as any).promise = Promise.resolve(mockDoc);
    (pdfjsLib.getDocument as any).mockReturnValue(mockDoc);

    const data = new ArrayBuffer(8);
    const result = await parsePdf(data);

    expect(result.title).toBe('Test PDF');
    expect(result.chapters.length).toBeGreaterThan(0);
    const text = result.chapters.flatMap(c => c.paragraphs.map(p => p.text)).join(' ');
    expect(text).toContain('Hello World');
  });

  it('groups text items on the same Y into one line, then into paragraphs by spacing', async () => {
    const items = [
      makeTextItem('This is', 700, 100),
      makeTextItem('line one', 700, 150),
      makeTextItem('This is line two', 650),
    ];
    const mockDoc = {
      numPages: 1,
      getPage: vi.fn((_i: number) => ({
        getTextContent: vi.fn().mockResolvedValue({ items, styles: {} }),
        getViewport: vi.fn(() => ({ width: 612, height: 792 })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      })),
      getMetadata: vi.fn().mockRejectedValue(new Error('no meta')),
    };
    (mockDoc as any).promise = Promise.resolve(mockDoc);
    (pdfjsLib.getDocument as any).mockReturnValue(mockDoc);

    const data = new ArrayBuffer(8);
    const result = await parsePdf(data);
    const paras = result.chapters[0].paragraphs;
    expect(paras).toHaveLength(2);
    expect(paras[0].text).toContain('line one');
    expect(paras[1].text).toContain('line two');
  });

  it('creates proper chapter structure', async () => {
    const items = [makeTextItem('Some content', 700)];
    const mockDoc = {
      numPages: 1,
      getPage: vi.fn((_i: number) => ({
        getTextContent: vi.fn().mockResolvedValue({ items, styles: {} }),
        getViewport: vi.fn(() => ({ width: 612, height: 792 })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      })),
      getMetadata: vi.fn().mockRejectedValue(new Error('no meta')),
    };
    (mockDoc as any).promise = Promise.resolve(mockDoc);
    (pdfjsLib.getDocument as any).mockReturnValue(mockDoc);

    const data = new ArrayBuffer(8);
    const result = await parsePdf(data);

    for (const ch of result.chapters) {
      expect(ch.id).toBeTruthy();
      expect(ch.paragraphs.length).toBeGreaterThan(0);
      for (const p of ch.paragraphs) {
        expect(p.id).toBeTruthy();
        expect(typeof p.text).toBe('string');
        expect(p.tag).toMatch(/^(p|h1|h2|h3|h4|h5|h6|blockquote)$/);
      }
    }
  });

  it('returns toc entries matching chapter count', async () => {
    const items = [makeTextItem('Content', 700)];
    const mockDoc = {
      numPages: 1,
      getPage: vi.fn((_i: number) => ({
        getTextContent: vi.fn().mockResolvedValue({ items, styles: {} }),
        getViewport: vi.fn(() => ({ width: 612, height: 792 })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      })),
      getMetadata: vi.fn().mockRejectedValue(new Error('no meta')),
    };
    (mockDoc as any).promise = Promise.resolve(mockDoc);
    (pdfjsLib.getDocument as any).mockReturnValue(mockDoc);

    const data = new ArrayBuffer(8);
    const result = await parsePdf(data);
    expect(result.toc.length).toBe(result.chapters.length);
  });

  it('uses fallback title and author when metadata is missing', async () => {
    const items = [makeTextItem('Text', 700)];
    const mockDoc = {
      numPages: 1,
      getPage: vi.fn((_i: number) => ({
        getTextContent: vi.fn().mockResolvedValue({ items, styles: {} }),
        getViewport: vi.fn(() => ({ width: 612, height: 792 })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      })),
      getMetadata: vi.fn().mockRejectedValue(new Error('no meta')),
    };
    (mockDoc as any).promise = Promise.resolve(mockDoc);
    (pdfjsLib.getDocument as any).mockReturnValue(mockDoc);

    const data = new ArrayBuffer(8);
    const result = await parsePdf(data);
    expect(result.title).toBe('Untitled PDF');
    expect(result.author).toBe('Unknown');
  });

  it('detects headings from large font size', async () => {
    const items = [
      makeTextItem('Chapter One', 700, 100, 24),
    ];
    const mockDoc = {
      numPages: 1,
      getPage: vi.fn((_i: number) => ({
        getTextContent: vi.fn().mockResolvedValue({ items, styles: {} }),
        getViewport: vi.fn(() => ({ width: 612, height: 792 })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      })),
      getMetadata: vi.fn().mockRejectedValue(new Error('no meta')),
    };
    (mockDoc as any).promise = Promise.resolve(mockDoc);
    (pdfjsLib.getDocument as any).mockReturnValue(mockDoc);

    const data = new ArrayBuffer(8);
    const result = await parsePdf(data);
    const para = result.chapters[0].paragraphs[0];
    expect(para.tag).toBe('h1');
    expect(para.text).toContain('Chapter One');
  });
});
