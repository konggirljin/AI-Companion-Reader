'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSettings, saveSettings } from '@/lib/storage/settings';
import { DEFAULT_SYSTEM_PROMPT_TEMPLATE } from '@/lib/prompts';
import { useLang } from '@/lib/lang-context';

export function SystemPromptEditor() {
  const [template, setTemplate] = useState(() => getSettings().systemPromptTemplate);
  const { t } = useLang();

  const save = () => {
    if (!template.includes('{{personas}}')) {
      toast.error(t('systemPrompt.mustContainPersonas'));
      return;
    }
    saveSettings({ ...getSettings(), systemPromptTemplate: template });
    toast.success(t('systemPrompt.saved'));
  };

  const reset = () => {
    setTemplate(DEFAULT_SYSTEM_PROMPT_TEMPLATE);
    saveSettings({ ...getSettings(), systemPromptTemplate: DEFAULT_SYSTEM_PROMPT_TEMPLATE });
    toast.success(t('systemPrompt.resetToast'));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('systemPrompt.title')}</CardTitle>
        <CardDescription>
          {t('systemPrompt.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Label htmlFor="prompt-editor" className="sr-only">System prompt template</Label>
        <Textarea id="prompt-editor" rows={14} className="font-mono text-xs" value={template}
          onChange={(e) => setTemplate(e.target.value)} />
        <div className="flex gap-2">
          <Button onClick={save}>{t('common.save')}</Button>
          <Button variant="outline" onClick={reset}>{t('systemPrompt.reset')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
