import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseEpub } from '@/lib/epub';

async function buildEpub3(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
    </container>`);
  zip.file('OEBPS/content.opf', `<?xml version="1.0"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>Test Book</dc:title><dc:creator>Jane Author</dc:creator>
      </metadata>
      <manifest>
        <item id="ch1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>
        <item id="ch2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/>
        <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
        <item id="cover" href="img/cover.png" media-type="image/png" properties="cover-image"/>
        <item id="pic" href="img/pic.png" media-type="image/png"/>
      </manifest>
      <spine><itemref idref="ch1"/><itemref idref="ch2"/></spine>
    </package>`);
  zip.file('OEBPS/nav.xhtml', `<?xml version="1.0"?>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
    <body><nav epub:type="toc"><ol>
      <li><a href="text/ch1.xhtml">Chapter One</a>
        <ol><li><a href="text/ch1.xhtml#s2">Section 1.2</a></li></ol></li>
      <li><a href="text/ch2.xhtml">Chapter Two</a></li>
    </ol></nav></body></html>`);
  zip.file('OEBPS/text/ch1.xhtml', `<?xml version="1.0"?>
    <html xmlns="http://www.w3.org/1999/xhtml"><body>
      <h1>Chapter One</h1>
      <p id="s2">Hello world.</p>
      <p>   </p>
      <p>Second <b>para</b>.</p>
      <div><p>Nested para.</p></div>
      <script>alert(1)</script>
      <p><img src="../img/pic.png" alt="A pic"/></p>
      <blockquote>A quote.</blockquote>
    </body></html>`);
  zip.file('OEBPS/text/ch2.xhtml', `<?xml version="1.0"?>
    <html xmlns="http://www.w3.org/1999/xhtml"><body><p>Second chapter text.</p></body></html>`);
  zip.file('OEBPS/img/cover.png', new Uint8Array([137, 80, 78, 71]));
  zip.file('OEBPS/img/pic.png', new Uint8Array([137, 80, 78, 71]));
  return zip.generateAsync({ type: 'arraybuffer' });
}

async function buildEpub2(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles>
    </container>`);
  zip.file('content.opf', `<?xml version="1.0"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Old Book</dc:title></metadata>
      <manifest>
        <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
      </manifest>
      <spine toc="ncx"><itemref idref="ch1"/></spine>
    </package>`);
  zip.file('toc.ncx', `<?xml version="1.0"?>
    <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
      <navMap>
        <navPoint id="n1" playOrder="1"><navLabel><text>Start</text></navLabel><content src="ch1.xhtml"/>
          <navPoint id="n2" playOrder="2"><navLabel><text>Start B</text></navLabel><content src="ch1.xhtml#b"/></navPoint>
        </navPoint>
      </navMap>
    </ncx>`);
  zip.file('ch1.xhtml', `<?xml version="1.0"?>
    <html xmlns="http://www.w3.org/1999/xhtml"><body><p>Only chapter.</p></body></html>`);
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('parseEpub (EPUB3)', () => {
  it('extracts metadata, toc with levels, chapters, paragraphs, images, cover', async () => {
    const book = await parseEpub(await buildEpub3());
    expect(book.title).toBe('Test Book');
    expect(book.author).toBe('Jane Author');
    expect(book.cover).toBeInstanceOf(Blob);

    expect(book.toc).toEqual([
      { title: 'Chapter One', chapterId: '0', level: 0 },
      { title: 'Section 1.2', chapterId: '0', level: 1, anchorPid: '0:1' },
      { title: 'Chapter Two', chapterId: '1', level: 0 },
    ]);

    expect(book.chapters).toHaveLength(2);
    const ch0 = book.chapters[0];
    expect(ch0.id).toBe('0');
    expect(ch0.title).toBe('Chapter One');

    const ids = ch0.paragraphs.map((p) => p.id);
    expect(ids).toEqual(['0:0', '0:1', '0:2', '0:3', '0:4', '0:5']);
    expect(ch0.paragraphs[0]).toMatchObject({ tag: 'h1', text: 'Chapter One' });
    expect(ch0.paragraphs[1].text).toBe('Hello world.');
    expect(ch0.paragraphs[2].text).toBe('Second para.');       // inline tags flattened
    expect(ch0.paragraphs[3].text).toBe('Nested para.');       // nested block found once
    expect(ch0.paragraphs[4].images).toEqual([{ path: 'OEBPS/img/pic.png', alt: 'A pic' }]);
    expect(ch0.paragraphs[5]).toMatchObject({ tag: 'blockquote', text: 'A quote.' });
    expect(ch0.paragraphs.some((p) => p.text.includes('alert'))).toBe(false); // script stripped
    expect(ch0.images).toHaveLength(1);
    expect(ch0.images[0].path).toBe('OEBPS/img/pic.png');
    expect(ch0.images[0].blob).toBeInstanceOf(Blob);

    expect(book.chapters[1].paragraphs[0].text).toBe('Second chapter text.');
  });

  it('throws CORRUPT_EPUB on garbage', async () => {
    await expect(parseEpub(new ArrayBuffer(8))).rejects.toThrow('CORRUPT_EPUB');
  });
});

