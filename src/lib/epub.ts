import JSZip from 'jszip';
import type { ChapterImage, Paragraph, ParsedBook, ParsedChapter, TocEntry } from './types';

const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE']);
const STRIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME']);

/** Resolve `href` relative to directory `baseDir` (both zip-internal, no leading slash). */
export function resolvePath(baseDir: string, href: string): string {
  const clean = decodeURIComponent(href.split('#')[0]);
  const parts = [...(baseDir ? baseDir.split('/') : []), ...clean.split('/')];
  const out: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

function dirOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

function parseXml(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'application/xhtml+xml');
  if (doc.querySelector('parsererror')) {
    return new DOMParser().parseFromString(xml, 'text/html');
  }
  return doc;
}

/** First element (document order) whose localName matches, ignoring namespaces. */
function byLocal(root: Document | Element, name: string): Element | null {
  const all = root.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) if (all[i].localName === name) return all[i];
  return null;
}

function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? '').trim();
}

async function blobAt(zip: JSZip, path: string): Promise<Blob | undefined> {
  const entry = zip.file(path);
  if (!entry) return undefined;
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const mime =
    ext === 'png' ? 'image/png'
    : ext === 'gif' ? 'image/gif'
    : ext === 'svg' ? 'image/svg+xml'
    : ext === 'webp' ? 'image/webp'
    : 'image/jpeg';
  return new Blob([await entry.async('arraybuffer')], { type: mime });
}

/** Collect leaf block-level paragraphs in document order; strip dangerous nodes inline.
 *  NOTE: XML-parsed documents (application/xhtml+xml) preserve authored lowercase tagNames,
 *  HTML-parsed ones uppercase them — always normalize with toUpperCase() before set lookup. */
function extractParagraphs(body: Element, chapterIndex: number, chapterDir: string): Paragraph[] {
  const out: Paragraph[] = [];
  const tagOf = (el: Element) => el.tagName.toUpperCase();

  const emitBlock = (el: Element) => {
    const tag = tagOf(el);
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    const images = Array.from(el.getElementsByTagName('img'))
      .filter((img) => Boolean(img.getAttribute('src')))
      .map((img) => ({
        path: resolvePath(chapterDir, img.getAttribute('src')!),
        alt: img.getAttribute('alt') ?? undefined,
      }));
    if (text || images.length) {
      out.push({
        id: `${chapterIndex}:${out.length}`,
        text,
        tag: tag.toLowerCase() as Paragraph['tag'],
        ...(images.length ? { images } : {}),
      });
    }
  };

  const walk = (el: Element) => {
    const tag = tagOf(el);
    if (STRIP_TAGS.has(tag)) return;
    if (BLOCK_TAGS.has(tag)) {
      const hasBlockChild = Array.from(el.children).some((c) => BLOCK_TAGS.has(tagOf(c)));
      if (!hasBlockChild) { emitBlock(el); return; }
      for (const child of Array.from(el.children)) walk(child);
      return;
    }
    // Non-block container: walk childNodes so direct text nodes aren't lost
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === 3) {
        const text = (child.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text) {
          out.push({ id: `${chapterIndex}:${out.length}`, text, tag: 'p' });
        }
      } else if (child.nodeType === 1) {
        walk(child as Element);
      }
    }
  };
  walk(body);
  return out;
}

/** Parse a nav.xhtml or toc.ncx element tree into flat entries with nesting level. */
function tocFromNav(navEl: Element, chapterDir: string, chapterIdByPath: Map<string, string>): TocEntry[] {
  const entries: TocEntry[] = [];
  const walkList = (list: Element, level: number) => {
    for (const li of Array.from(list.children).filter((c) => c.localName === 'li')) {
      const anchor = Array.from(li.children).find((c) => c.localName === 'a' || c.localName === 'span');
      const href = anchor?.getAttribute('href');
      const title = textOf(anchor);
      if (title && href) {
        const path = resolvePath(chapterDir, href);
        const chapterId = chapterIdByPath.get(path);
        if (chapterId !== undefined) entries.push({ title, chapterId, level });
      }
      const sub = Array.from(li.children).find((c) => c.localName === 'ol' || c.localName === 'ul');
      if (sub) walkList(sub, level + 1);
    }
  };
  const root = Array.from(navEl.getElementsByTagName('ol'))[0] ?? Array.from(navEl.getElementsByTagName('ul'))[0];
  if (root) walkList(root, 0);
  return entries;
}

function tocFromNcx(ncxDoc: Document, chapterDir: string, chapterIdByPath: Map<string, string>): TocEntry[] {
  const entries: TocEntry[] = [];
  const walkPoint = (np: Element, level: number) => {
    let title = '';
    let src = '';
    for (const child of Array.from(np.children)) {
      if (child.localName === 'navLabel') title = textOf(byLocal(child, 'text') ?? child);
      if (child.localName === 'content') src = child.getAttribute('src') ?? '';
    }
    if (title && src) {
      const chapterId = chapterIdByPath.get(resolvePath(chapterDir, src));
      if (chapterId !== undefined) entries.push({ title, chapterId, level });
    }
    for (const child of Array.from(np.children)) {
      if (child.localName === 'navPoint') walkPoint(child, level + 1);
    }
  };
  const navMap = byLocal(ncxDoc, 'navMap');
  if (navMap) {
    for (const child of Array.from(navMap.children)) {
      if (child.localName === 'navPoint') walkPoint(child, 0);
    }
  }
  return entries;
}

