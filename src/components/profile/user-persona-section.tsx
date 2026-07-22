'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, UserCircle2, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { UserPersona } from '@/lib/types';
import {
  listUserPersonas, saveUserPersona, deleteUserPersona,
  getActiveUserPersonaId, setActiveUserPersonaId,
} from '@/lib/storage/user-personas';

export function UserPersonaSection() {
  const [personas, setPersonas] = useState<UserPersona[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserPersona | null>(null);
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');

  const refresh = () => {
    setPersonas(listUserPersonas());
    setActiveId(getActiveUserPersonaId());
  };

  useEffect(() => {
    refresh();
  }, []);

  const openNew = () => { setEditing(null); setName(''); setPersonality(''); setOpen(true); };
  const openEdit = (p: UserPersona) => { setEditing(p); setName(p.name); setPersonality(p.personality); setOpen(true); };

  const save = () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!personality.trim()) { toast.error('Personality is required'); return; }
    saveUserPersona({ id: editing?.id, name: name.trim(), personality: personality.trim() });
    toast.success(editing ? 'Persona updated' : 'Persona created');
    setOpen(false);
    refresh();
  };

  const setActive = (id: string) => { setActiveUserPersonaId(id); refresh(); };
  const clearActive = () => { setActiveUserPersonaId(null); refresh(); };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Reader persona</h2>
            <p className="text-sm text-muted-foreground">Optional. Shape how companions talk to you.</p>
          </div>
          <Button variant="outline" size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </div>

        {activeId && (
          <div className="rounded-lg border border-primary/40 bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Active</p>
            {(() => {
              const p = personas.find((x) => x.id === activeId);
              if (!p) return null;
              return (
                <div className="mt-1 flex items-start gap-2">
                  <UserCircle2 className="h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.personality}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearActive}>Clear</Button>
                </div>
              );
            })()}
          </div>
        )}

        <div className="space-y-2">
          {personas.length === 0 && !activeId && (
            <p className="text-sm text-muted-foreground">No reader persona yet. Add one to give companions context about you.</p>
          )}
          {personas.map((p) => (
            <div key={p.id} className="flex items-start gap-2 rounded-md border p-3">
              <button className="flex min-w-0 flex-1 items-start gap-2 text-left" onClick={() => setActive(p.id)}>
                {activeId === p.id ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <UserCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.personality}</p>
                </div>
              </button>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Delete"
                  onClick={() => { deleteUserPersona(p.id); toast.success('Persona deleted'); refresh(); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md space-y-4">
          <DialogHeader><DialogTitle>{editing ? 'Edit reader persona' : 'New reader persona'}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="up-name">Name</Label>
            <Input id="up-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alice" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="up-personality">Personality</Label>
            <Textarea id="up-personality" rows={4} value={personality} onChange={(e) => setPersonality(e.target.value)}
              placeholder="A curious reader who loves mysteries and dislikes rushed endings." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
