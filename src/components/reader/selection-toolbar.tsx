'use client';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SelectionToolbarProps {
  position: { x: number; y: number } | null;
  onSend: () => void;
}

export function SelectionToolbar({ position, onSend }: SelectionToolbarProps) {
  if (!position) return null;
  return (
    <div
      className="fixed z-50 -translate-x-1/2 animate-scale-in"
      style={{ left: position.x, top: position.y }}
    >
      <Button size="sm" className="shadow-lg" onMouseDown={(e) => e.preventDefault()} onClick={onSend}>
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        Send to Companions
      </Button>
    </div>
  );
}