export async function parseEpub(data: ArrayBuffer): Promise<ParsedBook> {
  try {
    const zip = await JSZip.loadAsync(data);

    // 1. container.xml → OPF path
    const containerXml = await zip.file('META-INF/container.xml')?.async('text');
    if (!containerXml) throw new Error('no container');
    const containerDoc = parseXml(containerXml);
    const rootfile = byLocal(containerDoc, 'rootfile');
    const opfPath = rootfile?.getAttribute('full-path');
    if (!opfPath) throw new Error('no opf');
    const opfDir = dirOf(opfPath);

    // 2. OPF: metadata, manifest, spine
    const opfDoc = parseXml((await zip.file(opfPath)?.async('text')) ?? '');
    const title = textOf(byLocal(opfDoc, 'title')) || 'Untitled';
    const author = textOf(byLocal(opfDoc, 'creator'));

    const manifest = new Map<string, { href: string; mediaType: string; properties: string }>();
    for (const item of Array.from(opfDoc.getElementsByTagName('item'))) {
      manifest.set(item.getAttribute('id') ?? '', {
        href: item.getAttribute('href') ?? '',
        mediaType: item.getAttribute('media-type') ?? '',
        properties: item.getAttribute('properties') ?? '',
      });
    }
    const spineHrefs: string[] = [];
    for (const ref of Array.from(opfDoc.getElementsByTagName('itemref'))) {
      const item = manifest.get(ref.getAttribute('idref') ?? '');
      if (item) spineHrefs.push(resolvePath(opfDir, item.href));
    }
    if (!spineHrefs.length) throw new Error('empty spine');
    const chapterIdByPath = new Map(spineHrefs.map((p, i) => [p, String(i)]));

    // 3. TOC: EPUB3 nav → else EPUB2 ncx → else spine fallback
    let toc: TocEntry[] = [];
    const navItem = Array.from(manifest.values()).find((i) => i.properties.split(/\s+/).includes('nav'));
    if (navItem) {
      const navPath = resolvePath(opfDir, navItem.href);
      const navDoc = parseXml((await zip.file(navPath)?.async('text')) ?? '');
      const navEl = Array.from(navDoc.getElementsByTagName('nav')).find(
        (n) => (n.getAttribute('epub:type') ?? n.getAttribute('role') ?? '').includes('toc') || n.getElementsByTagName('ol').length > 0,
      );
      if (navEl) toc = tocFromNav(navEl, dirOf(navPath), chapterIdByPath);
    }
    if (!toc.length) {
      const ncxItem = Array.from(manifest.values()).find((i) => i.mediaType === 'application/x-dtbncx+xml');
      if (ncxItem) {
        const ncxPath = resolvePath(opfDir, ncxItem.href);
        toc = tocFromNcx(parseXml((await zip.file(ncxPath)?.async('text')) ?? ''), dirOf(ncxPath), chapterIdByPath);
      }
    }

    // 4. Chapters
    const chapters: ParsedChapter[] = [];
    const chapterTitles = new Map<string, string>();
    for (const entry of toc) if (!chapterTitles.has(entry.chapterId)) chapterTitles.set(entry.chapterId, entry.title);
    for (let i = 0; i < spineHrefs.length; i++) {
      const path = spineHrefs[i];
      const doc = parseXml((await zip.file(path)?.async('text')) ?? '');
      const body = doc.body ?? doc.documentElement;
      const paragraphs = body ? extractParagraphs(body, i, dirOf(path)) : [];
      const imagePaths = new Set(paragraphs.flatMap((p) => (p.images ?? []).map((im) => im.path)));
      const images: ChapterImage[] = [];
      for (const imgPath of imagePaths) {
        const blob = await blobAt(zip, imgPath);
        if (blob) images.push({ path: imgPath, blob });
      }
      chapters.push({ id: String(i), title: chapterTitles.get(String(i)) ?? `Chapter ${i + 1}`, paragraphs, images });
    }
    if (!toc.length) {
      toc = chapters.map((c) => ({ title: c.title, chapterId: c.id, level: 0 }));
    }

    // 5. Cover: cover-image property → meta name="cover" → first chapter image (spec §5.6)
    let cover: Blob | undefined;
    const coverItem = Array.from(manifest.values()).find((i) => i.properties.split(/\s+/).includes('cover-image'));
    if (coverItem) cover = await blobAt(zip, resolvePath(opfDir, coverItem.href));
    if (!cover) {
      const metaCover = Array.from(opfDoc.getElementsByTagName('meta')).find((m) => m.getAttribute('name') === 'cover');
      const id = metaCover?.getAttribute('content');
      const item = id ? manifest.get(id) : undefined;
      if (item) cover = await blobAt(zip, resolvePath(opfDir, item.href));
    }
    if (!cover) cover = chapters[0]?.images[0]?.blob;

    return { title, author, cover, toc, chapters };
  } catch (err) {
    if (err instanceof Error && err.message === 'CORRUPT_EPUB') throw err;
    throw new Error('CORRUPT_EPUB');
  }
}
