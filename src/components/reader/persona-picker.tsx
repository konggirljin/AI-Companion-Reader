'use client';
import { useState } from 'react';
import { UserCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Persona } from '@/lib/types';

const MAX_PERSONAS = 5;

interface PersonaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personas: Persona[];
  onConfirm: (personaIds: string[]) => void;
}

export function PersonaPicker({ open, onOpenChange, personas, onConfirm }: PersonaPickerProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_PERSONAS ? [...prev, id] : prev,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Send to companions (max {MAX_PERSONAS})</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {personas.length === 0 && (
            <p className="text-sm text-muted-foreground">No companions yet — create one from the Personas page.</p>
          )}
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                selected.includes(p.id) ? 'border-primary bg-accent' : 'hover:bg-accent',
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted">
                {p.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <UserCircle2 className="h-5 w-5 text-muted-foreground" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{p.name}</span>
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button
            disabled={selected.length === 0}
            onClick={() => { onConfirm(selected); setSelected([]); }}
          >
            Send ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
