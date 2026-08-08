import { describe, expect, it, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { LanguageProvider } from '@/lib/lang-context';
import { ImportButton } from '@/components/books/import-button';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  importBook: vi.fn(),
  detectBookFormat: vi.fn(),
}));

vi.mock('@/lib/import-book', () => ({
  importBook: mocks.importBook,
}));
vi.mock('@/lib/book-format', () => ({
  detectBookFormat: mocks.detectBookFormat,
}));

function makeFile(name: string, type: string): File {
  return new File(['hello'], name, { type });
}

async function selectFile(input: HTMLInputElement, file: File) {
  const fileList = { length: 1, 0: file, item: (i: number) => (i === 0 ? file : null) };
  Object.defineProperty(input, 'files', { value: fileList, configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
  });
}

let root: Root;
let container: HTMLDivElement;

function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const onImported = vi.fn();
  act(() => {
    root.render(
      <LanguageProvider>
        <ImportButton onImported={onImported} />
      </LanguageProvider>,
    );
  });
  return onImported;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('ImportButton', () => {
  it('imports a non-PDF file directly without showing the PDF mode dialog', async () => {
    const onImported = mount();
    const input = container.querySelector('input[type=file]') as HTMLInputElement;

    mocks.detectBookFormat.mockResolvedValue('epub');
    mocks.importBook.mockResolvedValue({ title: 'Book', id: 'x' });

    await selectFile(input, makeFile('book.epub', 'application/epub+zip'));

    expect(mocks.detectBookFormat).toHaveBeenCalledTimes(1);
    expect(mocks.importBook).toHaveBeenCalledTimes(1);
    expect(mocks.importBook).toHaveBeenCalledWith(expect.any(File), undefined);
    expect(document.body.textContent).not.toContain('Import PDF as');
    expect(onImported).toHaveBeenCalledTimes(1);
  });

  it('shows the PDF mode dialog only for PDF files', async () => {
    const onImported = mount();
    const input = container.querySelector('input[type=file]') as HTMLInputElement;

    mocks.detectBookFormat.mockResolvedValue('pdf');

    await selectFile(input, makeFile('book.pdf', 'application/pdf'));

    expect(mocks.importBook).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Import PDF as');
    expect(onImported).not.toHaveBeenCalled();
  });
});