async function buildEpubWithSubsections(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
    </container>`);
  zip.file('OEBPS/content.opf', `<?xml version="1.0"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>Trilogy</dc:title>
      </metadata>
      <manifest>
        <item id="bk1" href="text/book1.xhtml" media-type="application/xhtml+xml"/>
        <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
      </manifest>
      <spine><itemref idref="bk1"/></spine>
    </package>`);
  zip.file('OEBPS/nav.xhtml', `<?xml version="1.0"?>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
    <body><nav epub:type="toc"><ol>
      <li><a href="text/book1.xhtml#book1">Book One</a>
        <ol>
          <li><a href="text/book1.xhtml#ch1">Chapter 1</a></li>
          <li><a href="text/book1.xhtml#ch2">Chapter 2</a></li>
        </ol>
      </li>
    </ol></nav></body></html>`);
  zip.file('OEBPS/text/book1.xhtml', `<?xml version="1.0"?>
    <html xmlns="http://www.w3.org/1999/xhtml"><body>
      <h1 id="book1">Book One</h1>
      <h2 id="ch1">Chapter 1</h2>
      <p>First para.</p>
      <h2 id="ch2">Chapter 2</h2>
      <p>Second para.</p>
    </body></html>`);
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('parseEpub with subsection anchors (large chapter files)', () => {
  it('maps each toc subsection to a distinct paragraph anchor within the shared chapter', async () => {
    const book = await parseEpub(await buildEpubWithSubsections());
    expect(book.toc).toEqual([
      { title: 'Book One', chapterId: '0', level: 0, anchorPid: '0:0' },
      { title: 'Chapter 1', chapterId: '0', level: 1, anchorPid: '0:1' },
      { title: 'Chapter 2', chapterId: '0', level: 1, anchorPid: '0:3' },
    ]);
    const ch = book.chapters[0];
    expect(ch.anchors).toMatchObject({ book1: '0:0', ch1: '0:1', ch2: '0:3' });
    const anchorPids = book.toc.map((t) => t.anchorPid);
    expect(new Set(anchorPids).size).toBe(anchorPids.length);
  });
});

async function buildEpubWithTextNodes(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
    </container>`);
  zip.file('OEBPS/content.opf', `<?xml version="1.0"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
      <metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Text Node Book</dc:title></metadata>
      <manifest>
        <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
      </manifest>
      <spine><itemref idref="ch1"/></spine>
    </package>`);
  zip.file('OEBPS/ch1.xhtml', `<?xml version="1.0"?>
    <html xmlns="http://www.w3.org/1999/xhtml"><body>
      <p>First proper paragraph.</p>
      <div>Text directly inside a div.</div>
      <section><div>Text inside a section div.</div></section>
      <div><p>Paragraph inside div.</p><span>Inline span text.</span></div>
    </body></html>`);
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('extractParagraphs with text nodes', () => {
  it('captures text nodes inside non-block containers (div, section)', async () => {
    const book = await parseEpub(await buildEpubWithTextNodes());
    expect(book.chapters).toHaveLength(1);
    const texts = book.chapters[0].paragraphs.map((p) => p.text);
    expect(texts).toContain('First proper paragraph.');
    expect(texts).toContain('Text directly inside a div.');
    expect(texts).toContain('Text inside a section div.');
    expect(texts).toContain('Paragraph inside div.');
  });
});

describe('parseEpub (EPUB2 NCX)', () => {
  it('reads toc.ncx when nav.xhtml is absent', async () => {
    const book = await parseEpub(await buildEpub2());
    expect(book.title).toBe('Old Book');
    expect(book.toc).toEqual([
      { title: 'Start', chapterId: '0', level: 0 },
      { title: 'Start B', chapterId: '0', level: 1 },
    ]);
  });
});
