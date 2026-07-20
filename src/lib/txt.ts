import type { ParsedBook, ParsedChapter, Paragraph, TocEntry } from './types';

// NOTE: no \b after the Chinese branch — JS \b is ASCII-only and never fires next to CJK chars.
const CHAPTER_RE = /^\s*(第[0-9零一二三四五六七八九十百千万两]+[章回卷节](?:\s.*)?|chapter\s+\d+\b.*)$/i;
const PARAGRAPHS_PER_PART = 500;

function decode(data: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    return new TextDecoder('gbk').decode(data);
  }
}

function makeChapter(id: string, title: string, lines: string[]): ParsedChapter {
  const paragraphs: Paragraph[] = lines.map((text, i) => ({ id: `${id}:${i}`, text, tag: 'p' as const }));
  return { id, title, paragraphs, images: [] };
}

export async function parseTxt(data: ArrayBuffer, filename: string): Promise<ParsedBook> {
  const title = filename.replace(/\.[^.]+$/, '');
  const lines = decode(data)
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const chapters: ParsedChapter[] = [];
  const hasHeadings = lines.some((l) => CHAPTER_RE.test(l));

  if (!hasHeadings) {
    if (!lines.length) lines.push('(empty file)');
    for (let i = 0; i < lines.length; i += PARAGRAPHS_PER_PART) {
      chapters.push(makeChapter(String(chapters.length), `Part ${chapters.length + 1}`, lines.slice(i, i + PARAGRAPHS_PER_PART)));
    }
  } else {
    let currentTitle = '';
    let current: string[] = [];
    const flush = () => {
      if (!currentTitle && !current.length) return;
      const id = String(chapters.length);
      if (currentTitle) {
        chapters.push(makeChapter(id, currentTitle, current));
      } else {
        // preamble before first heading: first line becomes the title
        chapters.push(makeChapter(id, current[0]?.slice(0, 20) ?? 'Opening', current.slice(1)));
      }
      current = [];
      currentTitle = '';
    };
    for (const line of lines) {
      if (CHAPTER_RE.test(line)) {
        flush();
        currentTitle = line;
      } else {
        current.push(line);
      }
    }
    flush();
  }

  const toc: TocEntry[] = chapters.map((c) => ({ title: c.title, chapterId: c.id, level: 0 }));
  return { title, author: '', toc, chapters, cover: undefined };
}
