'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReaderPrefs } from '@/lib/types';

const FONT_OPTIONS = [
  { value: 'var(--font-geist-sans)', label: 'Geist Sans' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Serif' },
  { value: 'var(--font-geist-mono)', label: 'Mono' },
];

interface ReaderSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefs: ReaderPrefs;
  onChange: (prefs: ReaderPrefs) => void;
}

export function ReaderSettings({ open, onOpenChange, prefs, onChange }: ReaderSettingsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm space-y-4">
        <DialogHeader><DialogTitle>Reading settings</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Font size — {prefs.fontSize}px</Label>
          <Slider
            min={14} max={26} step={1} value={[prefs.fontSize]}
            onValueChange={([v]) => onChange({ ...prefs, fontSize: v })}
          />
        </div>
        <div className="space-y-2">
          <Label>Line spacing — {prefs.lineSpacing.toFixed(1)}</Label>
          <Slider
            min={1.4} max={2.4} step={0.1} value={[prefs.lineSpacing]}
            onValueChange={([v]) => onChange({ ...prefs, lineSpacing: v })}
          />
        </div>
        <div className="space-y-2">
          <Label>Font family</Label>
          <Select value={prefs.fontFamily} onValueChange={(v) => onChange({ ...prefs, fontFamily: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </DialogContent>
    </Dialog>
  );
}
