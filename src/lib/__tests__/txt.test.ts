import { describe, it, expect } from 'vitest';
import { parseTxt } from '@/lib/txt';

const enc = new TextEncoder();

describe('parseTxt', () => {
  it('splits Chinese chapter headings', async () => {
    const text = `序\n开篇的话。\n第一章 风起\n第一段的正文。\n\n第二段的正文。\n第二章 云涌\n第三章内容。`;
    const book = await parseTxt(enc.encode(text).buffer as ArrayBuffer, 'story.txt');
    expect(book.title).toBe('story');
    expect(book.chapters.map((c) => c.title)).toEqual(['序', '第一章 风起', '第二章 云涌']);
    expect(book.chapters[0].paragraphs[0]).toMatchObject({ id: '0:0', text: '开篇的话。' });
    expect(book.chapters[1].paragraphs.map((p) => p.id)).toEqual(['1:0', '1:1']);
    expect(book.chapters[1].paragraphs[0].text).toBe('第一段的正文。');
    expect(book.chapters[2].paragraphs[0].text).toBe('第三章内容。');
    expect(book.toc).toHaveLength(3);
  });

  it('splits English "Chapter N" headings case-insensitively', async () => {
    const text = `CHAPTER 1\nIt began.\nChapter 2\nIt continued.`;
    const book = await parseTxt(enc.encode(text).buffer as ArrayBuffer, 'en.txt');
    expect(book.chapters.map((c) => c.title)).toEqual(['CHAPTER 1', 'Chapter 2']);
  });

  it('falls back to GBK when UTF-8 decoding fails', async () => {
    // "你好" in GBK = C4 E3 BA C3, invalid as UTF-8
    const bytes = new Uint8Array([0xc4, 0xe3, 0xba, 0xc3, 0x0a, 0xc4, 0xe3, 0xba, 0xc3]);
    const book = await parseTxt(bytes.buffer as ArrayBuffer, 'gbk.txt');
    expect(book.chapters[0].paragraphs[0].text).toBe('你好');
  });

  it('chunks heading-less text into 500-paragraph parts', async () => {
    const text = Array.from({ length: 1200 }, (_, i) => `段落${i}`).join('\n');
    const book = await parseTxt(enc.encode(text).buffer as ArrayBuffer, 'long.txt');
    expect(book.chapters).toHaveLength(3);
    expect(book.chapters[0].title).toBe('Part 1');
    expect(book.chapters[2].paragraphs).toHaveLength(200);
    expect(book.chapters[1].paragraphs[0].id).toBe('1:0');
  });
});
