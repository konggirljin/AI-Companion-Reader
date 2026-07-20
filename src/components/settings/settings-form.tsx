'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Settings } from '@/lib/types';
import { getSettings, saveSettings } from '@/lib/storage/settings';
import { callChat } from '@/lib/ai';

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings>(() => getSettings());
  const [testing, setTesting] = useState(false);

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      await callChat(settings, [{ role: 'user', content: 'Reply with the word: ok' }]);
      toast.success('Connection works');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'NETWORK_ERROR';
      toast.error(msg === 'TIMEOUT' ? 'Timed out — check the base URL' : `Connection failed (${msg})`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Provider</CardTitle>
        <CardDescription>Any OpenAI-compatible API. Your key is stored only on this device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="s-base">Base URL</Label>
          <Input id="s-base" value={settings.baseUrl} onChange={(e) => update({ baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-key">API Key</Label>
          <Input id="s-key" type="password" value={settings.apiKey} onChange={(e) => update({ apiKey: e.target.value })}
            placeholder="sk-…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-model">Model</Label>
          <Input id="s-model" value={settings.model} onChange={(e) => update({ model: e.target.value })}
            placeholder="gpt-4o-mini" />
        </div>
        <Button variant="outline" onClick={() => void testConnection()} disabled={testing || !settings.apiKey}>
          {testing ? 'Testing…' : 'Test connection'}
        </Button>
      </CardContent>
    </Card>
  );
}
