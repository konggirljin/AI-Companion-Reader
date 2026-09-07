'use client';
import { useRef, useState } from 'react';
import { FolderSearch, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useLang } from '@/lib/lang-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { importBook } from '@/lib/import-book';
import { detectBookFormat } from '@/lib/book-format';

export function ImportButton({ onImported }: { onImported: () => void }) {
  const { t } = useLang();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const doImport = async (file: File | null, mode?: 'native' | 'text') => {
    if (!file) return;
    setPendingFile(null);
    setBusy(true);
    try {
      const book = await importBook(file, mode);
      toast.success(t('bookshelf.imported', { title: book.title }));
      onImported();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'STORAGE_FULL') toast.error(t('bookshelf.storageError'));
      else if (msg === 'DUPLICATE_BOOK') toast.info(t('bookshelf.duplicatesSkipped', { count: 1 }));
      else if (msg === 'CORRUPT_EPUB') toast.error(t('bookshelf.corruptFile'));
      else if (msg === 'UNSUPPORTED_FILE_TYPE') toast.error(t('bookshelf.unsupportedFormat'));
      else toast.error(t('bookshelf.importFailed'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleFiles = async (selected: FileList | null) => {
    if (!selected?.length) return;
    const files = Array.from(selected).filter((file) => {
      const name = file.name.toLowerCase();
      return name.endsWith('.epub')
        || name.endsWith('.txt')
        || name.endsWith('.pdf')
        || file.type === 'application/epub+zip'
        || file.type === 'application/pdf'
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
          // Bulk and folder imports use text mode for PDFs so the queue does not
          // stop for a mode dialog for every PDF.
          await importBook(file);
          imported++;
        } catch (err) {
          const message = err instanceof Error ? err.message : '';
          if (message === 'DUPLICATE_BOOK') {
            skipped++;
            continue;
          }
          failed++;
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

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const format = await detectBookFormat(file, data);
      if (format === 'pdf') {
        setPendingFile(file);
      } else {
        void doImport(file);
      }
    } catch {
      toast.error(t('bookshelf.unsupportedFormat'));
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleSelectedFiles = (selected: FileList | null) => {
    if (!selected?.length) return;
    if (selected.length === 1) {
      void handleFile(selected[0]);
    } else {
      void handleFiles(selected);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".epub,.txt,.pdf,application/epub+zip,application/pdf,text/plain"
        multiple
        className="hidden"
        onChange={(e) => handleSelectedFiles(e.target.files)}
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

      <Dialog open={Boolean(pendingFile)} onOpenChange={(open) => { if (!open) setPendingFile(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('bookshelf.pdfMode.title')}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-1 p-4"
              onClick={() => doImport(pendingFile, 'native')}
            >
              <span className="font-semibold">{t('bookshelf.pdfMode.native')}</span>
              <span className="text-xs text-muted-foreground whitespace-normal text-left">{t('bookshelf.pdfMode.nativeDesc')}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-1 p-4"
              onClick={() => doImport(pendingFile, 'text')}
            >
              <span className="font-semibold">{t('bookshelf.pdfMode.text')}</span>
              <span className="text-xs text-muted-foreground whitespace-normal text-left">{t('bookshelf.pdfMode.textDesc')}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
