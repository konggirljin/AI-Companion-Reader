'use client';
import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useLang } from '@/lib/lang-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { importBook } from '@/lib/import-book';
import { detectBookFormat } from '@/lib/book-format';

export function ImportButton({ onImported }: { onImported: () => void }) {
  const { t } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);
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
      else if (msg === 'CORRUPT_EPUB') toast.error(t('bookshelf.corruptFile'));
      else if (msg === 'UNSUPPORTED_FILE_TYPE') toast.error(t('bookshelf.unsupportedFormat'));
      else toast.error(t('bookshelf.importFailed'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
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

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".epub,.txt,.pdf"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={busy}>
        <Plus className="mr-1.5 h-4 w-4" />
        {busy ? t('bookshelf.importing') : t('bookshelf.import')}
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
