'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Persona } from '@/lib/types';
import { savePersona } from '@/lib/storage/personas';

const LANGUAGE_OPTIONS = ['中文', 'English', '日本語'];

async function fileToAvatarBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('BAD_IMAGE'));
    el.src = dataUrl;
  });
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function PersonaForm({ persona }: { persona?: Persona }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(persona?.name ?? '');
  const [avatar, setAvatar] = useState(persona?.avatar ?? '');
  const [description, setDescription] = useState(persona?.characterDescription ?? '');
  const [language, setLanguage] = useState(persona?.language ?? '中文');
  const [customLanguage, setCustomLanguage] = useState(
    persona && !LANGUAGE_OPTIONS.includes(persona.language) ? persona.language : '',
  );
  const [busy, setBusy] = useState(false);

  const onAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setAvatar(await fileToAvatarBase64(file));
    } catch {
      toast.error("Couldn't read that image");
    }
  };

  const onSave = () => {
    const finalLanguage = customLanguage.trim() || language;
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!description.trim()) { toast.error('Character description is required'); return; }
    setBusy(true);
    savePersona({
      id: persona?.id,
      name: name.trim(),
      avatar,
      characterDescription: description.trim(),
      language: finalLanguage,
    });
    toast.success(persona ? 'Persona updated' : 'Persona created');
    router.push('/persona');
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-muted"
            aria-label="Upload avatar"
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <UserCircle2 className="h-10 w-10 text-muted-foreground" />
            )}
          </button>
          <div className="text-sm text-muted-foreground">Tap to upload avatar (optional)</div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onAvatarFile(e.target.files?.[0])} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="p-name">Name</Label>
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sherlock Holmes" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="p-desc">Character description</Label>
          <Textarea
            id="p-desc" rows={5} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="A witty and sarcastic detective who enjoys analysing people's motives."
          />
        </div>

        <div className="space-y-2">
          <Label>Comment language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            value={customLanguage} onChange={(e) => setCustomLanguage(e.target.value)}
            placeholder="Or type a custom language (overrides dropdown)"
          />
        </div>

        <Button className="w-full" onClick={onSave} disabled={busy}>
          {persona ? 'Save changes' : 'Create persona'}
        </Button>
      </CardContent>
    </Card>
  );
}
