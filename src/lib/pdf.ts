import * as pdfjsLib from 'pdfjs-dist';
import type { ParsedBook, ParsedChapter, Paragraph, ChapterImage, TocEntry } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

function groupIntoLines(items: TextItem[]): TextItem[][] {
  const lines: TextItem[][] = [];
  let currentLine: TextItem[] = [];
  let lastY: number | null = null;

  for (const item of items) {
    const y = item.transform[5];
    if (lastY !== null && Math.abs(y - lastY) > 2) {
      if (currentLine.length) lines.push(currentLine);
      currentLine = [];
    }
    currentLine.push(item);
    lastY = y;
  }
  if (currentLine.length) lines.push(currentLine);
  return lines;
}

function linesToParagraphs(lines: TextItem[][], pageIndex: number): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let paraLines: TextItem[][] = [];
  let lastBottomY: number | null = null;

  for (const line of lines) {
    if (!line.length) continue;
    const topY = Math.max(...line.map(i => i.transform[5]));
    const gap = lastBottomY !== null ? lastBottomY - topY : 0;
    const avgHeight = line.reduce((s, i) => s + i.height, 0) / line.length;

    if (lastBottomY !== null && gap > avgHeight * 1.5) {
      if (paraLines.length) {
        const text = paraLines.flatMap(l => l.map(i => i.str)).join(' ').replace(/\s+/g, ' ').trim();
        if (text) {
          const firstItem = paraLines[0][0];
          const fontSize = Math.abs(firstItem.transform[0]);
          const tag = fontSize >= 18 ? 'h1' : 'p';
          paragraphs.push({
            id: `${pageIndex}:${paragraphs.length}`,
            text,
            tag,
            images: [],
          });
        }
      }
      paraLines = [];
    }

    paraLines.push(line);
    lastBottomY = Math.min(...line.map(i => i.transform[5] - i.height));
  }

  if (paraLines.length) {
    const text = paraLines.flatMap(l => l.map(i => i.str)).join(' ').replace(/\s+/g, ' ').trim();
    if (text) {
      const firstItem = paraLines[0][0];
      const fontSize = Math.abs(firstItem.transform[0]);
      const tag = fontSize >= 18 ? 'h1' : 'p';
      paragraphs.push({
        id: `${pageIndex}:${paragraphs.length}`,
        text,
        tag,
        images: [],
      });
    }
  }

  return paragraphs;
}

function isHeading(paragraph: Paragraph): boolean {
  if (paragraph.tag === 'h1') return true;
  const headingPatterns = [
    /^(chapter|part|section|book|act)\s/i,
    /^(第[一二三四五六七八九十百千万]+[章节回篇])/,
  ];
  return headingPatterns.some(p => p.test(paragraph.text));
}

function detectChapters(allPagesParagraphs: Paragraph[][]): ParsedChapter[] {
  const chapters: ParsedChapter[] = [];
  let currentParagraphs: Paragraph[] = [];
  let chapterIndex = 0;

  for (let i = 0; i < allPagesParagraphs.length; i++) {
    const pageParagraphs = allPagesParagraphs[i];

    if (pageParagraphs.length && isHeading(pageParagraphs[0]) && currentParagraphs.length > 0) {
      chapters.push({
        id: String(chapterIndex),
        title: `Chapter ${chapterIndex + 1}: ${pageParagraphs[0].text}`.slice(0, 128),
        paragraphs: currentParagraphs.map(p => ({ ...p, id: `${chapterIndex}:${p.id.split(':')[1]}` })),
        images: [],
      });
      chapterIndex++;
      currentParagraphs = [];
    }

    currentParagraphs.push(...pageParagraphs);
  }

  if (currentParagraphs.length) {
    chapters.push({
      id: String(chapterIndex),
      title: chapterIndex === 0 ? 'Content' : `Chapter ${chapterIndex + 1}`,
      paragraphs: currentParagraphs.map(p => ({ ...p, id: `${chapterIndex}:${p.id.split(':')[1]}` })),
      images: [],
    });
  }

  return chapters;
}

async function renderCover(doc: pdfjsLib.PDFDocumentProxy): Promise<Blob | undefined> {
  try {
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob returned null'));
      }, 'image/jpeg', 0.85);
    });
  } catch {
    return undefined;
  }
}

export async function parsePdf(data: ArrayBuffer): Promise<ParsedBook> {
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const allPagesParagraphs: Paragraph[][] = [];
  let title = '';
  let author = '';

  try {
    const metadata = await doc.getMetadata();
    const info = metadata.info as Record<string, unknown> | null;
    if (info) {
      title = String(info.Title || '');
      author = String(info.Author || '');
    }
  } catch {
    // metadata may be unavailable
  }

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as unknown as TextItem[];
    if (items.length) {
      const lines = groupIntoLines(items);
      const paragraphs = linesToParagraphs(lines, i - 1);
      allPagesParagraphs.push(paragraphs);
    } else {
      allPagesParagraphs.push([]);
    }
  }

  const chapters = detectChapters(allPagesParagraphs);
  const cover = await renderCover(doc);

  return {
    title: title || 'Untitled PDF',
    author: author || 'Unknown',
    cover,
    chapters,
    toc: chapters.map((c, i) => ({ chapterId: c.id, title: c.title, level: 0, index: i })),
  };
}
