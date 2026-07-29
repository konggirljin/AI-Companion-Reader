'use client';
import { Sparkles, Highlighter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/lang-context';

interface SelectionToolbarProps {
  position: { x: number; y: number } | null;
  onSend: () => void;
  onHighlight: () => void;
}

export function SelectionToolbar({ position, onSend, onHighlight }: SelectionToolbarProps) {
  const { t } = useLang();
  if (!position) return null;
  return (
    <div
      className="fixed z-50 -translate-x-1/2 animate-scale-in"
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex gap-1.5 rounded-lg bg-card p-1 shadow-lg border border-border">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2.5"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onHighlight}
        >
          <Highlighter className="mr-1 h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">{t('reader.highlightBtn')}</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2.5"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSend}
        >
          <Sparkles className="mr-1 h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">{t('reader.sendBtn')}</span>
        </Button>
      </div>
    </div>
  );
}