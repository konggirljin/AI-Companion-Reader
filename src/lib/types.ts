export interface TocEntry { title: string; chapterId: string; level: number }

export interface Paragraph {
  id: string; // `${chapterIndex}:${paragraphIndex}`
  text: string;
  tag: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote';
  images?: { path: string; alt?: string }[];
}

export interface ChapterImage { path: string; blob: Blob }

export interface ParsedChapter { id: string; title: string; paragraphs: Paragraph[]; images: ChapterImage[] }

export interface ParsedBook {
  title: string;
  author: string;
  cover?: Blob;
  toc: TocEntry[];
  chapters: ParsedChapter[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  format: 'epub' | 'txt';
  coverRef?: string;          // idb key
  toc: TocEntry[];
  addedAt: number;
  order: number;
  chapterCount: number;
  status?: 'favorites' | 'toRead' | 'finished';
  progress?: { chapterId: string; paragraphId: string; pageIndex: number };
}

export interface Persona {
  id: string;
  name: string;
  avatar: string;             // base64 data URL, <=256px
  characterDescription: string;
  language: string;           // '中文' | 'English' | custom
  createdAt: number;
}

export interface ThreadComment { personaId: string; text: string }

export interface Thread {
  id: string;
  bookId: string;
  chapterId: string;
  paragraphId: string;
  selectedText: string;
  comments: ThreadComment[];
  createdAt: number;
}

export interface Bookmark { id: string; bookId: string; chapterId: string; paragraphId: string; createdAt: number }

export interface Settings {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPromptTemplate: string; // contains {{personas}}
  proxyUrl: string;             // optional CORS proxy base URL (empty = direct)
}

export type ReaderTheme = 'amber' | 'warmWhite';

export interface ReaderPrefs { fontSize: number; fontFamily: string; lineSpacing: number; theme: ReaderTheme }

export interface UserPersona {
  id: string;
  name: string;
  personality: string;
  createdAt: number;
}

export interface ApiProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  createdAt: number;
}

export interface NumberedParagraph { index: number; pid: string; text: string }

export interface AIComment { personaId: string; paragraphIndex: number; text: string }
