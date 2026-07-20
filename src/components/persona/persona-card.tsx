'use client';
import Link from 'next/link';
import { Pencil, Trash2, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Persona } from '@/lib/types';
import { deletePersona } from '@/lib/storage/personas';

export function PersonaCard({ persona, onChanged }: { persona: Persona; onChanged: () => void }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {persona.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={persona.avatar} alt={persona.name} className="h-full w-full object-cover" />
          ) : (
            <UserCircle2 className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{persona.name}</p>
            <Badge variant="secondary">{persona.language}</Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{persona.characterDescription}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" asChild aria-label="Edit">
            <Link href={`/persona/edit?id=${persona.id}`}><Pencil className="h-4 w-4" /></Link>
          </Button>
          <Button
            variant="ghost" size="icon" aria-label="Delete"
            onClick={() => { deletePersona(persona.id); toast.success('Persona deleted'); onChanged(); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
