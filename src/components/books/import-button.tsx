'use client';
import { useRef, useState } from 'react';
import { FolderSearch, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useLang } from '@/lib/lang-context';
import { Button } from '@/components/ui/button';
import { importBook } from '@/lib/import-book';

export function ImportButton({ onImported }: { onImported: () => void }) {
  const { t } = useLang();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (selected: FileList | null) => {
    if (!selected?.length) return;
    const files = Array.from(selected).filter((file) => {
      const name = file.name.toLowerCase();
      return name.endsWith('.epub')
        || name.endsWith('.txt')
        || file.type === 'application/epub+zip'
        || file.type.startsWith('text/')
        || !name.includes('.');
    });
    if (!files.length) {
      toast.info(t('bookshelf.scanNoBooks'));
      return;
    }

    setBusy(true);
    let imported = 0;
    let failed = 0;
    let skipped = 0;
    let firstFailure = '';
    let storageFull = false;
    try {
      for (const file of files) {
        try {
          await importBook(file);
          imported++;
        } catch (err) {
          if (err instanceof Error && err.message === 'DUPLICATE_BOOK') {
            skipped++;
            continue;
          }
          failed++;
          const message = err instanceof Error ? err.message : '';
          if (!firstFailure) firstFailure = message;
          if (message === 'STORAGE_FULL') {
            storageFull = true;
            break;
          }
        }
      }
      if (storageFull) {
        toast.error(t('bookshelf.storageError'));
        if (imported) onImported();
        return;
      }
      if (imported) {
        onImported();
        if (failed || skipped) {
          toast.warning(t('bookshelf.importedPartial', { imported, failed, skipped }));
        } else {
          toast.success(t('bookshelf.importedCount', { count: imported }));
        }
      } else if (skipped && !failed) {
        toast.info(t('bookshelf.duplicatesSkipped', { count: skipped }));
      } else if (failed) {
        if (firstFailure === 'CORRUPT_EPUB') toast.error(t('bookshelf.corruptFile'));
        else if (firstFailure === 'UNSUPPORTED_FILE_TYPE') toast.error(t('bookshelf.unsupportedFormat'));
        else toast.error(t('bookshelf.importFailed'));
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".epub,.txt,application/epub+zip,text/plain"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <input
        ref={(node) => {
          folderInputRef.current = node;
          node?.setAttribute('webkitdirectory', '');
        }}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={busy}>
        <Plus className="mr-1.5 h-4 w-4" />
        {busy ? t('bookshelf.importing') : t('bookshelf.import')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={busy}
        title={t('bookshelf.scanFolder')}
        aria-label={t('bookshelf.scanFolder')}
        onClick={() => folderInputRef.current?.click()}
      >
        <FolderSearch className="h-4 w-4" />
      </Button>
    </>
  );
}
