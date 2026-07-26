import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { detectBookFormat } from '@/lib/book-format';

async function buildMinimalEpub(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles>
    </container>`);
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('detectBookFormat', () => {
  it('recognises EPUB files by extension or MIME type', async () => {
    const garbage = new ArrayBuffer(4);
    await expect(detectBookFormat({ name: 'book.EPUB', type: '' }, garbage)).resolves.toBe('epub');
    await expect(
      detectBookFormat({ name: 'book', type: 'application/epub+zip' }, garbage),
    ).resolves.toBe('epub');
  });

  it('recognises an extensionless EPUB from its ZIP contents', async () => {
    const data = await buildMinimalEpub();
    await expect(detectBookFormat({ name: '人間失格', type: '' }, data)).resolves.toBe('epub');
    await expect(detectBookFormat({ name: 'download.bin', type: 'application/octet-stream' }, data)).resolves.toBe('epub');
  });

  it('does not treat an ordinary ZIP as an EPUB', async () => {
    const zip = new JSZip();
    zip.file('notes.txt', 'hello');
    const data = await zip.generateAsync({ type: 'arraybuffer' });
    await expect(detectBookFormat({ name: 'notes', type: 'application/zip' }, data))
      .rejects.toThrow('UNSUPPORTED_FILE_TYPE');
  });

  it('recognises named and extensionless plain-text files', async () => {
    const data = new TextEncoder().encode('A plain text book.').buffer as ArrayBuffer;
    await expect(detectBookFormat({ name: 'book.txt', type: '' }, data)).resolves.toBe('txt');
    await expect(detectBookFormat({ name: 'book', type: '' }, data)).resolves.toBe('txt');
  });

  it('rejects unsupported binary data', async () => {
    const data = new Uint8Array([0x00, 0x01, 0x02, 0xff]).buffer;
    await expect(detectBookFormat({ name: 'image.bin', type: 'application/octet-stream' }, data))
      .rejects.toThrow('UNSUPPORTED_FILE_TYPE');
  });
});
