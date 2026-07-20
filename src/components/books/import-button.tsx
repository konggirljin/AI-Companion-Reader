'use client';
import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { importBook } from '@/lib/import-book';

export function ImportButton({ onImported }: { onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(epub|txt)$/i.test(file.name)) {
      toast.error('Only EPUB and TXT files are supported');
      return;
    }
    setBusy(true);
    try {
      const book = await importBook(file);
      toast.success(`Imported "${book.title}"`);
      onImported();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'STORAGE_FULL') toast.error('Not enough storage space on this device');
      else if (msg === 'CORRUPT_EPUB') toast.error("Couldn't import this file — it may be corrupt or DRM-protected");
      else toast.error('Import failed');
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
        accept=".epub,.txt"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={busy}>
        <Plus className="mr-1.5 h-4 w-4" />
        {busy ? 'Importing…' : 'Import book'}
      </Button>
    </>
  );
}
