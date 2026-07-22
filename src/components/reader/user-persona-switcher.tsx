'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCircle2, Check, Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  listUserPersonas, getActiveUserPersonaId, setActiveUserPersonaId,
} from '@/lib/storage/user-personas';
import type { UserPersona } from '@/lib/types';

interface UserPersonaSwitcherProps {
  activeId: string | null;
  onActivate: (id: string | null) => void;
}

export function UserPersonaSwitcher({ activeId, onActivate }: UserPersonaSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [personas, setPersonas] = useState<UserPersona[]>([]);

  useEffect(() => {
    setPersonas(listUserPersonas());
  }, [open]);

  const active = personas.find((p) => p.id === activeId);

  const trigger = active ? (
    <Button variant="secondary" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setOpen(true)}>
      <UserCircle2 className="h-3.5 w-3.5" />{active.name}
    </Button>
  ) : (
    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setOpen(true)}>
      <UserCircle2 className="h-3.5 w-3.5" />Set persona
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><span>{trigger}</span></PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2 p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Reader persona</p>
        {personas.length === 0 && (
          <p className="text-sm text-muted-foreground">No personas yet. Add one in Profile.</p>
        )}
        {personas.map((p) => (
          <button key={p.id} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
            onClick={() => { const next = p.id === activeId ? null : p.id; setActiveUserPersonaId(next); onActivate(next); setOpen(false); }}>
            {p.id === activeId ? <Check className="h-4 w-4 text-primary" /> : <UserCircle2 className="h-4 w-4" />}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">{p.personality}</p>
            </div>
          </button>
        ))}
        <div className="pt-2 border-t">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
          <Link href="/profile"><Settings className="h-4 w-4" />Manage</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
