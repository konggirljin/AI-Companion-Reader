import JSZip from 'jszip';

export type BookFormat = 'epub' | 'txt' | 'pdf';

const EPUB_MIME_TYPES = new Set([
  'application/epub+zip',
  'application/x-epub+zip',
]);

const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
]);

const PDF_MIME_TYPES = new Set([
  'application/pdf',
]);

function hasZipSignature(data: ArrayBuffer): boolean {
  if (data.byteLength < 4) return false;
  const bytes = new Uint8Array(data, 0, 4);
  return (
    bytes[0] === 0x50
    && bytes[1] === 0x4b
    && (
      (bytes[2] === 0x03 && bytes[3] === 0x04)
      || (bytes[2] === 0x05 && bytes[3] === 0x06)
      || (bytes[2] === 0x07 && bytes[3] === 0x08)
    )
  );
}

function hasPdfSignature(data: ArrayBuffer): boolean {
  if (data.byteLength < 4) return false;
  const bytes = new Uint8Array(data, 0, 4);
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

async function hasEpubStructure(data: ArrayBuffer): Promise<boolean> {
  if (!hasZipSignature(data)) return false;
  try {
    const zip = await JSZip.loadAsync(data);
    const mimetype = await zip.file('mimetype')?.async('text');
    return (
      mimetype?.trim() === 'application/epub+zip'
      || Boolean(zip.file('META-INF/container.xml'))
    );
  } catch {
    return false;
  }
}

function looksLikePlainText(data: ArrayBuffer): boolean {
  const bytes = new Uint8Array(data, 0, Math.min(data.byteLength, 4096));
  if (bytes.length === 0) return true;

  const hasUtf8Bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const hasUtf16Bom = bytes.length >= 2 && (
    (bytes[0] === 0xff && bytes[1] === 0xfe)
    || (bytes[0] === 0xfe && bytes[1] === 0xff)
  );
  if (hasUtf8Bom || hasUtf16Bom) return true;

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    let controls = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) controls++;
    }
    return controls <= Math.max(1, Math.floor(text.length * 0.01));
  } catch {
    return false;
  }
}

/**
 * Detect the book from its contents as well as its filename. Mobile downloads
 * often lose the extension even though the file is still a valid EPUB.
 */
export async function detectBookFormat(
  file: Pick<File, 'name' | 'type'>,
  data: ArrayBuffer,
): Promise<BookFormat> {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase().split(';')[0].trim();

  if (name.endsWith('.epub') || EPUB_MIME_TYPES.has(mime)) return 'epub';

  if (name.endsWith('.pdf') || PDF_MIME_TYPES.has(mime) || hasPdfSignature(data)) return 'pdf';

  if (hasZipSignature(data)) {
    if (await hasEpubStructure(data)) return 'epub';
    throw new Error('UNSUPPORTED_FILE_TYPE');
  }

  if (name.endsWith('.txt') || TEXT_MIME_TYPES.has(mime) || looksLikePlainText(data)) return 'txt';

  throw new Error('UNSUPPORTED_FILE_TYPE');
}
