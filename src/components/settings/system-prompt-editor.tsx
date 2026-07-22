'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSettings, saveSettings } from '@/lib/storage/settings';
import { DEFAULT_SYSTEM_PROMPT_TEMPLATE } from '@/lib/prompts';

export function SystemPromptEditor() {
  const [template, setTemplate] = useState(() => getSettings().systemPromptTemplate);

  const save = () => {
    if (!template.includes('{{personas}}')) {
      toast.error('Template must contain {{personas}}. That is where companion profiles are inserted.');
      return;
    }
    saveSettings({ ...getSettings(), systemPromptTemplate: template });
    toast.success('System prompt saved');
  };

  const reset = () => {
    setTemplate(DEFAULT_SYSTEM_PROMPT_TEMPLATE);
    saveSettings({ ...getSettings(), systemPromptTemplate: DEFAULT_SYSTEM_PROMPT_TEMPLATE });
    toast.success('Reset to default');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Prompt</CardTitle>
        <CardDescription>
          Controls how companions behave. Must contain <code>{'{{personas}}'}</code> where companion profiles are inserted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Label htmlFor="prompt-editor" className="sr-only">System prompt template</Label>
        <Textarea id="prompt-editor" rows={14} className="font-mono text-xs" value={template}
          onChange={(e) => setTemplate(e.target.value)} />
        <div className="flex gap-2">
          <Button onClick={save}>Save</Button>
          <Button variant="outline" onClick={reset}>Reset to default</Button>
        </div>
      </CardContent>
    </Card>
  );
}
