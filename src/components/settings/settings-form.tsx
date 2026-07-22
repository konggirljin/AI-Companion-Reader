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
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      await callChat(settings, [{ role: 'user', content: 'Reply with the word: ok' }]);
      toast.success('Connection works');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'NETWORK_ERROR';
      const friendly =
        msg === 'CORS_NETWORK_ERROR' ? 'Connection blocked — the API may not support browser requests (CORS issue)'
        : msg === 'TIMEOUT' ? 'Timed out — check the base URL'
        : msg === 'API_ERROR_503' ? 'Service unavailable (503) — the API server is temporarily overloaded'
        : msg.startsWith('API_ERROR_') ? `Provider error (${msg.replace('API_ERROR_', '')})`
        : `Connection failed (${msg})`;
      toast.error(friendly);
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
        <div className="space-y-2">
          <Label htmlFor="s-proxy">Proxy URL <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Input id="s-proxy" value={settings.proxyUrl ?? ''} onChange={(e) => update({ proxyUrl: e.target.value })}
            placeholder="http://localhost:8787" />
          <p className="text-xs text-muted-foreground">
            Most community APIs block browser requests (CORS). Two options:
          </p>
          <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
            <li>Local dev: run <code className="rounded bg-muted px-1">npm run proxy</code> in separate terminal, set this to <code className="rounded bg-muted px-1">http://localhost:8787</code></li>
            <li>Vercel deploy: set this to <code className="rounded bg-muted px-1">/api/proxy</code> (built-in, no extra process)</li>
          </ul>
        </div>
        <Button variant="outline" onClick={() => void testConnection()} disabled={testing || !settings.apiKey}>
          {testing ? 'Testing…' : 'Test connection'}
        </Button>
        <p className="text-xs text-muted-foreground">Changes save automatically to this device.</p>
      </CardContent>
    </Card>
  );
}
