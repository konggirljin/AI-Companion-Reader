'use client';
import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useLang } from '@/lib/lang-context';
import { Button } from '@/components/ui/button';
import { importBook } from '@/lib/import-book';

export function ImportButton({ onImported }: { onImported: () => void }) {
  const { t } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const book = await importBook(file);
      toast.success(t('bookshelf.imported', { title: book.title }));
      onImported();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'STORAGE_FULL') toast.error(t('bookshelf.storageError'));
      else if (msg === 'CORRUPT_EPUB') toast.error(t('bookshelf.corruptFile'));
      else if (msg === 'UNSUPPORTED_FILE_TYPE') toast.error(t('bookshelf.unsupportedFormat'));
      else toast.error(t('bookshelf.importFailed'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={busy}>
        <Plus className="mr-1.5 h-4 w-4" />
        {busy ? t('bookshelf.importing') : t('bookshelf.import')}
      </Button>
    </>
  );
}
